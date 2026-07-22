//! SeaORM entity、relation 与数据库结构枚举。

pub mod activity_change;
pub mod activity_event;
pub mod applied_operation;
pub mod common;
pub mod outbox;
pub mod project;
pub mod setting;
pub mod space;
pub mod task;
pub mod task_link;
pub mod tombstone;
pub mod view;

pub mod prelude {
    pub use crate::entities::activity_change::Entity as ActivityChange;
    pub use crate::entities::activity_event::Entity as ActivityEvent;
    pub use crate::entities::applied_operation::Entity as AppliedOperation;
    pub use crate::entities::outbox::Entity as Outbox;
    pub use crate::entities::project::Entity as Project;
    pub use crate::entities::setting::Entity as Setting;
    pub use crate::entities::space::Entity as Space;
    pub use crate::entities::task::Entity as Task;
    pub use crate::entities::task_link::Entity as TaskLink;
    pub use crate::entities::tombstone::Entity as Tombstone;
    pub use crate::entities::view::Entity as View;
}
