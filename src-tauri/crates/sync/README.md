# stoneflow-sync

同进程远端协议库。负责用户 Postgres 上的协议 schema、operation 上传、增量/全量下载与只读诊断。

## 职责

- 打开远端 Postgres 连接并校验协议 schema
- 在协议 schema v2 持有稳定远端 `instance_id`，并按调用方的 `expected_instance_id` fail closed
- 提交 operation、读取增量变更与 baseline
- 提供远端 health / diagnose 探针结果；ready schema 上的查询只读，门面首次连接仍会 bootstrap / 迁移协议 schema

## 公开入口

- `upload_operations(&SyncCloudConfig, &[SyncOperation])`
- `download_after(&SyncCloudConfig, after_seq)` / `download_full(&SyncCloudConfig)`
- `health(&SyncCloudConfig)` / `diagnose_cloud(&SyncCloudConfig)`

`SyncCloudConfig.database_url` 只在连接边界使用；runtime 负责安全展示与凭据存储。已有本地绑定时，调用方必须填写 `expected_instance_id`，每条短连接都会在业务读写前核对远端身份。首次握手可不传 identity，以便空库初始化或 v1 原位升级。

## 禁止依赖

- 不得依赖 Tauri / AppHandle
- 不得通过 stdout/stderr JSON 与宿主通讯
- 不得再提供独立 binary sidecar

调度、identity/cursor 本地原子绑定、显式 rebind、单飞合并、UI 事件与错误码映射由 `runtime` 负责。`sync` crate 不清理本地副本或 Outbox，也不决定用户确认流程。

## 相关

- 常青：`Documents/01-架构/A2-系统设计.md`（云同步）
- 任务追溯（已归档）：`Documents/98-归档/02-已完成重构/2026-07-24-local-first-sync-platform/`
