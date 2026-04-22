//! Tauri Commands 统一注册入口。

use tauri::ipc::Invoke;

mod focus;
mod inbox;
mod project;
mod quick_capture;
mod resource;
mod search;
mod space;
mod task;
mod task_drawer;
mod trash;

/// 生成 Tauri 命令处理器。
pub fn handler() -> impl Fn(Invoke) -> bool + Send + Sync + 'static {
    tauri::generate_handler![
        // Space
        space::healthcheck,
        space::create_space,
        // Project
        project::list_projects,
        project::create_project,
        project::get_project_execution_view,
        project::update_project_task_status,
        project::delete_project_to_trash,
        // Task
        task::create_task,
        task::set_active_space,
        task::create_capture_task,
        quick_capture::open_quick_capture,
        quick_capture::restore_main_window,
        quick_capture::quit_stoneflow,
        quick_capture::get_command_helper_status,
        // Inbox
        inbox::list_inbox_tasks,
        inbox::triage_inbox_task,
        // Focus
        focus::list_focus_views,
        focus::get_focus_view_tasks,
        focus::update_task_pin_state,
        // Resource
        resource::list_task_resources,
        resource::create_task_resource,
        resource::open_task_resource,
        resource::delete_task_resource,
        // Task Drawer
        task_drawer::get_task_drawer_detail,
        task_drawer::update_task_drawer_fields,
        task_drawer::delete_task_to_trash,
        // Trash
        trash::list_trash_entries,
        trash::restore_task_from_trash,
        trash::restore_project_from_trash,
        // Search
        search::search_workspace,
    ]
}
