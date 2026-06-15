//! Quick Create NSPanel 生命周期（macOS-only）。
//!
//! 遵循 tauri-nspanel 官方 `panel_builder` / `fullscreen` 示例组合：
//!   - Accessory App + NonActivatingPanel + can_become_key_window + is_floating_panel
//!   - 显示：只调 `show_and_make_key()`，**不调** `NSApp.activateIgnoringOtherApps`
//!     （activate 与 NonActivating 语义相抵，会互相抵消导致 key 状态不稳）。
//!   - 失焦隐藏：走 NSWindowDelegate 原生 `windowDidResignKey:` 通知，
//!     **不依赖** Tauri 的 `WindowEvent::Focused(false)`——
//!     NonActivating 面板不会让 owning app 激活，Tauri 的 focus 事件链不可靠。
//!   - 前端准备阶段：快捷键触发后先 emit `quick-create:session-prepared`，
//!     由前端在隐藏态完成首轮布局测量与 `commit_layout`，再由 Rust 执行真正的 show。
//!   - 前端呈现同步：`windowDidBecomeKey:` 回调里由运行时注入 `on_became_key`。
//!     此时 panel 已真正成为 key window，前端 `input.focus()` 才能命中；
//!     如果在 `show_and_make_key()` 返回后立刻 emit，key 状态可能还没 flush。
//!
//! 本模块整体仅在 macOS 编译：在 `lib.rs` 里已用
//! `#[cfg(target_os = "macos")] pub mod macos;` 门控，
//! 因此这里不再重复 `#![cfg(...)]`（clippy::duplicated_attributes）。

// `panel_event!` 宏要求的 `-> ()` 写法会被 clippy 误报 unused_unit。
// 宏调用前的 `#[allow]` 会被编译器忽略（只作用在宏上），必须走模块级 `#![allow]`。
// 本文件其余代码不存在手写的冗余 `-> ()`，抑制范围可控。
#![allow(clippy::unused_unit)]

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder, Wry};
use tauri_nspanel::{CollectionBehavior, ManagerExt, StyleMask, WebviewWindowExt};

use crate::quick_window::{
    spec::{
        QUICK_CREATE_LABEL, QUICK_CREATE_SCREEN_TOP_OFFSET_RATIO, QUICK_CREATE_SHORTCUT,
        QUICK_CREATE_TITLE, QUICK_CREATE_URL, QUICK_CREATE_WINDOW_HEIGHT,
        QUICK_CREATE_WINDOW_WIDTH,
    },
    QuickWindowCallbacks,
};

// 同时声明 NSPanel 子类 + NSWindowDelegate 子类：
//  - QuickCreatePanel：can_become_key_window + is_floating_panel。
//  - QuickCreatePanelEvents：监听 `windowDidBecomeKey:` / `windowDidResignKey:`，
//    驱动「前端 focus」与「失焦自动隐藏」两件事。
tauri_nspanel::tauri_panel! {
    panel!(QuickCreatePanel {
        config: {
            can_become_key_window: true,
            is_floating_panel: true
        }
    })

    panel_event!(QuickCreatePanelEvents {
        window_did_become_key(notification: &NSNotification) -> (),
        window_did_resign_key(notification: &NSNotification) -> ()
    })
}

