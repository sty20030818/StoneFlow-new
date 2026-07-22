//! 应用 adapter 层：业务真源在 `stoneflow-application`，此处仅保留 port 实现与 `AppError` 映射。
//!
//! R2：旧 sync_mutations 双写与 soft-delete 适配已拆除；多数业务服务为编译边界 stub。

pub mod activity;

mod launcher_adapter;
mod launcher_open_context_service;
mod launcher_service;
mod launcher_session_bridge;
mod lifecycle_service;
mod project_service;
mod search_service;
mod settings_service;
mod space_service;
mod task_link_service;
mod task_service;
mod update_adapter;
pub mod update_events;
mod update_service;
mod update_settings_store;
mod view_service;

pub use launcher_open_context_service::LauncherOpenContextService;
pub use launcher_service::{LauncherResolvedPlacement, LauncherService};
pub use launcher_session_bridge::LauncherSessionBridge;
pub use lifecycle_service::{
    LifecycleEntityType, LifecycleEntry, LifecycleMode, LifecycleScopeInput, LifecycleScopeKind,
    LifecycleService, ListLifecycleEntriesInput,
};
pub use project_service::{
    CreateProjectInput, ListProjectOverviewInput, ListSidebarProjectsInput, ProjectDetailDto,
    ProjectIdInput, ProjectOverviewItemDto, ProjectService, ProjectSidebarItemDto,
    UpdateProjectInput,
};
pub use search_service::{
    SearchEntitiesInput, SearchEntitiesResultDto, SearchProjectItemDto, SearchService,
    SearchTaskItemDto,
};
pub use settings_service::{
    GetSidebarSettingsOutput, SettingsService, SidebarFooterItemKey, SidebarItemConfig,
    SidebarItemVisibilityTarget, SidebarMainItemKey, SidebarMainItems, SidebarPreferenceSettings,
    SidebarProjectSectionPreferenceConfig, UpdateSidebarItemVisibilityInput,
    UpdateSidebarProjectSectionInput,
};
pub use space_service::{
    CreateSpaceInput, SetDefaultSpaceInput, SpaceDto, SpaceIdInput, SpaceLifecycleResult,
    SpaceService, UpdateSpaceInput,
};
pub use task_link_service::{
    CreateTaskLinkInput, DeleteTaskLinkInput, ListTaskLinksInput, TaskLinkDto, TaskLinkService,
    UpdateTaskLinkInput,
};
pub use task_service::{
    CreateTaskInput, CreateTaskPlacementInput, CreateTaskPlacementKind, ListTasksInput,
    ListTasksPlacementInput, ListTasksPlacementKind, TaskDetailDto, TaskIdInput, TaskListItemDto,
    TaskScopeInput, TaskScopeKind, TaskService, UpdateTaskInput, UpdateTaskPlacementInput,
    UpdateTaskPlacementKind,
};
pub use update_service::{build_update_service, RuntimeUpdateService};
pub use view_service::{
    CreateViewInput, DeleteViewInput, ListViewsInput, ReorderViewsInput, RunTaskViewInput,
    RunTaskViewOutput, ToggleViewVisibleInput, UpdateViewInput, ViewDto, ViewService,
};
