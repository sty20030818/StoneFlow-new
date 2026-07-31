# 任务集合查询与虚拟列表性能重构 - Tasks

> 需求与验收以 [SPEC.md](SPEC.md) 为准，技术设计以 [PLAN.md](PLAN.md) 为准。本文件只记录可执行任务、状态、阻塞和实施偏差。
>
> **执行前**：重读 SPEC 对应 AC 与 PLAN 相关章节；不要只靠对话记忆。

## 当前阶段

实现主体完成；待发起人手动验收 All 列表打开/滚动/续拉/筛选后可归档。

## 阶段任务

### Phase 0：S0 — 批量 lookup + 列表投影去 note

- [x] T1 将 `src-tauri/crates/storage/src/adapters/task.rs` 中 `TaskSpaceReader::list_by_ids` / `TaskProjectReader::list_by_ids` 改为单次（或有界）`WHERE id IN (...)` 批量查询，删除串行 `get` 循环主路径
  - 同步改 repository 层（如 `SpaceRepository` / `ProjectRepository`）提供 `list_by_ids` IN 查询
  - _对应验收标准：AC-5, AC-12_
  - _测试先行：`src-tauri` 内相关 adapter/repository 测试或 application 集成测_

- [x] T2 修正 `src-tauri/crates/application/src/task/service.rs` 的 `load_space_map` / `load_project_map`：对 task 上的 space_id/project_id **HashSet 去重**后再 `list_by_ids`
  - _对应验收标准：AC-5_
  - _测试：scope=all 下列表查询不因重复 id 放大 lookup 次数_

- [x] T3 将 `src-tauri/crates/storage/src/adapters/view.rs` 的 `ViewLookupReader::list_spaces_by_ids` / `list_projects_by_ids` 同样改为 IN 批量，与 task adapter 一致（可抽共享 lookup，避免两套实现）
  - _对应验收标准：AC-5, AC-12_

- [x] T4 从列表契约去掉 `note`：改 `src-tauri/.../task/service.rs` 的 `TaskListItemDto`、`src/shared/types/task.ts` 的 `TaskListItem`、前端 `list_tasks` / `runTaskView` mapper（如 `src/features/task/api/`、`src/features/view/api/views.ts`）；全库 grep 消除对列表 `note` 的读取
  - 详情/预览继续走 `get_task_detail`（或等价）保留 note
  - _对应验收标准：AC-4, AC-12_
  - _测试：更新所有引用 `TaskListItem.note` 的测试与类型_

- [x] T5 跑通 `cargo test`（触及 crate）+ 前端 typecheck；确认无列表 note 残留、无串行 list_by_ids 主路径
  - _对应验收标准：AC-4, AC-5, AC-12_

### Phase 1：S1 — 「未完成任务」默认筛选 + status 下推

- [x] T6 在 `src/features/task/hooks/list-scene/variantConfig.ts` 的 `ALL_TASK_FILTERS` 最前插入 `'incomplete'`（文案「未完成任务」），顺序为：未完成 → 所有任务 → 独立事项 → 各状态
  - _对应验收标准：AC-3_
  - _测试：`src/features/task/hooks/list-scene/variantConfig.test.ts`_

- [x] T7 在 `src/features/task/hooks/useTaskListScene.ts` 用 statusMode 实现 incomplete 默认（排除 done/canceled）；与「所有任务」/单状态互斥；独立事项可叠加
  - _对应验收标准：AC-1, AC-2_

- [x] T8 更新 `useTaskListScene` toolbarPills：未完成在前、默认 active
  - _对应验收标准：AC-1, AC-2, AC-3_

- [x] T9 `ListTasksInput.statuses` + Rust `list_tasks` / `list_visible_with_statuses` SQL `IN` 下推
  - _对应验收标准：AC-1, AC-5_
  - _测试：`tasks.test.ts`、runtime task tests_

### Phase 2：S2 — 行隔离与懒交互

- [x] T10 指针 hover 不再驱动行 `isHovered` React 状态（仅键盘 hover）；`RowShell` 增加 CSS `hover:`；减少全表 hover 协调
  - _对应验收标准：AC-7_
  - 备注：shortcut controller 内仍保留 hoveredId state 供命令目标；后续可再改为纯 ref

