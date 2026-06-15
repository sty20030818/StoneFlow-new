//! StoneFlow 的 Rust 集成测试宿主。

pub mod app {
    pub use stoneflow_runtime::app::*;
}

pub mod composition {
    pub use stoneflow_runtime::composition::*;
}

pub mod services {
    pub use stoneflow_runtime::services::*;
}

#[cfg(test)]
mod tests;
