# 所有空间任务执行台落地 - Tasks

> 需求与验收以 [SPEC.md](SPEC.md) 为准，技术设计以 [PLAN.md](PLAN.md) 为准。本文件只记录可执行任务、状态、阻塞和实施偏差。

## 当前阶段

实现与定向测试已完成；质量检查通过 typecheck / boundaries / 定向 Vitest。

## 阶段任务

### Phase 1：文案与导航收口

- [x] T1 将 All scope 界面文案统一为「所有空间」：修改 `src/layout/ShellLayoutContent.tsx` 中「全部 Spaces」及创建壳空态文案（改为「选择空间」），测试同步
  - _对应验收标准：AC-1_

- [x] T2 在 `src/layout/model/scopeNavPolicy.ts` + `ShellSidebar.tsx` 实现 All scope 下隐藏项目总览、不展示项目列表/独立事项；单 Space 不变
  - _对应验收标准：AC-8, AC-10_
  - _测试：`scopeNavPolicy.test.ts`、`ShellSidebar.test.tsx`_

### Phase 2：所有任务同语义 + 行级 Space

- [x] T3 锁定 All「所有任务」与单 Space 共用 `TASK_LIST_PAGE_VIEW_KEY = 'all'`（`variantConfig` / `useTaskListScene`）
  - _对应验收标准：AC-2_
  - _测试：`variantConfig.test.ts`、`tasks.test.ts`_

- [x] T4 All 列表 `showSpaceLabel` 经 collection scene → Board → Row 固定展示 `spaceName`
  - _对应验收标准：AC-3_
  - _测试：`TaskRowAdapter.test.tsx`_

- [x] T5 确认 `groupBy=status` + 既有 `smart` 排序在组内含优先级权重；无需改默认 orderBy
  - _对应验收标准：AC-2_

### Phase 3：创建与推进操作

- [x] T6 创建表单 All 预填具体 Space；空 spaceId schema 拒绝；壳层空态「选择空间」
  - _对应验收标准：AC-6, AC-7_
  - _测试：`taskCreateForm.test.ts`、`CreateDialogShell.test.tsx`_

- [x] T7 状态/优先级与批量仍走既有 task 路径（无分叉）；命令副标题 All 下露出 Space
  - _对应验收标准：AC-4, AC-5_
  - _测试：`buildTaskCommandSelection.test.ts`_

### Phase 4：View 同构与文档收尾

- [x] T8 View 既有 `scope=all` 路径与测试保持（`views.ts` / ViewsPage 测试）
  - _对应验收标准：AC-9_

- [x] T9 同步 P2、A3、A1、`space/ARCHITECTURE.md`、本 TASKS
  - _对应验收标准：Definition of Done_

- [x] T10 `bun run typecheck`、`bun run lint:boundaries`、定向 Vitest 通过；无 redirect 兼容层、无「全部 Spaces」残留
  - _对应验收标准：AC-1–AC-10、Definition of Done_

## 阻塞

无。

## 与 SPEC/PLAN 的实施偏差

无实质偏差。T5 经阅读 `compareBySmartOrder`：状态分组内优先级为排序维度之一，未改默认 `orderBy`。

## 完成记录

- 新增 `src/layout/model/scopeNavPolicy.ts`（All 导航策略纯函数）。
- 文案统一「所有空间」；创建空选「选择空间」。
- All 行 `showSpaceLabel`；list viewKey 与单 Space 同语义。
- 长期文档已对齐。
