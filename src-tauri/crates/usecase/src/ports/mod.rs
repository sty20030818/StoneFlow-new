//! 用例层 ports：定义持久化与事务边界的长期契约。
//!
//! 这一层的职责只有两件事：
//! - 约束 usecase 可以向外界要求什么能力；
//! - 阻止 Tauri / SeaORM / IPC DTO 继续渗入业务编排层。
//!
//! S3 当前先把契约立住；具体 trait 细化与 desktop-app adapter 接线会继续在后续迁移中完成。

pub use crate::activity::ActivityPersistence;
pub use crate::lifecycle::{
    LifecycleProjectPersistence, LifecycleSpacePersistence, LifecycleTaskPersistence,
};
pub use crate::project::{ProjectPersistence, ProjectSpaceReader, ProjectTaskCounter};
pub use crate::quick_create::QuickCreatePorts;
pub use crate::search::{SearchProjectReader, SearchSpaceReader, SearchTaskReader};
pub use crate::settings::SettingsPersistence;
pub use crate::space::SpacePersistence;
pub use crate::task::{TaskPersistence, TaskProjectReader, TaskSpaceReader};
pub use crate::task_link::{TaskLinkPersistence, TaskLinkTaskReader};
pub use crate::view::{ViewLookupReader, ViewPersistence, ViewTaskReader};
