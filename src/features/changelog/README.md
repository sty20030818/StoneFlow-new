# changelog

> 读取、校验、筛选并展示 StoneFlow 更新日志。

内容源是仓库根 [CHANGELOG.md](../../../CHANGELOG.md)，结构标记只接受中文契约。打开时立即展示已有有效文档或构建时内置快照，后台按需刷新远端副本；失败不清空已有内容。

## 公开入口

- `ChangelogDialogHost`：接收渠道与打开意图，首次打开后 lazy mount 完整历史 Dialog；可定位指定版本。
- `presentation` 中的 `ChangelogRelease`：渲染单个已解析版本。
- `presentation` 中的 `ChangelogReleaseContent`：使用 HeroUI Pro Markdown 渲染分类正文，供已展示版本元信息的场景复用；`headingLevel` 只控制分类标题的语义层级。
- `useChangelog`、`ChangelogQuery`：查询完整历史或版本区间。
- `prefetchChangelog(targetVersion?)`：非阻塞预取同一份文档，新目标缺失时主动刷新。

## 最小使用示例

```tsx
<ChangelogDialogHost
	open={open}
	channel='stable'
	onOpenChange={setOpen}
/>
```

跨模块从 `@/features/changelog` 导入 Host、查询与预取，从 `@/features/changelog/presentation` 导入正文展示；后者只在弹窗懒加载图中使用。关闭且从未打开时不会加载 Markdown 展示图。发布脚本只复用无 React、无 I/O 的 `contract.ts`。

## 源码位置

`src/features/changelog/`

## 相关文档

- [模块架构](./ARCHITECTURE.md)
- [语法、区间与回退设计](./DESIGN.md)
- [Update 模块](../update/README.md)
