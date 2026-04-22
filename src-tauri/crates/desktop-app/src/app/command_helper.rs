//! Command Helper 生命周期协调层。
//!
//! M4-C 第一版 Helper 仍运行在当前 Tauri 进程内，只负责窗口唤起与生命周期，
//! 不复制 Quick Capture 的任务创建业务逻辑。

use std::sync::Mutex;

#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;
use tauri::{Manager, Runtime, WebviewUrl, WebviewWindowBuilder};

use crate::app::{MAIN_WINDOW_LABEL, QUICK_CAPTURE_WINDOW_LABEL, QUICK_CAPTURE_WINDOW_SPEC};

/// Helper 唤起来源。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum CommandHelperInvokeSource {
    MainApp,
    // M4-D 会把系统级快捷键接入同一 Helper 入口，M4-C 只预留来源枚举。
    #[allow(dead_code)]
    FutureGlobalShortcut,
}

impl CommandHelperInvokeSource {
    fn as_str(self) -> &'static str {
        match self {
            Self::MainApp => "main_app",
            Self::FutureGlobalShortcut => "future_global_shortcut",
        }
    }
}

/// 最近一次 Helper 唤起结果。
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
    pub(crate) last_invoke_source: Option<&'static str>,
    pub(crate) last_invoke_success: Option<bool>,
    pub(crate) last_invoke_error: Option<String>,
    pub(crate) main_window_hidden: bool,
    pub(crate) exiting: bool,
}

#[derive(Debug, Clone)]
struct CommandHelperRuntime {
    initialized: bool,
    last_invoke_source: Option<CommandHelperInvokeSource>,
    last_invoke_result: Option<CommandHelperInvokeResult>,
    main_window_hidden: bool,
    exiting: bool,
}

impl Default for CommandHelperRuntime {
    fn default() -> Self {
        Self {
            initialized: true,
            last_invoke_source: None,
            last_invoke_result: None,
            main_window_hidden: false,
            exiting: false,
        }
    }
}

/// Command Helper 的进程内运行时状态。
#[derive(Debug, Default)]
pub(crate) struct CommandHelperState {
    runtime: Mutex<CommandHelperRuntime>,
}

impl CommandHelperState {
    pub(crate) fn new_initialized() -> Self {
        Self {
            runtime: Mutex::new(CommandHelperRuntime::default()),
        }
    }

