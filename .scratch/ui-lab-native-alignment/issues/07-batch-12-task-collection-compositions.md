# 07 — 建立第十二批 Task 与集合组合审查面

**What to build:** 使用生产公开组件和轻量 fixture 建立第十二批，覆盖 TaskBoard、任务行、连续选择、Bulk Action、Labels、Global Search、Task Metadata 与 Activity Timeline；复用第一至十一批结论，不在 Lab 重写集合或业务状态。

**Blocked by:** 04 — 建立第九批 HeroUI OSS 原子与表单对照；05 — 建立第十批 HeroUI OSS/Pro 复杂控件对照；06 — 建立第十一批 StoneFlow 共享产品组件审查面。

**Status:** planned

**Primary write scope:** 新增一个第十二批 sample/fixture 模块、catalog 注册入口与必要的根级测试；TaskBoard、TaskRowAdapter、RowShell、BulkActionBar、GlobalSearchResults、Metadata、Timeline 生产模块只读。

- [ ] 第十二批包含九个 review unit：TaskBoard；Group Header；Task Row；连续选择；Bulk ActionBar；Labels；Global Search；Task Metadata；Activity/Timeline。
- [ ] 第一至八批已有 fixture 能回答问题时直接复用或链接，不复制预览、不重置历史完成状态。
- [ ] TaskBoard 保留真实 `44px Row / 36px Header / 2px gap`、虚拟化与 selection 合同；Lab 不重写 collection、sticky、spacer 或宽度模型。
- [ ] Group Header、Task Row 与连续选择覆盖现有 Product Owner、single/first/middle/last、Selected/Selected-hover 和尾部操作，不建立第二套选择状态。
- [ ] Bulk ActionBar 使用生产公开组件与本地选择 fixture，只验证组合和操作层级，不写真实 Store 或执行业务命令。
- [ ] Labels 继续明确“当前无生产领域模型”；只复用已确认的 Lab 产品假设，不宣称产品已采用或创建持久化合同。
- [ ] Global Search 使用真实结果组件，覆盖标题、副标题、时间、Hover、长中文、空结果和窄宽度。
- [ ] Task Metadata 与 Activity/Timeline 覆盖适用的 loading、empty、error、long-text，并记录 HeroUI 原料、Product Owner 与真实应用边界。
- [ ] 所有 review unit 记录当前/推荐 Owner、处置、消费位置、组合父项和验证范围；产品组件没有上游等价物时明确说明。
- [ ] Current 视觉不变；生产组件、`theme.css`、`components.css`、业务状态与依赖均无修改。
- [ ] 第十二批只有用户实际审查完成后才能标记 `done`，自动化通过只证明 fixture 和目录行为。

## Verification

- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx`
- 对连续选择或 Bulk Action 的一个稳定公共行为留最小聚焦测试
- `bun typecheck`
- `bun lint`
- `bun run lint:boundaries`
- `bun format:check`
- `git diff --check`
