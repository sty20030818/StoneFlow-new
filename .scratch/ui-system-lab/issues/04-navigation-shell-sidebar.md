# 04 — 让 Navigation 与 Shell/Sidebar 语义和密度可审查

**What to build:** 让审查者能够通过真实导航组件比较当前态、链接语义、Hover、键盘焦点和密度，并在一个最小 Shell/Sidebar 组合中观察整体层级、长中文与窄容器表现；无法安全隔离的行为必须明确留给真实应用。

**Blocked by:** 01 — 建立 UI Lab 垂直内核并跑通 Button 双视图样例。

**Status:** ready-for-agent

- [ ] StoneFlow 的 Navigation 分类可从目录或搜索进入，并能找到 Breadcrumb、Sidebar、Tabs、Pagination、Command 与 Settings Navigation；确实无法隔离展示的项目必须明确标为“仅真实应用验证”，不得静默缺失。
- [ ] Breadcrumb 样例同时呈现可导航祖先与当前项，并明确标注两者的预期语义；实际角色、Tab 次序、颜色和 Hover 结果来自真实组件，Lab 不叠加修饰来伪造正确结果。
- [ ] Sidebar 样例允许在相同内容条件下观察当前 32 高度与上游 36 高度基线，并覆盖普通、当前、Hover、Pressed、Keyboard Focus Visible 与 Disabled 等适用状态；对比本身不修改产品密度规则。
- [ ] Tabs、Pagination、Command 和 Settings Navigation 的适用 Current/Selected/Disabled 状态均可通过真实交互触发；不能可靠静态模拟的状态提供简短操作提示，而不是用静态样式冒充。
- [ ] 用户只用键盘即可通过 Lab Shell 找到、进入并离开每个导航样例；Lab 自身不会抢占组件快捷键。被测导航的实际键盘结果与焦点缺口必须可观察、可记录，但真实组件失败不要求在本 ticket 内修复。
- [ ] 最小 Shell/Sidebar 场景可在常规宽度、窄容器和长中文下审查整体层级、密度、溢出与当前态，且不要求真实业务数据、完整路由树或跨窗口状态。
- [ ] 每个样例显示真实 owner、HeroUI/主题/recipe/产品 Module 的责任层、适用状态和 Lab/真实应用验证边界，审查者能够据此判断后续问题应归属何处。
- [ ] 完成该 ticket 不新增仅供 Lab 使用的产品公共 Interface，不深导入产品私有实现，不复制生产导航 JSX，也不修改已发现的 Breadcrumb、Sidebar 或焦点问题；这些问题留给后续独立 ticket。
