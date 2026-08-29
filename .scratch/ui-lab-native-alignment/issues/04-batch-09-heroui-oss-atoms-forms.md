# 04 — 建立第九批 HeroUI OSS 原子与表单对照

**What to build:** 使用锁定版本与同一组 fixture 建立第九批 Upstream、Token、Current 对照，覆盖生产使用的 OSS 原子/表单及有明确目标的候选；历史已确认视觉只补来源与实现归属，不重新设计。

**Blocked by:** 03 — 跑通 Upstream、Token 与 Current 的隔离对照。

**Status:** planned

**Primary write scope:** 新增一个第九批 sample/fixture 模块、Ticket 01 建立的 catalog 注册入口、必要的 UI Lab 根级测试；禁止修改 `src/features`、`src/shared`、`src/layout`、`src/styles`、依赖和锁文件。

- [ ] 第九批包含九个 review unit：Actions；Text Fields；SearchField；NumberField；Choice Controls；Select/ListBox；ComboBox/Autocomplete；Date/Calendar/ColorSwatchPicker；Compact Metadata。
- [ ] Actions 覆盖 Button、ToggleButton、ToggleButtonGroup、Toolbar；Text Fields 覆盖 Form、TextField、Input、TextArea、Label、Description、FieldError。
- [ ] SearchField 使用 Global Search 与 Filter 两类真实消费者，明确标为生产已使用；NumberField 使用 Settings Sync 的真实配置语义。
- [ ] Choice Controls 覆盖 Checkbox、Radio、RadioGroup、Switch；只使用上游公共状态、键盘与可访问性，不在 Lab 伪造 Focus、动画或半选状态机。
- [ ] Select/ListBox 覆盖单选、禁用、长值和键盘路径；ComboBox/Autocomplete 只在锁定版本公共能力真实存在时作为可搜索属性菜单候选，不发明 API。
- [ ] Date/Calendar/ColorSwatchPicker 记录当前生产 Calendar/日期组合和 Space 颜色选择原料；完整 Space Editor 留给后续产品场景。
- [ ] Compact Metadata 覆盖生产相关的 Chip、Avatar、Kbd、Separator；第一至八批已确认项目只补 Upstream/Token/Current 归因，不要求重复审查相同 Current。
- [ ] 每个 review unit 记录 Owner、处置、消费者、覆盖方式和适用状态；无独立预览的家族有明确理由。
- [ ] 三层对照复用相同数据与 props；相同结果只渲染一次并标记 `Upstream · 无覆盖`，不复制组件实现。
- [ ] 状态仅覆盖适用的 default、hover、pressed、focus-visible、disabled、invalid、selected/mixed、长中文和窄宽度，不生成笛卡尔积。
- [ ] Current 视觉、生产组件、样式和依赖均无变化；第九批进入 `pending`，只有用户实际确认后才能改为 `done`。

## Verification

- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx`
- Ticket 03 建立的隔离 renderer 聚焦测试
- `bun typecheck`
- `bun lint`
- `bun run lint:boundaries`
- `bun format:check`
- `git diff --check`
