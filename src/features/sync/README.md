# sync

> 主应用中的同步状态、设置与手动重试入口。

## 公开入口

- `getSyncStatus`、`getSyncDiagnostics`、`configureSync`、`adoptLegacySyncRemote`、`rebindSync`、`updateSyncPolicy`、`runSync`
- `SyncStatusProvider`、`useSharedSyncStatus`
- `SyncFooterStatusItem`、`SyncConfigDialog`

普通配置会验证 Postgres 的稳定实例 identity，并与本机 cursor 绑定核对；不一致时必须在同一对话框明确确认 `rebindSync`。有待上传 Outbox 时后端拒绝重新绑定。界面和状态只接收 scheme / host / port / path 组成的安全地址，不接收 authority 或 query。

旧版本只保存 cursor、未保存 identity 时，副本进入 `legacy_binding_required`。用户可在 `SyncConfigDialog` 核对状态载荷中的脱敏地址并明确确认 `adoptLegacySyncRemote`：该命令不接收或返回 URL，在同一远端事务的一致快照内先只读检查协议、最新序号与实例身份；校验失败不提交写入，校验通过的 v1 才升级到当前协议，v2 不改 schema。远端最新序号不得落后于本机 cursor；随后本地事务只补 identity，保留 cursor、Outbox 与业务数据。钥匙串配置也可改用其他远端并进入既有 rebind 流程。`baseline_required` 仍可执行普通同步；`legacy_binding_required` 与 `diverged` 会阻断普通同步和诊断。

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
