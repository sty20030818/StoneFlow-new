# 07 — 建立第十二批 Task 与集合组合审查面

**What to build:** 使用生产公开组件和轻量 fixture 建立第十二批，覆盖 TaskBoard、任务行、连续选择、Bulk Action、Labels、Global Search、Task Metadata 与 Activity Timeline；复用第一至十一批结论，不在 Lab 重写集合或业务状态。

**Blocked by:** 04 — 建立第九批 HeroUI OSS 原子与表单对照；05 — 建立第十批 HeroUI OSS/Pro 复杂控件对照；06 — 建立第十一批 StoneFlow 共享产品组件审查面。

**Status:** complete — 7/7 reviewable units confirmed, 2 external

**Primary write scope:** 新增一个第十二批 sample/fixture 模块、catalog 注册入口与必要的根级测试；初始建面不修改生产模块，用户审查后只在真实所有者同步共享行状态色与 BulkActionBar，并在 fixture 内修正 Labels 空态和 Metadata 审查证据。

- [x] 第十二批包含九个 review unit：TaskBoard；Group Header；Task Row；连续选择；Bulk ActionBar；Labels；Global Search；Task Metadata；Activity/Timeline。
- [x] 第一至八批已有 fixture 能回答问题时直接复用，不复制预览、不重置历史完成状态。
- [x] TaskBoard 保留真实 `44px Row / 36px Header / 2px gap` 合同；虚拟化、selection、sticky、spacer 与宽度模型仍由生产路径验证，Lab 不重写。
- [x] Group Header、Task Row 与连续选择覆盖现有 Product Owner、single/first/middle/last、Selected/Selected-hover 和尾部操作，不建立第二套选择状态。
- [x] Bulk ActionBar 使用生产公开组件与本地选择 fixture，只验证组合和操作层级，不写真实 Store 或执行业务命令。
- [x] Labels 继续明确“当前无生产领域模型”；只复用已确认的 Lab 产品假设，不宣称产品已采用或创建持久化合同。
- [x] Global Search 采用已确认的最小公共面取舍：链接第五批 ListView 与第十一批私有组件边界，不深导入 `GlobalSearchResults`，也不把代理视觉冒充真实产品覆盖。
- [x] Task Metadata 直接渲染公开生产组件并覆盖入口、空值与长文本；Activity/Timeline 链接第十批上游原料与第十一批产品边界，不复制第二套状态机。
- [x] 所有有生产消费者的 review unit 记录当前/推荐 Owner、处置、消费位置、组合父项和验证范围；Labels 明确无生产消费者。
- [x] 初始建面保持 Current 视觉不变；用户审查后只在真实所有者同步 RowShell 状态色、Bulk ActionBar、Labels 空态与 Task Metadata 优先级，不改业务状态、依赖或公共导出。
- [x] 第十二批只有用户实际审查完成后才能标记 `done`，自动化通过只证明 fixture 和目录行为。

实现与人工审查均已完成；七个可审查单元均为 `done`，两个未渲染单元保持 `external`，不伪装为已审查。

## 人工审查进展

- [x] TaskBoard：Current 可接受。
- [x] Group Header：Current 可接受。
- [x] Task Row：已同步第十一批 RowShell 的 hover、active、selected 与 selected + hover 状态色，用户确认可接受。
- [x] 连续选择：已同步同一套 RowShell 状态色与 first / middle / last 形状，用户确认可接受。
- [x] Bulk ActionBar：已对齐第十批确认的 Current anatomy，用户确认可接受。
- [x] Labels：无标签时已改为“标签图标 + 新增标签”的 ghost 按钮，不再并列显示“暂无”和 `+`，用户确认可接受。
- [x] Task Metadata：已调整“紧急”红色，并明确标注后面两个值是空值与长文本只读样例，用户确认可接受。
- `external`：Global Search 与 Activity/Timeline 未渲染，按用户要求不进行视觉审查。

## Verification

- `bun run test:dom -- src/features/bulk-action/components/BulkActionBar.test.tsx src/features/task/model/indicators/PriorityIcon.test.tsx src/shared/components/row/RowShell.test.tsx src/ui-lab/samples/ticket-12/taskCollectionCompositionSamples.test.tsx src/ui-lab/UiLabApp.test.tsx`
- `bun run test:scripts`
- `bun typecheck`
- `bun lint`
- `bun run lint:boundaries`
- `bun format:check`
- `bun run build`
- `git diff --check`
- `git diff --cached --check`

## Implementation evidence

- 九个 review unit 全部进入同一 catalog；其中七项可渲染、两项明确为 `covered-in-composition`。目录状态同步为 7 个 `done` 与 2 个 `external`；TaskBoard、Group Header、Task Row、连续选择和 Labels 复用第五批已确认 fixture。
- RowShell 新增独立 `surface-active`，普通 hover、active、selected 与 selected + hover 分别使用 `#efeff0`、`#e7e7e8`、`#e8e8f4` 与 `#dedeea`；Lab 的静态 Task Row 覆盖也回归相同 token，没有复制第二套色值。
- `BulkActionBar` 通过 `@/features/bulk-action` 公开面真实渲染，并使用数字 Chip、三处分割线、实体 Danger 删除按钮与清空入口；选择和 Command Runtime 仅存在于可逆 Lab fixture，聚焦测试覆盖清空与恢复选择。
- Labels 空态只保留 accessible name 与可见文案一致的“新增标签” ghost 按钮；Task Metadata 继续真实渲染公开组件，只把两个只读值的用途标清，并让实心紧急图标使用实体 `danger`，不触发 Autosave 或业务写入。
- `GlobalSearchResults` 与 `TaskActivityTimeline` 都是 feature 私有展示面；本 ticket 只链接既有原料和产品边界，避免扩大生产 API 或伪造覆盖。
- 聚焦 DOM 测试 5 files / 33 tests、根级 scripts 测试 19 files / 168 tests 均通过；`bun typecheck`、`bun lint`、`bun run lint:boundaries`、`bun format:check`、`bun run build`、`git diff --check` 与 `git diff --cached --check` 通过，lint 与构建只保留任务外既有 warnings。
- 浏览器实测普通 hover `rgb(239,239,240)`、active `rgb(231,231,232)`、selected `rgb(232,232,244)`、selected + hover `rgb(222,222,234)`；ActionBar 外框与 Danger 按钮均为 `9999px` 圆角，三处分割线存在，Danger 为 `rgb(220,52,52)`；空标签只显示带图标的“新增标签”，Metadata 两个只读值用途可见。刷新后仍停留在第十二批当前样例，最后留在首个待审查项 Task Row。
