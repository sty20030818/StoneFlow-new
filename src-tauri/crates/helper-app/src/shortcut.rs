//! 全局快捷键注册：Option+Space 触发 Quick Create 面板 toggle。

use tauri::{AppHandle, Manager};
use tauri::Emitter;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::runtime::{QuickPopupOpenReason, QuickPopupRuntimeState};
use crate::window_controller;
use crate::window_spec::QUICK_CREATE_SHORTCUT;

/// 注册全局快捷键，失败时只记录 warn，不阻塞 Helper 启动。
///
/// macOS 上 Helper 以 Accessory 启动，无需用户"聚焦到 App"即可捕获全局按键。
pub fn register_global_shortcut(app_handle: &AppHandle<tauri::Wry>) {
    let handle = app_handle.clone();

    let result = app_handle.global_shortcut().on_shortcut(
        QUICK_CREATE_SHORTCUT,
        move |_app, _shortcut, event| {
            // 只响应 key-down，避免 key-up 重复唤起。
            if event.state != ShortcutState::Pressed {
                return;
            }

            log::debug!("helper: 快捷键触发 -> {QUICK_CREATE_SHORTCUT}");

            let app_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                handle_toggle(app_handle).await;
            });
        },
    );

    match result {
        Ok(()) => {
            log::info!("helper: 全局快捷键 {QUICK_CREATE_SHORTCUT} 注册成功")
        }
        Err(error) => log::warn!("helper: 全局快捷键 {QUICK_CREATE_SHORTCUT} 注册失败: {error}"),
    }
}

async fn handle_toggle(app_handle: AppHandle<tauri::Wry>) {
    let Some(runtime) = app_handle.try_state::<QuickPopupRuntimeState>() else {
        log::error!("helper: quick popup runtime 未注册");
        return;
    };

    let controller = window_controller::build_controller(app_handle.clone());
    let visible = match controller.is_visible() {
        Ok(visible) => visible,
        Err(error) => {
            log::warn!("helper: 读取 quick create 可见状态失败: {error}");
            false
        }
    };

    if visible {
        match runtime.begin_close().await {
            Ok(Some(session)) => {
                log::info!("helper: 关闭 quick create session={}", session.session_id);
                if let Err(error) = controller.hide() {
                    log::warn!("helper: 隐藏 quick create 失败: {error}");
                    runtime.mark_error().await;
                    return;
                }
                runtime.finish_close().await;
            }
            Ok(None) => {
                log::debug!("helper: quick create 已经是 idle，忽略关闭");
            }
            Err(error) => {
                log::warn!("helper: 当前阶段不能关闭 quick create: {error}");
            }
        }
        return;
    }

    if !runtime.is_frontend_ready().await {
        log::warn!("helper: quick create 前端未 ready，拒绝本次打开");
        runtime.mark_error().await;
        runtime.reset_to_idle().await;
        return;
    }

    let session = match runtime.begin_open(QuickPopupOpenReason::GlobalShortcut).await {
        Ok(session) => session,
        Err(error) => {
            log::warn!("helper: 当前阶段不能打开 quick create: {error}");
            return;
        }
    };

    if let Err(error) = controller.prepare_hidden() {
        log::warn!("helper: quick create prepare hidden 失败: {error}");
        runtime.mark_error().await;
        runtime.reset_to_idle().await;
        return;
    }

    if let Err(error) = runtime.mark_waiting_layout().await {
        log::warn!("helper: quick create 进入 waiting_layout 失败: {error}");
        runtime.mark_error().await;
        runtime.reset_to_idle().await;
        return;
    }

    log::info!("helper: 打开 quick create session={}", session.session_id);
    let Some(window) = app_handle.get_webview_window(crate::window_spec::QUICK_CREATE_LABEL) else {
        log::error!("helper: quick create window 未初始化");
        runtime.mark_error().await;
        runtime.reset_to_idle().await;
        return;
    };
    if let Err(error) = window.emit("quick-create:prepare", ()) {
        log::warn!("helper: quick-create:prepare 事件发送失败: {error}");
        runtime.mark_error().await;
        runtime.reset_to_idle().await;
    }
}
