//! 主 App 侧的"主窗口生命周期助手"。
//!
//! 历史背景：M4-C 曾把 Quick Capture NSPanel 放在主 App 里，因此本模块承载过
//! 面板创建、全局快捷键唤起、线程调度等逻辑。M4-D 之后 Quick Capture 已整体
//! 迁到独立 Helper 进程（`crates/helper-app`），主 App 不再拥有 NSPanel。
//!
//! 本模块保留的仍是「主窗口 close/hide/quit」语义：
//! - 主窗口关闭时先藏起来（`handle_main_window_close_requested`）；
//! - Helper 的"退出应用"按钮触发时，经 IPC 或用户直接操作主 App 可走
//!   `quit_from_helper`；
//! - 运行时观测信息仍保留，便于后续接 IPC 调用统计与诊断面板。

use std::sync::Mutex;

use tauri::{Manager, Runtime};
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

use crate::app::MAIN_WINDOW_LABEL;

fn main_window_state_flags() -> StateFlags {
    StateFlags::SIZE | StateFlags::POSITION | StateFlags::MAXIMIZED
}

/// 最近一次主窗口操作的结果（供 snapshot 观测）。
///
/// 当前仅测试路径会构造这两个变体；非测试构建下留给未来 IPC 调用统计等扩展挂钩。
#[cfg_attr(not(test), allow(dead_code))]
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum CommandHelperInvokeResult {
    Success,
    Failed(String),
}

impl CommandHelperInvokeResult {
    fn is_success(&self) -> bool {
        matches!(self, Self::Success)
    }

    fn error_message(&self) -> Option<&str> {
        match self {
            Self::Success => None,
            Self::Failed(message) => Some(message.as_str()),
        }
    }
}

/// Command Helper 的可观测运行时快照。
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CommandHelperSnapshot {
    pub(crate) initialized: bool,
    pub(crate) last_invoke_success: Option<bool>,
    pub(crate) last_invoke_error: Option<String>,
    pub(crate) main_window_hidden: bool,
    pub(crate) exiting: bool,
}

#[derive(Debug, Clone, Default)]
struct CommandHelperRuntime {
    initialized: bool,
    last_invoke_result: Option<CommandHelperInvokeResult>,
    main_window_hidden: bool,
    exiting: bool,
}

/// Command Helper 的进程内运行时状态。
#[derive(Debug, Default)]
pub(crate) struct CommandHelperState {
    runtime: Mutex<CommandHelperRuntime>,
}

impl CommandHelperState {
    pub(crate) fn new_initialized() -> Self {
        Self {
            runtime: Mutex::new(CommandHelperRuntime {
                initialized: true,
                ..Default::default()
            }),
        }
    }

    pub(crate) fn snapshot(&self) -> anyhow::Result<CommandHelperSnapshot> {
        let runtime = self
            .runtime
            .lock()
            .map_err(|_| anyhow::anyhow!("command helper state lock is poisoned"))?;

        Ok(CommandHelperSnapshot {
            initialized: runtime.initialized,
            last_invoke_success: runtime
                .last_invoke_result
                .as_ref()
                .map(CommandHelperInvokeResult::is_success),
            last_invoke_error: runtime
                .last_invoke_result
                .as_ref()
                .and_then(CommandHelperInvokeResult::error_message)
                .map(ToOwned::to_owned),
            main_window_hidden: runtime.main_window_hidden,
            exiting: runtime.exiting,
        })
    }

    #[cfg(test)]
    pub(crate) fn record_invoke(&self, result: CommandHelperInvokeResult) -> anyhow::Result<()> {
        let mut runtime = self
            .runtime
            .lock()
            .map_err(|_| anyhow::anyhow!("command helper state lock is poisoned"))?;
        runtime.last_invoke_result = Some(result);
        Ok(())
    }

    pub(crate) fn mark_main_window_hidden(&self, hidden: bool) -> anyhow::Result<()> {
        let mut runtime = self
            .runtime
            .lock()
            .map_err(|_| anyhow::anyhow!("command helper state lock is poisoned"))?;
        runtime.main_window_hidden = hidden;
        Ok(())
    }

    pub(crate) fn mark_exiting(&self) -> anyhow::Result<()> {
        let mut runtime = self
            .runtime
            .lock()
            .map_err(|_| anyhow::anyhow!("command helper state lock is poisoned"))?;
        runtime.exiting = true;
        Ok(())
    }

    pub(crate) fn is_exiting(&self) -> anyhow::Result<bool> {
        let runtime = self
            .runtime
            .lock()
            .map_err(|_| anyhow::anyhow!("command helper state lock is poisoned"))?;
        Ok(runtime.exiting)
    }
}

/// 主窗口关闭时：默认藏起来（保留进程存活以便快捷键/托盘复用）。
/// 仅当外部显式标记 `exiting` 时才真正关闭。
pub(crate) fn handle_main_window_close_requested<R: Runtime>(
    window: &tauri::Window<R>,
    helper_state: &CommandHelperState,
) -> tauri::Result<bool> {
    if !should_hide_main_window_on_close(window.label(), helper_state)
        .map_err(tauri::Error::Anyhow)?
    {
        return Ok(false);
    }

    hide_main_window_to_tray(&window.app_handle(), helper_state)?;
    Ok(true)
}

