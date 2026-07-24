# R1 Workspace 与架构边界 - Spec

## 目标

将 Rust workspace 收敛为稳定依赖方向，删除运行时业务服务层与同步 sidecar 的结构入口，但不在本任务完成全部业务迁移。

## 范围

- 建立 `domain / application / storage / sync / platform / runtime / test-support` crate 布局。
- 将 `usecase` 改名为 `application`；将 schema 与 migration 合并到 storage。
- 将 sync-worker 转为 library 入口；移除独立 binary、CLI 参数和 stdout/stderr JSON 契约。
- 移除独立 integration-tests crate，保留 test-support。
- 建立 runtime composition、分层错误、tracing 与 SQLite 每连接初始化的最低基础。

## 不做什么

- 不完成新领域模型、同步协议或全部 command 的业务迁移。
- 不预建没有调用方的 trait、factory 或平台抽象。

## 当前上下文

- 当前 workspace 有 `runtime`、`sync-worker`、`platform`、`domain`、`usecase`、`storage`、`schema`、`migration`、`test-support`、`integration-tests` 十个成员。
- `runtime/services` 直接持有 SeaORM Repository、手写事务与同步 payload；`runtime/sync/engine.rs` 仍启动外部 binary。
- `schema` 与 `migration` 只服务 SQLite storage；`integration-tests` 只是测试 host，不是独立产品模块。

## 目标文件结构

```text
src-tauri/
├── Cargo.toml
└── crates/
    ├── domain/
    ├── application/
    ├── storage/
    │   └── src/sqlite/{connection,entities,migration,repositories}/
    ├── sync/
    ├── platform/
    ├── runtime/
    └── test-support/
```

文件夹只是职责边界，不要求每个概念再拆 crate。`sync` 是 crate 的原因是它拥有独立的 Turso 协议、调度和测试，不是为了抽象而抽象。

## 实施设计

1. 调整 workspace members、包名和 crate 路径；根 `src/main.rs` 继续只调用 runtime builder。
2. 将 `usecase` 内容迁入 `application`，将 ports、DTO、应用错误保持在该 crate；禁止引入 SeaORM/Tauri/libsql。
3. 将 SeaORM entity、migration 和 SQLite connection 全部迁入 storage；只允许 storage 引入 SeaORM。
4. 将 worker 的非 CLI 逻辑迁入 sync；删除 `main.rs`、参数解析、二进制寻找、stdout/stderr JSON 协议。
5. 将跨 crate 测试迁入 `runtime/tests`，领域/存储测试就近放各 crate；保留 `test-support` 的临时库和 fixture 工具。
6. 用 `AppState`/composition 逐步替换 runtime services；本阶段允许旧业务实现暂存，但不得新增调用。
7. 在每条 SQLite pool 连接建立时执行 PRAGMA 初始化，不能只在 pool 创建后运行一次。

## 接口与依赖规则

- application 定义业务所需 ports；storage/sync 可以实现它们，application 不得反向 import 具体实现。
- sync 通过 application 的同步入口和 storage 的受控接口工作；它不接触 Tauri `AppHandle`。
- runtime 命令参数和返回均为 owned serde DTO；内部错误只在 runtime 统一映射。
- `platform` 仅封装 Tauri/OS 行为，不存业务状态。

## 约束

- `application` 不依赖 SeaORM、Tauri 或 libsql。
- `runtime` 是唯一组合层；`runtime/services` 不得保留为新路径。
- workspace 在每个提交点保持可编译、可测试。

## 退出条件

- 旧 crate/binary 无 workspace member 或生产引用。
- 目标 crate 依赖方向可由 Cargo 与架构测试验证。
- SQLite pool 的每条连接均配置必要 PRAGMA。

## 验证

- `cargo fmt --check`、严格 Clippy、workspace tests。
- 检索确认旧 crate、sidecar 协议和 runtime/services 无残留生产入口。

## 风险与切分原则

- Cargo 移动容易造成 feature、测试和 build script 漂移，因此每次目录移动后立即跑 workspace 校验。
- 不在本任务把所有业务逻辑“搬家后顺便重写”；R2-R8 才负责各纵切。
- 若旧 services 临时保留以保持编译，必须在 R1 TASKS 标为过渡入口，并在 R9 删除。

## 关联

- [总重构 Spec](../2026-07-22-backend-rearchitecture/SPEC.md)
- [R2 领域与存储基线](../2026-07-22-r2-domain-storage-baseline/SPEC.md)
