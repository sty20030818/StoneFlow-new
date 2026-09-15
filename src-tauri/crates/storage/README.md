# stoneflow-storage

SQLite 持久化层。

## 职责

- 连接池与每连接 PRAGMA 初始化
- SeaORM entities
- migration
- repository 实现
- entity ↔ application record 映射

## 公开入口

- `database::{bootstrap_database, connect_sqlite, …}`
- `entities`
- `migration::run_migrations`
- `repositories`
- `StorageError`

## 数据迁移

当前迁移链只有 `m20260915_000001_baseline`，空库直接建立九列 View 表。
保留 SeaORM 的版本化前向迁移机制；后续变更追加迁移，不重写已执行的 baseline。
启动先在只读快照内检查迁移记录、必需表和 View 列，再启用 WAL；旧账本、未知或残缺数据库明确拒绝，不自动改账本、补表或清库。
整次迁移及迁移记录写入使用同一 IMMEDIATE 事务，失败时回滚。

旧三步迁移链与旧 View 格式转换已退役。业务读写由 application 的严格 codec 校验，无效定义保留为不可用记录。
最新代码不直接打开旧账本或旧备份。当前 Mac 的账本收敛属于备份后单独执行的维护，必须逐表证明账本之外的数据未变；不由启动流程代办。
其他设备重建本地并从同一云端 v3 全量恢复前须保留完整本地备份；未同步内容、本机设置和活动历史不能依靠云端恢复。
迁移不提供逆向降级；回退须恢复匹配的代码与完整备份。切换约束见 [ADR-0004](../../../Documents/01-架构/adr/ADR-0004-single-view-contract-and-sync-v3.md)。

## 禁止依赖

- Tauri
- 同步协议调度（由 `sync` / `runtime` 负责）
