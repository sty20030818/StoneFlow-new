# changelog · 更新日志

唯一内容源是仓库根 `CHANGELOG.md`。模块通过 Tauri 更新边界优先读取发布到 R2 的静态副本，失败时回退到构建时嵌入的同一文件快照。

- `model.ts`：解析、语义版本排序、渠道过滤与目标版本定位。
- `useChangelog.ts`：单进程缓存与远端/本地回退。
- `ChangelogDialog.tsx`：头像菜单和更新完成 Toast 打开的宽版记录弹窗。
- `ChangelogMarkdown.tsx`：仅渲染标题、列表、段落、加粗与 Unicode 图标。

更新模块只能按版本消费内容，不能反向拥有或写入 changelog 状态。
