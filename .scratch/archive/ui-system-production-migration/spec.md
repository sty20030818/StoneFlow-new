# StoneFlow UI Lab 目标生产迁移

**Status:** completed; archived; real-app acceptance transferred
**Triage:** completed
**日期:** 2026-08-28
**采用基线:** HeroUI OSS 3.2.4、HeroUI Styles 3.2.4、HeroUI Pro 1.0.0-beta.8
**设计输入:** [已归档 UI Lab 人工审查规格](../ui-lab-review/spec.md)
**长期门禁:** [ADR-0003](../../../Documents/01-架构/adr/ADR-0003-ui-lab-review-and-product-migration-gate.md)
**真实应用验收:** [统一产品验收](../../unified-product-acceptance/spec.md)

## Problem Statement

StoneFlow 已完成八批 UI Lab 人工审查，目标外观、交互状态、HeroUI/StoneFlow 所有权和浏览器 Lab 的证据边界已经确认。Lab 现在能够回答“产品应该长什么样、由谁负责”，但不表示真实生产消费者已经全部对齐，也不表示 Main、Launcher、Tauri 或 WebView 已完成验收。

此前工作已经完成 HeroUI 平台选择、P0-P2 标准控件 hard cut 和 UI Lab 建设。本轮不能重新做一次全量组件迁移，也不能按审查截图逐页补丁。真正待解决的问题是：审计当前生产消费者与已确认目标之间的差异，把共享状态收敛到正确 Owner，只修改真实偏离项，并删除迁移后不再需要的局部覆盖、旧实现和兼容路径。

若不建立统一迁移工作包，最容易出现三种长期问题：同一 Hover/Focus/圆角规则散落到多个页面；HeroUI 原生状态被局部 class 或自实现交互重新接管；Lab 已确认的目标与生产实现继续漂移。反过来，若把 Lab 中每个样例都变成生产任务，又会为 Table、Badge、Labels、Modal 变体等没有当前消费者或领域合同的内容提前造系统。

## Solution

在一个本地生产迁移工作包中，按依赖顺序完成五个真实 Owner 切片与一个收口切片。每个切片先审计真实消费者；一致项记录证据后保持不动，偏离项在共同 Owner 处 hard cut，随后删除旧路径。不得新增一对一 wrapper、平行 token/variant runtime、页面私有皮肤、feature flag 或永久兼容层。

### 切片 1：共享主题与 HeroUI Recipe

Owner：`src/styles/theme.css`、`src/styles/components.css`。

- 对齐 Warning 强度、Control/Surface/Overlay 圆角、Checkbox `4px`、控件高度、Focus-visible、MenuItem、Breadcrumb、Sidebar、RowShell/ListView 状态所需的共享规则。
- HeroUI 继续拥有组件结构、Pointer/Keyboard 状态、动画、Overlay、焦点管理和可访问性；StoneFlow 只表达已确认的颜色、密度和几何差异。
- Sidebar 和 Task Row 的 Linear 色值仅作为视觉目标证据，生产实现优先映射现有语义 token，不在组件内硬编码灰色或紫色。
- `uiLab.css` 只保留 Lab Shell、fixture 和预览布局；迁入生产 Owner 后删除仅用于重复表达生产目标的规则。

退出条件：共享语义可被后续切片直接复用，Shell theme 同步与边界检查通过，不需要页面局部 class 才能得到目标状态。

### 切片 2：标准控件与 Action 语义

Owner：HeroUI 标准控件、Metadata Fields feature 与真实 Settings 消费者。

- 审计 Button variant：Primary 只用于流程主动作，Secondary 保留 HeroUI 原生灰底，Ghost 用于上下文明确的轻操作，Danger 用于风险动作。
- 所有文本型 Metadata 属性入口统一为 Ghost；展示值继续使用适合的 Chip 或文本，不以蓝色 Secondary 冒充属性状态。
- 复核 Search/Input/NumberField/Select/DatePicker 不存在祖先与叶子双框；Checkbox 使用 HeroUI 原生交互、动画和三态，只覆盖 `4px` 圆角与语义颜色。
- Settings 保存失败继续使用 HeroUI Danger Alert 与 Danger 重试动作；若生产实现已符合则不改。

