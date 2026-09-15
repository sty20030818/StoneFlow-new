# 本地工作文档

StoneFlow 不使用外部 Issue Tracker。规格与实施 tickets 只保存为本地 Markdown。

## 约定

- 每项工作使用 `.scratch/<feature-slug>/`。
- 已完成工作包整体移动到 `.scratch/archive/<feature-slug>/` 并冻结；`archive` 不是 feature slug，活跃任务扫描必须跳过该目录，新问题另建工作包。
- `to-spec` 写入 `.scratch/<feature-slug>/spec.md`。
- `to-tickets` 为每个垂直切片创建独立文件：`.scratch/<feature-slug>/issues/<NN>-<slug>.md`。
- “发布”仅表示创建或更新这些本地文件。
- 不创建 GitHub Issues、标签、PR，也不自动暂存、提交或推送。
- 验收截图与录屏仅作本地产物，由 `.gitignore` 排除；提交必要的文字结论、环境与结构化证据。已入历史的图片清理时保留提交号与恢复路径，不为缩小目录擅自重写 Git 历史。
