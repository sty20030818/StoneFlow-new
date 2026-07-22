//! 用例层 ports：定义持久化与事务边界的长期契约。
//!
//! 这一层的职责只有两件事：
//! - 约束 usecase 可以向外界要求什么能力；
//! - 阻止 Tauri / SeaORM / IPC DTO 继续渗入业务编排层。
//!
//! R2 起以 UnitOfWork / Outbox / Tombstone 为写边界；具体业务 port 由 R3–R8 继续接线。

pub use crate::activity::ActivityPersistence;
pub use crate::launcher::LauncherPorts;
pub use crate::lifecycle::{
    LifecycleProjectPersistence, LifecycleSpacePersistence, LifecycleTaskPersistence,
};
pub use crate::operation::{AppliedOperationWriter, OutboxWriter, TombstoneWriter, UnitOfWork};
pub use crate::project::{ProjectPersistence, ProjectSpaceReader, ProjectTaskCounter};
pub use crate::search::{SearchProjectReader, SearchSpaceReader, SearchTaskReader};
pub use crate::settings::SettingsPersistence;
pub use crate::space::SpacePersistence;
pub use crate::task::{TaskPersistence, TaskProjectReader, TaskSpaceReader};
pub use crate::task_link::{TaskLinkPersistence, TaskLinkTaskReader};
pub use crate::view::{ViewLookupReader, ViewPersistence, ViewTaskReader};