退出条件：真实消费者不再使用旧蓝色属性按钮、局部焦点补丁或自实现标准控件状态，现有表单与属性行为保持不变。

### 切片 3：导航与 Shell

Owner：`AppBreadcrumb`、`ShellSidebar`、`SidebarNavRow`、`PageFrame` 及其导航数据适配。

- Breadcrumb 祖先项采用 28px 圆角填充式 Ghost；没有蓝色链接、下划线或整条灰底，当前项不可误呈现为链接。
- Sidebar 行高统一为 36px，明确 Rest/Hover/Current/Current-hover/Disabled/Focus-visible；Hover 必须可感知，Keyboard Focus 不得出现直角外框或白角。
- Tabs、Command、Settings Navigation 的焦点由真实可操作叶子拥有；Escape 或 Tab 后不得出现复合祖先双框。
- 不新增 Breadcrumb/Sidebar facade；导航模型只负责层级与目的地，不持有视觉规则。

退出条件：Main 中所有导航消费者走同一共享规则，指针与键盘状态可区分，原有路由、快捷键和导航数据不变。

### 切片 4：集合、搜索与 Task 工作面

Owner：`RowShell`、`TaskBoard`、`TaskRowAdapter`、`GlobalSearchResults` 与现有 collection/selection/virtualization 模型。

- 统一 Rest/Hover/Selected/Selected-hover/Focus-visible；Hover 使用中性灰，Selected 使用语义 Accent Soft，Selected-hover 比 Selected 更深。
- 保留现有 React Aria collection、上下键选择、范围选择、右键选择、虚拟化、sticky 与 spacer 合同，不复制 HeroUI 或 React Aria 状态机。
- Task Row 连续选中时只处理相邻外观，消除中间圆角；Group Header 维持独立 36px 行，Task Row 维持 44px，Header 与首行间距为 2px。
- Group Header 只验证折叠、双击折叠、计数和尾部新增入口所需合同；不在共享样式层接管业务命令。
- 全局搜索结果按已确认的 HeroUI Pro ListView Primary、无选择模式审计；标题、副标题、时间和 Hover 必须具有清晰层级。
- 以真实容器和 `visibleProperties` 复现窄宽场景；只有确认当前 560px 规则不足时，才增加最小的第二降级档。标题和关键操作优先，低优先级元数据先隐藏，长标题截断并保留可访问名称。

退出条件：真实集合在鼠标、键盘、长标题、连续选择和窄容器下符合目标，且现有选择与虚拟几何测试保持通过。

### 切片 5：Feedback 与 Overlay

Owner：应用 Provider、Danger Confirm、Settings Feedback、Shell Overlays 与实际业务浮层消费者。

- 审计 Empty/Loading/Success/Error/Retry、Alert、Toast 的语义和生命周期；只修真实偏离，不为 Lab fixture 问题重写生产实现。
- Dropdown、Popover、Context Menu、Modal、AlertDialog、Sheet 优先使用 HeroUI 原生结构、Portal、Escape、外点关闭、Tab 循环与焦点恢复。
- Context Menu 保留游标坐标锚点和上游触屏长按合同；示例或产品内容皮肤放在普通子节点，不覆盖行为 Trigger。
- Modal 只处理已有消费者；Danger 确认继续使用 AlertDialog，复杂侧栏流程继续使用 Sheet，不预建新的业务 Modal 平台。

退出条件：实际浮层没有自建焦点状态机、祖先焦点框或残留 Portal，已有业务反馈与命令行为不变。

### 切片 6：清理与验收交接

- 删除已被共享 Owner 取代的 UI Lab 目标重复规则、旧自实现、shadcn 遗留、局部 HeroUI skin、兼容 alias 和零消费者导出。
- 运行完整静态门禁和聚焦行为测试，确认生产源码没有 UI Lab import，Lab 仍独立于生产 Router 与构建入口。
- 将本轮最终状态矩阵引用到既有统一产品验收工作包；Main、Launcher、macOS WKWebView、Windows WebView2、窗口断点、缩放和跨窗口一致性只在真实应用中验收。
- 所有生产切片完成且自动化门禁通过后再归档本工作包；未执行的真实设备项保持外部待验，不伪装成自动化已通过。

