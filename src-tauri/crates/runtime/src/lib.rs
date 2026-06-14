//! StoneFlow 的 Tauri runtime 外壳。
//!
//! S1 只完成根入口所有权切换：
//! - `src-tauri/src/lib.rs` 从这里进入；
//! - 真实运行逻辑暂时委托给 `legacy` shim；
//! - 后续阶段再逐步把窗口、命令、状态和编排迁入本 crate。

mod legacy;

/// 通过新的 runtime 边界启动 StoneFlow。
pub fn run(context: tauri::Context<tauri::Wry>) {
    legacy::run(context);
}
