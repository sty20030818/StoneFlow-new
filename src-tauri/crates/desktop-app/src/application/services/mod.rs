//! Service 骨架：保留后续业务模块的编排边界。

mod lifecycle_service;
mod project_service;
mod search_service;
mod settings_service;
mod space_service;
mod task_service;
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
pub use search_service::{
    SearchEntitiesInput, SearchEntitiesResultDto, SearchProjectItemDto, SearchService,
    SearchTaskItemDto,
};
pub use settings_service::{
    GetLegacyShellDevicePreferencesOutput, GetSidebarSettingsOutput,
    LegacySidebarDevicePreferences, LegacyUiDevicePreferences, SettingsService,
    SidebarDesktopPreference, SidebarFooterItemKey, SidebarItemConfig, SidebarItemVisibilityTarget,
    SidebarMainItemKey, SidebarMainItems, SidebarPreferenceSettings,
    SidebarProjectSectionPreferenceConfig, UpdateSidebarItemVisibilityInput,
    UpdateSidebarProjectSectionInput,
};
pub use space_service::{
    CreateSpaceInput, SetDefaultSpaceInput, SpaceDto, SpaceIdInput, SpaceService, UpdateSpaceInput,
};
pub use task_service::{
    CreateTaskInput, CreateTaskPlacementInput, CreateTaskPlacementKind, InboxTaskProjectInput,
    ListTasksInput, ListTasksPlacementInput, ListTasksPlacementKind, TaskDetailDto, TaskIdInput,
    TaskListItemDto, TaskScopeInput, TaskScopeKind, TaskService, UpdateTaskInput,
};
pub use view_service::{
    CreateViewInput, DeleteViewInput, ListViewsInput, ReorderViewsInput, RunProjectViewInput,
    RunTaskViewInput, RunTaskViewOutput, TaskViewGroupDto, ToggleViewVisibleInput, UpdateViewInput,
    ViewDto, ViewService, ViewSortDirection, ViewSortRuleDto,
};