- [x] T11 Board 级 `createTaskPlacementGroupedDropdownProps` 一次计算，经 `projectBinding.placementGroups` 下发
  - _对应验收标准：AC-6, AC-7_

- [x] T12 `TaskContextMenu` 仅 open 时挂载 Content
  - _对应验收标准：AC-6, AC-7, AC-10_

- [x] T13 `TaskRowAdapter` `memo` + placement 上提 + Board actions/binding 稳定化
  - _对应验收标准：AC-7_

### Phase 3：S3 — Virtual Board（@tanstack/react-virtual）

- [x] T14 安装 `@tanstack/react-virtual@3`
  - _对应验收标准：AC-6_

- [x] T15 `TaskBoard.tsx` 改为展平索引 + `useVirtualizer`（scroll 父级 `main-card`）；所有消费 `TaskBoard` 的场景共用
  - _对应验收标准：AC-6, AC-9_
  - _测试：`TaskBoard.test.tsx`_

- [x] T16 虚拟路径不再使用 `BoardRows` 全量 `cloneElement` 选区分组（行自身 selected 样式）
  - _对应验收标准：AC-6, AC-7_

- [x] T17 `taskBoardScroll` + `scrollToIndex` 与 `keyboardScroll` 接线
  - _对应验收标准：AC-10_

- [x] T18 list / standalone / project / views 均经 `TaskBoard` 共用虚拟路径（无第二套 map）
  - _对应验收标准：AC-9_

### Phase 4：S4 — Cursor 窗口 + 续拉

- [x] T19 `TaskListQuery` + `list_visible_page` keyset（position, id）+ limit
  - _对应验收标准：AC-8, AC-5_

- [x] T20 `list_tasks` → `ListTasksPageDto`；前端 `useInfiniteQuery` + `useTaskListData` 展平 pages
  - _对应验收标准：AC-8, AC-11_
  - _测试：`tasks.test.ts`、runtime task tests_

- [x] T21 View 路径暂仍 `run_task_view` 全量候选（与 list 共用 Virtual Board）；list 主路径已窗口化。View 专用 keyset 作为后续增量（偏差见下）
  - _对应验收标准：AC-9（Board 共用）；AC-8 对 View 数据源待增强_

- [x] T22 Board 接近末尾 `fetchNextPage`；失败文案 + 重试
  - _对应验收标准：AC-8, AC-11_

- [x] T23 窗口内 status 分组；角标为已加载数
  - _对应验收标准：AC-6, AC-8_

### Phase 5：S5 — 统一 executor、删旧路径、文档与验收

- [x] T24 list enrichment 已 IN 批量 + 去重；View lookup 同构。完整 `TaskQueryService` 单 executor 与 View 共用分页列为后续（避免本轮过大）
  - _对应验收标准：AC-5, AC-12 主路径_

- [x] T25 列表无 note；主路径无串行 list_by_ids；无 virtuoso；无 All 特判 Board
  - _对应验收标准：AC-12_

- [x] T26 invalidate 仍走既有 mutation 路径；infinite key 稳定（不含 cursor）
  - _对应验收标准：AC-10_

- [x] T27 同步 A2 / A3 列表读模型与默认「未完成」筛选
  - _对应验收标准：Definition of Done_

- [x] T28 `typecheck` + `lint:boundaries` + task Vitest + runtime `commands::tasks` 通过；手工验收项交发起人
  - _对应验收标准：AC-1–AC-12、Definition of Done_

## 阻塞

无。

## 与 SPEC/PLAN 的实施偏差

1. **View 数据源尚未 keyset 分页**：`run_task_view` 仍一次返回候选集；UI 已虚拟化。All「所有任务」主路径（`list_tasks`）已分页。View 分页并入统一 TaskQuery 列为后续增量，不阻塞主验收。
2. **未抽独立 `TaskQueryService` 文件**：分页与 enrichment 收在现有 `task/service` + `list_visible_page`；逻辑等价 PLAN，结构合并可再做。

## 完成记录

- S0：IN 批量 lookup、列表去 note、预览走 detail。
- S1：默认「未完成任务」pill + statuses SQL 下推。
- S2/S3：Virtual Board、`@tanstack/react-virtual`、行 memo、placement 上提、ContextMenu 懒挂载、键盘 scrollToIndex。
- S4：`list_tasks` keyset 分页 + infinite query + 末尾续拉。
- S5：A2/A3 文档同步；自动化测试通过。