/// 在 Tauri `setup()`（主线程）里预创建 WebviewWindow 并转换为 NSPanel。
///
/// 必须在主线程调用：AppKit 所有 ObjC 操作（`to_panel`、`set_collection_behavior`
/// 等）都需要主线程语义，否则 `CanJoinAllSpaces` 等 flag 不会生效。
pub fn init_quick_create_panel(app_handle: &AppHandle<Wry>, callbacks: QuickWindowCallbacks) {
    if app_handle.get_webview_panel(QUICK_CREATE_LABEL).is_ok() {
        return;
    }

    let window = match WebviewWindowBuilder::new(
        app_handle,
        QUICK_CREATE_LABEL,
        WebviewUrl::App(QUICK_CREATE_URL.into()),
    )
    .title(QUICK_CREATE_TITLE)
    .inner_size(QUICK_CREATE_WINDOW_WIDTH, QUICK_CREATE_WINDOW_HEIGHT)
    .resizable(false)
    .fullscreen(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .decorations(false)
    .shadow(false)
    .transparent(true)
    .visible(false)
    .build()
    {
        Ok(w) => w,
        Err(error) => {
            log::error!("platform: quick create 窗口创建失败: {error}");
            return;
        }
    };

    let panel = match window.to_panel::<QuickCreatePanel>() {
        Ok(p) => p,
        Err(error) => {
            log::error!("platform: quick create 转换 NSPanel 失败: {error}");
            return;
        }
    };

    // 层级、样式、集合行为三件套（缺一不可）。
    panel.set_level(101); // NSPopUpMenuWindowLevel
    panel.set_style_mask(StyleMask::empty().nonactivating_panel().into());
    set_panel_shadow(panel.as_ref(), false);
    panel.set_collection_behavior(
        CollectionBehavior::new()
            .move_to_active_space()
            .full_screen_auxiliary()
            .ignores_cycle()
            .into(),
    );

    // 装配 NSWindowDelegate：
    //  - becomeKey：panel 真正拿到 key window 状态，通知运行时处理 session-presented；
    //  - resignKey：panel 失去 key（点其它 App / 点桌面 / 点其它窗口），立刻隐藏。
    //
    // 注：tauri-nspanel 的 `set_event_handler` 会内部 `retain` 这个 handler
    // 并存进 panel 的 ivar（见 src/panel.rs 的实现），因此本地 `handler`
    // 绑定离开作用域后 ObjC delegate 仍然活着，无需额外 leak。
    let handler = QuickCreatePanelEvents::new();

    let app_for_became_key = app_handle.clone();
    let on_became_key = callbacks.on_became_key.clone();
    handler.window_did_become_key(move |_notification| {
        log::debug!("platform: windowDidBecomeKey → on_became_key");
        on_became_key(app_for_became_key.clone());
    });

    let app_for_resign_key = app_handle.clone();
    let on_resign_key = callbacks.on_resign_key.clone();
    handler.window_did_resign_key(move |_notification| {
        // 失去 key 就意味着用户已经在别处操作，直接隐藏面板。
        // 用 get_webview_panel 重新取引用，避免跨闭包搬运非 Send 类型。
        if let Ok(panel) = app_for_resign_key.get_webview_panel(QUICK_CREATE_LABEL) {
            log::debug!("platform: windowDidResignKey → hide panel");
            panel.hide();
        }
        on_resign_key(app_for_resign_key.clone());
    });

    panel.set_event_handler(Some(handler.as_ref()));

    log::info!("platform: quick create NSPanel 初始化完成");
}

/// Toggle 面板：可见则隐藏，否则只触发前端准备流程，等待 resize 完成后再真正显示。
///
/// 所有 AppKit 操作通过 `run_on_main_thread` 派发，符合线程安全要求。
/// 真正呈现面板：先定位到当前屏，再执行 show_and_make_key。
pub fn present_quick_create_panel(app_handle: &AppHandle<Wry>) -> Result<(), String> {
    let panel = app_handle
        .get_webview_panel(QUICK_CREATE_LABEL)
        .map_err(|error| format!("获取 quick create panel 失败: {error:?}"))?;

    app_handle
        .run_on_main_thread(move || {
            place_panel_on_active_screen(panel.as_ref(), "present");
            log::info!(
                "platform: Quick Create 弹窗已准备完毕，执行 show_and_make_key（快捷键={QUICK_CREATE_SHORTCUT}）"
            );
            panel.show_and_make_key();
        })
        .map_err(|error| format!("主线程显示 quick create panel 失败: {error}"))
}

pub fn is_quick_create_panel_visible(app_handle: &AppHandle<Wry>) -> Result<bool, String> {
    let panel = app_handle
        .get_webview_panel(QUICK_CREATE_LABEL)
        .map_err(|error| format!("获取 quick create panel 失败: {error:?}"))?;
    Ok(panel.is_visible())
}

pub fn hide_quick_create_panel(app_handle: &AppHandle<Wry>) -> Result<(), String> {
    let panel = app_handle
        .get_webview_panel(QUICK_CREATE_LABEL)
        .map_err(|error| format!("获取 quick create panel 失败: {error:?}"))?;
    app_handle
        .run_on_main_thread(move || {
            panel.hide();
        })
        .map_err(|error| format!("主线程隐藏 quick create panel 失败: {error}"))
}

pub fn prepare_hidden_quick_create_panel(app_handle: &AppHandle<Wry>) -> Result<(), String> {
    let panel = app_handle
        .get_webview_panel(QUICK_CREATE_LABEL)
        .map_err(|error| format!("获取 quick create panel 失败: {error:?}"))?;

    app_handle
        .run_on_main_thread(move || {
            panel.hide();
            place_panel_on_active_screen(panel.as_ref(), "prepare-hidden");
        })
        .map_err(|error| format!("主线程准备 hidden quick create panel 失败: {error}"))
}

/// macOS 下调整 Quick Create 高度时，保持窗口顶部边界不变。
pub fn resize_quick_create_panel_preserving_top(
    app_handle: &AppHandle<Wry>,
    target_window_height: f64,
) -> Result<(), String> {
    let panel = app_handle
        .get_webview_panel(QUICK_CREATE_LABEL)
        .map_err(|error| format!("获取 quick create panel 失败: {error:?}"))?;

    app_handle
        .run_on_main_thread(move || {
            let ns_panel = panel.as_panel();
            let current_frame: objc2_foundation::NSRect =
                unsafe { objc2::msg_send![ns_panel, frame] };
            let current_top = current_frame.origin.y + current_frame.size.height;
            let next_origin_y = current_top - target_window_height;
            let next_frame = objc2_foundation::NSRect::new(
                objc2_foundation::NSPoint::new(current_frame.origin.x, next_origin_y),
                objc2_foundation::NSSize::new(current_frame.size.width, target_window_height),
            );

            unsafe {
                let _: () = objc2::msg_send![ns_panel, setFrame: next_frame, display: false];
            }
        })
        .map_err(|error| format!("主线程调整 quick create frame 失败: {error}"))
}

fn set_panel_shadow(panel: &dyn tauri_nspanel::Panel, enabled: bool) {
    let ns_panel = panel.as_panel();
    unsafe {
        let _: () = objc2::msg_send![ns_panel, setHasShadow: enabled];
        let _: () = objc2::msg_send![ns_panel, invalidateShadow];
    }
}

/// 将面板居中到「用户当前正在操作」的屏幕（以鼠标所在屏为准）。
///
/// 不用 `NSScreen.mainScreen()` 的原因：Helper 虽然是 Accessory，但 Tauri 宿主
/// 启动的瞬间其 key window 仍指向进程创建时的初始屏幕；多屏切换后 `mainScreen`
/// 会退化为物理主屏，无法跟随用户视线。遍历所有 NSScreen 找鼠标命中屏才正确。
fn place_panel_on_active_screen(panel: &dyn tauri_nspanel::Panel, phase: &str) {
    // SAFETY: 仅在 run_on_main_thread 闭包内调用，已保证处于主线程。
    let mtm = unsafe { objc2::MainThreadMarker::new_unchecked() };

    let mouse_loc: objc2_foundation::NSPoint =
        unsafe { objc2::msg_send![objc2_app_kit::NSEvent::class(), mouseLocation] };

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
            log::warn!("platform: 未找到任何屏幕，跳过定位");
            return;
        }
    };

    let screen_frame: objc2_foundation::NSRect =
        unsafe { objc2::msg_send![&*screen, visibleFrame] };
    let ns_panel = panel.as_panel();
    let current_frame: objc2_foundation::NSRect = unsafe { objc2::msg_send![ns_panel, frame] };
    // present 阶段只负责定位，不再重置尺寸。
    // 尺寸真相源是前端 prepare 阶段完成的实测 resize；这里如果回写默认高度，
    // 首次打开会把刚算好的高度覆盖掉，直到后续交互再次触发 resize 才恢复。
    let panel_width = current_frame.size.width.max(QUICK_CREATE_WINDOW_WIDTH);
    let panel_height = current_frame.size.height;
    let x = screen_frame.origin.x + (screen_frame.size.width - panel_width) / 2.0;
    let top_offset = screen_frame.size.height * QUICK_CREATE_SCREEN_TOP_OFFSET_RATIO;
    let panel_top = screen_frame.origin.y + screen_frame.size.height - top_offset;
    let y = panel_top - panel_height;
    let next_frame = objc2_foundation::NSRect::new(
        objc2_foundation::NSPoint::new(x, y),
        objc2_foundation::NSSize::new(panel_width, panel_height),
    );

    unsafe {
        let _: () = objc2::msg_send![ns_panel, setFrame: next_frame, display: false];
    }

    log::info!(
        "platform: quick create panel 已定位 phase={} origin=({x:.0},{y:.0}) size=({:.0}×{:.0})",
        phase,
        panel_width,
        panel_height,
    );
    log::debug!(
        "platform: 鼠标在 ({:.0},{:.0}) → 屏幕 visible_frame=({:.0},{:.0},{:.0}×{:.0}) top_offset={:.0}",
        mouse_loc.x,
        mouse_loc.y,
        screen_frame.origin.x,
        screen_frame.origin.y,
        screen_frame.size.width,
        screen_frame.size.height,
        top_offset,
    );
}
