# sync

> 主应用中的同步状态、设置与手动重试入口。

## 公开入口

- `getSyncStatus`、`getSyncDiagnostics`、`configureSync`、`rebindSync`、`updateSyncPolicy`、`runSync`
- `SyncStatusProvider`、`useSharedSyncStatus`
- `SyncFooterStatusItem`、`SyncConfigDialog`

普通配置会验证 Postgres 的稳定实例 identity，并与本机 cursor 绑定核对；不一致时必须在同一对话框明确确认 `rebindSync`。有待上传 Outbox 时后端拒绝重新绑定。界面和状态只接收 scheme / host / port / path 组成的安全地址，不接收 authority 或 query。

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
