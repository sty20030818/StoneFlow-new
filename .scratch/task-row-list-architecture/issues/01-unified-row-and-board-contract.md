# 01：统一 Row 与集合页面契约

**What to build:** 让 Task Workspace、Project Overview、Archive 与 Trash 使用同一套 Row、Section Header、连续选择和集合滚动合同，使用户在不同实体页面获得一致的排版、状态与恢复体验，同时完整保留各领域自己的属性、Command、写动作与焦点语义。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] RowShell 继续作为唯一交互根，统一固定 Row 高度、outer padding、active/selected/hover/focus/pending 状态与可访问根节点，不读取任何领域实体或 layout-engine 状态。
- [ ] 新增无状态 RowLayout，并只提供 `selection`、`leading`、`primary`、`properties`、`actions` 五个真实 ReactNode 槽位；它统一内部对齐、间距、收缩、截断、属性/动作显隐和响应式优先级，不增加 entity kind、boolean 组合、列配置、Context 或 Provider。
- [ ] Task、Project、Lifecycle 三个 Row Adapter 全部迁移到 RowLayout；各 Adapter 继续唯一拥有领域属性、HeroUI 控件、Command Context 与动作，不出现通用 EntityRow 或配置式 renderer。
- [ ] BoardRowSlot 成为 section 内连续选择几何的唯一 Owner，统一 2px item gap，并根据相邻 selected keys 形成 `single/first/middle/last`；RowShell 的旧 selection-position API、TaskBoard 私有 rounding map 和重复 CSS 同批删除。
- [ ] BoardSectionHeader 统一 36px 高度、surface、圆角、label/count/selected-count 与 leading/trailing anatomy；sticky/absolute positioning、collapse、double-click、Context Menu、创建动作和焦点恢复仍留在各 Board。
- [ ] Row 44px、Header 36px、item gap 2px 只有一份共享产品几何事实源；Row、Section Header 与 TaskBoard 的 estimate/offset/sticky 推导共同消费，不保留 Tailwind 数值与虚拟模型数值两份知识，也不增加 density 或动态高度 variant。
- [ ] PageFrame 的 VirtualizedBody clean cut 为 CollectionBody；Task Workspace、Project Overview、Archive 与 Trash 使用同一真实 scroll viewport、inset 与 overflow 合同，普通内容 Body 保持不变，旧名称无 alias、无消费者。
- [ ] 迁移共享 Row/Header 后重新审计 ProjectBoard 与 LifecycleBoard 的剩余重复；只有 section wrapper、selection count、select/deselect-all、collapse/expand、Context Menu 与 BoardRowSlot mapping 仍表达同一知识且能被小 Interface 隐藏时，才保留非虚拟 GroupedBoardSection。若只剩领域 wiring 或参数透传，则维持各域本地 section，不为“看起来相似”制造薄层。
- [ ] 三类 Board 的 loading、empty、error 使用一致且可恢复的 HeroUI 合同；error 接通真实 retry/refetch，不再只显示“请稍后重试”，且不新增状态 DSL。
- [ ] UI Lab 现有 Task、Group Header、Row 与连续选择样例直接消费生产公开组件；不新增批次、不复制视觉实现、不把 Lab 状态变成第二份产品真源。
- [ ] 同步界面系统、HeroUI 平台 ADR 与相关模块架构中关于 Row/Header/CollectionBody、44/36/2 几何和滚动 viewport 的权威合同，使 Ticket 01 单独完成时文档与代码一致。
- [ ] 保持 Row activate、Checkbox、range selection、折叠、Group Header re-entry、Context Menu、Command projection、详情焦点恢复与 560px 紧凑排版的现有可观察行为。
- [ ] 现有 RowShell、TaskBoard、ProjectBoard、LifecycleBoard 与 PageFrame 测试覆盖槽位、连续选择、Header、唯一 viewport、keyboard/focus 和 retry；测试验证行为与合同，不锁定完整 Tailwind class 字符串。
- [ ] 搜索确认旧 VirtualizedBody、RowShell selection-position、TaskBoard 私有 header/rounding shape、重复 UI Lab shape 和零消费者导出全部清零；不保留兼容 alias、feature flag、注释旧代码或新依赖。
- [ ] 聚焦测试通过后，运行根级 `bun typecheck`、`bun lint`、`bun run lint:boundaries`、`bun format:check`、`bun test:run`、`bun run test:scripts`、`bun run test:release`、`bun run build` 与 `git diff --check`，并将自动化证据与待真实应用验收边界分开记录。
