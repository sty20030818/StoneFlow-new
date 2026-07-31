# 任务 Board 硬化与 View 窗口化 - Tasks

> 前序已归档至 `Documents/98-归档/02-已完成重构/2026-07-31-task-collection-query-virtualization/`。

## 当前阶段

实现完成，待发起人热更新后手工验收。

## Phase 0 — 模型与滚动契约

- [x] T1 `taskBoardModel.ts`：flat / offsets / extent / stickyPush + 单测
- [x] T2 `TaskBoard` 改用 model；折叠变高；去掉 header 预算锁死
- [x] T3 `AppScrollArea` ScrollViewportContext；TaskBoard 用 ref
- [x] T4 OverlayScrollbar 去掉 task-board 选择器
- [x] T5 删除 `totalCount ?? items.length` 危险回退

## Phase 1 — 契约

- [x] T6 `loadedCount` 透传；Board extent 用服务端 loaded 计数

## Phase 2 — View 窗口

- [x] T7 `run_task_view`：limit/cursor、totalCount、nextCursor（内存滤后切片）
- [x] T8 前端 infinite query + `useViewsScene` 接线
- [x] T9 ViewsPage 测试更新

## Phase 3 — 文档与验收

- [x] T10 同步 A2
- [x] T11 验收说明见下方
- [x] T12 typecheck + 相关 vitest + application view 测通过

## 验收说明（手工）

1. **折叠**：展开/折叠状态分区 → 列表变矮/变高，拇指长度跟着变。  
2. **Sticky**：跨分区滚动有顶替（当前标题被下一分区顶走）。  
3. **续拉**：长列表滚到底加载更多；未折叠时拇指不无故狂缩。  
4. **View**：系统/自定义视图打开、滚动续拉、footer 总数为 totalCount。  
5. **≥500（建议）**：用 seed 或批量导入后重复 1–4。

## 完成记录

- 旧任务已归档。
- P0–P3 代码落地；自动化测通过；待 UI 手工确认后可归档本任务。
