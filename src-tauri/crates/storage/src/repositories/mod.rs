//! Repository：R2 基线持久化。
//!
//! 旧 soft-delete / sync_mutations CRUD 已拆除；Task/Project/View 等由后续切片重建。

mod applied_operation_repository;
mod outbox_repository;
mod settings_repository;
mod space_repository;
mod sync_repository;
mod tombstone_repository;

pub use applied_operation_repository::AppliedOperationRepository;
pub use outbox_repository::OutboxRepository;
pub use settings_repository::SettingsRepository;
pub use space_repository::{
    CreateSpaceRecord, SpaceCascadeEntities, SpaceCascadeResult, SpaceRepository, UpdateSpacePatch,
};
pub use sync_repository::{SyncCursorRecord, SyncDeviceRecord, SyncRepository};
pub use tombstone_repository::TombstoneRepository;
