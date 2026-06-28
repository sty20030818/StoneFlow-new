//! Tauri 命令注册。

use tauri::ipc::Invoke;

pub(crate) mod activity;
pub(crate) mod lifecycle;
pub(crate) mod projects;
pub(crate) mod quick_create;
pub(crate) mod search;
pub(crate) mod settings;
pub(crate) mod spaces;
pub(crate) mod sync;
pub(crate) mod tasks;
pub(crate) mod views;
pub(crate) mod workspace;

/// 生成命令处理器。
pub fn handler() -> impl Fn(Invoke) -> bool + Send + Sync + 'static {
    tauri::generate_handler![
        activity::get_entity_activities,
        lifecycle::list_archive_entries,
        lifecycle::list_trash_entries,
        search::search_entities,
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
        projects::permanently_delete_project,
        tasks::list_tasks,
        tasks::get_task_detail,
        tasks::create_task,
        tasks::update_task,
        tasks::archive_task,
        tasks::restore_task,
        tasks::delete_task,
        tasks::permanently_delete_task,
        tasks::list_task_links,
        tasks::create_task_link,
        tasks::update_task_link,
        tasks::delete_task_link,
        views::list_views,
        views::run_task_view,
        views::create_view,
        views::update_view,
        views::delete_view,
        views::toggle_view_visible,
        views::reorder_views,
        settings::get_sidebar_settings,
        settings::get_legacy_shell_device_preferences,
        settings::update_sidebar_item_visibility,
        settings::update_sidebar_project_section,
        sync::get_sync_status,
        sync::configure_sync,
        sync::force_sync,
        sync::restore_sync,
        spaces::list_visible_spaces,
        spaces::create_space,
        spaces::update_space,
        spaces::set_default_space,
        spaces::archive_space,
        spaces::restore_space,
        spaces::delete_space,
        spaces::permanently_delete_space,
        workspace::healthcheck,
        workspace::set_active_scope,
        quick_create::restore_main_window,
        quick_create::quit_stoneflow,
        quick_create::take_pending_command_open_intent,
        quick_create::domain::quick_create_get_initial_state,
        quick_create::domain::quick_create_list_projects_by_space,
        quick_create::domain::quick_create_search,
        quick_create::domain::quick_create_create,
        quick_create::domain::quick_create_create_and_open,
        quick_create::domain::quick_create_open_target,
        quick_create::window::quick_create_prepare_session,
        quick_create::window::quick_create_commit_layout,
        quick_create::window::quick_create_present_session,
        quick_create::window::quick_create_close_session,
        quick_create::window::quick_create_frontend_ready,
        quick_create::window::quick_create_frontend_unready,
        quick_create::window::quick_create_report_layout_diagnostics
    ]
}
