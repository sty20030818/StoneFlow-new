//! StoneFlow 的数据库 schema crate。
//!
//! 这个 crate 只承载 SeaORM entity、relation 和数据库结构枚举，
//! 不引入业务 helper、service 或 repository 逻辑。

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
    pub use crate::activity_change::Entity as ActivityChange;
    pub use crate::activity_event::Entity as ActivityEvent;
    pub use crate::project::Entity as Project;
    pub use crate::setting::Entity as Setting;
    pub use crate::space::Entity as Space;
    pub use crate::task::Entity as Task;
    pub use crate::task_link::Entity as TaskLink;
    pub use crate::view::Entity as View;
}
