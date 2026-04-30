//! Service 骨架：保留后续业务模块的编排边界。

mod project_service;
mod settings_service;
mod space_service;
mod task_service;
mod view_service;

pub use project_service::ProjectService;
pub use settings_service::{
    GetSidebarSettingsOutput, SettingsService, SidebarDesktopPreference, SidebarFooterItemKey,
    SidebarItemVisibilityTarget, SidebarMainItemKey, SidebarProjectSectionConfig, SidebarSettings,
    UpdateSidebarDesktopPreferenceInput, UpdateSidebarItemVisibilityInput,
    UpdateSidebarProjectSectionInput, UpdateSidebarWidthInput,
};
pub use space_service::SpaceService;
pub use task_service::TaskService;
pub use view_service::ViewService;
