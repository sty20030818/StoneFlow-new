# 任务 Board 硬化与 View 窗口化 - Spec

## 背景

前序任务 [任务集合查询与虚拟列表](../../98-归档/02-已完成重构/2026-07-31-task-collection-query-virtualization/) 已落地 list keyset、Virtual Board、默认未完成筛选。收口阶段发现：

1. `TaskBoard` 上帝组件（~950 行）混杂模型 / 虚拟化 / sticky / 续拉。
2. 滚动用 `querySelector`，OverlayScrollbar 硬编码 task 选择器。
3. 总高用「header 预算」锁死，**折叠时拇指不变**（与产品期望不符）。
4. `totalCount ?? items.length` 掩盖契约缺失。
5. **View `run_task_view` 仍全量**，未与 list 同窗口语义。

本任务做干净收口：模型层、滚动契约、折叠变高、契约硬化、View 窗口化。

## 范围

- 抽出 pure `taskBoardModel`（flat / extent / sticky push）。
- extent：折叠后总高与拇指随真实结构变；分页未完成时仅对未加载行占位。
- `AppScrollArea` 提供 scrollRef Context；去掉 Board/Overlay 的 DOM 选择器耦合。
- 删除危险 `totalCount` 回退；列表契约 totalCount 必有。
- View：`run_task_view` 返回 `nextCursor` + `totalCount`；前端 infinite 续拉。
- 同步 A2；可勾选验收（含 ≥500 建议 seed 说明）。

## 不做什么

- 不换成 shadcn ScrollArea / virtuoso。
- 不把 VirtualList 抽到 shared（尚无第二消费者）。
- 不重做筛选 UI；能下推的筛选继续下推，本轮以 **status/incomplete 已下推 + total 与服务端同语义** 为主。
- 不强制 View 全部过滤 SQL 化（可在内存滤后 keyset 切片；规模 ≤2k）。

## 验收要点

- AC-1：折叠分区后内容变矮、拇指变长；展开恢复。
- AC-2：有 totalCount 且续拉中，未加载行占位，续拉不无故改拇指（折叠除外）。
- AC-3：sticky 跨分区有顶替（push）。
- AC-4：Board 不通过 querySelector 绑 main-card。
- AC-5：View 与 list 均为窗口 + totalCount + 续拉。
- AC-6：typecheck + 相关单测通过。
