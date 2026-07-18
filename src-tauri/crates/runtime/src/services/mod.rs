//! 应用 adapter 层：业务真源在 `stoneflow-usecase`，此处仅保留 port 实现与 `AppError` 映射。

pub mod activity;

mod lifecycle_service;
mod project_service;
mod launcher_adapter;
mod launcher_open_context_service;
mod launcher_service;
mod launcher_session_bridge;
mod search_service;
mod settings_service;
mod space_service;
mod sync_mutation;
mod task_link_service;
mod task_service;
mod update_adapter;
pub mod update_events;
mod update_service;
mod update_settings_store;
mod view_service;

pub use lifecycle_service::{
    LifecycleEntityType, LifecycleEntry, LifecycleMode, LifecycleScopeInput, LifecycleScopeKind,
    LifecycleService, ListLifecycleEntriesInput,
};
pub use project_service::{
    CreateProjectInput, ListProjectOverviewInput, ListSidebarProjectsInput, ProjectDetailDto,
    ProjectIdInput, ProjectOverviewItemDto, ProjectScopeInput, ProjectScopeKind, ProjectService,
    ProjectSidebarItemDto, UpdateProjectInput,
};
pub use launcher_open_context_service::LauncherOpenContextService;
pub use launcher_service::{
    LauncherService, LauncherResolvedOpenTarget, LauncherResolvedPlacement,
};
pub use launcher_session_bridge::LauncherSessionBridge;
pub use search_service::{
    SearchEntitiesInput, SearchEntitiesResultDto, SearchProjectItemDto, SearchService,
    SearchTaskItemDto,
};
pub use settings_service::{
    GetLegacyShellDevicePreferencesOutput, GetSidebarSettingsOutput,
    LegacySidebarDevicePreferences, LegacyUiDevicePreferences, SettingsService,
    SidebarDesktopPreference, SidebarFooterItemKey, SidebarItemConfig, SidebarItemVisibilityTarget,
    SidebarMainItemKey, SidebarMainItems, SidebarPreferenceSettings, SidebarProjectSectionPreferenceConfig,
    UpdateSidebarItemVisibilityInput, UpdateSidebarProjectSectionInput,
};
pub use space_service::{
    CreateSpaceInput, SetDefaultSpaceInput, SpaceDto, SpaceIdInput, SpaceService, UpdateSpaceInput,
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
    CreateViewInput, DeleteViewInput, ListViewsInput, ReorderViewsInput, RunProjectViewInput,
    RunTaskViewInput, RunTaskViewOutput, TaskViewGroupDto, ToggleViewVisibleInput, UpdateViewInput,
    ViewDto, ViewService, ViewSortDirection, ViewSortRuleDto,
};
