# filter · 筛选平台

> 作用：描述 **当前已落地** 的 `src/features/filter` 边界  
> 最后更新：2026-08-03（P0–P5：FilterQuery + 会话 + Menu/Bar 主路径）

---

## 1. 心智

```txt
URL search `f` ──temp──┐
                       ├─► effective ──adapt──► list_tasks / run_view
View.filters ──base────┘

UI：PageFilterButton → FilterMenu（锚定）
    FilterBar → chip / Clear(dirty) / Save
命令 F：emitFilterUiEvent → 打开 FilterMenu（非 filter-picker 全页）
```

| 概念 | 真源 |
|---|---|
| 公式形状 | `FilterQuery`（clause 列表） |
| 临时条件 | 路由 search `f`（`useListFilterSession`） |
| 持久 View 筛选 | SQLite `filters_json`（同形） |
| 显示选项 | **不在本包** → `display-options` |

---

## 2. 目录

```txt
src/features/filter/
├── core/                 # 纯领域：types · normalize · url-codec · adapt
├── model/
│   ├── useListFilterSession.ts   # base/temp/effective
│   ├── ListFilterUiContext.tsx   # 页级注入 session + Save
│   ├── filterUiEvents.ts         # 命令 → 打开菜单
│   ├── pageFilterSliceBridge.ts  # 旧扁平→clause（P7 删）
│   └── PageFilterProvider.tsx    # 过渡 controller（P7 删）
├── components/
│   ├── PageFilterButton · FilterMenu · FilterBar
│   └── filterLabels.ts
├── commands/registerFilterCommands.ts
└── index.ts
```

---

## 3. Public

- 领域：`FilterQuery`、`normalizeFilterQuery`、`adaptFilterQueryToListTasks`、URL codec、`FILTER_SEARCH_PARAM_KEY`
- 会话：`useListFilterSession`、`parseListFilterSearch`、`ListFilterUiProvider`
- UI：`PageFilterButton`、`FilterBar`、`FilterMenu`
- 命令：`registerFilterCommands`、`emitFilterUiEvent`

**不在本包：** `useTaskPageFilterController` → `@/features/task`（过渡桥，P7 删）

---

## 4. 禁止

- 外模块深路径 import `core/` / `model/`
- UI 内复制 adapt 映射
- display-options import filter 业务状态
- 以全页 Command `filter-picker` 作为唯一加筛入口
