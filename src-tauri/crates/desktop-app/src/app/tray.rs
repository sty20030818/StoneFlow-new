//! StoneFlow 主窗口托盘集成。
//!
//! 设计目标：
//! - 只给主 App 提供单实例托盘；
//! - 托盘菜单负责“显示 / 隐藏 / 退出”三类窗口生命周期动作；
//! - 左键点击托盘图标时直接恢复主窗口，避免额外弹菜单。

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, Manager,
};

use crate::app::command_helper::{
    hide_main_window_to_tray, quit_application, restore_main_window, CommandHelperState,
};

const MAIN_TRAY_ID: &str = "main-tray";
const TRAY_MENU_SHOW_ID: &str = "show";
const TRAY_MENU_HIDE_ID: &str = "hide";
const TRAY_MENU_QUIT_ID: &str = "quit";

/// 初始化主窗口托盘与其交互行为。
pub(crate) fn initialize_main_tray(app: &App) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, TRAY_MENU_SHOW_ID, "显示主窗口", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, TRAY_MENU_HIDE_ID, "隐藏主窗口", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, TRAY_MENU_QUIT_ID, "退出 StoneFlow", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &hide, &quit])?;

    let tray_builder = TrayIconBuilder::with_id(MAIN_TRAY_ID)
        .menu(&menu)
        .tooltip("StoneFlow")
        .show_menu_on_left_click(false)
        .on_menu_event(|app_handle, event| {
            if let Err(error) = handle_tray_menu_event(app_handle, event.id.as_ref()) {
                log::warn!("托盘菜单事件处理失败: {error}");
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let Err(error) = handle_tray_icon_event(tray.app_handle(), &event) {
                log::warn!("托盘图标事件处理失败: {error}");
            }
        });

    let tray_builder = if let Some(icon) = app.default_window_icon() {
        tray_builder.icon(icon.clone())
    } else {
        tray_builder
    };

    tray_builder.build(app)?;
    Ok(())
}

fn handle_tray_menu_event<R: tauri::Runtime>(
    app_handle: &tauri::AppHandle<R>,
    menu_id: &str,
) -> tauri::Result<()> {
    let helper_state = app_handle.state::<CommandHelperState>();

    match menu_id {
        TRAY_MENU_SHOW_ID => restore_main_window(app_handle, helper_state.inner()),
        TRAY_MENU_HIDE_ID => hide_main_window_to_tray(app_handle, helper_state.inner()),
        TRAY_MENU_QUIT_ID => quit_application(app_handle, helper_state.inner()),
        _ => Ok(()),
    }
}

fn handle_tray_icon_event<R: tauri::Runtime>(
    app_handle: &tauri::AppHandle<R>,
    event: &TrayIconEvent,
) -> tauri::Result<()> {
    if !matches!(
        event,
        TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        }
    ) {
        return Ok(());
    }

    let helper_state = app_handle.state::<CommandHelperState>();
    restore_main_window(app_handle, helper_state.inner())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn known_tray_menu_ids_are_stable() {
        assert_eq!(TRAY_MENU_SHOW_ID, "show");
        assert_eq!(TRAY_MENU_HIDE_ID, "hide");
        assert_eq!(TRAY_MENU_QUIT_ID, "quit");
    }
}
