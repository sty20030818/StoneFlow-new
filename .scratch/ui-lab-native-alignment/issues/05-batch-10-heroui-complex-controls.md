# 05 — 建立第十批 HeroUI OSS/Pro 复杂控件对照

**What to build:** 建立第十批复杂集合、Overlay、导航和 Pro 控件对照，重点验证上游公共状态、Portal、Focus 与产品组合边界；没有真实场景的能力只登记，不制造业务 Demo。

**Blocked by:** 03 — 跑通 Upstream、Token 与 Current 的隔离对照。

**Status:** planned

**Primary write scope:** 新增一个第十批 sample/fixture 模块、catalog 注册入口、必要的隔离 Portal/根级测试；禁止修改生产 Overlay、Focus 路由、HeroUI recipe、依赖和锁文件。

- [ ] 第十批包含十个 review unit：Menu；Overlays；Navigation；Collections；Command；ActionBar；Cell Controls；Layout Surfaces；Timeline/HoverCard；EmptyState。
- [ ] Menu 覆盖 Dropdown、ContextMenu、Popover；Overlays 覆盖 Modal、AlertDialog、Sheet；Navigation 覆盖 Tabs、Disclosure。
- [ ] Collections 覆盖 ListView 与 Table，并明确真实消费者、候选或当前无场景；没有产品表格需求时 Table 保持 ledger-only，不虚构业务数据表。
- [ ] Command、Menu、ListView、ActionBar 只覆盖适用的键盘移动、选择、禁用、危险项、尾部动作与 Escape，不复制上游状态机。
- [ ] Cell Controls 覆盖 CellSwitch、CellSelect，并在锁定版本公共能力真实存在时展示 InlineSelect；候选明确指向 Metadata 属性编辑。
- [ ] Layout Surfaces 覆盖 Resizable、ScrollShadow、Surface；只验证上游原料，Entity Detail 的 Resizable/Sheet 组合留给第十三批。
- [ ] Timeline/HoverCard 记录 Activity/Task Preview 的真实目标；EmptyState 使用实际 Launcher/空集合语义，不复制 HeroUI Pro 源码或官网示例。
- [ ] Overlay 在隔离 Document 自己的 Portal root 中打开、关闭和清理，不泄漏到父 Lab；真实 Shell 焦点恢复与 WebView Portal 标为 `real-app-only`。
- [ ] 三层对照复用相同 fixture，只使用锁定版本公共 compound API、props 与 slots，不深导入私有源码或依赖私有 DOM/class。
- [ ] 11 个生产 Pro 家族均可搜索并区分独立预览、组合覆盖和 `real-app-only`；无独立预览者有理由。
- [ ] Current 视觉、生产代码、依赖及第一至八批结论不变；第十批只在用户实际确认后完成。

## Verification

- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx`
- Ticket 03 建立的隔离 renderer/Portal 聚焦测试
- `bun typecheck`
- `bun lint`
- `bun run lint:boundaries`
- `bun format:check`
- `git diff --check`
