# 02 — 让视觉基线、Actions 与 PageFrame 组合可审查

**What to build:** 让审查者能够在 UI Lab 中观察 StoneFlow 实际生效的视觉基线与动作组件，并通过一个最小 PageFrame 产品组合验证这些规则在标题、工具栏、筛选、长中文和窄容器中的真实表现，而不是另建一份 token 或静态样式说明书。

**Blocked by:** 01 — 建立 UI Lab 垂直内核并跑通 Button 双视图样例。

**Status:** completed; archived; manual acceptance transferred

- [x] Foundations 可审查面展示实际生效的语义颜色、排版层级、4/8/12 间距、28/32/36 控件高度、6/8/12 圆角、边框、阴影和图标基线，不维护第二份 token 或实验室专用视觉值。
- [x] 颜色与排版样例同时覆盖关键语义角色、常见中文、短英文和长中文，使审查者能判断对比度、层级、换行与扫描性。
- [x] Actions 可审查面使用真实组件覆盖项目实际存在的 Button 变体和尺寸，以及文字按钮、图标按钮、加载、禁用和长文案；每个样例明确推荐语义，不把所有 Accent Button 一概判错。
- [x] ButtonGroup、ToggleButtonGroup 与 Toolbar 的最小真实样例可操作，并覆盖适用的单选、复选、选择、禁用及图标/文字组合状态；Lab 不创建第二套业务工具栏。
- [x] Link 与按钮式动作的最小样例能显示真实语义、Hover 和键盘焦点差异，不用 Lab 装饰伪造正确结果。
- [x] 审查者可以实际触发适用的 Rest、Hover、Pressed、Selected/Open、Pointer Focus、Keyboard Focus Visible、Disabled 与 Loading；Lab 不用额外伪类掩盖真实组件结果。
- [x] PageFrame 代表场景以最小真实组合展示标题、Toolbar、Filter 与内容，并能切换常规、长标题和窄容器条件；它不复制完整页面、路由或业务数据流。
- [x] 每个 Foundations、Actions 与 PageFrame 样例均可被分类和搜索，显示真实责任归属与验证边界；切换后只有当前预览被挂载。
- [x] 浏览器走查能够复现并记录指针/键盘焦点、长中文和窄容器结果；本 ticket 只建立观察面，不把发现的问题宣称为已修复，不引入旧主题、兼容样式或新的生产行为。
