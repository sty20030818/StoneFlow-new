# view · 自定义视图

> 作用：描述 **当前已落地** 的 `src/features/view` 边界  
> 最后更新：2026-07-18

---

## 1. 职责 / 不负责

**负责：**

- 自定义视图（View）定义 CRUD、排序、可见性切换
- 按视图条件执行任务列表 run（`runTaskView`）
- Views 场景页：列表浏览、编辑器、行操作菜单

**不负责：**

- 任务业务规则与 mutation（→ `@/features/task`）
- 显示选项（分组/排序/字段）（→ `@/features/display-options`）
- 实体抽屉 URL 契约（→ `@/features/entity-detail`）
- 路由注册与壳布局（→ `layout` / `routes`）

---

## 2. 目录（简树）

```txt
src/features/view/
├── ARCHITECTURE.md
├── index.ts              # 唯一 public
├── api/views.ts          # Tauri invoke：list/run/CRUD
├── hooks/                # viewKeys · queries · mutations
└── components/
    ├── ViewsPage.tsx
    ├── ViewEditorDialog.tsx
    ├── ViewActionsMenu.tsx
    └── ViewEditorDialog.form.ts
```

---

## 3. Public 最小集（要点）

| 类 | 符号 |
|----|------|
| Query | `useViewsQuery` · `useTaskViewRunQuery` · `viewKeys` |
| Mutation | `useCreateViewMutation` · `useUpdateViewMutation` · `useDeleteViewMutation` · `useToggleViewVisibleMutation` · `useReorderViewsMutation` |
| 页面 | `ViewsPage` |
| 组件 | `ViewEditorDialog` · `ViewActionsMenu` |

外模块只 `import { … } from '@/features/view'`。

---

## 4. 禁止依赖

- **不得** `import` `@/layout/**`
- **不得** `import` 本 feature 深路径（`api/`、`hooks/`、`components/`）
- 跨 feature 只走对方 public（如 `task`、`display-options`、`entity-detail`）
- 不在本域实现 bulk / 命令 handler（由 `task` / `bulk-action` 贡献）

---

## 5. 装配点

| 位置 | 挂载 |
|------|------|
| `routes/_shell/-workspace-pages.tsx` | `WorkspaceViewsPage` / `WorkspaceViewDetailPage` → `ViewsPage` |
| `routes/_shell/$scopeKey/views/$viewId.tsx` | 带 `viewId` 的路由入口 |
| `project-overview` | `useViewsQuery`（侧栏视图列表，非页面本体） |

---

## 6. 状态落点（URL | Query | UI）

| 状态 | 落点 |
|------|------|
| 当前视图 id | **URL** `/$scopeKey/views/$viewId`（无 id 时列表态） |
| 视图定义 / run 结果 | **Query** `viewKeys` + `useTaskViewRunQuery` |
| 编辑器开关、表单草稿 | **UI** `ViewsPage` / `ViewEditorDialog` 本地 state |
| 显示选项偏好 | **Query**（经 `display-options` public，非本域持久化） |
