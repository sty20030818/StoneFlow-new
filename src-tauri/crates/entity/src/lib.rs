//! StoneFlow 的 SeaORM 实体集合。

pub mod focus_view;
pub mod project;
pub mod resource;
pub mod space;
pub mod task;
pub mod trash_entry;

pub mod prelude {
    pub use super::focus_view::Entity as FocusView;
    pub use super::project::Entity as Project;
    pub use super::resource::Entity as Resource;
    pub use super::space::Entity as Space;
    pub use super::task::Entity as Task;
    pub use super::trash_entry::Entity as TrashEntry;
}
