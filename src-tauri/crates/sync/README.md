# stoneflow-sync

同进程远端协议库。负责用户 Postgres 上的协议 schema、operation 上传、增量/全量下载与只读诊断。

## 职责

- 打开远端 Postgres 连接并校验协议 schema
- 提交 operation、读取增量变更与 baseline
- 提供远端 health / diagnose 只读结果

## 公开入口

- `upload_operations(&SyncCloudConfig, &[SyncOperation])`
- `download_after(&SyncCloudConfig, after_seq)` / `download_full(&SyncCloudConfig)`
- `health(&SyncCloudConfig)` / `diagnose_cloud(&SyncCloudConfig)`

## 禁止依赖

- 不得依赖 Tauri / AppHandle
- 不得通过 stdout/stderr JSON 与宿主通讯
- 不得再提供独立 binary sidecar

调度、单飞合并、UI 事件与错误码映射由 `runtime` 负责。

## 相关

- 常青：`Documents/01-架构/A2-系统设计.md`（云同步）
- 任务追溯（已归档）：`Documents/98-归档/02-已完成重构/2026-07-24-local-first-sync-platform/`