pub(crate) fn should_hide_main_window_on_close(
    window_label: &str,
    helper_state: &CommandHelperState,
) -> anyhow::Result<bool> {
    if window_label != MAIN_WINDOW_LABEL {
        return Ok(false);
    }

    Ok(!helper_state.is_exiting()?)
}

/// 隐藏主窗口到托盘前主动保存窗口状态，避免长期驻留托盘时丢失布局。
pub(crate) fn hide_main_window_to_tray<R: Runtime>(
    app_handle: &tauri::AppHandle<R>,
    helper_state: &CommandHelperState,
) -> tauri::Result<()> {
    app_handle
        .save_window_state(main_window_state_flags())
        .map_err(|error| tauri::Error::Anyhow(anyhow::Error::new(error)))?;

    if let Some(window) = app_handle.get_webview_window(MAIN_WINDOW_LABEL) {
        window.hide()?;
        helper_state
            .mark_main_window_hidden(true)
            .map_err(tauri::Error::Anyhow)?;
    }

    Ok(())
}

pub(crate) fn restore_main_window<R: Runtime>(
    app_handle: &tauri::AppHandle<R>,
    helper_state: &CommandHelperState,
) -> tauri::Result<()> {
    if let Some(window) = app_handle.get_webview_window(MAIN_WINDOW_LABEL) {
        window.show()?;
        window.unminimize()?;
        window.set_focus()?;
        if let Err(error) = helper_state.mark_main_window_hidden(false) {
            log::warn!("failed to mark main window visible: {error}");
        }
    }
    Ok(())
}

pub(crate) fn quit_application<R: Runtime>(
    app_handle: &tauri::AppHandle<R>,
    helper_state: &CommandHelperState,
) -> tauri::Result<()> {
    if let Err(error) = helper_state.mark_exiting() {
        log::warn!("failed to mark command helper exiting: {error}");
    }

    app_handle.exit(0);
    Ok(())
}

pub(crate) fn restore_main_window_from_helper<R: Runtime>(
    app_handle: &tauri::AppHandle<R>,
    helper_state: &CommandHelperState,
) -> tauri::Result<()> {
    restore_main_window(app_handle, helper_state)
}

pub(crate) fn quit_from_helper<R: Runtime>(
    app_handle: &tauri::AppHandle<R>,
    helper_state: &CommandHelperState,
) -> tauri::Result<()> {
    quit_application(app_handle, helper_state)
}

#[cfg(test)]
mod tests {
    use super::*;

    // 测试里需要一个"非主窗口"的 label 对照，与 Helper 进程那边 Quick Capture 面板保持一致。
    const QUICK_CAPTURE_WINDOW_LABEL: &str = "quick-capture";

    #[test]
    fn helper_state_starts_initialized() {
        let state = CommandHelperState::new_initialized();
        let snapshot = state.snapshot().expect("snapshot should be available");

        assert!(snapshot.initialized);
        assert_eq!(snapshot.last_invoke_success, None);
        assert_eq!(snapshot.last_invoke_error, None);
        assert!(!snapshot.main_window_hidden);
        assert!(!snapshot.exiting);
    }

    #[test]
    fn helper_state_records_invoke_result() {
        let state = CommandHelperState::new_initialized();

        state
            .record_invoke(CommandHelperInvokeResult::Success)
            .expect("invoke result should be recorded");

        let snapshot = state.snapshot().expect("snapshot should be available");
        assert_eq!(snapshot.last_invoke_success, Some(true));
        assert_eq!(snapshot.last_invoke_error, None);
    }

    #[test]
    fn helper_state_records_failed_invoke_result() {
        let state = CommandHelperState::new_initialized();

        state
            .record_invoke(CommandHelperInvokeResult::Failed("boom".to_owned()))
            .expect("invoke result should be recorded");

        let snapshot = state.snapshot().expect("snapshot should be available");
        assert_eq!(snapshot.last_invoke_success, Some(false));
        assert_eq!(snapshot.last_invoke_error, Some("boom".to_owned()));
    }

    #[test]
    fn helper_state_records_hidden_and_exiting() {
        let state = CommandHelperState::new_initialized();

        state
            .mark_main_window_hidden(true)
            .expect("hidden state should be recorded");
        state.mark_exiting().expect("exit state should be recorded");

        let snapshot = state.snapshot().expect("snapshot should be available");
        assert!(snapshot.main_window_hidden);
        assert!(snapshot.exiting);
    }

    #[test]
    fn main_window_close_policy_hides_only_when_helper_is_active() {
        let state = CommandHelperState::new_initialized();

        assert!(should_hide_main_window_on_close(MAIN_WINDOW_LABEL, &state)
            .expect("policy should be available"));
        assert!(
            !should_hide_main_window_on_close(QUICK_CAPTURE_WINDOW_LABEL, &state)
                .expect("policy should be available")
        );

        state.mark_exiting().expect("exit state should be recorded");
        assert!(!should_hide_main_window_on_close(MAIN_WINDOW_LABEL, &state)
            .expect("policy should be available"));
    }

    #[test]
    fn state_flags_exclude_visible_state() {
        let flags = main_window_state_flags();

        assert!(flags.contains(StateFlags::SIZE));
        assert!(flags.contains(StateFlags::POSITION));
        assert!(flags.contains(StateFlags::MAXIMIZED));
        assert!(!flags.contains(StateFlags::VISIBLE));
    }
}
