# filter · 筛选平台

> 作用：描述 **当前已落地** 的 `src/features/filter` 边界  
> 最后更新：2026-08-03（P0：`core` FilterQuery 落地；UI 会话仍为过渡）

---

## 1. 心智

```txt
长期：
  FilterQuery (core) ← URL search / View.filters / chip
       ↓ adapt
  list_tasks / run_view

当前过渡（P3–P7 删除）：
  PageFilterProvider → 扁平 controller → Command picker
```

---

## 2. 目录

```txt
src/features/filter/
├── core/           # 领域：types · normalize · url-codec · adapt（无 React）
├── model/          # 页级 Provider（过渡）
├── components/     # PageFilterButton（过渡）
├── commands/       # registerFilterCommands（过渡）
└── index.ts        # 唯一公共面
```

---

## 3. Public

### 领域核（长期）

- `FilterQuery` / `FilterClause` / `normalizeFilterQuery` / `isFilterQueryEmpty` / `filterQueriesEqual`
- `encodeFilterQueryToSearchParam` / `decodeFilterQueryFromSearchParam` / `FILTER_SEARCH_PARAM_KEY`（`f`）
- `adaptFilterQueryToListTasks` / `adaptFilterQueryToViewFilters`（view 侧 T4 前桥接旧 TaskViewFilters）

### 过渡（将删）

- `PageFilterProvider` · controller 类型 · `PageFilterButton` · `registerFilterCommands`

**不在本包：** `useTaskPageFilterController` → `@/features/task`（P7 删除）

---

## 4. 禁止

- 外模块深路径 import `core/` / `model/`
- UI 内复制 adapt 映射
- display-options import filter 业务状态
