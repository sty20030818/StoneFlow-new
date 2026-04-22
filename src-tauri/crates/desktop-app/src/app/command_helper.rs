//! Command Helper 生命周期协调层。
//!
//! M4-C 第一版 Helper 仍运行在当前 Tauri 进程内，只负责窗口唤起与生命周期，
//! 不复制 Quick Capture 的任务创建业务逻辑。

use std::sync::Mutex;

use tauri::{Emitter, Manager, Runtime, WebviewUrl, WebviewWindowBuilder};

// macOS：tauri-nspanel 将 Quick Capture 升级为 NSPanel 以支持全屏/多屏可见与 toggle。
//
// ⚠️  Panel 的所有 ObjC 操作（set_collection_behavior、show_and_make_key 等）
//     都必须在 macOS 主线程上执行，否则行为未定义（多屏不可见、collection behavior 失效）。
//     因此 NSPanel 在 setup() 时预初始化（主线程），
//     快捷键回调时通过 run_on_main_thread 执行 toggle。
#[cfg(target_os = "macos")]
use tauri_nspanel::{CollectionBehavior, ManagerExt, StyleMask, WebviewWindowExt};

// objc2 / objc2-app-kit / objc2-foundation：用于在显示面板前定位到当前活跃屏幕的中心。
// 注意：tauri_panel! 宏内部也导入了 MainThreadMarker、NSPoint 等符号，
// 因此本模块不使用 `use` 导入这些类型，改在函数体内通过全限定路径引用，避免命名冲突。

// 定义 Quick Capture NSPanel 的 Objective-C 子类：
//   can_become_key_window = true → 允许接收键盘输入（输入框必须）
//   is_floating_panel     = true → 浮动面板，非激活态不褪色
#[cfg(target_os = "macos")]
tauri_nspanel::tauri_panel! {
    panel!(QuickCapturePanel {
        config: {
            can_become_key_window: true,
            is_floating_panel: true
        }
    })
}

use crate::app::{MAIN_WINDOW_LABEL, QUICK_CAPTURE_WINDOW_LABEL, QUICK_CAPTURE_WINDOW_SPEC};

/// Helper 唤起来源。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum CommandHelperInvokeSource {
    MainApp,
    /// M4-D 全局快捷键唤起来源。
    GlobalShortcut,
}

