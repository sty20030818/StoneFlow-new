//! Repository 骨架：阶段 0 只建立边界，不提前写业务规则。

mod activity_repository;
mod project_repository;
mod settings_repository;
mod space_repository;
mod task_repository;
mod view_repository;

pub use activity_repository::{
    ActivityChangeRecord, ActivityEventRecord, ActivityQuery, ActivityRepository,
};
pub use project_repository::{
    CreateProjectRecord, ProjectOverviewView, ProjectRepository, UpdateProjectPatch,
};
pub use settings_repository::SettingsRepository;
pub use space_repository::{CreateSpaceRecord, SpaceRepository, UpdateSpacePatch};
pub use task_repository::{
    CreateTaskRecord, ProjectTaskCount, TaskLifecycleView, TaskListQuery, TaskRepository,
    UpdateTaskPatch,
};
pub use view_repository::ViewRepository;
