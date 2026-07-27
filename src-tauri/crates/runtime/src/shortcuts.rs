//! 全局快捷键：唤起 Launcher（单 Binary 路径）。
//!
//! 具体组合见 [`stoneflow_platform::launcher_window::spec::LAUNCHER_SHORTCUT`]
//! （macOS: Option+Space；Windows: Alt+Space；其它: Control+Shift+Space）。

use stoneflow_platform::launcher_window::spec::LAUNCHER_SHORTCUT;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::app::state::{ActiveScopeState, AppState};
use crate::window::launcher::{
    controller::build_quick_controller,
    runtime::{LauncherWindowCloseReason, LauncherWindowRuntimeState},
    session::prepare_launcher_session,
    warmup::{ensure_launcher_ready, LauncherWarmupState},
};

/// 注册全局快捷键；失败时只记录 warn，不阻塞应用启动。
pub fn register_global_shortcut(app_handle: &AppHandle<tauri::Wry>) {
    let handle = app_handle.clone();

    let result = app_handle.global_shortcut().on_shortcut(
        LAUNCHER_SHORTCUT,
        move |_app, _shortcut, event| {
            if event.state != ShortcutState::Pressed {
                return;
            }

            log::info!("runtime: 快捷键触发 -> {LAUNCHER_SHORTCUT}");
            let app_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                handle_toggle(app_handle).await;
            });
        },
    );

    match result {
        Ok(()) => log::info!("runtime: 全局快捷键 {LAUNCHER_SHORTCUT} 注册成功"),
        Err(error) => log::warn!("runtime: 全局快捷键 {LAUNCHER_SHORTCUT} 注册失败: {error}"),
    }
}

async fn handle_toggle(app_handle: AppHandle<tauri::Wry>) {
    let Some(warmup) = app_handle.try_state::<LauncherWarmupState>() else {
        log::error!("runtime: launcher warmup state 未注册");
        return;
    };
    let Some(runtime) = app_handle.try_state::<LauncherWindowRuntimeState>() else {
        log::error!("runtime: quick popup runtime 未注册");
        return;
    };
    let Some(app_state) = app_handle.try_state::<AppState>() else {
        log::error!("runtime: AppState 未注册");
        return;
    };
    let Some(active_scope) = app_handle.try_state::<ActiveScopeState>() else {
        log::error!("runtime: active scope state 未注册");
        return;
    };

    if let Err(error) = ensure_launcher_ready(app_handle.clone(), warmup.inner().clone()).await {
        log::warn!("runtime: launcher 未就绪: {error}");
        return;
    }

    let controller = build_quick_controller(app_handle.clone());
    let visible = match controller.is_visible() {
        Ok(visible) => visible,
        Err(error) => {
            log::warn!("runtime: 读取 launcher 可见状态失败: {error}");
            false
        }
    };

    if visible {
        let Some(session_id) = runtime.inner().active_session_id().await else {
            return;
        };

        match runtime
            .inner()
            .begin_close_for(&session_id, LauncherWindowCloseReason::Toggle)
            .await
        {
            Ok(Some(session)) => {
                if let Err(error) = controller.hide() {
                    log::warn!("runtime: 隐藏 launcher 失败: {error}");
                    runtime.inner().mark_error().await;
                    return;
                }
                let _ = runtime.inner().finish_close_for(&session.session_id).await;
            }
            Ok(None) => {}
            Err(error) => log::warn!("runtime: 当前阶段不能关闭 launcher: {error}"),
        }
        return;
    }

    match prepare_launcher_session(
        app_handle.clone(),
        runtime.inner(),
        app_state.inner(),
        active_scope.inner(),
    )
    .await
    {
        Ok(response) => {
            log::info!("runtime: 打开 launcher session={}", response.session_id);
        }
        Err(error) => {
            log::warn!("runtime: launcher prepare session 失败: {}", error.message);
        }
    }
}
