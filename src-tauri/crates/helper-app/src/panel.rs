//! Quick Capture NSPanel 生命周期（macOS-only）。
//!
//! 遵循 tauri-nspanel 官方 `panel_builder` / `fullscreen` 示例组合：
//!   - Accessory App + NonActivatingPanel + can_become_key_window + is_floating_panel
//!   - 显示：只调 `show_and_make_key()`，**不调** `NSApp.activateIgnoringOtherApps`
//!     （activate 与 NonActivating 语义相抵，会互相抵消导致 key 状态不稳）。
//!   - 失焦隐藏：走 NSWindowDelegate 原生 `windowDidResignKey:` 通知，
//!     **不依赖** Tauri 的 `WindowEvent::Focused(false)`——
//!     NonActivating 面板不会让 owning app 激活，Tauri 的 focus 事件链不可靠。
//!   - 前端 focus 同步：`windowDidBecomeKey:` 回调里才 emit `quick-capture:shown`。
//!     此时 panel 已真正成为 key window，前端 `input.focus()` 才能命中；
//!     如果在 `show_and_make_key()` 返回后立刻 emit，key 状态可能还没 flush。
//!
//! 本模块整体仅在 macOS 编译：在 `lib.rs` 里已用
//! `#[cfg(target_os = "macos")] pub mod panel;` 门控，
//! 因此这里不再重复 `#![cfg(...)]`（clippy::duplicated_attributes）。

// `panel_event!` 宏要求的 `-> ()` 写法会被 clippy 误报 unused_unit。
// 宏调用前的 `#[allow]` 会被编译器忽略（只作用在宏上），必须走模块级 `#![allow]`。
// 本文件其余代码不存在手写的冗余 `-> ()`，抑制范围可控。
#![allow(clippy::unused_unit)]

use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, Wry};
use tauri_nspanel::{CollectionBehavior, ManagerExt, StyleMask, WebviewWindowExt};

use crate::window_spec::{QUICK_CAPTURE_LABEL, QUICK_CAPTURE_TITLE, QUICK_CAPTURE_URL};
use crate::window_spec::{QUICK_CAPTURE_WINDOW_HEIGHT, QUICK_CAPTURE_WINDOW_WIDTH};

// 同时声明 NSPanel 子类 + NSWindowDelegate 子类：
//  - QuickCapturePanel：can_become_key_window + is_floating_panel。
//  - QuickCapturePanelEvents：监听 `windowDidBecomeKey:` / `windowDidResignKey:`，
//    驱动「前端 focus」与「失焦自动隐藏」两件事。
tauri_nspanel::tauri_panel! {
    panel!(QuickCapturePanel {
        config: {
            can_become_key_window: true,
            is_floating_panel: true
        }
    })

    panel_event!(QuickCapturePanelEvents {
        window_did_become_key(notification: &NSNotification) -> (),
        window_did_resign_key(notification: &NSNotification) -> ()
    })
}

