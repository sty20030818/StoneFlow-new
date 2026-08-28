# 04 — 统一集合、搜索与 Task 工作面

**What to build:** 通过 RowShell、真实 TaskBoard 与全局搜索结果完成集合状态的端到端迁移，使 Hover、Selected、Selected-hover、连续选择、Group Header 和窄容器信息优先级符合 UI Lab 目标，同时完整保留 React Aria collection、selection、虚拟化和滚动几何合同。

**Blocked by:** 01 — 收敛共享主题与 HeroUI Recipe。

**Status:** ready-for-agent

**Primary write scope:** `src/shared/components/row/RowShell.tsx`、`src/features/task/components/TaskBoard.tsx`、`src/features/task/components/TaskRowAdapter.tsx`、`src/features/task/components/TaskRowCells.tsx`、`src/features/task/model/taskBoardModel.ts`、`src/features/global-search/components/GlobalSearchResults.tsx` 及其现有测试；selection、sticky、spacer 与虚拟化 Owner 只读验证。

- [ ] 审计 `src/shared/components/row/RowShell.tsx` 及 Lifecycle、Project、Task 三类真实 adapter；Rest 不常驻 Hover 背景，Pointer Hover 使用中性灰，Selected 使用语义 Accent Soft，Selected-hover 比 Selected 更深，键盘焦点与选择状态可区分。
- [ ] 审计 `src/features/task/components/TaskBoard.tsx`、`src/features/task/components/TaskRowAdapter.tsx` 与 `src/features/task/model/taskBoardModel.ts`；保留 `44px` Task Row、`36px` Group Header、Header 与首行 `2px` 间距、sticky、spacer、虚拟化和现有 selection 协议。
- [ ] 将 TaskBoard Group Header 仍使用的 `bg-surface-secondary` 映射到 Ticket 01 已批准的中性默认表面，并把连续选中组 2px 填充壳从普通 `bg-default` 对齐到 RowShell 的语义 Accent Soft；间隙与行背景同色，中间行只移除内部圆角。
- [ ] 连续选中行必须通过既有 group-position 合同消除中间圆角；Task Checkbox 只在 Hover、Focus、Selected 或产品已确认状态下出现，键盘用户仍能发现并操作，不复制一套 Hover/Focus 状态机。
- [ ] Group Header 保持独立行，折叠箭头、状态、标题、数量与尾部新增入口对齐；保留既有折叠、双击折叠、右键命令与业务状态 Owner，不把命令行为移入共享样式。
- [ ] 将 `src/features/global-search/components/GlobalSearchResults.tsx` 中两个 `ListView variant='secondary'` 对齐为已确认的 Primary 并显式使用 `selectionMode='none'`；外部 highlighted row 使用 `aria-current`，不得产生持久 `aria-selected`，标题、副标题、时间、Hover 与操作语义清晰。
- [ ] 用真实容器与真实 `visibleProperties` 复现 560px 附近、长中文和元数据拥挤；只有确认现有规则失败时才增加一个最小降级档，标题和关键操作优先，低优先级元数据先隐藏，长标题截断并保留可访问名称。
- [ ] 本 ticket 不修改共享 CSS、不重写 collection/selection/virtualization/sticky/spacer/滚动协议；迁移完成后删除局部 Row skin、重复 geometry 与零消费者兼容路径。
- [ ] 在 `src/shared/components/row/RowShell.test.tsx`、`src/features/selection/model/useCollectionInteraction.test.tsx`、`src/features/selection/shortcuts/useCollectionKeyboardAdapter.test.tsx`、`src/features/task/components/TaskBoard.test.tsx`、`src/features/task/components/TaskRowAdapter.test.tsx`、`src/features/task/model/taskBoardModel.test.ts`、`src/features/project/components/ProjectRowAdapter.test.tsx`、`src/features/lifecycle/components/LifecycleRowAdapter.test.tsx` 与 `src/features/global-search/components/GlobalSearchInput.test.tsx` 中覆盖真实行为，并运行 `bun typecheck`、`bun lint`、`bun run lint:boundaries` 与 `git diff --check`；不修改共享 CSS 或重新实现只读协议。
