use std::process::Stdio;
use std::time::{Duration, Instant};

use stoneflow_ipc_protocol::{HelperShutdownReason, PROTOCOL_VERSION};
use tokio::process::Command;
use tokio::sync::mpsc;
use tokio::time::interval;

use crate::app::error::AppError;
use crate::app::state::CommandHelperState;

use super::binary_resolver::resolve_or_build_helper;
use super::command::{SupervisorCommand, SupervisorHandle};
use super::log_forwarder::forward_helper_output;
use super::restart_policy::{RestartDecision, RestartPolicy, RestartPolicyConfig};
use super::shutdown::{shutdown_child_process, ShutdownOutcome};
use super::state::{ChildProcess, RestartPlan, SupervisorStage};

const HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(10);
const HEALTH_CHECK_INTERVAL: Duration = Duration::from_millis(250);
const HELPER_RESTART_BACKOFF_MS: u64 = 1_500;

pub fn spawn_supervisor(
    app_handle: tauri::AppHandle,
    helper_state: CommandHelperState,
) -> SupervisorHandle {
    let (tx, rx) = mpsc::channel(32);
    let handle = SupervisorHandle::new(tx);
    let actor = HelperSupervisorActor::new(app_handle, helper_state, rx);
    tauri::async_runtime::spawn(actor.run());
    handle
}

struct HelperSupervisorActor {
    #[allow(dead_code)]
    app_handle: tauri::AppHandle,
    helper_state: CommandHelperState,
    receiver: mpsc::Receiver<SupervisorCommand>,
    policy: RestartPolicy,
    stage: SupervisorStage,
    current_child: Option<ChildProcess>,
    hello_deadline: Option<Instant>,
    restart_plan: Option<RestartPlan>,
}

impl HelperSupervisorActor {
    fn new(
        app_handle: tauri::AppHandle,
        helper_state: CommandHelperState,
        receiver: mpsc::Receiver<SupervisorCommand>,
    ) -> Self {
        Self {
            app_handle,
            helper_state,
            receiver,
            policy: RestartPolicy::new(RestartPolicyConfig::default()),
            stage: SupervisorStage::Idle,
            current_child: None,
            hello_deadline: None,
            restart_plan: None,
        }
    }

    async fn run(mut self) {
        log::info!("helper supervisor actor 启动");
        let mut ticker = interval(HEALTH_CHECK_INTERVAL);
        self.helper_state
            .set_ipc_status(crate::app::state::IpcServerStatus::Ready, None)
            .await;

        loop {
            tokio::select! {
                Some(command) = self.receiver.recv() => {
                    self.handle_command(command).await;
                }
                _ = ticker.tick() => {
                    self.on_tick().await;
                }
                else => break,
            }
        }

        log::info!("helper supervisor actor 已停止");
    }

    async fn handle_command(&mut self, command: SupervisorCommand) {
        match command {
            SupervisorCommand::Start { respond_to } => {
                let _ = respond_to.send(self.ensure_started().await);
            }
            SupervisorCommand::Stop { reason, respond_to } => {
                let _ = respond_to.send(self.stop_helper(reason).await);
            }
            SupervisorCommand::HelperHello {
                payload,
                received_at,
                respond_to,
            } => {
                let _ = respond_to.send(self.handle_helper_hello(payload, received_at).await);
            }
            SupervisorCommand::HelperWindowReady { at, respond_to } => {
                self.helper_state.mark_window_ready(at).await;
                self.stage = SupervisorStage::Ready;
                let _ = respond_to.send(Ok(()));
            }
            SupervisorCommand::HelperWindowUnready { at, respond_to } => {
                self.helper_state.mark_window_unready(at).await;
                if self.stage == SupervisorStage::Ready {
                    self.stage = SupervisorStage::WaitingForWindow;
                }
                let _ = respond_to.send(Ok(()));
            }
            SupervisorCommand::ProtocolError {
                message,
                at,
                respond_to,
            } => {
                let result = self.handle_protocol_error(message, at).await;
                let _ = respond_to.send(result);
            }
        }
    }

    async fn on_tick(&mut self) {
        self.maybe_restart().await;
        self.maybe_handle_hello_timeout().await;
        self.maybe_detect_child_exit().await;
    }

