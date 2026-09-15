# stoneflow-sync

同进程远端协议库。负责用户 Postgres 上的协议 schema、operation 上传、增量/全量下载与只读诊断。

## 职责

- 打开远端 Postgres 连接并校验协议 schema
- 在协议 schema v3 持有稳定远端 `instance_id`，并按调用方的 `expected_instance_id` fail closed
- 提交 operation、读取增量变更与 baseline
- 提供远端 health / diagnose 探针结果；ready schema 上的查询只读，门面首次连接仍会 初始化空同步 schema

## 公开入口

- `upload_operations(&SyncCloudConfig, &[SyncOperation])`
- `download_after(&SyncCloudConfig, after_seq)` / `download_full(&SyncCloudConfig)`
- `health(&SyncCloudConfig)` / `diagnose_cloud(&SyncCloudConfig)`

`SyncCloudConfig.database_url` 只在连接边界使用；runtime 负责安全展示与凭据存储。已有本地绑定时，调用方必须填写 `expected_instance_id`，每条短连接都会在业务读写前核对远端身份。首次握手可不传 identity，以便空同步 schema 初始化；已有库仅接受五张同步表存在且版本为 v3、身份有效的副本，不升级旧版、不修复残缺 schema。v2 到 v3 专用迁移 API 与工具已退役，已有云端 v3 继续使用原身份与协议状态。

## 禁止依赖

- 不得依赖 Tauri / AppHandle
- 不得通过 stdout/stderr JSON 与宿主通讯
- 不得再提供独立 binary sidecar

调度、identity/cursor 本地原子绑定、显式 rebind、单飞合并、UI 事件与错误码映射由 `runtime` 负责。`sync` crate 不清理本地副本或 Outbox，也不决定用户确认流程。

## 相关

- 常青：`Documents/01-架构/A2-系统设计.md`（云同步）
- 任务追溯（已归档）：`Documents/98-归档/02-已完成重构/2026-07-24-local-first-sync-platform/`

## 本地副本恢复

退役本地旧迁移后，其他设备须升级当前代码、保留完整本地备份，再重建本地并连接同一云端 v3 全量恢复。未同步内容、本机设置和活动历史不能依靠云端恢复；未同步内容须在重建前单独保全。

Mac 当前副本的无损账本维护及旧备份恢复边界见 [ADR-0004](../../../Documents/01-架构/adr/ADR-0004-single-view-contract-and-sync-v3.md)。本次退役不修改已有云端 v3，后续协议变更仍需明确迁移、客户端升级与恢复边界。
