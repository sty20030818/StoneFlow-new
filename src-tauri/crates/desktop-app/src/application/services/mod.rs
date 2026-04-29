//! Service 骨架：阶段 0 只建立业务编排边界。

mod activity_service;
mod project_service;
mod settings_service;
mod space_service;
mod task_service;
mod view_service;

pub use activity_service::ActivityService;
pub use project_service::ProjectService;
pub use settings_service::SettingsService;
pub use space_service::SpaceService;
pub use task_service::TaskService;
pub use view_service::ViewService;
