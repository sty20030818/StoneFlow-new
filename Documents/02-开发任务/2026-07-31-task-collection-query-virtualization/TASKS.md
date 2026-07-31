# 任务集合查询与虚拟列表性能重构 - Tasks

> 需求与验收以 [SPEC.md](SPEC.md) 为准，技术设计以 [PLAN.md](PLAN.md) 为准。本文件只记录可执行任务、状态、阻塞和实施偏差。
>
> **执行前**：重读 SPEC 对应 AC 与 PLAN 相关章节；不要只靠对话记忆。

## 当前阶段

实现阶段（PLAN 已确认）。按 Phase 顺序执行；默认上一条完成后再做下一条。

## 阶段任务

### Phase 0：S0 — 批量 lookup + 列表投影去 note

- [ ] T1 将 `src-tauri/crates/storage/src/adapters/task.rs` 中 `TaskSpaceReader::list_by_ids` / `TaskProjectReader::list_by_ids` 改为单次（或有界）`WHERE id IN (...)` 批量查询，删除串行 `get` 循环主路径
  - 同步改 repository 层（如 `SpaceRepository` / `ProjectRepository`）提供 `list_by_ids` IN 查询
  - _对应验收标准：AC-5, AC-12_
  - _测试先行：`src-tauri` 内相关 adapter/repository 测试或 application 集成测_

- [ ] T2 修正 `src-tauri/crates/application/src/task/service.rs` 的 `load_space_map` / `load_project_map`：对 task 上的 space_id/project_id **HashSet 去重**后再 `list_by_ids`
  - _对应验收标准：AC-5_
  - _测试：scope=all 下列表查询不因重复 id 放大 lookup 次数_

- [ ] T3 将 `src-tauri/crates/storage/src/adapters/view.rs` 的 `ViewLookupReader::list_spaces_by_ids` / `list_projects_by_ids` 同样改为 IN 批量，与 task adapter 一致（可抽共享 lookup，避免两套实现）
  - _对应验收标准：AC-5, AC-12_

- [ ] T4 从列表契约去掉 `note`：改 `src-tauri/.../task/service.rs` 的 `TaskListItemDto`、`src/shared/types/task.ts` 的 `TaskListItem`、前端 `list_tasks` / `runTaskView` mapper（如 `src/features/task/api/`、`src/features/view/api/views.ts`）；全库 grep 消除对列表 `note` 的读取
  - 详情/预览继续走 `get_task_detail`（或等价）保留 note
  - _对应验收标准：AC-4, AC-12_
  - _测试：更新所有引用 `TaskListItem.note` 的测试与类型_

- [ ] T5 跑通 `cargo test`（触及 crate）+ 前端 typecheck；确认无列表 note 残留、无串行 list_by_ids 主路径
  - _对应验收标准：AC-4, AC-5, AC-12_

### Phase 1：S1 — 「未完成任务」默认筛选 + status 下推

- [ ] T6 在 `src/features/task/hooks/list-scene/variantConfig.ts` 的 `ALL_TASK_FILTERS` 最前插入 `'incomplete'`（文案「未完成任务」），顺序为：未完成 → 所有任务 → 独立事项 → 各状态
  - _对应验收标准：AC-3_
  - _测试：`src/features/task/hooks/list-scene/variantConfig.test.ts`_

- [ ] T7 在 `src/features/task/hooks/useTaskPageFilterController.ts`（及必要时 `src/features/filter/`）实现 incomplete 语义：排除 `done`/`canceled`；与「所有任务」/单状态 pill **互斥**；「独立事项」仍为 placement 叠加维度
  - 默认状态：`variant=all` 的「所有任务」页 **初始为 incomplete**（`initialShowCompleted` 等旧开关与 incomplete 对齐，避免双状态源）
  - _对应验收标准：AC-1, AC-2_
  - _测试：`useTaskPageFilterController` 相关测或 filter 单元测_

