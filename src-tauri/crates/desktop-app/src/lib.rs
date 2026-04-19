//! StoneFlow 桌面应用编排入口。

pub mod app;
mod application;
mod infrastructure;

pub fn builder() -> tauri::Builder<tauri::Wry> {
    app::builder()
}
