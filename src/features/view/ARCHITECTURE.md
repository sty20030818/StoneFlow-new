# view · 自定义视图

> 定稿最优架构。写法见 [`CONVENTIONS.md`](../../CONVENTIONS.md)。  
> 最后更新：2026-08-03（filters = FilterQuery；sort/group 退出产品真源）

---

## 1. 心智

```txt
routes 薄页
  → ViewsPage（薄壳 + ListFilterUiProvider）
  → useViewsScene
       · base = activeView.filters（FilterQuery）
       · temp = URL `f`（useListFilterSession）
       · run_task_view(filters 覆盖 = temp 或 legacy search)
       · display pageKey = task:view:{id}
  → PageFrame + FilterBar + TaskBoard

Save
  → 只写 filters（覆盖当前自定义 View 或 create）
  → 不写 Display

旧 sort/group
  → 一次性 migrateViewPresentationToDisplay → display default
  → update 清空行内 sort/group
```

跨模块 **只** `import { … } from '@/features/view'`。  
**禁止** `features/view` → `@/layout/**`。

---

## 2. 目录结构

```txt
src/features/view/
├── ARCHITECTURE.md
├── index.ts
├── api/views.ts · viewSearch.ts
├── hooks/ … useViewsScene
├── model/migrateViewPresentationToDisplay.ts
└── components/
    ├── ViewsPage
    ├── ViewActionsMenu
    └── ViewEditorDialog · form（仅 name/scope/filters）
```

---

## 3. Public 要点

| 类 | 示例 |
|----|------|
| 页面 | `ViewsPage` |
| 数据 | `useViewsQuery`、`createView`、`useCreateViewMutation` |
| Search | `parseViewSearch`（含 `f` / tempFilters） |

---

## 4. 与其它模块

| 协作 | 方向 |
|------|------|
| filter | session + FilterBar/Menu；filters 同 FilterQuery |
| display-options | 仅呈现；pageKey = view |
| task | TaskBoard / collection public |
| page-frame | Header / Toolbar(filterBar) / Body |

---

## 5. 变更纪律

改定稿目录或 public 时更新本文件。`bun run check`（或至少 tsc + boundaries + view vitest）。