- [ ] T8 更新 `src/features/task/hooks/useTaskListScene.ts` 的 `toolbarPills`：渲染「未完成任务」在前、默认 active；点击「所有任务」清除 incomplete/单状态；点击单状态取消 incomplete
  - _对应验收标准：AC-1, AC-2, AC-3_
  - _测试：scene/pills 定向测（可扩 `TaskListSceneView.test.tsx` 或 list-scene 测）_

- [ ] T9 将 incomplete/status 约束下推到 list 查询：扩展 `ListTasksInput` / Rust `list_tasks`（或过渡 query）支持 statuses 过滤；`src-tauri/.../task_repository.rs` 的 `list_visible`（或新 query builder）在 SQL 层 `status IN (...)`，禁止「全量拉回只靠前端 filter」作为默认路径
  - 前端 `useTaskListData` / query key 纳入 statuses
  - _对应验收标准：AC-1, AC-5_
  - _测试：Rust list 过滤测 + 前端 query input 测_

### Phase 2：S2 — 行隔离与懒交互

- [ ] T10 重构 `src/features/task/shortcuts/useTaskRowShortcutController.ts` + `TaskRowShortcutScope.tsx`：删除「`hoveredId` React state + children(render-prop) 灌全表」；pointer 目标改 ref / `data-task-id` / elementFromPoint；键盘焦点继续用 `focusedTaskId`
  - 同步改 `src/features/task/components/TaskBoard.tsx` 接线，不再把 hover state 作为每行 props 驱动整表
  - _对应验收标准：AC-7, AC-10_
  - _测试：`TaskRowShortcutScope.test.tsx` 及 Board 相关测_

- [ ] T11 将 placement groups 上提到 Board/Scene 级计算一次（`createTaskPlacementGroupedDropdownProps` / `buildTaskPlacementGroups`），经稳定 props 下发；删除 `TaskRowAdapter.tsx` 内对每行 `buildTaskPlacementGroups(all projects)` 的重复构建
  - _对应验收标准：AC-6, AC-7_

- [ ] T12 懒挂载行交互：`TaskContextMenu` 仅常驻 Trigger，Content 在 open 时再挂；Metadata dropdown 的 options 在 open 时创建（改 `src/features/task/components/TaskContextMenu.tsx`、`TaskRowAdapter.tsx`、必要时 `src/features/metadata-fields/`）
  - _对应验收标准：AC-6, AC-7, AC-10_

- [ ] T13 为 `TaskRowAdapter`（或拆出的 `TaskRow`）加 `memo`，保证 actions/placementGroups/handlers 引用稳定（Scene/Board 用 `useCallback`/`useMemo` 稳定化）
  - _对应验收标准：AC-7_

### Phase 3：S3 — Virtual Board（@tanstack/react-virtual）

- [ ] T14 安装并锁定 `@tanstack/react-virtual` 依赖（`package.json` / bun lock）；不引入 react-virtuoso
  - _对应验收标准：AC-6_

- [ ] T15 在 `src/features/task/` 实现唯一 `VirtualTaskBoard`（建议 `components/VirtualTaskBoard.tsx` 或 `board/` 目录）：单一 scroll 父级 + 展平索引（section header + rows）+ `useVirtualizer`；复用空态/loading 视觉
  - 替换 `TaskBoard.tsx` 全量 `tasks.map` 路径；**所有**任务集合入口改走 VirtualTaskBoard（list / standalone / project / views）
  - _对应验收标准：AC-6, AC-9_
  - _测试：`TaskBoard.test.tsx` 迁移或新建 `VirtualTaskBoard` 测（有界 DOM / 渲染数量）_

- [ ] T16 处理选中态：删除或绕开 `src/shared/components/board/Board.tsx` 中 `BoardRows` 对全部 children 的 `Children.toArray` + `cloneElement` 选区分组；改为行自身 `selected` 样式（相邻选中可用 CSS），虚拟窗口外不遍历全量 React children
  - _对应验收标准：AC-6, AC-7_

- [ ] T17 接通键盘 `scrollIntoView` / `scrollToIndex`：shortcut 聚焦行时虚拟列表滚到对应 index（`src/features/task/shortcuts/` + VirtualTaskBoard）
  - _对应验收标准：AC-10_
  - _测试：定向 shortcut + virtual 测_

