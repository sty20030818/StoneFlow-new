//! Tauri 命令注册。

use tauri::ipc::Invoke;

pub(crate) mod activity;
pub(crate) mod projects;
pub(crate) mod quick_capture;
pub(crate) mod settings;
pub(crate) mod spaces;
pub(crate) mod tasks;
pub(crate) mod workspace;

/// 生成命令处理器。
pub fn handler() -> impl Fn(Invoke) -> bool + Send + Sync + 'static {
    tauri::generate_handler![
        activity::get_entity_activities,
        projects::list_project_overview,
        projects::list_sidebar_projects,
        projects::get_project_detail,
        projects::create_project,
        projects::update_project,
        projects::complete_project,
        projects::reopen_project,
        projects::archive_project,
        projects::restore_project,
        projects::delete_project,
        tasks::list_tasks,
        tasks::get_task_detail,
        tasks::create_task,
        tasks::update_task,
        tasks::archive_task,
        tasks::move_task_to_inbox,
        tasks::leave_inbox_to_project,
        tasks::leave_inbox_as_no_project,
        tasks::restore_task,
        tasks::delete_task,
        settings::get_sidebar_settings,
        settings::update_sidebar_item_visibility,
        settings::update_sidebar_width,
        settings::update_sidebar_project_section,
        settings::update_sidebar_desktop_preference,
        spaces::list_visible_spaces,
        spaces::create_space,
        spaces::update_space,
        spaces::set_default_space,
        spaces::archive_space,
        spaces::restore_space,
        spaces::delete_space,
        workspace::healthcheck,
        workspace::set_active_scope,
        quick_capture::restore_main_window,
        quick_capture::quit_stoneflow,
        quick_capture::get_command_helper_status
    ]
}
