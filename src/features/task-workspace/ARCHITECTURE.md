# task-workspace · 任务结果页工作区组合

> 最后更新：2026-09-02

## 1. 职责 / 不负责

**负责：**

- 统一组合 `PageFrame.Header`、任务视图 Toolbar、Filter Bar 与 `PageFrame.CollectionBody`
- 按 `all`、`standalone`、`project` 上下文给出代码定义的默认视图矩阵
- 维护默认视图 URL `v` 的选择语义，并在切换查询基线时清除旧 Filter Draft `f`
- 为任务工作区路由复用 `v` 与 filter `f` 的 search 解析

**不负责：**

- 任务查询、Board、选择、预览与 mutation（→ `task`）
- Saved View 的持久化、编辑或执行（→ `view`）
- Filter / Display 规则及其真相源（→ `filter` / `display-options`）
- 路由挂载、壳层铬架或项目业务

---

## 2. 目录

```txt
src/features/task-workspace/
├── ARCHITECTURE.md
├── index.ts
├── components/TaskWorkspace.tsx
└── model/
    ├── defaultTaskViews.ts
    ├── taskWorkspaceSearch.ts
    └── useDefaultTaskViewSelection.ts
```

测试与对应 model 文件同目录。

---

## 3. Public 最小集

| 类 | 符号 |
|----|------|
| 组合 | `TaskWorkspace` |
| 默认视图 | `getDefaultTaskViews` · `DefaultTaskView` · `DefaultTaskViewKey` |
| URL 选择 | `DEFAULT_TASK_VIEW_SEARCH_PARAM_KEY` · `useDefaultTaskViewSelection` |
| Search | `parseTaskWorkspaceSearch` |

仅从 `@/features/task-workspace` 导入；新增导出前必须已有外部消费者。

---

## 4. 禁止依赖

- 不得依赖 `@/layout/**`
- 不得深路径导入其它 feature
- 不得引入任务 IO、Query、mutation 或 Saved View 持久化
- 不得复制 filter / display-options / PageFrame 已有规则

---

## 5. 装配点

| 消费方 | 用途 |
|--------|------|
| routes | `parseTaskWorkspaceSearch` 校验任务、独立事项与项目详情 search |
| task | 默认视图选择 + 全部任务 / 独立事项工作区 |
| project | 项目状态对应的默认视图选择 + 项目任务工作区 |
| view | 复用默认视图定义，并为 Saved View 详情组合任务工作区 |

---

## 6. 状态落点

| 状态 | 落点 |
|------|------|
| 当前默认视图 | Router search `v`；页面默认值不写入 URL |
| 临时筛选 | Router search `f`，解析与会话归 `filter` |
| 默认视图矩阵 | 纯 model，由页面上下文与项目完成态派生 |
| Filter / Display UI | 调用方注入受控值；本模块不另建真相源 |
| 任务数据 | 无；由调用方提供 Board |

`CollectionBody` 是任务结果页唯一真实 viewport；TaskBoard 的 loaded-only 虚拟几何、固定分页 sentinel、sticky、分页状态、append anchor 与 stable-id 焦点恢复仍由 task 域持有。本模块只组合 viewport，不解释或改写虚拟几何，也不把 `totalCount` 转换为滚动高度。

---

## 7. 验证

```bash
bun run lint:boundaries
bun run typecheck
bun run test:run src/features/task-workspace
```
