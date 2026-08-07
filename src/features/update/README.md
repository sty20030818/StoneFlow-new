# update

> 主应用中的更新检查、下载、安装与状态展示入口。

## 公开入口

- `useUpdateEvents`：在壳层订阅后端更新会话，并消费一次性更新完成确认。
- `useManualUpdateCheck`：菜单、设置页和关于窗口共用的手动检查入口。
- `UpdateDialog`、`SystemStatusChip`、`UpdateStatusFooterItem`、`UpdateSettingsSection`：主应用装配组件。
- `@/features/update/contract`：跨模块读取当前更新渠道的最小契约。

## 最小装配

```tsx
function ShellUpdateLayer() {
	useUpdateEvents()

	return (
		<>
			<UpdateDialog />
			<SystemStatusChip />
		</>
	)
}
```

`useUpdateEvents` 在主应用壳中只装配一次。页脚和设置页按需挂载各自组件。

## 源码位置

`src/features/update/`

## 相关文档

- [模块架构](./ARCHITECTURE.md)
- [更新流程设计](./DESIGN.md)
- [Changelog 模块](../changelog/README.md)