/// 在 Tauri `setup()`（主线程）里预创建 WebviewWindow 并转换为 NSPanel。
///
/// 必须在主线程调用：AppKit 所有 ObjC 操作（`to_panel`、`set_collection_behavior`
/// 等）都需要主线程语义，否则 `CanJoinAllSpaces` 等 flag 不会生效。
pub fn init_quick_capture_panel(app_handle: &AppHandle<Wry>) {
    if app_handle.get_webview_panel(QUICK_CAPTURE_LABEL).is_ok() {
        return;
    }

    let window = match WebviewWindowBuilder::new(
        app_handle,
        QUICK_CAPTURE_LABEL,
        WebviewUrl::App(QUICK_CAPTURE_URL.into()),
    )
    .title(QUICK_CAPTURE_TITLE)
    .inner_size(QUICK_CAPTURE_WINDOW_WIDTH, QUICK_CAPTURE_WINDOW_HEIGHT)
    .min_inner_size(QUICK_CAPTURE_WINDOW_WIDTH, QUICK_CAPTURE_WINDOW_HEIGHT)
    .max_inner_size(QUICK_CAPTURE_WINDOW_WIDTH, QUICK_CAPTURE_WINDOW_HEIGHT)
    .resizable(false)
    .fullscreen(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .decorations(false)
    .shadow(false)
    .transparent(true)
    .center()
    .visible(false)
    .build()
    {
        Ok(w) => w,
        Err(error) => {
            log::error!("helper: quick capture 窗口创建失败: {error}");
            return;
        }
    };

    let panel = match window.to_panel::<QuickCapturePanel>() {
        Ok(p) => p,
        Err(error) => {
            log::error!("helper: quick capture 转换 NSPanel 失败: {error}");
            return;
        }
    };

    // 层级、样式、集合行为三件套（缺一不可）。
    panel.set_level(101); // NSPopUpMenuWindowLevel
    panel.set_style_mask(StyleMask::empty().nonactivating_panel().into());
    panel.set_collection_behavior(
        CollectionBehavior::new()
            .can_join_all_spaces()
            .full_screen_auxiliary()
            .ignores_cycle()
            .into(),
    );

    // 装配 NSWindowDelegate：
    //  - becomeKey：panel 真正拿到 key window 状态，通知前端重置输入并 focus；
    //  - resignKey：panel 失去 key（点其它 App / 点桌面 / 点其它窗口），立刻隐藏。
    //
    // 注：tauri-nspanel 的 `set_event_handler` 会内部 `retain` 这个 handler
    // 并存进 panel 的 ivar（见 src/panel.rs 的实现），因此本地 `handler`
    // 绑定离开作用域后 ObjC delegate 仍然活着，无需额外 leak。
    let handler = QuickCapturePanelEvents::new();

    let app_for_show = app_handle.clone();
    handler.window_did_become_key(move |_notification| {
        log::info!("helper: windowDidBecomeKey → emit quick-capture:shown");
        if let Some(window) = app_for_show.get_webview_window(QUICK_CAPTURE_LABEL) {
            if let Err(error) = window.emit("quick-capture:shown", ()) {
                log::warn!("helper: quick-capture:shown 事件发送失败: {error}");
            }
        }
    });

    let app_for_hide = app_handle.clone();
    handler.window_did_resign_key(move |_notification| {
        // 失去 key 就意味着用户已经在别处操作，直接隐藏面板。
        // 用 get_webview_panel 重新取引用，避免跨闭包搬运非 Send 类型。
        if let Ok(panel) = app_for_hide.get_webview_panel(QUICK_CAPTURE_LABEL) {
            log::info!("helper: windowDidResignKey → hide panel");
            panel.hide();
        }
    });

    panel.set_event_handler(Some(handler.as_ref()));

    log::info!(
        "helper: quick capture NSPanel 初始化完成 \
         [level=101/PopUpMenu, style=NonActivating, collection=CanJoinAllSpaces+FullScreenAuxiliary+IgnoresCycle, delegate=QuickCapturePanelEvents]"
    );
}

/// Toggle 面板：可见则隐藏，否则定位到当前屏并 `orderFrontRegardless`。
///
/// 所有 AppKit 操作通过 `run_on_main_thread` 派发，符合线程安全要求。
pub fn toggle_quick_capture_panel(app_handle: &AppHandle<Wry>) {
    let panel = match app_handle.get_webview_panel(QUICK_CAPTURE_LABEL) {
        Ok(p) => p,
        Err(_) => {
            log::error!("helper: Option+Space 触发，但 panel 未初始化");
            return;
        }
    };

    let dispatch_result = app_handle.run_on_main_thread(move || {
        let visible = panel.is_visible();
        log::info!("helper: Option+Space 触发 → panel.is_visible()={visible}");

        if visible {
            // 直接 hide 即可——panel 的 resignKey delegate 回调还会再兜底一次，幂等。
            log::info!("helper: 隐藏面板");
            panel.hide();
        } else {
            center_panel_on_active_screen(panel.as_ref());

            // 关键：Accessory + NonActivating + show_and_make_key 三件套，
            // NSPanel 直接成为 key window 接收键盘，不需要（也不应该）
            // 再调 `NSApp.activateIgnoringOtherApps` —— 它与 NonActivating 语义
            // 相抵，会互相抵消导致 becomeKey 不稳定、输入框拿不到焦点。
            //
            // 对齐 tauri-nspanel 官方 panel_builder / fullscreen 示例的用法。
            log::info!("helper: show_and_make_key（进入 key window 状态）");
            panel.show_and_make_key();

            // 此处不 emit `quick-capture:shown`：前端 focus 时机改由
            // `windowDidBecomeKey:` delegate 回调触发，避免 key 状态未 flush
            // 时前端先 focus 的时序竞争。
        }
    });

    if let Err(error) = dispatch_result {
        log::warn!("helper: 主线程派发失败: {error}");
    }
}

/// 将面板居中到「用户当前正在操作」的屏幕（以鼠标所在屏为准）。
///
/// 不用 `NSScreen.mainScreen()` 的原因：Helper 虽然是 Accessory，但 Tauri 宿主
/// 启动的瞬间其 key window 仍指向进程创建时的初始屏幕；多屏切换后 `mainScreen`
/// 会退化为物理主屏，无法跟随用户视线。遍历所有 NSScreen 找鼠标命中屏才正确。
fn center_panel_on_active_screen(panel: &dyn tauri_nspanel::Panel) {
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
            log::warn!("helper: 未找到任何屏幕，跳过定位");
            return;
        }
    };

    let screen_frame: objc2_foundation::NSRect =
        unsafe { objc2::msg_send![&*screen, visibleFrame] };
    let ns_panel = panel.as_panel();

    let x = screen_frame.origin.x + (screen_frame.size.width - QUICK_CAPTURE_WINDOW_WIDTH) / 2.0;
    let y = screen_frame.origin.y + (screen_frame.size.height - QUICK_CAPTURE_WINDOW_HEIGHT) / 2.0;

    unsafe {
        let _: () =
            objc2::msg_send![ns_panel, setFrameOrigin: objc2_foundation::NSPoint::new(x, y)];
    }

    log::info!(
        "helper: 鼠标在 ({:.0},{:.0}) → 定位到屏 visible_frame=({:.0},{:.0},{:.0}×{:.0}) → panel origin=({x:.0},{y:.0})",
        mouse_loc.x,
        mouse_loc.y,
        screen_frame.origin.x,
        screen_frame.origin.y,
        screen_frame.size.width,
        screen_frame.size.height,
    );
}
