# 本地工作文档

StoneFlow 不使用外部 Issue Tracker。规格与实施 tickets 只保存为本地 Markdown。

## 约定

- 每项工作使用 `.scratch/<feature-slug>/`。
- `to-spec` 写入 `.scratch/<feature-slug>/spec.md`。
- `to-tickets` 为每个垂直切片创建独立文件：`.scratch/<feature-slug>/issues/<NN>-<slug>.md`。
- “发布”仅表示创建或更新这些本地文件。
- 不创建 GitHub Issues、标签、PR，也不自动暂存、提交或推送。
