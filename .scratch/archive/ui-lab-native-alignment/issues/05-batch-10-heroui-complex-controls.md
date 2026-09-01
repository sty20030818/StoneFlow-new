# 05 — 建立第十批 HeroUI OSS/Pro 复杂控件对照

**What to build:** 建立第十批复杂集合、Overlay、导航和 Pro 控件对照，重点验证上游公共状态、Portal、Focus 与产品组合边界；没有真实场景的能力只登记，不制造业务 Demo。

**Blocked by:** 03 — 跑通 Upstream、Token 与 Current 的隔离对照。

**Status:** complete — 10/10 confirmed

**Primary write scope:** 新增一个第十批 sample/fixture 模块、catalog 注册入口、必要的隔离 Portal/根级测试；禁止修改生产 Overlay、Focus 路由、HeroUI recipe、依赖和锁文件。

- [x] 第十批包含十个 review unit：Menu；Overlays；Navigation；Collections；Command；ActionBar；Cell Controls；Layout Surfaces；Timeline/HoverCard；EmptyState。
- [x] Menu 覆盖 Dropdown、ContextMenu、Popover；Overlays 覆盖 Modal、AlertDialog、Sheet；Navigation 覆盖 Tabs、Disclosure。
- [x] Collections 覆盖 ListView 与 Table，并明确真实消费者、候选或当前无场景；没有产品表格需求时 Table 保持 ledger-only，不虚构业务数据表。
- [x] Command、Menu、ListView、ActionBar 只覆盖适用的键盘移动、选择、禁用、危险项、尾部动作与 Escape，不复制上游状态机。
- [x] Cell Controls 覆盖 CellSwitch、CellSelect，并在锁定版本公共能力真实存在时展示 InlineSelect；候选明确指向 Metadata 属性编辑。
- [x] Layout Surfaces 覆盖 Resizable、ScrollShadow、Surface；只验证上游原料，Entity Detail 的 Resizable/Sheet 组合留给第十三批。
- [x] Timeline/HoverCard 记录 Activity/Task Preview 的真实目标；EmptyState 使用实际 Launcher/空集合语义，不复制 HeroUI Pro 源码或官网示例。
- [x] Overlay 在隔离 Document 自己的 Portal root 中打开、关闭和清理，不泄漏到父 Lab；真实 Shell 焦点恢复与 WebView Portal 标为 `real-app-only`。
- [x] 三层对照复用相同 fixture，只使用锁定版本公共 compound API、props 与 slots，不深导入私有源码或依赖私有 DOM/class。
- [x] 11 个生产 Pro 家族均可搜索并区分独立预览、组合覆盖和 `real-app-only`；无独立预览者有理由。
- [x] 生产依赖及第一至八批结论不变；只实施用户本轮明确批准的共享字段外壳与 Disclosure 布局修复，第十批其余项目仍须实际确认。

实现已完成；用户已确认 Menu、Overlays、Navigation、Collections、Command、ActionBar、Cell Controls、Layout Surfaces、Timeline/HoverCard 与 EmptyState。

## 人工审查进展

- [x] Menu、Overlays、Navigation、Collections、Command、Cell Controls、Layout Surfaces、Timeline/HoverCard、EmptyState。
- [x] ActionBar：按上游示例使用数字 Chip 与三条 Separator；Current 外壳恢复固定操作栏的真 pill 语义；删除操作恢复原生实心 `danger`，并使用全局协调后的 strong danger 红。

## Verification

- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx src/ui-lab/native-comparison/NativeComparison.test.tsx`
- Ticket 03 建立的隔离 renderer/Portal 聚焦测试
- `bun typecheck`
- `bun lint`
- `bun run lint:boundaries`
- `bun format:check`
- `git diff --check`

## Implementation evidence

- 十个 review unit 共用 Ticket 03 的隔离 renderer；组件关系通过 `inventoryRefs` 从既有 HeroUI 总账派生，没有复制消费者清单。
- `Table`、无消费者的 `Tabs`、OSS `EmptyState` 保持 ledger-only；`Sidebar` 保持组合覆盖；`InlineSelect` 与 `HoverCard` 仍是候选，不把预览误算成已采用。
- Navigation 明确展示为 Disclosure 折叠面板；fixture 与真实 Settings Sync 消费者共同修正 Indicator 布局。Command 使用真实 SearchIcon。ActionBar 使用数字 Chip、官方三段 Separator anatomy，以及原生实心 `danger` 文字/图标，并为数量与分隔线留有 DOM 回归断言。Cell Controls 复用公共无框字段外壳与 Primary 轻阴影；InlineSelect 使用单下箭头，并通过外部布局宽度容纳原生 `ItemIndicator`。
- 浏览器实测确认 Navigation 三层箭头均回到标题行、Command 搜索图标恢复 16px；ActionBar Current 外壳计算圆角为 `9999px` 且三条 Separator 均为纵向，删除操作恢复原生实心 `danger`：静止 `#dc3434`、悬停约 `#c93232`，白字对比分别为 4.58:1 与 5.29:1；soft danger 色阶保持不变。CellSwitch Current 为 `0px` 边框且轻阴影与 CellSelect 一致；InlineSelect 弹层宽度为 96px，选中文字与 16px ItemIndicator 保持 34px 间隔。用户复审 ActionBar 后，第十批 10 项均已标为 `done`。
- 聚焦 DOM 测试 2 files / 28 tests 通过；`bun typecheck`、`bun lint`、`bun run lint:boundaries`、`bun format:check`、`bun run build` 与 `git diff --check` 通过，lint 仅保留任务外既有 warnings。
- 生产构建仍只有 `index.html` 与 `launcher.html`；未修改依赖或锁文件。