## User Stories

1. 作为用户，我希望整个应用保持统一、简洁、整齐、冷静的浅色工作台风格，而不是在不同页面看到不同组件体系。
2. 作为用户，我希望相同语义在 Main、Launcher、Settings 和任务详情中使用相同颜色、密度与状态反馈。
3. 作为用户，我希望 Hover、Pressed、Current、Selected、Open 和 Focus-visible 是可辨认的不同状态。
4. 作为鼠标用户，我希望点击控件后不会出现仅属于键盘导航的突兀外框。
5. 作为键盘用户，我希望焦点始终清晰、符合控件圆角，并且不会被全局 `outline: none` 删除。
6. 作为高对比度模式用户，我希望系统 `Highlight` 焦点仍然可见。
7. 作为用户，我希望组件内部主要使用 4px 与 8px 间距，区域层级再使用更大间距，避免零散的微型规格。
8. 作为用户，我希望 Control、Surface、Overlay 与 Pill 各自有稳定边界，不把所有东西都做成大圆角胶囊。
9. 作为用户，我希望 Primary 只突出当前流程最重要的动作。
10. 作为用户，我希望 Secondary 保持 HeroUI 原生灰底，不出现额外黑边或灰边。
11. 作为用户，我希望上下文明确的属性入口使用轻量 Ghost，而不是一排蓝色按钮。
12. 作为用户，我希望不可逆动作使用 Danger，并与普通操作在视觉和菜单结构上区分。
13. 作为表单用户，我希望 Input、Search、NumberField、Select 与 DatePicker 不出现框中框或 Escape 后的祖先直角框。
14. 作为表单用户，我希望错误、加载、禁用与已填值状态不会互相残留或叠色。
15. 作为 Checkbox 用户，我希望看到 HeroUI 原生动画与交互、4px 圆角和可操作的选中/半选/未选三态。
16. 作为任务编辑用户，我希望保存失败使用统一 Danger Alert，并能从明确的 Danger 重试动作恢复。
17. 作为用户，我希望 Breadcrumb 祖先项像圆角填充式 Ghost，而不是蓝色下划线链接。
18. 作为用户，我希望 Breadcrumb 当前项明确表示当前位置，不伪装成可跳转链接。
19. 作为侧栏用户，我希望 36px 行高在密度和可点击性之间保持平衡。
20. 作为侧栏用户，我希望 Rest、Hover、Current 与 Current-hover 的灰阶差异足够清晰。
21. 作为键盘侧栏用户，我希望只看到与条目圆角一致的 Focus-visible，不出现直角框和白角。
22. 作为 Tabs 用户，我希望方向键、Tab 和 Panel 焦点符合原生语义，且面板不会被直角外框包住。
23. 作为 Command 用户，我希望搜索、菜单项、快捷键、勾选和 Danger 分组对齐，并能用 Escape 正确恢复焦点。
24. 作为列表用户，我希望行在 Hover 时有明确但克制的中性背景。
25. 作为键盘列表用户，我希望用上下方向键移动当前项，并区分焦点项与已选项。
26. 作为多选用户，我希望 Selected 与 Selected-hover 的强度递进明确。
27. 作为连续多选用户，我希望相邻选中行视觉连成一组，中间不保留不必要圆角。
28. 作为任务列表用户，我希望 Checkbox 只在需要时出现，不长期抢占信息层级。
29. 作为任务列表用户，我希望 Group Header 独占一行，折叠箭头、状态、标题、数量与新增入口对齐。
30. 作为任务列表用户，我希望 Header 与第一行只相隔 2px，同时不同分组仍能清晰分辨。
31. 作为窄窗口用户，我希望标题和关键操作优先保留，低优先级元数据按规则降级而不是挤压标题。
32. 作为长中文内容用户，我希望标题可截断但完整可访问名称仍可获取。
33. 作为全局搜索用户，我希望结果列表标题、副标题、时间和 Hover 具有清晰层级，不显得拥挤。
34. 作为菜单用户，我希望左侧图标与标题、右侧勾选与 Kbd 按固定列对齐。
35. 作为菜单用户，我希望搜索头部、快捷键提示、普通项和危险项遵循同一 Menu 配方。
36. 作为用户，我希望 Empty、Loading、Success、Warning 与 Error 使用一致的语义反馈，而不是手写彩色边框组合。
37. 作为用户，我希望 Warning 与其他信息色强度协调，同时允许 Soft Warning 使用深色文字。
38. 作为 Toast 用户，我希望异步反馈有明确生命周期，不重复、不残留也不意外丢失。
39. 作为 Context Menu 用户，我希望右键菜单出现在触发位置，触屏长按走上游合同，关闭后焦点正确恢复。
40. 作为浮层用户，我希望 Dropdown、Popover、Modal、AlertDialog 与 Sheet 都能用 Escape、外点或明确按钮关闭，并遵守各自焦点合同。
41. 作为辅助技术用户，我希望组件保留 HeroUI/React Aria 的角色、名称、禁用、选择和焦点语义。
42. 作为维护者，我希望共享视觉变化只需修改 `theme.css` 或 `components.css`，而不是搜索所有页面补丁。
43. 作为维护者，我希望产品结构与业务状态留在对应 Module，标准控件行为继续由 HeroUI 拥有。
44. 作为维护者，我希望迁移完成后只有一条实现路径，不保留旧 wrapper、兼容 alias、feature flag 或双轨 CSS。
45. 作为验收者，我希望自动化、Lab 人工确认和真实 Tauri/WebView 验收被明确区分，不以其中一类证据替代另一类。

