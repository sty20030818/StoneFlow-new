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
| API      | `getSyncStatus` · `getSyncDiagnostics` · `configureSync` · `updateSyncPolicy` · `runSync`             |
| 类型     | `SyncStatus` · `SyncReplicaState` · `SyncPolicyMode` · `SyncStatusPayload` · `SyncDiagnosticsPayload` |
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
| 配置表单         | **UI** `SyncConfigDialog` 本地 state + API 持久化   |
| 页脚文案         | **派生** `deriveSyncFooterView`（无独立 store）     |
