# sync

> 主应用中的同步状态、设置与手动重试入口。

## 公开入口

- `getSyncStatus`、`configureSync`、`updateSyncPolicy`、`runSync`
- `SyncStatusProvider`、`useSharedSyncStatus`
- `SyncFooterStatusItem`、`SyncConfigDialog`

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