## Implementation Decisions

1. 本规格不改变领域模型、存储、同步、路由、Tauri Command 或公共业务契约；没有新增领域术语，因此不新增 `CONTEXT.md` 或 ADR。
2. 执行前由 `to-tickets` 把六个切片拆成依赖有序的本地 Markdown tickets；真实消费者审计写入各切片，不另建只产报告的审计 ticket。
3. 切片 1 必须先串行完成。它落地并形成已提交基线后，切片 2～5 只有在文件 Owner 不重叠时才可使用独立 worktree 并行；切片 6 最后串行收口。
4. 当前工作树包含尚未提交的 Lab 基线。未获得用户提交授权前，不创建依赖该基线的 worktree，也不 stage、commit 或 push。
5. 每个实现 ticket 在编辑 HeroUI 组件前，先查当前 HeroUI OSS/Pro 组件文档，再以仓库锁定版本的类型和运行行为为准；本轮不升级依赖。
6. HeroUI OSS/Pro 负责标准结构、状态机、Keyboard、Focus、Overlay、动画和可访问性；`theme.css` 负责语义值，`components.css` 只负责上游不能表达的最小跨应用 recipe，产品 Module 负责业务结构、状态和必要动态几何。
7. 先审计再修改。一致的生产消费者记录证据后不改；只有真实偏离才能形成代码差异。
8. 使用 hard cut：共同 Owner 修正后迁移所有真实消费者，并在同一 ticket 删除旧实现与兼容路径；不保留临时双轨。
9. 不把 Lab class 复制进产品。Lab fixture 只表达目标；生产实现必须落到语义 token、共享 recipe 或产品 Owner。
10. Sidebar 中性灰阶和 Task Row 选中紫色先映射现有语义 token；不得为复刻 Linear 在组件中硬编码颜色，也不得为了 Sidebar 改动同时服务启动壳的全局 Surface token。
11. 既有 TaskBoard `44px row / 36px header / 2px gap`、虚拟化与 selection 合同视为保留项；第二响应档只有真实复现后才增加。
12. Main / Launcher 的真实应用验收继续由 `.scratch/unified-product-acceptance/spec.md` 单独拥有，本规格只负责完成前置生产改造和交接证据。

## Testing Decisions

