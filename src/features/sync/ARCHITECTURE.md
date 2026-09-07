# sync · 数据同步状态

> 作用：描述 **当前已落地** 的 `src/features/sync` 边界
> 云端副本：用户 Postgres 连接串（非 Turso）

---

## 1. 职责 / 不负责

**负责：**

- 同步状态 / 诊断 / 配置 / 手动运行 API（Tauri invoke）
- 壳级 `SyncStatusProvider` 共享 controller
- 状态文案与色调（`syncStatusPresentation`）
- 页脚同步项、配置对话框 UI

**不负责：**

- 工作区 Query invalidate（→ `@/features/workspace`）
- 应用更新流程（→ `@/features/update`；`SystemStatusChip` 只读 sync public）
- 设置页路由壳（→ `layout` · `@/features/settings`）

---

## 2. 目录（简树）

```txt
src/features/sync/
├── ARCHITECTURE.md
├── index.ts
├── api/sync.ts
├── model/
│   ├── SyncStatusProvider.tsx
│   ├── useSyncStatusController.ts
│   ├── syncStatusPresentation.ts
│   └── deriveSyncFooterView.ts
└── components/
    ├── SyncFooterStatusItem.tsx
    └── SyncConfigDialog.tsx
```

---

## 3. Public 最小集（要点）

| 类       | 符号                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------- |
| API      | `getSyncStatus` · `getSyncDiagnostics` · `configureSync` · `rebindSync` · `updateSyncPolicy` · `runSync` |
| 类型     | `SyncStatus` · `SyncReplicaState` · `SyncPolicyMode` · `SyncDatabaseConfigInput` · 状态/诊断 payload     |
| 展示     | `getSyncStatusTone` · `formatSyncStatus` · `formatReplicaState` 等                                    |
| Provider | `SyncStatusProvider` · `useSharedSyncStatus`                                                          |
| UI       | `SyncFooterStatusItem` · `SyncConfigDialog`                                                           |

---

## 4. 禁止依赖

- **不得** `import` `@/layout/**`
- **不得** 外模块深路径 import
- 不 invalidate 业务 Query（与 `workspace` 分工）
- 跨 feature 只暴露 public；`update` 可读 sync 展示函数

---

## 5. 装配点

| 位置                                  | 挂载                     |
| ------------------------------------- | ------------------------ |
| `layout/ShellLayoutContent.tsx`       | `SyncStatusProvider`     |
| `layout/ShellFooter.tsx`              | `SyncFooterStatusItem`   |
| `features/settings/SettingsSyncPanel` | API + `SyncConfigDialog` |

---

## 6. 状态落点（URL | Query | UI）

| 状态             | 落点                                                |
| ---------------- | --------------------------------------------------- |
| 同步状态 payload | **UI** `useSyncStatusController`（Provider 内单例） |
| Tauri 推送       | **事件** `stoneflow://sync/status-changed`          |
| 同步凭据         | **Debug** 根目录 `.env.local`；**Release** 系统钥匙串 |
| 远端地址展示     | **派生**：只保留 scheme / host / port / path；authority 与全部 query 丢弃 |
| 配置表单         | `SyncConfigDialog`：Release 先验证连接与 identity；Debug 只读说明 |
| 页脚文案         | **派生** `deriveSyncFooterView`（无独立 store）     |

---

## 7. 配置与重新绑定合同

- `configureSync` 是普通配置入口：连接候选 Postgres、读取远端稳定 identity，并与本机绑定核对。不同 identity、来源不可证明的旧 cursor，或本机与未绑定远端同时已有数据时返回 `Conflict`，不会上传 Outbox、复用旧 cursor 或清空本机。
- `SyncConfigDialog` 只把上述 `configureSync` 的 `Conflict` 转成“确认重新绑定”步骤；其它连接、鉴权、数据库或钥匙串错误保持普通失败，可原位修改和重试。
- `rebindSync` 是用户明确确认后的危险入口。后端在同一个本地写边界内再次检查 Outbox；仍有待上传变更时拒绝。非空远端以其完整 baseline 替换本机同步副本，空远端保留本机业务并建立新的 origin baseline。
- rebind 提交后 runtime 立即发送 `stoneflow://workspace/changed`（`reason: rebind`，覆盖五个同步领域）；普通连续同步也在每个成功 round 提交后立即发送自己的事件。后续 round 失败不会吞掉前一轮已提交变化。
- 业务 Query 失效仍由 `@/features/workspace` 消费事件完成，`sync` feature 不直接操作业务缓存。
