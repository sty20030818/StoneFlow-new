//! 系统托盘菜单与事件。

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

use crate::exit_coordinator::{self, ExitReason};
use crate::window::main::{toggle_main_window, MAIN_WINDOW_LABEL};

const MAIN_TRAY_SHOW_ID: &str = "tray-show-main";
const MAIN_TRAY_QUIT_ID: &str = "tray-quit";

const TRAY_ICON: tauri::image::Image<'_> = tauri::include_image!("../../icons/tray/icon.png");

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
        .icon(TRAY_ICON)
        .icon_as_template(false)
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
                            exit_coordinator::request_exit_and_quit(
                                &app_handle,
                                ExitReason::TrayQuit,
                            )
                            .await;
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

#[cfg(test)]
mod tests {
    use super::TRAY_ICON;

    #[test]
    fn tray_icon_should_have_transparent_corners_and_visible_content() {
        let icon = TRAY_ICON;
        let width = icon.width() as usize;
        let height = icon.height() as usize;
        assert!(width > 0 && height > 0);
        let rgba = icon.rgba();
        assert_eq!(rgba.len(), width * height * 4);
        for pixel in [0, width - 1, (height - 1) * width, width * height - 1] {
            assert_eq!(rgba[pixel * 4 + 3], 0, "托盘图标四角应透明");
        }
        assert!(rgba.chunks_exact(4).any(|pixel| pixel[3] > 0));
    }
}
