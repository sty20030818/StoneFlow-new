//! SeaORM entity、relation 与数据库结构枚举。
//!
//! 只承载持久化结构，不包含业务 helper、service 或 repository 逻辑。

pub mod activity_change;
pub mod activity_event;
pub mod common;
pub mod project;
pub mod setting;
pub mod space;
pub mod task;
pub mod task_link;
pub mod view;

/// SeaORM 实体的窄导出，保留当前查询层使用习惯。
pub mod prelude {
    pub use crate::entities::activity_change::Entity as ActivityChange;
    pub use crate::entities::activity_event::Entity as ActivityEvent;
    pub use crate::entities::project::Entity as Project;
    pub use crate::entities::setting::Entity as Setting;
    pub use crate::entities::space::Entity as Space;
    pub use crate::entities::task::Entity as Task;
    pub use crate::entities::task_link::Entity as TaskLink;
    pub use crate::entities::view::Entity as View;
}
