# ADR-0003：以分批 UI Lab 审查作为产品 UI 改造前置门禁

## 状态

已接受。

## 背景

StoneFlow 已选择 HeroUI OSS/Pro 作为唯一 UI 平台，但“采用同一组件库”并不会自动产生统一、简洁、整齐、有条理且冷静的产品界面。当前发现的问题横跨语义颜色、动作层级、复合 Field、焦点边界、Breadcrumb、Sidebar、集合 Row、Menu 和 Task 工作面；若在逐项审查时直接修改生产代码，同一共享规则会被拆成页面补丁，也容易在尚未看完整体前反复推翻。

现有 UI Lab 已能隔离展示 StoneFlow 组件、产品场景和 HeroUI 候选，但 `coverage='rendered'` 只表示样例可以渲染，不表示人工视觉审查通过，更不表示 Main、Launcher 或 Tauri/WebView 已完成改造和验收。需要把“发现与确认目标”“实施生产改造”“真实应用验收”分成三个明确阶段。

## 决策

1. UI Lab 是产品 UI 改造的前置审查面。先在 Lab 中按人工批次确认目标外观、交互状态、组件归属和验证边界；所有批次结束后，再创建独立生产改造工作包。审查期间不再零散修改生产页面或共享 recipe。
2. UI Lab 的人工审查状态与覆盖状态相互独立：
   - 覆盖状态只回答样例能否在 Lab 渲染；
   - 审查状态只回答用户是否已经完成该项的肉眼判断；
   - “Lab 审查完成”不等于“生产已改造”，也不等于“真实桌面应用已验收”。
3. 审查范围按批次组织，同时保留样例原有的功能分类。批次成员、对照项和当前状态由 `src/ui-lab/uiLabCatalog.tsx` 唯一维护，UI 从该目录派生清单和进度，不建立可在浏览器中随意勾选但刷新即丢失的第二份状态。
4. HeroUI OSS/Pro 继续拥有标准控件的结构、键盘行为、Focus、Overlay、可访问性、官方状态和动效。StoneFlow 优先保留这些原生 UI/UX，只通过 `theme.css` 和 `components.css` 调整已确认的语义颜色、圆角、密度和少量跨应用公共差异；产品 Module 继续拥有产品结构、业务状态和必要动态几何。
   - 为审计 StoneFlow 相对锁定版本 HeroUI 上游的视觉增量，UI Lab 可以在仅开发环境的隔离 renderer 中复用同一 fixture，展示 Upstream、Token 与 Current 诊断基线。
   - 这些基线只是审查视图，不是可切换的产品主题或并行实现；不得进入生产入口、复制组件实现，或建立第二份 token、recipe、catalog、Provider 与 runtime。
5. 不为了“更像 StoneFlow”重新实现 Checkbox、Input、Select、Menu、ListView 等上游控件，不新增一对一 wrapper、第二套 token/variant runtime、页面私有皮肤或 Lab 专用兼容层。RowShell、TaskBoard 虚拟几何、Command/selection 等已确认产品合同仍由 StoneFlow 自己拥有。
6. 已经通过人工审查和生产迁移确认的 Current 视觉，是后续 HeroUI 原生实现对齐的冻结目标；“靠近 HeroUI”指公共 API、状态机和实现所有权向上游收敛，不授权视觉重设计。任何可观察差异必须重新进入 Lab 决策。目标视觉不要求恢复旧 StoneFlow，长期方向是统一、规范、简洁、整齐、有条理、冷静和低装饰：
   - 组件内部间距优先使用 `4px` 与 `8px`；更大间距只表达区块或页面层级；
   - Control、Surface、Overlay 继续使用少量语义圆角，Checkbox 明确使用 `4px`，pill 只用于适合的封闭控件；
   - 标准控件优先保留 HeroUI 原生 Primary/Secondary 外观，不额外加装饰边；Metadata 文本属性入口统一使用 Ghost；
   - 指针 Hover 使用低噪声中性填充，Keyboard Focus Visible 必须清晰且匹配真实控件圆角；禁止通过全局 `outline: none` 删除键盘焦点；
   - Pointer Focus、Keyboard Focus Visible、Active/current、Selected 和 Open 必须是不同状态，不用一个通用祖先 ring 同时表达它们。
