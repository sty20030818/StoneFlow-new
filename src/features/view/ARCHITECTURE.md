# view · 保存视图

> 定稿最优架构。写法见 [`CONVENTIONS.md`](../../CONVENTIONS.md)。  
> 最后更新：2026-08-22（Default View / Saved View / Filter Draft 硬切）

---

## 1. 心智

```txt
View 定义 = scope + context + baseViewKey + filters

/views
  → ViewsPage + useSavedViewLibraryScene
  → 仅搜索与管理 Saved View，不执行任务查询

/views/:viewId
  → SavedViewPage + useSavedViewWorkspaceScene
  → TaskWorkspace + TaskBoard
  → run_task_view(viewId, scope, dirty ? draft : undefined)

Save
  → create：保存当前 context、baseViewKey 与 effective filters
  → overwrite：只覆盖当前 Saved View 的 filters
  → 不写 Display
```

`context` 是不可移除的查询边界；URL `f` 是 filters 的完整临时替换，不得覆盖
`scope/context/baseViewKey`。Default View 是页面内代码定义的选项，不是 View 实体。
不存在 System View 兼容实体。

`filters_json` 的旧扁平形状只在 Rust 存储解码边界读取：可无损表达的条件转换为
`FilterQuery`；当前模型无法表达的旧条件显式失败，禁止近似后返回错误结果。
无效旧定义仍以“需要重建”留在 Library，允许删除但不可编辑或执行；单条坏数据不得拖垮列表。

跨模块 **只** `import { … } from '@/features/view'`。  
**禁止** `features/view` → `@/layout/**`。

---

## 2. 目录结构

```txt
src/features/view/
├── ARCHITECTURE.md
├── index.ts
├── api/views.ts · viewSearch.ts
├── hooks/ … useSavedViewLibraryScene · useSavedViewWorkspaceScene
└── components/
    ├── ViewsPage · SavedViewPage
    ├── ViewActionsMenu
    └── ViewEditorDialog · form
```

---

## 3. Public 要点

| 类 | 示例 |
|----|------|
| 页面 | `ViewsPage`、`SavedViewPage` |
| 数据 | `useViewsQuery`、`createView`、`useCreateViewMutation` |
| Search | `parseViewSearch`（仅 `f`） |

---

## 4. 与其它模块

| 协作 | 方向 |
|------|------|
| filter | session + FilterBar/Menu；filters 同 FilterQuery |
| display-options | 仅呈现；pageKey = view |
| task-workspace | Saved View 详情与默认任务页共用唯一工作区组合 |
| task | TaskBoard / collection public |
| page-frame | Saved View Library 的页面布局 |

---

## 5. 变更纪律

改定稿目录或 public 时更新本文件。`bun run check`（或至少 tsc + boundaries + view vitest）。
