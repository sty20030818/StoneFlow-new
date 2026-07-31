# 任务 Board 硬化与 View 窗口化 - Plan

## 定案（grill）

| 项 | 决议 |
|---|---|
| 模型 | 抽 pure model，Board 只渲染 |
| 滚动条 | 保留 AppScrollArea + OverlayScrollbar；不换 shadcn；去 task 选择器；scrollRef Context |
| 分区 | 必须 sticky 顶替；**折叠改变总高与拇指** |
| 数据 | 前端少二滤；totalCount 与服务端窗口同语义 |
| View | 完整窗口化（本任务必做） |
| 规模 | ≤2k；View 可内存滤后切片；list 继续 SQL keyset |

## 架构

```
taskBoardModel.ts (pure)
  buildFlatItems / buildItemOffsets / buildBoardExtent / buildStickyPush

AppScrollArea → ScrollViewportContext(ref)
TaskBoard → useScrollViewport() → useVirtualizer.getScrollElement

run_task_view → { items, groups, nextCursor, totalCount }
  候选 → 滤 → 排 → totalCount=len → cursor 切片

useTaskViewInfiniteQuery + useViewsScene 接线 totalCount/hasNext/fetchNext
```

## Extent 公式

```
flatSize = Σ 当前 flatItems（折叠已反映）
loadedServerCount = 服务端已拉取任务数（pages 展平，非可见行）
if hasNextPage && totalCount > 0:
  contentHeight = flatSize + max(0, totalCount - loadedServerCount) * ROW
else:
  contentHeight = flatSize   // 折叠立即变矮
```

## 波次

- P0 模型 + extent + scrollRef + 删 fallback
- P1 totalCount 契约
- P2 View 窗口
- P3 A2 + 验收说明 + 测试

## 前序

归档：`Documents/98-归档/02-已完成重构/2026-07-31-task-collection-query-virtualization/`
