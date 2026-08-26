# 05 — 让 Collections 与 Task 工作面可审查

**What to build:** 让审查者能够操作 StoneFlow 的真实集合组件和紧凑元数据，并通过最小可信的 Task Row、Group Header 与 Board 场景观察选择、尾部动作、键盘可发现性、长文本和 560 紧凑边界；不为 Lab 复制复杂任务运行时。

**Blocked by:** 01 — 建立 UI Lab 垂直内核并跑通 Button 双视图样例。

**Status:** ready-for-agent

- [ ] StoneFlow 的 Collections 分类可找到 RowShell、Menu、ListBox、ListView、Table、Tag、Chip、Badge、Avatar、Task Row、Group Header 与 Task Board；无法隔离展示的项目有明确的“仅真实应用验证”说明。
- [ ] RowShell、Menu、ListBox 与 ListView 至少可观察普通、选中、包含尾部操作、禁用和长文本等适用状态，并使用真实交互语义而不是静态容器模拟。
- [ ] 只在 Hover 时出现的行操作仍可由键盘用户发现并操作；若生产组件不满足该条件，Lab 应暴露真实现状而不是使用专用覆盖掩盖。
- [ ] Table、Tag、Chip、Badge 与 Avatar 可在短值、长中文、溢出、空值、选中和可移除等适用场景下观察；没有真实产品需求的复杂表格能力不为“组件齐全”而新增。
- [ ] Task Row 与 Group Header 使用最小可信 fixture 呈现高频信息、状态、尾部动作与扫描密度，不依赖真实 Store、Query、Tauri Command 或业务写入。
- [ ] Task Board 可在宽容器与小于 560 的窄容器中审查现有紧凑行为、文本溢出和列间关系；该 ticket 不改变既有 560 响应式规则。
- [ ] 复杂 Task 场景只有在既有公开 Module/Interface 足以组合时才进入预览；需要深导入、复制生产 JSX 或新增 Lab 专用 facade 的场景必须标为“仅真实应用验证”。
- [ ] 每个集合样例显示 owner、责任层、适用状态与验证边界，并可通过目录和搜索找到；长中文与窄容器不复制第二套组件实现。
- [ ] 完成该 ticket 不新增数据表平台、集合状态框架或产品运行时依赖，也不修复审查中发现的 Task/集合视觉问题；边界检查仍能证明产品代码不依赖 Lab。
