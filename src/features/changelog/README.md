# changelog

> 读取、校验、筛选并展示 StoneFlow 更新日志。

内容源是仓库根 [CHANGELOG.md](../../../CHANGELOG.md)，结构标记只接受中文契约。运行时优先读取发布根目录的远端副本，失败时回退到最近一次有效远端文档或构建时内置快照。

## 公开入口

- `ChangelogDialog`：按渠道展示完整发布历史，可定位指定版本。
- `ChangelogRelease`：渲染单个已解析版本。
- `useChangelog`、`ChangelogQuery`：查询完整历史或版本区间。

## 最小使用示例

```tsx
<ChangelogDialog
	open={open}
	channel='stable'
	onOpenChange={setOpen}
/>
```

跨模块只从 `@/features/changelog` 导入。发布脚本只复用无 React、无 I/O 的 `contract.ts`。

## 源码位置

`src/features/changelog/`

## 相关文档

- [模块架构](./ARCHITECTURE.md)
- [语法、区间与回退设计](./DESIGN.md)
- [Update 模块](../update/README.md)