### 自动化与静态门禁

- 切片 1：`scripts/check-shell-theme-sync.ts`、`scripts/check-feature-boundaries.test.ts`、UI Lab 聚焦 DOM 测试。
- 切片 2：Metadata Fields、Task Properties、Settings 相关测试；验证业务回调、三态 Checkbox、错误与重试，不断言 HeroUI 私有 DOM 或 class。
- 切片 3：`AppBreadcrumb.test.tsx`、`ShellSidebar.test.tsx`、`SidebarNavRow.test.tsx`、`PageFrame.test.tsx`；覆盖 Pointer、Keyboard、Disabled、Current 与 Focus-visible。
- 切片 4：`RowShell.test.tsx`、`TaskBoard.test.tsx`、`TaskRowAdapter.test.tsx`、`taskBoardModel.test.ts`、collection keyboard adapter 与 Global Search 测试；保留选择、虚拟几何和窄宽行为证据。
- 切片 5：Danger Confirm、Settings Feedback、Shell Overlay Focus、Launcher Page 相关测试；覆盖 Escape、外点关闭、焦点恢复、Danger 与 Portal 清理。
- 每个 ticket 运行最小相关测试；切片收口运行根级 `bun typecheck`、`bun lint`、`bun run lint:boundaries`、`bun format:check` 与必要测试。
- 运行 `git diff --check`，并扫描生产代码中的 UI Lab import、HeroUI 局部 skin、旧 wrapper、兼容 alias 和已声明删除项。

### 人工与真实应用证据

- Lab 八批人工结论已完成，不重复要求用户从头验收；只对实现中改变的共享目标做最小回归对照。
- macOS Main/Launcher、Windows WebView2、窗口最小尺寸、常见宽度、100%/125% 缩放、跨窗口 Accent、Portal 归属和真实业务数据必须转既有统一产品验收。
- 自动化通过不能把外部验收项改为已完成；没有实际 Windows 环境时必须保持未验状态。

## Out of Scope

- 不扩建第九批 Lab，不复制 HeroUI 官网，不建设第二套组件展厅、Storybook、Chromatic 或截图基线系统。
- 不升级 HeroUI、React Aria、Tailwind 或其他依赖，不新增运行时依赖。
- 不新增暗色主题、新品牌色、新字体、页面信息架构或业务流程。
- 不为当前没有生产消费者的 Table、Badge、通用 Tag/Chip 平台或 Avatar 参考样例实施产品功能。
- 不实现尚无领域模型与持久化合同的 Labels 功能；Lab 样例仅保留交互参考。
- 不预建业务 Modal 类型系统；真实消费者出现重复合同后另行评估。
- 不重写 HeroUI Checkbox、Input、Select、Menu、ListView、Overlay 的原生交互和动画。
- 不重写 TaskBoard 虚拟列表、collection、selection、sticky、spacer 或滚动协议。
- 不在本工作包执行真实设备、签名包、发布或云端验收。

## Further Notes

- 视觉基线是浅色、克制、高信息密度、低装饰；不要求像素级恢复旧 StoneFlow，也不要求像素级复制 Linear。
- 已确认几何：组件内部主要间距 `4px / 8px`；Control `6px`、Surface `8px`、Overlay `12px`、Checkbox `4px`；控件高度 `28/32/36px`；Sidebar `36px`。
- 已确认动作：Primary、Secondary、Tertiary、Outline、Ghost、Danger 各自按语义使用；Metadata 文本入口统一 Ghost；HeroUI 原生 Primary/Secondary 不加额外边框。
- 已确认焦点：Pointer Focus 与 Keyboard Focus-visible 分离；真实叶子或具体组件 Owner 绘制焦点；复合祖先不画通用直角 ring；强制颜色模式保留系统焦点。
- 已确认 Feedback：Warning 参考色 `#c88a22`；Soft Warning 可使用深色文字；失败恢复优先 HeroUI Alert + 语义动作。
- 先前已归档的视觉系统和 HeroUI P0-P2 工作包是历史输入，不重新打开；本规格只处理本轮人工审查确认的新差异。
