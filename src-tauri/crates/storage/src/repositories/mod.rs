//! Repository：本地持久化。
//!
//! 旧 soft-delete / sync_mutations CRUD 已拆除；Task/Project/View 等由后续切片重建。

mod activity_repository;
mod applied_operation_repository;
mod outbox_repository;
mod project_repository;
mod settings_repository;
mod space_repository;
mod sync_repository;
mod task_link_repository;
mod task_repository;
mod tombstone_repository;
mod view_repository;

pub use activity_repository::ActivityRepository;
pub use applied_operation_repository::AppliedOperationRepository;
pub use outbox_repository::{OutboxRepository, PendingOutboxOperation};
pub use project_repository::{
    CreateProjectRecord, ProjectCascadeResult, ProjectRepository, UpdateProjectPatch,
};
pub use settings_repository::SettingsRepository;
pub use space_repository::{
    CreateSpaceRecord, SpaceCascadeEntities, SpaceCascadeResult, SpaceRepository, UpdateSpacePatch,
};
pub use sync_repository::{SyncCursorRecord, SyncDeviceRecord, SyncRepository};
pub use task_link_repository::{CreateTaskLinkRecord, TaskLinkRepository, UpdateTaskLinkPatch};
pub use task_repository::{CreateTaskRecord, TaskRepository, UpdateTaskPatch};
pub use tombstone_repository::TombstoneRepository;
pub use view_repository::{
    map_view, CreateViewRecord, UpdateViewPatch as StorageUpdateViewPatch, ViewRepository,
};
