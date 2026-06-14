//! 阶段 1 默认 Seed：只负责初始化稳定默认数据。

mod defaults;
mod runner;
mod store;

pub(super) use runner::{multiple_default_spaces_error, run_seed};
