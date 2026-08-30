# 07 — 建立第十二批 Task 与集合组合审查面

**What to build:** 使用生产公开组件和轻量 fixture 建立第十二批，覆盖 TaskBoard、任务行、连续选择、Bulk Action、Labels、Global Search、Task Metadata 与 Activity Timeline；复用第一至十一批结论，不在 Lab 重写集合或业务状态。

**Blocked by:** 04 — 建立第九批 HeroUI OSS 原子与表单对照；05 — 建立第十批 HeroUI OSS/Pro 复杂控件对照；06 — 建立第十一批 StoneFlow 共享产品组件审查面。

**Status:** implemented — pending manual review

**Primary write scope:** 新增一个第十二批 sample/fixture 模块、catalog 注册入口与必要的根级测试；TaskBoard、TaskRowAdapter、RowShell、BulkActionBar、GlobalSearchResults、Metadata、Timeline 生产模块只读。

- [x] 第十二批包含九个 review unit：TaskBoard；Group Header；Task Row；连续选择；Bulk ActionBar；Labels；Global Search；Task Metadata；Activity/Timeline。
- [x] 第一至八批已有 fixture 能回答问题时直接复用，不复制预览、不重置历史完成状态。
- [x] TaskBoard 保留真实 `44px Row / 36px Header / 2px gap` 合同；虚拟化、selection、sticky、spacer 与宽度模型仍由生产路径验证，Lab 不重写。
- [x] Group Header、Task Row 与连续选择覆盖现有 Product Owner、single/first/middle/last、Selected/Selected-hover 和尾部操作，不建立第二套选择状态。
- [x] Bulk ActionBar 使用生产公开组件与本地选择 fixture，只验证组合和操作层级，不写真实 Store 或执行业务命令。
- [x] Labels 继续明确“当前无生产领域模型”；只复用已确认的 Lab 产品假设，不宣称产品已采用或创建持久化合同。
- [x] Global Search 采用已确认的最小公共面取舍：链接第五批 ListView 与第十一批私有组件边界，不深导入 `GlobalSearchResults`，也不把代理视觉冒充真实产品覆盖。
- [x] Task Metadata 直接渲染公开生产组件并覆盖入口、空值与长文本；Activity/Timeline 链接第十批上游原料与第十一批产品边界，不复制第二套状态机。
- [x] 所有有生产消费者的 review unit 记录当前/推荐 Owner、处置、消费位置、组合父项和验证范围；Labels 明确无生产消费者。
- [x] Current 视觉不变；生产组件、`theme.css`、`components.css`、业务状态与依赖均无修改。
- [x] 第十二批只有用户实际审查完成后才能标记 `done`，自动化通过只证明 fixture 和目录行为。

实现已完成；第十二批目录状态保持 `pending`，等待用户逐项人工确认。

## Verification

- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx`
- 对连续选择或 Bulk Action 的一个稳定公共行为留最小聚焦测试
- `bun typecheck`
- `bun lint`
- `bun run lint:boundaries`
- `bun format:check`
- `git diff --check`

## Implementation evidence

- 九个 review unit 全部进入同一 catalog；其中七项可渲染、两项明确为 `covered-in-composition`。TaskBoard、Group Header、Task Row、连续选择和 Labels 复用第五批已确认 fixture。
- `BulkActionBar` 通过 `@/features/bulk-action` 公开面真实渲染；选择和 Command Runtime 仅存在于可逆 Lab fixture，聚焦测试覆盖清空与恢复选择。
- Task Metadata 通过 `@/features/metadata-fields` 公共面真实渲染，聚焦测试验证本地优先级切换；不触发 Autosave 或业务写入。
- `GlobalSearchResults` 与 `TaskActivityTimeline` 都是 feature 私有展示面；本 ticket 只链接既有原料和产品边界，避免扩大生产 API 或伪造覆盖。
- 验证结果以本 ticket 提交前实际运行记录为准。
