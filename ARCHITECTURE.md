# StoneFlow - 整体架构

## 系统边界

StoneFlow 是一个 Tauri 桌面应用。前端负责界面、路由和交互状态；Rust 负责领域规则、本地 SQLite 持久化、同步运行时和桌面平台能力。Turso/libSQL 是当前可选的同步远端，不是业务数据的直接前端来源。

## 架构总览

```text
React 前端
  路由与页面 -> Feature UI / Query / UI store -> Tauri command
                                                   |
Rust workspace                                   SQLite（本地事实源）
  runtime -> usecase -> domain / storage          |
                 |                                +-> sync-worker -> Turso/libSQL（可选同步副本）
                 +-> platform
```

## 核心模块

| 模块 | 职责 | 路径 | 文档 |
|---|---|---|---|
| 前端应用 | Provider、路由、Shell 装配 | `src/app/`、`src/routes/`、`src/layout/` | [src 架构](./src/ARCHITECTURE.md) |
| 功能模块 | Task、Project、Space、View、Launcher、Command、Sync 等业务 UI | `src/features/` | 各模块 `ARCHITECTURE.md` |
| 前端共享层 | 类型、Query、Tauri 调用、基础组件和样式 | `src/shared/`、`src/styles/` | [src 架构](./src/ARCHITECTURE.md) |
| Rust 业务核心 | 领域规则、用例、存储、运行时与平台能力 | `src-tauri/crates/` | [Rust 架构](./src-tauri/ARCHITECTURE.md) |
| 本地数据 | SQLite 业务表、迁移和同步元数据 | `src-tauri/crates/{storage,migration,schema}/` | [领域模型](./Documents/01-架构/A1-领域模型.md) |
| 同步 | 后台同步、远端副本和状态反馈 | `src/features/sync/`、`src-tauri/crates/sync-worker/` | [同步设计](./Documents/01-架构/A2-系统设计.md#云同步) |

## 模块依赖方向

- 路由和 Layout 只负责页面装配，业务 UI 与规则留在 Feature 内。
- Feature 通过 `shared` 的稳定能力协作；不直接依赖其他 Feature 的内部实现。
- 前端通过明确的 Tauri command 边界调用 Rust，不直接访问 SQLite 或远端数据库。
- Rust 的 `usecase` 编排业务；`domain` 不依赖 Tauri、存储或平台；`storage` 和 `platform` 是外层实现。

## 关键运行关系

- TanStack Router 管 URL、浏览历史和可分享的筛选状态。
- TanStack Query 管服务端/业务数据缓存与失效；Zustand 只管跨组件 UI 状态；组件 local state 只管瞬时交互。
- SQLite 是离线与业务读写的本地事实源。同步完成后由统一的工作区变更事件失效前端 Query。

## 全局架构约束

- 不在 Query、Zustand 与 local state 中复制 Task、Project、View、Space 或同步业务数据。
- 不把同步凭证写入同步数据、日志或前端领域模型。
- 不让业务核心依赖 Tauri，以保留未来其他客户端复用的空间。
- 能归属到单个 Feature 的设计细节写入该 Feature 的 `DESIGN.md`；本文件不复制。

## 相关文档

- [系统设计](./Documents/01-架构/A2-系统设计.md)
- [领域模型](./Documents/01-架构/A1-领域模型.md)
- [界面系统](./Documents/01-架构/A3-界面系统.md)
- [文档索引](./Documents/_INDEX.md)
