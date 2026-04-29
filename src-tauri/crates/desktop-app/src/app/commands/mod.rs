//! Tauri 命令注册。

use tauri::ipc::Invoke;

pub(crate) mod project;
pub(crate) mod quick_capture;
pub(crate) mod support;
pub(crate) mod task;
pub(crate) mod workspace;

/// 生成命令处理器。
pub fn handler() -> impl Fn(Invoke) -> bool + Send + Sync + 'static {
    tauri::generate_handler![
        workspace::healthcheck,
        workspace::create_space,
        workspace::set_active_space,
        project::list_projects,
        project::create_project,
        project::get_project_execution_view,
        project::update_project_task_status,
        project::delete_project_to_trash,
        task::create_task,
        task::create_capture_task,
        task::list_inbox_tasks,
        task::triage_inbox_task,
        task::get_task_drawer_detail,
        task::update_task_drawer_fields,
        task::delete_task_to_trash,
        support::list_focus_views,
        support::get_focus_view_tasks,
        support::update_task_pin_state,
        support::list_task_resources,
        support::create_task_resource,
        support::open_task_resource,
        support::delete_task_resource,
        support::list_trash_entries,
        support::restore_task_from_trash,
        support::restore_project_from_trash,
        support::search_workspace,
        quick_capture::restore_main_window,
        quick_capture::quit_stoneflow,
        quick_capture::get_command_helper_status
    ]
}
