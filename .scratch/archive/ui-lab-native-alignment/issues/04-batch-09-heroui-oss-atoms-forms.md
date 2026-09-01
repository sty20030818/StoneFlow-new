# 04 — 建立第九批 HeroUI OSS 原子与表单对照

**What to build:** 使用锁定版本与同一组 fixture 建立第九批 Upstream、Token、Current 对照，覆盖生产使用的 OSS 原子/表单及有明确目标的候选；历史已确认视觉只补来源与实现归属，不重新设计。

**Blocked by:** 03 — 跑通 Upstream、Token 与 Current 的隔离对照。

**Status:** complete — Current 视觉与九个 review unit 已获用户确认

**Primary write scope:** 第九批 sample/fixture、catalog、UI Lab 根级状态与测试，以及用户复审明确批准的 `src/styles` 共享字段 recipe；不修改产品 Feature、依赖和锁文件。

- [x] 第九批包含九个 review unit：Actions；Text Fields；SearchField；NumberField；Choice Controls；Select/ListBox；ComboBox/Autocomplete；Date/Calendar/ColorSwatchPicker；Compact Metadata。
- [x] Actions 覆盖 Button、ToggleButton、ToggleButtonGroup、Toolbar；Text Fields 覆盖 Form、TextField、Input、TextArea、Label、Description、FieldError。
- [x] SearchField 使用 Global Search 与 Filter 两类真实消费者，明确标为生产已使用；NumberField 使用 Settings Sync 的真实配置语义。
- [x] Choice Controls 覆盖 Checkbox、Radio、RadioGroup、Switch；只使用上游公共状态、键盘与可访问性，不在 Lab 伪造 Focus、动画或半选状态机。
- [x] Select/ListBox 覆盖单选、禁用、长值和键盘路径；ComboBox/Autocomplete 只在锁定版本公共能力真实存在时作为可搜索属性菜单候选，不发明 API。
- [x] Date/Calendar/ColorSwatchPicker 记录当前生产 Calendar/日期组合和 Space 颜色选择原料；完整 Space Editor 留给后续产品场景。
- [x] Compact Metadata 覆盖生产相关的 Chip、Avatar、Kbd、Separator；第一至八批已确认项目只补 Upstream/Token/Current 归因，不要求重复审查相同 Current。
- [x] 每个 review unit 记录 Owner、处置、消费者、覆盖方式和适用状态；无独立预览的家族有明确理由。
- [x] 三层对照复用相同数据与 props；相同结果只渲染一次并标记 `Upstream · 无覆盖`，不复制组件实现。
- [x] 状态仅覆盖适用的 default、hover、pressed、focus-visible、disabled、invalid、selected/mixed、长中文和窄宽度，不生成笛卡尔积。
- [x] 用户已确认九个 review unit 的方向与保留合同。
- [x] Current 的等宽响应式已改为 fixture container query；三栏按各自实际预览宽度决定列数，不再只有 Current 在窄栏内强制双列。
- [x] 用户明确要求直接实施 Current：字段外壳去硬框、Primary 恢复 HeroUI Light 轻阴影、focus/invalid 交还上游，Checkbox 与 circle swatch 收敛几何。
- [x] UI Lab 只持久化最后可见 sample ID；view、batch/category 继续由 catalog 派生。
- [x] 用户复审 Current 后，第九批九项均已改为 `done`。

## 人工审查结论

1. Actions：Keep。Current pill 保留；Token 的偏方外观继续作为高阶圆角 token 影响的诊断证据。
2. Text Fields：定向移除硬框，保留 StoneFlow 颜色、32px 密度、6px control radius；Primary 使用 HeroUI Light 轻阴影，focus/invalid 使用上游 ring/outline。TextField 持有默认值，hover 不再清空 TextArea。
3. SearchField：跟随字段表面方向；有值时保留原生 X，空值时原生隐藏。此前 X 消失是 Current 的窄栏断点错配与裁切，已由 container query 修复。
4. NumberField：跟随字段表面方向；保留增减按钮内部结构分隔、边界和键盘步进合同。
5. Choice Controls：Checkbox 外层与选中色层统一为 4px；`::before` 继承 control 圆角，保留公共状态。
6. Select / ListBox：只对 Select.Trigger 采用字段表面方向；裸 ListBox 和 UI Lab 对照卡片保持原生边界。
7. ComboBox / Autocomplete：仍是零产品消费者候选；Current 复用经验证的无硬框字段表面，保留过滤、清空、popover 与键盘行为。
8. Date / Calendar / ColorSwatchPicker：Current 叠层已由 container query 修复；Calendar 保持 36px 日期单元并恢复真圆，circle swatch 同样使用真圆；不改全局 2xl/3xl token，并保留上游状态 ring 与留白。
9. Compact Metadata：Keep，沿用第五批所有权与视觉结论。

## Verification

- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx`
- Ticket 03 建立的隔离 renderer 聚焦测试
- `bun typecheck`
- `bun lint`
- `bun run lint:boundaries`
- `bun format:check`
- `bun run build`
- `git diff --check`

## Implementation evidence

- 九个 review unit 复用同一隔离 renderer；Catalog 通过 `inventoryRefs` 从既有 HeroUI 总账派生真实消费者与上游原料，没有复制消费者清单。
- SearchField 同时覆盖 Global Search 与 Filter 语义；NumberField 使用生产同步间隔的 1–1440 分钟合同；ComboBox 与 Autocomplete 使用锁定版本公开 compound API。
- Choice Controls 按锁定版 anatomy 让 `Switch.Content` 直接持有标签文字，不在可点击 label 内再嵌套 `Label`。
- TextField 根组件持有默认值；hover 触发 React Aria 重渲染后，Input 与 TextArea 不会再被根字段的空值覆盖。
- 用户复审 Current 后，第九批九项均已标为 `done`。
- Current 生产字段 recipe 已定向实施去硬框、Primary 轻阴影、Checkbox 4px 同层圆角与 circle swatch 真圆；NumberField 和 InputGroup 的内部结构分隔保留。
- UI Lab 浏览器实测确认 SearchField 的 X 位于 group 内，Choice、Select/ListBox、ComboBox/Autocomplete 与 Date/Color 的 Current 不再发生窄栏双列或叠层；Calendar 的 42 个日期单元均保持 36×36px 并成为真圆，selected、today、hover、focus-visible 状态继续生效；刷新后恢复最后可见样例。
- 聚焦 DOM 测试 2 files / 28 tests 通过；`bun typecheck`、`bun lint`、`bun run lint:boundaries`、`bun format:check`、`bun run build` 与 `git diff --check` 通过，lint 仅保留任务外既有 warnings。
