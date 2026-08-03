# Linear 式 Filter · Display · Views - Tasks

## 当前阶段

**已完成并归档**（`Documents/98-归档/02-已完成重构/2026-08-03-linear-filter-display-views/`）

## 阶段任务

- [x] P0 T1–T3 领域 FilterQuery / URL / adapt  
- [x] P1 T4–T6 View/Rust clause；sort/group 迁 Display  
- [x] P2 T7–T9 Display 独占呈现  
- [x] P3 T10–T12 列表会话 base/temp/effective  
- [x] P4 T13–T16 FilterMenu / FilterBar / 接线  
- [x] P5 T17–T20 Save / 命令主路径 / 槽位  
- [x] P6 T21–T22 验收与长期文档  
- [x] P7 T23–T31 删兼容层、统一架构、归档  

### P7 清扫要点

- 删除 `useTaskPageFilterController`、`pageFilterSliceBridge`  
- 删除 collection `externalFilter` / `serverDrivenFilters`  
- 删除 `useTaskViewRunQuery`  
- 列表/项目/Views：`useListFilterSession` + `useRegisterFilterCommandAdapter` + adapt  
- 命令宿主投影自 FilterQuery；`showCompleted` 真源在 Display  

## 偏差

1. AC-15 隐藏条数：UI 位保留，count 为 null（避免假数）。  
2. View 全量 SQL keyset 不在范围（见债台账 F-02）。  

## 完成记录

| 日期 | 记录 |
|---|---|
| 2026-08-03 | 全阶段完成；P7 清扫冗余兼容；任务归档 |
