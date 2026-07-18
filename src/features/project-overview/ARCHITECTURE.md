# project-overview · 项目总览

> 作用：描述 **当前已落地** 的 `src/features/project-overview` 边界  
> 最后更新：2026-07-18

---

## 1. 职责 / 不负责

**负责：**

- 项目总览 scene 页（`/projects`）：列表、空态、视图切换
- 组合 `EntityScene`、bulk 选择、命令选中注册
- 行级归档/完成/删除等操作编排（调用 `project` public mutations）

**不负责：**

- 项目 CRUD 与 overview 数据 hook 定义（→ `@/features/project`）
- 项目行 UI 适配器（→ `project` `ProjectRowAdapter`）
- 危险确认实现（→ `@/features/danger-confirm`）
- 自定义视图定义（→ `@/features/view`，仅 `useViewsQuery` 读侧栏）

---

## 2. 目录（简树）

```txt
src/features/project-overview/
├── ARCHITECTURE.md
├── index.ts
└── components/
    ├── ProjectOverviewPage.tsx
    ├── ProjectOverviewList.tsx
    ├── ProjectOverviewEmptyState.tsx
    └── ProjectOverviewPage.test.tsx
```

---

## 3. Public 最小集（要点）

| 类 | 符号 |
|----|------|
| 页面 | `ProjectOverviewPage` |

仅此一个对外导出。

---

## 4. 禁止依赖

- **不得** `import` `@/layout/**`
- **不得** 外模块 `import` `components/` 深路径
- 数据与 mutation 只走 `@/features/project` public
- bulk / selection / dialog 只走各域 public，不在此重复引擎

---

## 5. 装配点

| 位置 | 挂载 |
|------|------|
| `routes/_shell/-workspace-pages.tsx` | `WorkspaceProjectsPage` → `ProjectOverviewPage` |

---

## 6. 状态落点（URL | Query | UI）

| 状态 | 落点 |
|------|------|
| 列表数据 | **Query** `useProjectOverviewData`（`project` public） |
| 视图键（全部/进行中/…） | **UI** `viewKey` 本地 state |
| 行 busy | **UI** `busyProjectId` |
| 打开项目详情 | **URL** `openProjectDetail`（`app/navigation`） |
| Bulk 选中 | **UI** `useEntitySelection`（`selection` public） |
