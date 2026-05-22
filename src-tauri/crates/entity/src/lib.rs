//! StoneFlow 阶段 1 ORM 实体层。
//!
//! 这一层只承载数据库映射与稳定枚举，不提前实现业务规则。

pub mod activity_change;
pub mod activity_event;
pub mod common;
pub mod project;
pub mod setting;
pub mod space;
pub mod task;
pub mod task_link;
pub mod view;

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
