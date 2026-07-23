//! Tauri 命令注册。

use tauri::ipc::Invoke;

pub(crate) mod activity;
pub(crate) mod launcher;
pub(crate) mod lifecycle;
pub(crate) mod projects;
pub(crate) mod search;
pub(crate) mod settings;
pub(crate) mod spaces;
pub(crate) mod sync;
pub(crate) mod tasks;
pub(crate) mod update;
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
        projects::archive_project,
        projects::restore_project,
        projects::delete_project,
        projects::permanently_delete_project,
        tasks::list_tasks,
        tasks::get_task_detail,
        tasks::create_task,
        tasks::update_task,
        tasks::bulk_update_tasks,
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
        settings::get_sidebar_settings,
        settings::update_sidebar_item_visibility,
        settings::update_sidebar_project_section,
        sync::get_sync_status,
        sync::configure_sync,
        sync::update_sync_policy,
        sync::get_sync_diagnostics,
        sync::run_sync,
        spaces::list_visible_spaces,
        spaces::get_space,
        spaces::create_space,
        spaces::update_space,
        spaces::set_default_space,
        spaces::archive_space,
        spaces::restore_space,
        spaces::delete_space,
        spaces::permanently_delete_space,
        update::check_update,
        update::download_and_install,
        update::restart_and_install,
        update::skip_version,
        update::set_check_mode,
        update::set_channel,
        update::set_check_interval_secs,
        update::get_update_settings,
        update::get_update_session,
        update::cancel_update_download,
        workspace::healthcheck,
        workspace::set_active_scope,
        launcher::restore_main_window,
        launcher::quit_stoneflow,
        launcher::take_pending_command_open_intent,
        launcher::domain::launcher_get_initial_state,
        launcher::domain::launcher_list_projects_by_space,
        launcher::domain::launcher_open_target,
        launcher::window::launcher_prepare_session,
        launcher::window::launcher_present_session,
        launcher::window::launcher_close_session,
        launcher::window::launcher_frontend_ready,
        launcher::window::launcher_frontend_unready,
    ]
}
