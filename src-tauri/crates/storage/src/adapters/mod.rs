//! application ports 的 SQLite 实现，以及已装配的 application service 工厂。
//!
//! 边界：
//! - 本模块是 storage 实现 application ports 的唯一入口；
//! - runtime 只应调用 `build_*_service`，不应再手写 SeaORM adapter。

mod activity;
mod error;
mod launcher;
mod lifecycle;
mod project;
mod search;
mod settings;
mod space;
mod task;
mod task_link;
mod view;

pub use activity::{build_activity_service, ActivityAppService, ActivityPersistenceAdapter};
pub use launcher::{
    build_launcher_context_service, build_launcher_service, LauncherAppService,
    LauncherContextAppService, LauncherPortsAdapter,
};
pub use lifecycle::{build_lifecycle_service, LifecycleAppService, LifecyclePortsAdapter};
pub use project::{build_project_service, ProjectAppService, ProjectPersistenceAdapter};
pub use search::{build_search_service, SearchAppService, SearchPortsAdapter};
pub use settings::{build_settings_service, SettingsAppService, SettingsPersistenceAdapter};
pub use space::{build_space_service, SpaceAppService, SpacePersistenceAdapter};
pub use task::{build_task_service, TaskAppService, TaskPersistenceAdapter};
pub use task_link::{build_task_link_service, TaskLinkAppService, TaskLinkPersistenceAdapter};
pub use view::{build_view_service, ViewAppService, ViewPersistenceAdapter};