    async fn ensure_started(&mut self) -> Result<(), AppError> {
        if self.current_child.is_some()
            || matches!(
                self.stage,
                SupervisorStage::WaitingForHello
                    | SupervisorStage::WaitingForWindow
                    | SupervisorStage::Ready
                    | SupervisorStage::ShuttingDown
            )
        {
            return Ok(());
        }

        self.spawn_helper().await
    }

    async fn spawn_helper(&mut self) -> Result<(), AppError> {
        let helper_path = resolve_or_build_helper().await?;
        self.helper_state
            .mark_helper_starting(Some(helper_path.clone()))
            .await;

        let mut command = Command::new(&helper_path);
        if let Some(parent_dir) = helper_path.parent() {
            command.current_dir(parent_dir);
        }
        command
            .env("STONEFLOW_MAIN_APP", "1")
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);

        let mut child = command
            .spawn()
            .map_err(|error| AppError::initialization(format!("spawn helper 失败: {error}")))?;
        let pid = child.id().unwrap_or(0);
        self.helper_state.mark_helper_spawned(pid).await;
        forward_helper_output(child.stdout.take(), child.stderr.take(), pid);

        self.current_child = Some(ChildProcess {
            child,
            pid,
        });
        self.stage = SupervisorStage::WaitingForHello;
        self.hello_deadline = Some(Instant::now() + HANDSHAKE_TIMEOUT);
        self.restart_plan = None;