impl CommandHelperInvokeSource {
    fn as_str(self) -> &'static str {
        match self {
            Self::MainApp => "main_app",
            Self::GlobalShortcut => "global_shortcut",
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

/// Quick Capture 唤起规划（非 macOS 平台使用 WebviewWindowBuilder，macOS 使用 NSPanel toggle）。
#[cfg(not(target_os = "macos"))]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum QuickCaptureInvokePlan {
    CreateWindow,
    FocusExisting,
}

#[cfg(not(target_os = "macos"))]
pub(crate) fn plan_quick_capture_invocation(window_exists: bool) -> QuickCaptureInvokePlan {
    if window_exists {
        QuickCaptureInvokePlan::FocusExisting
    } else {
        QuickCaptureInvokePlan::CreateWindow
    }
}

/// 记录 Helper 调用结果到运行时快照，供诊断与测试使用。
fn record_helper_invoke(
    helper_state: &CommandHelperState,
    source: CommandHelperInvokeSource,
    result: &tauri::Result<()>,
) {
    let tracked_result = match result {
        Ok(()) => CommandHelperInvokeResult::Success,
        Err(error) => CommandHelperInvokeResult::Failed(error.to_string()),
    };
    if let Err(error) = helper_state.record_invoke(source, tracked_result) {
        log::warn!("failed to record command helper invocation: {error}");
    }
}

// macOS：tauri-nspanel 的 PanelBuilder 仅支持具体的 Wry runtime，
// 因此 macOS 版本使用具体类型 AppHandle<tauri::Wry>（= AppHandle，默认泛型）。
#[cfg(target_os = "macos")]
pub(crate) fn open_quick_capture_from_helper(
    app_handle: &tauri::AppHandle<tauri::Wry>,
    helper_state: &CommandHelperState,
    source: CommandHelperInvokeSource,
) -> tauri::Result<()> {
    let result = open_quick_capture_window(app_handle);
    record_helper_invoke(helper_state, source, &result);
    result
}

// 非 macOS：保持泛型签名，兼容所有 Tauri runtime。
#[cfg(not(target_os = "macos"))]
pub(crate) fn open_quick_capture_from_helper<R: Runtime>(
    app_handle: &tauri::AppHandle<R>,
    helper_state: &CommandHelperState,
    source: CommandHelperInvokeSource,
) -> tauri::Result<()> {
    let result = open_quick_capture_window(app_handle);
    record_helper_invoke(helper_state, source, &result);
    result
}

/// macOS：在 app setup 时（主线程）预创建 Quick Capture 窗口并转换为 NSPanel。
///
/// 必须在主线程调用：所有 AppKit / ObjC 操作（to_panel、set_collection_behavior 等）
/// 都需要在主线程执行，否则多屏/全屏可见性等 collection behavior 将失效。
///
/// 调用位置：`mod.rs` 的 `.setup()` 回调（Tauri 保证 setup 在主线程运行）。
#[cfg(target_os = "macos")]
pub(crate) fn init_quick_capture_panel(app_handle: &tauri::AppHandle<tauri::Wry>) {
    // 避免重复初始化（热重载场景）
    if app_handle
        .get_webview_panel(QUICK_CAPTURE_WINDOW_SPEC.label)
        .is_ok()
    {
        return;
    }

    // 创建 WebviewWindow（初始隐藏，等待快捷键唤起）
    let window = match WebviewWindowBuilder::new(
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
    .decorations(false)
    // 窗口本身透明：由前端卡片的圆角/阴影/边框承担外观，
    // 面板周围不再显示 body 背景色形成的"灰白一圈"。
    // 注意：Tauri 的 transparent 需在 Cargo feature 中启用 `macos-private-api`（已在 tauri.conf.json 的 "macOSPrivateApi": true 开启）。
    .transparent(true)
    .center()
    .visible(false)
    .build()
    {
        Ok(w) => w,
        Err(error) => {
            log::error!("quick capture 窗口创建失败: {error}");
            return;
        }
    };

    // 在主线程将 NSWindow 转换为 NSPanel，并注册到 WebviewPanelManager
    let panel = match window.to_panel::<QuickCapturePanel>() {
        Ok(p) => p,
        Err(error) => {
            log::error!("quick capture 转换 NSPanel 失败: {error}");
            return;
        }
    };

    // 配置 window level、style mask 与 collection behavior
    // （必须在主线程且在首次 show 之前设置）：
    //
    // 1. Level = 101（NSPopUpMenuWindowLevel）：
    //    与 Raycast / Alfred 等全局启动器相同的层级策略，
    //    高于 Menu Bar (24)、Dock (20) 与所有全屏 App 的内容层。
    //
    // 2. StyleMask = NonActivatingPanel（⚠️ 全屏可见的关键）：
    //    NSPanel 默认显示时会激活所属 App，这会把系统切回 App 自己的 Space，
    //    导致挤掉用户的全屏 Space / panel 无法出现在全屏 App 之上。
    //    NonActivating 让 panel 以"不激活 App"的方式显示，系统允许其浮在
    //    当前 Space（包括别人的全屏 Space）之上。
    //    这是官方 fullscreen 示例的关键步骤，之前被遗漏。
    //
    // 3. CollectionBehavior（三 flag 缺一不可）：
    //    CanJoinAllSpaces    → 跟随所有 Space（多屏、多桌面切换均可见）
    //    FullScreenAuxiliary → ⚠️ 全屏 Space 可见的必备 flag。
    //                          声明此窗口是"辅助面板"，系统允许其与别的 App 的全屏窗口
    //                          共存于同一 Space。缺少此 flag 时，即便 level 再高，
    //                          进入全屏 Space 后 panel 依然不可见。
    //    IgnoresCycle        → Cmd+Tab 不切换到此面板
    panel.set_level(101); // NSPopUpMenuWindowLevel

    panel.set_style_mask(StyleMask::empty().nonactivating_panel().into());

    panel.set_collection_behavior(
        CollectionBehavior::new()
            .can_join_all_spaces()
            .full_screen_auxiliary()
            .ignores_cycle()
            .into(),
    );

    log::info!(
        "quick capture NSPanel 初始化完成 [level=101/PopUpMenu, style=NonActivating, collection=CanJoinAllSpaces+FullScreenAuxiliary+IgnoresCycle]"
    );
}

/// macOS：toggle Quick Capture 面板的可见状态。
///
/// 面板已在 setup 时初始化，此处只负责 show/hide toggle。
/// 所有 panel ObjC 操作通过 run_on_main_thread 派发，符合 AppKit 线程安全要求。
#[cfg(target_os = "macos")]
fn open_quick_capture_window(app_handle: &tauri::AppHandle<tauri::Wry>) -> tauri::Result<()> {
    let panel = match app_handle.get_webview_panel(QUICK_CAPTURE_WINDOW_SPEC.label) {
        Ok(p) => p,
        Err(_) => {
            log::error!(
                "[QC] Option+Space 触发，但 panel 未初始化（init_quick_capture_panel 未被调用？）"
            );
            return Err(tauri::Error::Anyhow(anyhow::anyhow!(
                "quick capture panel 未初始化"
            )));
        }
    };

    let app_clone = app_handle.clone();

    // 派发到主线程：AppKit 操作必须在主线程执行
    app_handle.run_on_main_thread(move || {
        let visible = panel.is_visible();
        log::info!("[QC] Option+Space 触发 → panel.is_visible()={visible}");

        if visible {
            log::info!("[QC] 隐藏面板");
            panel.hide();
        } else {
            // 定位到用户当前操作的屏幕
            center_panel_on_main_screen(panel.as_ref());

            log::info!("[QC] 显示面板（orderFrontRegardless，不抢 key window）");
            // 只调 show（= orderFrontRegardless）：仅显示 panel，不尝试成为 key window。
            //
            // 放弃抢键盘焦点的原因：
            //   我们是普通 app（非 Accessory），当前台是别人时，系统不允许
            //   NSPanel 稳定成为 key window，即使强行激活 App 也会带来 Space 切换等副作用。
            //   综合体验考虑，本版 Quick Capture 采用"点外面关闭 / Option+Space 切换"
            //   两种明确入口，不再依赖键盘焦点的 Esc 与自动 input focus。
            //   用户可点击 input 手动聚焦并输入。
            panel.show();

            // 仍发送事件让前端重置状态（清空上次输入、恢复"写入 Inbox"提示语）。
            // 注意：focusInput 在当前模式下大概率失败，但保留无害。
            if let Some(window) = app_clone.get_webview_window(QUICK_CAPTURE_WINDOW_SPEC.label) {
                if let Err(error) = window.emit("quick-capture:shown", ()) {
                    log::warn!("[QC] 显示事件发送失败: {error}");
                }
            }
        }
    })?;

    Ok(())
}

/// 将面板居中到当前拥有键盘焦点的屏幕（NSScreen.mainScreen）。
///
/// macOS 的 NSScreen.mainScreen 返回当前接收键盘事件的窗口所在屏幕，
/// 即用户正在操作的那块屏幕。在显示面板之前调用此函数，
/// 确保面板出现在用户视野内，而不是停留在初始化时的主屏幕位置。
/// 将面板居中到"用户当前正在操作"的屏幕。
///
/// ⚠️ 不使用 `NSScreen.mainScreen()`：
///   mainScreen 返回的是当前 key window 所在屏幕。由于本 app 通常不是 key
///   （用户在操作其它 App 或全屏 App），mainScreen 会退化为物理主屏，
///   导致多屏场景下面板永远出现在主屏，用户在别的屏上看不到。
///
/// 正确做法：遍历所有 NSScreen，找到包含当前鼠标位置的那块屏。
#[cfg(target_os = "macos")]
fn center_panel_on_main_screen(panel: &dyn tauri_nspanel::Panel) {
    // SAFETY: 此函数只在 run_on_main_thread 内部调用，已保证处于主线程。
    let mtm = unsafe { objc2::MainThreadMarker::new_unchecked() };

    // NSEvent.mouseLocation 返回全局坐标系下的鼠标位置（左下角原点）
    let mouse_loc: objc2_foundation::NSPoint =
        unsafe { objc2::msg_send![objc2_app_kit::NSEvent::class(), mouseLocation] };

    // 遍历所有屏幕，找鼠标命中的那一块；找不到则退回 mainScreen 作为兜底
    let screens = objc2_app_kit::NSScreen::screens(mtm);
    let mut target_screen: Option<objc2::rc::Retained<objc2_app_kit::NSScreen>> = None;
    let count = screens.count();
    for i in 0..count {
        let screen = screens.objectAtIndex(i);
        let frame: objc2_foundation::NSRect = unsafe { objc2::msg_send![&*screen, frame] };
        let in_x = mouse_loc.x >= frame.origin.x && mouse_loc.x < frame.origin.x + frame.size.width;
        let in_y =
            mouse_loc.y >= frame.origin.y && mouse_loc.y < frame.origin.y + frame.size.height;
        if in_x && in_y {
            target_screen = Some(screen);
            break;
        }
    }

    let screen = match target_screen.or_else(|| objc2_app_kit::NSScreen::mainScreen(mtm)) {
        Some(s) => s,
        None => {
            log::warn!("[QC] 未找到任何屏幕，跳过定位");
            return;
        }
    };

    // visibleFrame 排除 Dock 和 Menu Bar，使面板居中于可见区域
    let screen_frame: objc2_foundation::NSRect =
        unsafe { objc2::msg_send![&*screen, visibleFrame] };

    let ns_panel = panel.as_panel();
    let panel_w = QUICK_CAPTURE_WINDOW_SPEC.width;
    let panel_h = QUICK_CAPTURE_WINDOW_SPEC.height;

    // macOS 坐标系：左下角原点，y 轴向上
    let x = screen_frame.origin.x + (screen_frame.size.width - panel_w) / 2.0;
    let y = screen_frame.origin.y + (screen_frame.size.height - panel_h) / 2.0;

    unsafe {
        let _: () =
            objc2::msg_send![ns_panel, setFrameOrigin: objc2_foundation::NSPoint::new(x, y)];
    }

    log::info!(
        "[QC] 鼠标在 ({:.0},{:.0}) → 定位到屏 visible_frame=({:.0},{:.0},{:.0}×{:.0}) → panel origin=({x:.0},{y:.0})",
        mouse_loc.x,
        mouse_loc.y,
        screen_frame.origin.x,
        screen_frame.origin.y,
        screen_frame.size.width,
        screen_frame.size.height,
    );
}

/// 非 macOS：保留原有的 WebviewWindowBuilder 逻辑（create or focus）。
#[cfg(not(target_os = "macos"))]
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
            let window = WebviewWindowBuilder::new(
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
            .decorations(false)
            .center()
            .build()?;
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
    fn helper_state_records_failed_global_shortcut_invoke_result() {
        let state = CommandHelperState::new_initialized();

        state
            .record_invoke(
                CommandHelperInvokeSource::GlobalShortcut,
                CommandHelperInvokeResult::Failed("window failed".to_owned()),
            )
            .expect("invoke result should be recorded");

        let snapshot = state.snapshot().expect("snapshot should be available");
        assert_eq!(snapshot.last_invoke_source, Some("global_shortcut"));
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

    // 非 macOS 平台使用 plan_quick_capture_invocation，macOS 改用 NSPanel toggle。
    #[cfg(not(target_os = "macos"))]
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
    fn helper_state_records_global_shortcut_success() {
        let state = CommandHelperState::new_initialized();

        state
            .record_invoke(
                CommandHelperInvokeSource::GlobalShortcut,
                CommandHelperInvokeResult::Success,
            )
            .expect("invoke result should be recorded");

        let snapshot = state.snapshot().expect("snapshot should be available");
        assert_eq!(snapshot.last_invoke_source, Some("global_shortcut"));
        assert_eq!(snapshot.last_invoke_success, Some(true));
        assert_eq!(snapshot.last_invoke_error, None);
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
}
