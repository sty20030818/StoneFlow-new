//! 系统托盘菜单与事件。

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

use crate::exit_coordinator;
use crate::supervisor;
use crate::windows::main::{toggle_main_window, MAIN_WINDOW_LABEL};

const MAIN_TRAY_SHOW_ID: &str = "tray-show-main";
const MAIN_TRAY_QUIT_ID: &str = "tray-quit";

pub fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let show = MenuItem::with_id(
        app,
        MAIN_TRAY_SHOW_ID,
        "显示/隐藏主窗口",
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, MAIN_TRAY_QUIT_ID, "退出 StoneFlow", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;
    TrayIconBuilder::new()
        .icon(
            app.default_window_icon()
                .cloned()
                .expect("missing default app icon"),
        )
        .show_menu_on_left_click(false)
        .menu(&menu)
        .on_menu_event(
            move |app_handle: &tauri::AppHandle<tauri::Wry>, event: tauri::menu::MenuEvent| {
                match event.id.as_ref() {
                    MAIN_TRAY_SHOW_ID => {
                        if let Some(window) = app_handle.get_webview_window(MAIN_WINDOW_LABEL) {
                            toggle_main_window(&window);
                        }
                    }
                    MAIN_TRAY_QUIT_ID => {
                        let app_handle = app_handle.clone();
                        tauri::async_runtime::spawn(async move {
                            request_exit_and_quit(&app_handle).await;
                        });
                    }
                    _ => {}
                }
            },
        )
        .on_tray_icon_event(
            move |tray: &tauri::tray::TrayIcon<tauri::Wry>, event: tauri::tray::TrayIconEvent| {
                if let tauri::tray::TrayIconEvent::Click {
                    button,
                    button_state,
                    ..
                } = event
                {
                    if button == tauri::tray::MouseButton::Left
                        && button_state == tauri::tray::MouseButtonState::Up
                    {
                        if let Some(window) =
                            tray.app_handle().get_webview_window(MAIN_WINDOW_LABEL)
                        {
                            toggle_main_window(&window);
                        }
                    }
                }
            },
        )
        .build(app)?;

    Ok(())
}

pub async fn request_exit_and_quit(app_handle: &tauri::AppHandle) {
    if let (Some(exit_coordinator), Some(handle)) = (
        app_handle.try_state::<exit_coordinator::ExitCoordinator>(),
        app_handle.try_state::<supervisor::SupervisorHandle>(),
    ) {
        if let Err(error) = exit_coordinator
            .request_exit(&handle, exit_coordinator::ExitReason::TrayQuit)
            .await
        {
            log::warn!("tray quit 请求 helper 停止失败: {error}");
        }
    }
    app_handle.exit(0);
}