        log::info!("helper 已启动, pid={pid}");
        Ok(())
    }

    async fn handle_helper_hello(
        &mut self,
        payload: stoneflow_ipc_protocol::HelperHelloPayload,
        received_at: String,
    ) -> Result<(), AppError> {
        if payload.protocol_version != PROTOCOL_VERSION {
            let message = format!(
                "helper protocol version mismatch: expected {}, got {}",
                PROTOCOL_VERSION, payload.protocol_version
            );
            self.handle_protocol_error(message.clone(), received_at).await?;
            return Err(AppError::validation(message));
        }

        self.helper_state
            .mark_helper_hello(
                payload.protocol_version,
                payload.helper_version,
                payload.platform,
                received_at,
            )
            .await;
        self.stage = SupervisorStage::WaitingForWindow;
        self.hello_deadline = None;
        self.policy.record_stable();
        Ok(())
    }

    async fn handle_protocol_error(
        &mut self,
        message: String,
        at: String,
    ) -> Result<(), AppError> {
        log::warn!("helper protocol error: {message}");
        self.helper_state
            .mark_protocol_error(message.clone(), at.clone())
            .await;

        if let Some(child) = self.current_child.take() {
            let _ = shutdown_child_process(child.child, HelperShutdownReason::Restart).await;
        }

        self.schedule_restart(message).await;
        Ok(())
    }

    async fn stop_helper(&mut self, reason: HelperShutdownReason) -> Result<(), AppError> {
        self.stage = SupervisorStage::ShuttingDown;
        self.helper_state.mark_shutting_down().await;

        let Some(child) = self.current_child.take() else {
            self.hello_deadline = None;
            self.restart_plan = None;
            self.stage = SupervisorStage::Idle;
            return Ok(());
        };

        let reason_label = shutdown_reason_label(reason);
        let requested_at = chrono::Utc::now().to_rfc3339();
        log::info!(
            "准备关闭 helper 进程, pid={}, reason={reason_label}",
            child.pid
        );
        self.helper_state
            .mark_shutdown_requested(reason_label, requested_at)
            .await;

        let report = shutdown_child_process(child.child, reason).await?;
        if report.ack.is_some() {
            self.helper_state
                .mark_shutdown_acknowledged(chrono::Utc::now().to_rfc3339())
                .await;
        }

        match report.outcome {
            ShutdownOutcome::Exited(status) => {
                log::info!("helper 进程已关闭, pid={}, status={status}", child.pid);
                self.helper_state
                    .mark_expected_shutdown_completed(
                        reason_label,
                        status.code(),
                        chrono::Utc::now().to_rfc3339(),
                    )
                    .await;
            }
            ShutdownOutcome::Terminated(status) => {
                log::warn!("helper 进程已 terminate fallback 关闭, pid={}, status={status}", child.pid);
                self.helper_state
                    .mark_terminate_fallback(
                        format!("helper 已 terminate fallback 关闭: {reason_label}"),
                        status.code(),
                        chrono::Utc::now().to_rfc3339(),
                    )
                    .await;
            }
            ShutdownOutcome::Killed(status) => {
                log::warn!("helper 进程已 kill fallback 关闭, pid={}, status={status}", child.pid);
                self.helper_state
                    .mark_kill_fallback(
                        format!("helper 已 kill fallback 关闭: {reason_label}"),
                        status.code(),
                        chrono::Utc::now().to_rfc3339(),
                    )
                    .await;
            }
        }

        self.hello_deadline = None;
        self.restart_plan = None;
        self.stage = SupervisorStage::Idle;
        Ok(())
    }

    async fn maybe_detect_child_exit(&mut self) {
        let Some(child) = self.current_child.as_mut() else {
            return;
        };

        match child.child.try_wait() {
            Ok(Some(status)) => {
                let pid = child.pid;
                let code = status.code();
                let reason = format!(
                    "helper 进程已退出，stage={:?}, code={}",
                    self.stage,
                    code.unwrap_or(-1)
                );
                log::warn!("helper 进程已退出, pid={pid}, code={}", code.unwrap_or(-1));
                self.current_child.take();
                self.helper_state
                    .mark_helper_crashed(
                        reason.clone(),
                        code,
                        reason.clone(),
                        chrono::Utc::now().to_rfc3339(),
                    )
                    .await;
                self.schedule_restart(reason).await;
            }
            Ok(None) => {}
            Err(error) => {
                let reason = format!("检查 helper 状态失败: {error}");
                self.current_child.take();
                self.helper_state
                    .mark_helper_crashed(
                        reason.clone(),
                        None,
                        reason.clone(),
                        chrono::Utc::now().to_rfc3339(),
                    )
                    .await;
                self.schedule_restart(reason).await;
            }
        }
    }

    async fn maybe_handle_hello_timeout(&mut self) {
        if self.stage != SupervisorStage::WaitingForHello {
            return;
        }

        let Some(deadline) = self.hello_deadline else {
            return;
        };

        if Instant::now() < deadline {
            return;
        }

        let reason = "helper hello 超时".to_owned();
        log::warn!("{reason}");
        self.helper_state
            .mark_helper_crashed(
                reason.clone(),
                None,
                "hello_timeout".to_owned(),
                chrono::Utc::now().to_rfc3339(),
            )
            .await;

        if let Some(child) = self.current_child.take() {
            let _ = shutdown_child_process(child.child, HelperShutdownReason::Restart).await;
        }
        self.schedule_restart(reason).await;
    }

    async fn schedule_restart(&mut self, reason: String) {
        match self.policy.record_crash() {
            RestartDecision::Restart(delay) => {
                self.helper_state.mark_helper_restarting(reason.clone()).await;
                self.restart_plan = Some(RestartPlan {
                    reason,
                    restart_at: Instant::now() + delay.max(Duration::from_millis(HELPER_RESTART_BACKOFF_MS)),
                });
                self.stage = SupervisorStage::Restarting;
            }
            RestartDecision::CircuitOpen => {
                self.stage = SupervisorStage::CircuitOpen;
                self.restart_plan = None;
                self.helper_state
                    .mark_helper_crashed(
                        "重启次数达到上限，已熔断",
                        None,
                        "circuit_open".to_owned(),
                        chrono::Utc::now().to_rfc3339(),
                    )
                    .await;
                log::error!("helper 重启次数达到上限，进入熔断状态");
            }
        }
    }

    async fn maybe_restart(&mut self) {
        if self.stage != SupervisorStage::Restarting {
            return;
        }

        let Some(plan) = self.restart_plan.as_ref() else {
            return;
        };

        if Instant::now() < plan.restart_at {
            return;
        }

        let reason = plan.reason.clone();
        log::info!("helper 准备重启: {reason}");
        if let Err(error) = self.spawn_helper().await {
            log::error!("helper 重启失败: {error}");
            self.helper_state
                .mark_helper_crashed(
                    format!("helper 重启失败: {error}"),
                    None,
                    "restart_spawn_failed".to_owned(),
                    chrono::Utc::now().to_rfc3339(),
                )
                .await;
            self.schedule_restart(format!("helper 重启失败: {error}")).await;
        }
    }
}

fn shutdown_reason_label(reason: HelperShutdownReason) -> &'static str {
    match reason {
        HelperShutdownReason::AppExit => "app_exit",
        HelperShutdownReason::SupervisorStop => "supervisor_stop",
        HelperShutdownReason::Restart => "restart",
    }
}
