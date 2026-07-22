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

## 禁止依赖

- Tauri
- 同步协议调度（由 `sync` / `runtime` 负责）
