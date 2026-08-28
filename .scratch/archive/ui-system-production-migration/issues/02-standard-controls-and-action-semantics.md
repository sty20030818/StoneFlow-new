# 02 — Hard cut Metadata Action 与标准控件语义

**What to build:** 通过 Metadata Fields 共享入口一次性覆盖任务创建、任务详情与行内属性入口，把仍偏离 UI Lab 目标的消费者切到 HeroUI 原生能力与 Ticket 01 的共享 recipe；标准 Field/Checkbox 只做回归审计，不重建控件，也不改变业务提交、Autosave 或 Tauri 持久化。

**Blocked by:** 01 — 收敛共享主题与 HeroUI Recipe。

**Status:** completed

**Primary write scope:** `src/features/metadata-fields/components/`、`src/features/task/components/TaskCreateMetaActions.tsx`、`src/features/task/detail/components/TaskPropertiesSection.tsx` 及其现有测试；`TaskRowAdapter.tsx` 仅验证，Settings Feedback 由 Ticket 05 独占。

- [x] 审计 `src/features/metadata-fields/components/MetadataFieldButton.tsx`、`src/features/metadata-fields/components/MetadataFieldValue.tsx`、同目录全部公开 Metadata Dropdown 消费者、`src/features/task/detail/components/TaskPropertiesSection.tsx` 与 `src/features/task/components/TaskCreateMetaActions.tsx`；文本型属性入口必须统一 Ghost，展示值继续使用语义合适的 Chip 或文本，不保留蓝色 Secondary 或 feature 私有替代触发器。
- [x] 将 `TaskPropertiesSection.tsx` 属性行内部仍存在的 `gap-3` 对照真实画面收敛为已确认的 `gap-2`；若它实际承担区域层级，必须在 ticket 记录可验证证据后保持不动，不能引入新的 6px 间距档。
- [x] 审计真实 Primary/Secondary/Ghost/Danger 使用边界；HeroUI 原生 Primary/Secondary 不增加灰边或黑边，Primary 只保留流程主动作，Danger 只用于风险动作，不新增 `SfButton` 或运行时 variant facade。
- [x] 回归验证真实 Search/Input/NumberField/Select/DatePicker 的 Pointer Focus、Keyboard Focus-visible、Disabled、Invalid 与已填值；外观偏差由 Ticket 01 共享 recipe 解决，本 ticket 不接管 HeroUI 输入解析、选择、键盘或 Overlay 状态机。
- [x] 回归验证生产 Checkbox 使用 HeroUI 原生结构、动效与选择语义；当前没有生产三态 Checkbox 消费者，不为 Lab 样例新增领域状态，本 ticket 不自绘 Checkbox、Hover 外框或局部圆角。
- [x] 从公开 Metadata 入口验证任务创建、任务详情和 Task Row 的 Dropdown 选择、快捷键、禁用、Tooltip、日期入口与业务回调保持不变；`TaskRowAdapter.tsx` 不属于本 ticket 的写入范围。
- [x] 保持 Metadata 的事件阻断、Dropdown、Autosave、日期值、放置目标和任务创建提交合同不变；消费者迁移完成后删除零消费者旧 variant、局部 class、兼容 alias 与替代实现。
- [x] 在 `src/features/metadata-fields/metadata-fields.test.tsx`、`src/features/task/detail/components/TaskPropertiesSection.test.tsx`、`src/features/task/components/TaskCreateContent.test.tsx` 及最小相关测试中覆盖可观察行为，并运行 `bun typecheck`、`bun lint`、`bun run lint:boundaries` 与 `git diff --check`；不锁定 HeroUI 私有 DOM/class，也不修改共享 CSS。

## 实施证据（2026-08-29）

- **Metadata 单一入口：** `MetadataFieldButton` 的文本与行内图标形态均已是锁定版 HeroUI `Button size='sm' variant='ghost'`；任务创建、任务详情和 Task Row 统一消费 `MetadataFieldDropdown` / `MetadataDateDropdown` / `MetadataPlacementDropdown`。只读 Space 值继续由 `MetadataFieldValue` 使用 `Chip size='sm' variant='secondary'`，没有以按钮伪装只读值。`CreateDialogSpaceSelector` 是创建弹窗的 Space scope 选择器而非任务属性入口，保留现有 Outline 语义。
- **本轮真实差异：** 详情属性行由 `gap-3` 收敛到 `gap-2`；`MetadataPlacementDropdown` 删除无行为的 `GroupedPlacementDropdown` 透传层。`compact`、`row-icon`、事件阻断、Overlay placement、快捷键和 Tooltip 均有 Task Row 真实消费者，因此保留。
- **Action 边界：** 任务创建与日期保存继续使用 Primary；Metadata 触发器与取消使用 Ghost；只读值使用 Chip；清空日期是可恢复字段编辑，保留 Outline 而不伪装成破坏性 Danger。审计范围内没有额外边框、`SfButton`、运行时 variant facade 或 feature 私有焦点皮肤。
- **标准控件审计：** 生产 SearchField、Input、NumberField、Select 与 Checkbox 均直接使用 HeroUI OSS/Pro 结构，局部 class 只承担宽度或内容布局，没有接管 Focus、Invalid、Disabled 或 Overlay 状态。当前生产没有 DatePicker 消费者，日期合同继续由 Metadata Dropdown + 既有 Calendar 组合承担；三个生产 Checkbox 消费者均使用 `Checkbox.Content > Checkbox.Control > Checkbox.Indicator`，没有生产三态 Checkbox 或局部 Hover 外框。
- **自动化：** Metadata / Task Properties / Task Create / Task Row 聚焦 DOM 测试 4 files、21 tests 通过；Display Options / Space Editor / Project Row / Lifecycle Row 标准控件回归 4 files、15 tests 通过；Global Search 的 SearchField 聚焦用例 1 test 通过。`bun typecheck`、`bun lint`（仅既有 warnings）、`bun run lint:boundaries`、`bun format:check` 与 `git diff --check` 通过。
- **未替代的验收：** 未启动新服务或浏览器；Pointer/Keyboard 的真实 WKWebView/WebView2 视觉、Portal 与跨窗口行为继续由 `.scratch/unified-product-acceptance/spec.md` 验收。
