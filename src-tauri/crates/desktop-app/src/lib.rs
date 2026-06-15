//! StoneFlow 桌面主应用 crate：业务 adapter 与持久化 re-export。

pub mod app;
pub mod application;
pub mod domain;
mod infrastructure;

#[cfg(test)]
mod tests;
