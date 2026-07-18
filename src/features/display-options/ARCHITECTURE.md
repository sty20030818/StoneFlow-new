# display-options · 任务列表显示选项

> 作用：描述 **当前已落地** 的 `src/features/display-options` 边界
> 最后更新：2026-07-18

---

## 1. 职责 / 不负责

**负责：**

- 任务列表显示层：布局（list/board）、分组、排序、字段可见性
- 页面级偏好键（`TaskDisplayPageKey`）与默认值 / 归一化
- 偏好读写（workspace default + personal override，Tauri store）
- 将已解析选项应用到任务列表（`applyTaskDisplayOptionsToTasks`）
- 工具条「显示」入口（`DisplayOptionsButton`）

**不负责：**

- 任务数据获取与 mutation（→ `@/features/task`）
- 视图筛选定义（→ `@/features/view`）
- 页面路由与场景编排（→ 各列表页 / `entity-scene`）

---

## 2. 目录（简树）

```txt
src/features/display-options/
├── ARCHITECTURE.md
├── index.ts
├── core/                 # pageKey · 类型 · 默认值 · normalize
├── api/displayOptions.ts # Tauri LazyStore 持久化
├── model/                # keys · queries · mutations · useTaskDisplayOptions
├── adapters/task/        # apply · groups · compare · properties
└── components/           # Button · Panel · Popover（仅 Button 对外）
```

---

## 3. Public 最小集（要点）

| 类 | 符号 |
|----|------|
| 类型 / 键 | `TaskDisplayPageKey` · `TaskDisplayPropertyKey` · `createTaskDisplayViewPageKey` |
| Hook | `useTaskDisplayOptions` |
| 适配 | `applyTaskDisplayOptionsToTasks` · `createTaskDisplayApplyContext` |
| UI | `DisplayOptionsButton` |

---

## 4. 禁止依赖

- **不得** `import` `@/layout/**`
- **不得** 外模块深路径 import（`core/`、`model/`、`adapters/`、`components/`）
- 跨 feature 只走 public；本域 adapter 可 `import` `task` 的 **格式化/图标** public
- 不把任务筛选、视图 run、命令逻辑塞进本域

---

## 5. 装配点

| 消费方 | 用法 |
|--------|------|
| `task` 列表场景 | `useTaskDisplayOptions` + `DisplayOptionsButton` + apply |
| `project` 详情页 | 同上（`ProjectPage`） |
| `view` `ViewsPage` | `createTaskDisplayViewPageKey` + 显示选项全套 |

---

## 6. 状态落点（URL | Query | UI）

| 状态 | 落点 |
|------|------|
| 持久化偏好 | **Tauri store** `display-options-preferences.json`（经 `api/displayOptions`） |
| 读取 / 写入请求 | **Query** `taskDisplayOptionsKeys` + mutations |
| 编辑草稿 | **UI** `useTaskDisplayOptions` 内 `draftOverride` |
| 页面键 | **代码** `TaskDisplayPageKey`（非 URL） |
