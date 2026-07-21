# sync-worker

> 本地 SQLite 副本与 Turso/libSQL 远端副本之间的同步协议实现。

## 公开入口

- 二进制：`stoneflow-sync-worker`
- 由 Rust runtime 调度，不直接供前端调用。
- 输入和输出通过本地/远端数据库连接及结构化错误载荷传递。

## 源码位置

`src-tauri/crates/sync-worker/`

## 相关文档

- [同步协议设计](./DESIGN.md)
- [系统设计](../../../Documents/01-架构/A2-系统设计.md)
- [Rust 架构](../../ARCHITECTURE.md)
