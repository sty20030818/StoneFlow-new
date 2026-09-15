# sync

> 主应用中的同步状态、设置与手动重试入口。

## 公开入口

- `getSyncStatus`、`getSyncDiagnostics`、`configureSync`、`rebindSync`、`updateSyncPolicy`、`runSync`
- `SyncStatusProvider`、`useSharedSyncStatus`
- `SyncFooterStatusItem`、`SyncConfigDialog`

普通配置会验证 Postgres 的稳定实例 identity，并与本机 cursor 绑定核对；不一致时必须在同一对话框明确确认 `rebindSync`。有待上传 Outbox 时后端拒绝重新绑定。界面和状态只接收 scheme / host / port / path 组成的安全地址，不接收 authority 或 query。

存在 cursor 却缺少 identity 是绑定损坏，进入 `diverged` 并阻断普通同步和诊断。恢复使用既有的连接验证与显式 rebind；不再沿用来源不明的 cursor，也不提供旧绑定采用入口。`baseline_required` 仍可执行普通同步。远端仅接收当前协议 v3；旧库需要保留备份后使用全新的同步 schema。

## 最小使用示例

```tsx
<SyncStatusProvider>
  <Shell />
</SyncStatusProvider>
```

## 源码位置

`src/features/sync/`

## 相关文档

- [模块架构](./ARCHITECTURE.md)
- [同步协议设计](../../../src-tauri/crates/sync/DESIGN.md)
