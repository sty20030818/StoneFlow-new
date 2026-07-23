# 后端架构与本地优先同步重构 - Tasks

## 当前阶段

R0–R7（协议/引擎 1–4）已完成；R8 阶段一进行中。R7 阶段五为双设备/性能验证债。

## 阶段任务

| 阶段 | 任务 | 状态 |
|---|---|---|
| R0 | [备份与基线](../2026-07-22-r0-backup-baseline/SPEC.md) | 已完成（范围见 R0 实施偏差） |
| R1 | [Workspace 与架构边界](../2026-07-22-r1-workspace-boundaries/SPEC.md) | 已完成（见 R1 实施偏差与遗留债） |
| R2 | [领域与存储基线](../2026-07-22-r2-domain-storage-baseline/SPEC.md) | 已完成（硬切零兼容；业务 CRUD stub 见 R2 TASKS） |
| R3 | [Space](../2026-07-22-r3-space/SPEC.md) | 已完成（默认替代、Project/Task 精确级联恢复、tombstone 与前端契约迁移） |
| R4 | [Project](../2026-07-22-r4-project/SPEC.md) | 已完成 |
| R5 | [Task 与 Activity](../2026-07-22-r5-task-activity/SPEC.md) | 已完成 |
| R6 | [View 与查询](../2026-07-22-r6-view-queries/SPEC.md) | 已完成 |
| R7 | [同步引擎](../2026-07-22-r7-sync-engine/SPEC.md) | 阶段一至四完成；阶段五验证债 |
| R8 | [Runtime 与 Platform](../2026-07-22-r8-runtime-platform/SPEC.md) | 已完成（见 R8 TASKS） |
| R9 | [旧链路清理](../2026-07-22-r9-legacy-cleanup/SPEC.md) | 待开始 |
| R10 | [全量验证与文档](../2026-07-22-r10-verification-docs/SPEC.md) | 待开始 |

## 阻塞

无。

## 与 SPEC 的实施偏差

见各阶段 TASKS。

## 完成记录

- R2（2026-07-22）：领域 WorkState + 新 SQLite baseline + Outbox/Tombstone/UoW；旧 soft-delete / sync_mutations 硬切拆除。
- R3（2026-07-22）：Space application service 与生命周期收口；默认 Space 自动替代；Project/Task 以 operation 来源精确级联恢复；永久删除写入 tombstone；IPC 使用 camelCase，Rust/SQLite 使用 snake_case。
- R5（2026-07-23）：Task、TaskLink 与 Activity 完整纵切；批量 Task 操作采用同一 operation id 的原子事务；Outbox 支持一个 operation 对应多条变更；排序、时间、归属、回收站生命周期与 Tauri 契约完成验证。