7. 全部批次审查完成后，生产改造必须在正确 Owner 处一次性收敛共享规则。允许破坏性重构和 hard cut；消费者迁移完成后删除旧自实现、shadcn 遗留、重复 recipe、兼容 alias 与无退出条件的双轨代码，不按页面留下永久补丁。
8. 生产改造继续遵守当前依赖方向与单一事实源：`theme.css` 持有全局语义值，`components.css` 持有上游无法表达的最小公共 recipe，产品 Module 持有产品结构和状态。整洁架构、六边形边界、DRY、KISS、单一职责、高内聚低耦合只在真实消费者和变化边界上落实，不为形式增加接口、工厂或 Adapter。
9. UI Lab 只证明隔离浏览器场景。Portal 归属、WebView 激活、窗口缩放、Main/Launcher 几何、跨窗口一致性、真实 Store/Query/Router/Tauri 命令和实际业务数据仍由真实应用验收负责。

## 后果

### 正向影响

- UI 问题先被稳定复现、分类和归属，再进入生产改造，降低反复修改共享样式和页面补丁的概率。
- 批次进度、样例覆盖和生产迁移不再混为同一状态，完成声明更可信。
- HeroUI 原生交互与 StoneFlow 视觉责任保持清晰，减少重新实现上游控件和形成第二套组件库的风险。
- 最终改造可以按共享 Owner hard cut，减少冗余、兼容代码和长期双轨。

### 成本与约束

- 在所有批次完成前，Lab 的目标结果与生产应用可能暂时不一致；这种差异必须明确标注，不能把 Lab 当成当前生产真相。
- 人工审查状态是版本控制中的显式决定，需要在用户确认后修改 catalog；它不是浏览器本地偏好。
- Lab 无法代替真实 Main、Launcher、macOS/Windows WebView 和跨窗口验收，生产改造后仍需最小真实应用 smoke。
- 隔离 renderer 可以作为版本锁定的开发诊断工具长期保留，但只组合既有单一事实源；生产始终只有 Current 一条样式与实现路径。
- 本 ADR 固定长期门禁与目标原则，逐项问题、批次内容和当前审查记录由活跃规格维护，避免 ADR 变成持续变动的 issue tracker。

## 放弃的方案

- **边审查边修改生产代码：** 会在完整目标尚未确认前制造页面补丁和共享规则反复，已经发生过一次误改，不能作为后续流程。
- **把 `coverage='rendered'` 当作完成：** 只能证明样例存在，不能证明用户认可视觉结果。
- **在浏览器中提供可自由勾选且不持久化的 Checklist：** 刷新后丢失，会制造假进度；审查结论应进入版本控制。
- **只保留功能分类，不记录审查批次：** 适合查组件，不适合持续推进人工验收。
- **删除功能分类，只保留批次：** 批次会随审查推进变化，不能替代稳定的 Foundations、Fields、Navigation 等系统分类。
- **每发现一个问题立即建生产 ticket：** 会在 UI 全貌未完成前碎片化改造；生产 tickets 应在 Lab 结束后按共享 Owner 统一拆分。
- **为统一外观重做 HeroUI 原生组件：** 会重新引入上游已经解决的交互、焦点、可访问性和动效维护责任。

## 关联文档

- [HeroUI UI 平台决策](./ADR-0002-heroui-ui-platform.md)
- [界面系统](../A3-界面系统.md)
- [UI 组件审查与实验室研究](../../04-专题研究/2026-08-26-ui-component-audit-lab-research.md)
- [已归档 UI Lab 人工审查规格](../../../.scratch/archive/ui-lab-review/spec.md)
- [已归档 UI Lab 建设规格](../../../.scratch/archive/ui-system-lab/spec.md)
- [UI Lab 全量清单与 HeroUI 原生实现对齐规格](../../../.scratch/ui-lab-native-alignment/spec.md)
