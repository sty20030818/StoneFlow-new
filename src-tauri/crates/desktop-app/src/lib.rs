//! StoneFlow 桌面应用编排入口。

pub mod app;
mod application;
mod infrastructure;
#[cfg(test)]
#[path = "tests/m3_e_project_hierarchy_tests.rs"]
mod m3_e_project_hierarchy_tests;

pub fn builder() -> tauri::Builder<tauri::Wry> {
    app::builder()
}