- [ ] T18 确认 `src/features/view/hooks/useViewsScene.ts`、`src/features/project/components/ProjectPage.tsx`（及 `TaskListSceneView`）均只消费 VirtualTaskBoard，无第二套列表 map
  - _对应验收标准：AC-9_

### Phase 4：S4 — Cursor 窗口 + 续拉

- [ ] T19 在 application 层定义 `TaskQuery` / `TaskCursor` / `TaskQueryPage`（建议 `src-tauri/crates/application/src/task/query.rs` 或并入现有 task 模块）：`limit` + keyset cursor；`ORDER BY` 与 cursor 字段一致
  - storage 实现 `query_page`（SQL filter + sort + limit+1 判下一页）
  - _对应验收标准：AC-8, AC-5_
  - _测试先行：Rust 页连接无重复/无空洞_

- [ ] T20 将 `list_tasks` 改为返回分页形态（`items` + `nextCursor`）或新增统一 query command 并切换前端；更新 `src/features/task/api/` + `task.queries.ts` / `useTaskListData` 为 infinite query（TanStack Query `useInfiniteQuery` 或等价 append）
  - _对应验收标准：AC-8, AC-11_
  - _测试：api + query hooks_

- [ ] T21 `run_task_view` 走同一 `TaskQuery` executor 的窗口语义：`src-tauri/crates/application/src/view/service.rs` resolve definition 后调 query page；前端 `useTaskViewRunQuery` / `useViewsScene` 支持续拉
  - _对应验收标准：AC-8, AC-9_
  - _测试：view run 分页/窗口测_

- [ ] T22 VirtualTaskBoard 接近末尾时触发 `fetchNextPage`，拼接 items 且**不**把滚动重置到顶部；加载失败展示可读错误或保留已有窗口可重试（`AC-11`）
  - _对应验收标准：AC-8, AC-11_

- [ ] T23 窗口内 status 分组：对已加载 items 做 section 分组；角标不承诺全局精确 count（与 PLAN 一致）；全局 sort 键稳定，避免跨页乱序
  - _对应验收标准：AC-6, AC-8_

### Phase 5：S5 — 统一 executor、删旧路径、文档与验收

- [ ] T24 合并 application 内 list 与 view 候选集/enrichment 为单一 `TaskQueryService::query`；`list_tasks` 与 `run_task_view` command 仅薄映射；删除仅服务旧路径的串行 enrichment / 全量 `list_candidates`+内存 retain 主路径（View 难下推的日期语义按 PLAN 保持等价）
  - _对应验收标准：AC-5, AC-9, AC-12_

- [ ] T25 全库清理：无 `TaskListItem.note`、无任务列表主路径串行 `list_by_ids` for-get、无 All 专用性能分叉 Board、无 react-virtuoso
  - _对应验收标准：AC-12_

- [ ] T26 变更后的乐观更新/invalidate：mutation 优先按 id patch 当前 infinite 缓存窗口（`src/features/task/hooks/useTaskListController.ts` 等），避免整表闪烁
  - _对应验收标准：AC-10_

- [ ] T27 同步长期文档：`Documents/01-架构/A2-系统设计.md`、`A3-界面系统.md`；`src/features/task/`（及 view）ARCHITECTURE（若有）；在 all-spaces 任务文档或归档说明中标注「&lt;50 / 无虚拟列表」量级假设已由本任务取代
  - _对应验收标准：Definition of Done_

- [ ] T28 质量门禁与手工验收：`bun run typecheck`、`bun run lint:boundaries`、定向 Vitest、触及的 `cargo test`；本机 All scope ≥100 条：打开、滚动、hover、续拉、切「未完成/所有任务」、改状态/批量
  - _对应验收标准：AC-1–AC-12、Definition of Done_

## 阻塞

无。

## 与 SPEC/PLAN 的实施偏差

_（执行中若有偏差先写这里，再回改 SPEC/PLAN）_

## 完成记录

_（阶段完成后追加）_
