//! 全局快捷键：Option+Space 触发 Quick Create（单 Binary 路径）。

use stoneflow_platform::quick_window::spec::QUICK_CREATE_SHORTCUT;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::app::state::ActiveScopeState;
use crate::window::quick_create::{
    callbacks::runtime_quick_window_callbacks,
    controller::build_quick_controller,
    frontend::QuickCreateFrontendState,
    runtime::{QuickPopupCloseReason, QuickPopupRuntimeState},
    session::prepare_quick_create_session,
};
use stoneflow_storage::database::DatabaseRuntimeState;

/// 注册全局快捷键；失败时只记录 warn，不阻塞应用启动。
pub fn register_global_shortcut(app_handle: &AppHandle<tauri::Wry>) {
    let handle = app_handle.clone();

    let result = app_handle.global_shortcut().on_shortcut(
        QUICK_CREATE_SHORTCUT,
        move |_app, _shortcut, event| {
            if event.state != ShortcutState::Pressed {
                return;
            }

            log::debug!("runtime: 快捷键触发 -> {QUICK_CREATE_SHORTCUT}");
            let app_handle = handle.clone();
            tauri::async_runtime::spawn(async move {
                handle_toggle(app_handle).await;
            });
        },
    );

    match result {
        Ok(()) => log::info!("runtime: 全局快捷键 {QUICK_CREATE_SHORTCUT} 注册成功"),
        Err(error) => log::warn!("runtime: 全局快捷键 {QUICK_CREATE_SHORTCUT} 注册失败: {error}"),
    }
}

fn ensure_quick_create_panel(app_handle: &AppHandle<tauri::Wry>) {
    if !should_initialize_quick_create_panel(
        app_handle
            .get_webview_window(stoneflow_platform::quick_window::spec::QUICK_CREATE_LABEL)
            .is_some(),
    ) {
        return;
    }

    let callbacks = runtime_quick_window_callbacks();

    #[cfg(target_os = "macos")]
    {
        let app_handle = app_handle.clone();
        if let Err(error) = app_handle.clone().run_on_main_thread(move || {
            stoneflow_platform::macos::panel::init_quick_create_panel(&app_handle, callbacks);
        }) {
            log::error!("runtime: quick create panel 主线程初始化失败: {error}");
        }
    }

    #[cfg(target_os = "windows")]
    stoneflow_platform::windows::panel::init_quick_create_panel(app_handle, callbacks);

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = (app_handle, callbacks);
        log::warn!("runtime: 当前平台尚未实现 Quick Create 浮窗");
    }
}

fn should_initialize_quick_create_panel(panel_exists: bool) -> bool {
    !panel_exists
}

async fn handle_toggle(app_handle: AppHandle<tauri::Wry>) {
    let Some(frontend) = app_handle.try_state::<QuickCreateFrontendState>() else {
        log::error!("runtime: quick create frontend state 未注册");
        return;
    };
    let Some(runtime) = app_handle.try_state::<QuickPopupRuntimeState>() else {
        log::error!("runtime: quick popup runtime 未注册");
        return;
    };
    let Some(database) = app_handle.try_state::<DatabaseRuntimeState>() else {
        log::error!("runtime: database state 未注册");
        return;
    };
    let Some(active_scope) = app_handle.try_state::<ActiveScopeState>() else {
        log::error!("runtime: active scope state 未注册");
        return;
    };

    ensure_quick_create_panel(&app_handle);

    if !frontend.inner().is_ready().await {
        log::info!("runtime: quick create 前端未 ready，等待初始化完成");
        let mut attempts = 0;
        while attempts < 50 {
            tokio::time::sleep(std::time::Duration::from_millis(20)).await;
            if frontend.inner().is_ready().await {
                break;
            }
            attempts += 1;
        }

        if !frontend.inner().is_ready().await {
            log::warn!("runtime: quick create 前端启动超时");
            runtime.inner().mark_error().await;
            runtime.inner().reset_to_idle().await;
            return;
        }
    }

    let controller = build_quick_controller(app_handle.clone());
    let visible = match controller.is_visible() {
        Ok(visible) => visible,
        Err(error) => {
            log::warn!("runtime: 读取 quick create 可见状态失败: {error}");
            false
        }
    };

    if visible {
        let Some(session_id) = runtime.inner().active_session_id().await else {
            return;
        };

        match runtime
            .inner()
            .begin_close_for(&session_id, QuickPopupCloseReason::Toggle)
            .await
        {
            Ok(Some(session)) => {
                if let Err(error) = controller.hide() {
                    log::warn!("runtime: 隐藏 quick create 失败: {error}");
                    runtime.inner().mark_error().await;
                    return;
                }
                let _ = runtime.inner().finish_close_for(&session.session_id).await;
            }
            Ok(None) => {}
            Err(error) => log::warn!("runtime: 当前阶段不能关闭 quick create: {error}"),
        }
        return;
    }

    match prepare_quick_create_session(
        app_handle.clone(),
        frontend.inner(),
        runtime.inner(),
        database.inner(),
        active_scope.inner(),
    )
    .await
    {
        Ok(response) => {
            log::info!("runtime: 打开 quick create session={}", response.session_id);
        }
        Err(error) => {
            log::warn!(
                "runtime: quick create prepare session 失败: {}",
                error.message
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::should_initialize_quick_create_panel;

    #[test]
    fn quick_create_panel_should_not_reinitialize_when_it_already_exists() {
        assert!(!should_initialize_quick_create_panel(true));
    }

    #[test]
    fn quick_create_panel_should_initialize_when_missing() {
        assert!(should_initialize_quick_create_panel(false));
    }
}
