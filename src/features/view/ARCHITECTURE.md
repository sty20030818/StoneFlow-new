# view · 自定义视图

> 定稿最优架构。写法见 [`CONVENTIONS.md`](../../CONVENTIONS.md)。最后更新：2026-07-19

---

## 1. 心智

```txt
routes 薄页
  → ViewsPage（薄壳）
  → useViewsScene（视图轨 / run / 选择 / 任务板 / 编辑器）
  → EntityScene（boardKind=task，组合 task public）

写路径
  → 视图定义 CRUD：本域 api / mutations
  → 任务行动作：只调 task public（controller / selection / preview）
  → 显示选项：display-options public（pageKey = view）

不负责
  → 主壳导航 / layout
  → 复制 task list-scene
  → 拆回空壳 features/views
```

跨模块 **只** `import { … } from '@/features/view'`。
**禁止** `features/view` → `@/layout/**`。

---

## 2. 目录结构（定稿）

```txt
src/features/view/
├── ARCHITECTURE.md
├── index.ts                 # 主 public
├── api/views.ts             # list / run / CRUD invoke
├── hooks/                   # keys · queries · mutations · useViewsScene
└── components/
    ├── ViewsPage            # 页薄壳（槽位 + 编辑器）
    ├── ViewActionsMenu
    ├── ViewEditorDialog · ViewEditorDialog.form
```

列表与任务板编排在 `hooks/useViewsScene`；`ViewsPage` 只拼 EntityScene 槽位与编辑器。

---

## 3. Public 要点

| 类 | 示例 |
|----|------|
| 页面 | `ViewsPage` |
| 数据 | `useViewsQuery`（project-overview 侧栏等） |

新增导出前确认已有外消费者。导出符合 CONVENTIONS TSDoc L1。
run query、mutations、编辑器、ActionsMenu、`viewKeys` 默认包内使用，不预防性外放。

---

## 4. 与其它模块

| 协作 | 方向 |
|------|------|
| task | 任务板只组合其 public（controller / selection / preview / command selection） |
| display-options | pageKey = view；应用分组/字段走其 public |
| entity-scene / entity-detail / selection / bulk-action | 页编排消费；禁本域 → layout |
| project-overview | 只 `useViewsQuery` |
| routes | 极薄：只挂 `ViewsPage` |

---

## 5. 变更纪律

改定稿目录或 public 时更新本文件。`bun run check`（或至少 tsc + boundaries + view vitest）。