    pub(crate) fn snapshot(&self) -> anyhow::Result<CommandHelperSnapshot> {
        let runtime = self
            .runtime
            .lock()
            .map_err(|_| anyhow::anyhow!("command helper state lock is poisoned"))?;

        Ok(CommandHelperSnapshot {
            initialized: runtime.initialized,
            last_invoke_source: runtime
                .last_invoke_source
                .map(CommandHelperInvokeSource::as_str),
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

    fn record_invoke(
        &self,
        source: CommandHelperInvokeSource,
        result: CommandHelperInvokeResult,
    ) -> anyhow::Result<()> {
        let mut runtime = self
            .runtime
            .lock()
            .map_err(|_| anyhow::anyhow!("command helper state lock is poisoned"))?;
        runtime.last_invoke_source = Some(source);
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

/// Quick Capture 唤起规划，用于单元测试覆盖首次与重复唤起语义。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum QuickCaptureInvokePlan {
    CreateWindow,
    FocusExisting,
}

pub(crate) fn plan_quick_capture_invocation(window_exists: bool) -> QuickCaptureInvokePlan {
    if window_exists {
        QuickCaptureInvokePlan::FocusExisting
    } else {
        QuickCaptureInvokePlan::CreateWindow
    }
}

pub(crate) fn open_quick_capture_from_helper<R: Runtime>(
    app_handle: &tauri::AppHandle<R>,
    helper_state: &CommandHelperState,
    source: CommandHelperInvokeSource,
) -> tauri::Result<()> {
    let result = open_quick_capture_window(app_handle);
    let tracked_result = match &result {
        Ok(()) => CommandHelperInvokeResult::Success,
        Err(error) => CommandHelperInvokeResult::Failed(error.to_string()),
    };

    if let Err(error) = helper_state.record_invoke(source, tracked_result) {
        log::warn!("failed to record command helper invocation: {error}");
    }

    result
}

fn open_quick_capture_window<R: Runtime>(app_handle: &tauri::AppHandle<R>) -> tauri::Result<()> {
    match plan_quick_capture_invocation(
        app_handle
            .get_webview_window(QUICK_CAPTURE_WINDOW_SPEC.label)
            .is_some(),
    ) {
        QuickCaptureInvokePlan::FocusExisting => {
            if let Some(window) = app_handle.get_webview_window(QUICK_CAPTURE_WINDOW_SPEC.label) {
                window.unminimize()?;
                window.show()?;
                window.set_focus()?;
            }
        }
        QuickCaptureInvokePlan::CreateWindow => {
            let window_builder = WebviewWindowBuilder::new(
                app_handle,
                QUICK_CAPTURE_WINDOW_SPEC.label,
                WebviewUrl::App(QUICK_CAPTURE_WINDOW_SPEC.url.into()),
            )
            .title(QUICK_CAPTURE_WINDOW_SPEC.title)
            .inner_size(
                QUICK_CAPTURE_WINDOW_SPEC.width,
                QUICK_CAPTURE_WINDOW_SPEC.height,
            )
            .min_inner_size(
                QUICK_CAPTURE_WINDOW_SPEC.width,
                QUICK_CAPTURE_WINDOW_SPEC.height,
            )
            .max_inner_size(
                QUICK_CAPTURE_WINDOW_SPEC.width,
                QUICK_CAPTURE_WINDOW_SPEC.height,
            )
            .resizable(false)
            .fullscreen(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .center();

            #[cfg(target_os = "macos")]
            let window_builder = window_builder
                .decorations(false)
                .title_bar_style(TitleBarStyle::Overlay)
                .hidden_title(true);

            #[cfg(not(target_os = "macos"))]
            let window_builder = window_builder.decorations(false);

            let window = window_builder.build()?;
            window.set_focus()?;
        }
    }

    Ok(())
}

pub(crate) fn handle_main_window_close_requested<R: Runtime>(
    window: &tauri::Window<R>,
    helper_state: &CommandHelperState,
) -> tauri::Result<bool> {
    if !should_hide_main_window_on_close(window.label(), helper_state)
        .map_err(tauri::Error::Anyhow)?
    {
        return Ok(false);
    }

    window.hide()?;
    helper_state
        .mark_main_window_hidden(true)
        .map_err(tauri::Error::Anyhow)?;
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

pub(crate) fn restore_main_window_from_helper<R: Runtime>(
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

pub(crate) fn quit_from_helper<R: Runtime>(
    app_handle: &tauri::AppHandle<R>,
    helper_state: &CommandHelperState,
) -> tauri::Result<()> {
    if let Err(error) = helper_state.mark_exiting() {
        log::warn!("failed to mark command helper exiting: {error}");
    }

    if let Some(window) = app_handle.get_webview_window(QUICK_CAPTURE_WINDOW_LABEL) {
        window.destroy()?;
    }

    app_handle.exit(0);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn helper_state_starts_initialized() {
        let state = CommandHelperState::new_initialized();
        let snapshot = state.snapshot().expect("snapshot should be available");

        assert!(snapshot.initialized);
        assert_eq!(snapshot.last_invoke_source, None);
        assert_eq!(snapshot.last_invoke_success, None);
        assert_eq!(snapshot.last_invoke_error, None);
        assert!(!snapshot.main_window_hidden);
        assert!(!snapshot.exiting);
    }

    #[test]
    fn helper_state_records_invoke_result() {
        let state = CommandHelperState::new_initialized();

        state
            .record_invoke(
                CommandHelperInvokeSource::MainApp,
                CommandHelperInvokeResult::Success,
            )
            .expect("invoke result should be recorded");

        let snapshot = state.snapshot().expect("snapshot should be available");
        assert_eq!(snapshot.last_invoke_source, Some("main_app"));
        assert_eq!(snapshot.last_invoke_success, Some(true));
        assert_eq!(snapshot.last_invoke_error, None);
    }

    #[test]
    fn helper_state_records_failed_future_shortcut_invoke_result() {
        let state = CommandHelperState::new_initialized();

        state
            .record_invoke(
                CommandHelperInvokeSource::FutureGlobalShortcut,
                CommandHelperInvokeResult::Failed("window failed".to_owned()),
            )
            .expect("invoke result should be recorded");

        let snapshot = state.snapshot().expect("snapshot should be available");
        assert_eq!(snapshot.last_invoke_source, Some("future_global_shortcut"));
        assert_eq!(snapshot.last_invoke_success, Some(false));
        assert_eq!(snapshot.last_invoke_error, Some("window failed".to_owned()));
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
    fn quick_capture_invoke_plan_reuses_existing_window() {
        assert_eq!(
            plan_quick_capture_invocation(false),
            QuickCaptureInvokePlan::CreateWindow
        );
        assert_eq!(
            plan_quick_capture_invocation(true),
            QuickCaptureInvokePlan::FocusExisting
        );
    }

    #[test]
    fn main_window_close_policy_hides_only_when_helper_is_active() {
        let state = CommandHelperState::new_initialized();

        assert!(
            should_hide_main_window_on_close(MAIN_WINDOW_LABEL, &state)
                .expect("policy should be available")
        );
        assert!(
            !should_hide_main_window_on_close(QUICK_CAPTURE_WINDOW_LABEL, &state)
                .expect("policy should be available")
        );

        state.mark_exiting().expect("exit state should be recorded");
        assert!(
            !should_hide_main_window_on_close(MAIN_WINDOW_LABEL, &state)
                .expect("policy should be available")
        );
    }
}
