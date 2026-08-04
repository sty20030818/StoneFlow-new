# display-options · 任务列表显示选项

> 作用：描述 **当前已落地** 的 `src/features/display-options` 边界  
> 最后更新：2026-08-04

---

## 1. 职责 / 不负责

**负责：**

- 任务列表**呈现**：分组、子分组、排序、方向、完成项排序、**是否显示已完成**、空分组、字段可见性
- 页面级偏好键（`TaskDisplayPageKey`）与默认值 / 归一化
- 偏好读写（workspace default + personal override，Tauri store）
- `applyTaskDisplayOptionsToTasks`（含 `showCompleted === false` 时隐藏 done/canceled）
- 工具条「显示」入口（`DisplayOptionsButton`）与面板（方向内嵌、设为默认 / 恢复默认）
- 面板表面固定为紧凑的左标签、右控件行；属性使用 pill，底栏只保留重置与设为默认

**不负责：**

- 筛选公式 / FilterQuery / Save View（→ `@/features/filter` / `view`）
- 任务数据获取与 mutation（→ `@/features/task`）
- 页面路由与场景编排

---

## 2. 目录（简树）

```txt
src/features/display-options/
├── ARCHITECTURE.md
├── index.ts
├── core/                 # pageKey · 类型 · 默认值 · normalize
├── api/displayOptions.ts # Tauri LazyStore 持久化
├── model/                # keys · queries · mutations · useTaskDisplayOptions
├── adapters/task/        # apply · groups · compare
└── components/           # Button · Panel · Popover
```

---

## 3. Public 最小集

| 类 | 符号 |
|----|------|
| 类型 / 键 | `TaskDisplayPageKey` · `TaskDisplayPropertyKey` · `TaskDisplayPreferenceRecord` · `createTaskDisplayViewPageKey` |
| Hook | `useTaskDisplayOptions`（含 `setAsDefault` / `resetToDefault`） |
| API | `updateTaskDisplayPreference`（迁移等） |
| 适配 | `applyTaskDisplayOptionsToTasks` · `createTaskDisplayApplyContext` |
| UI | `DisplayOptionsButton` |

---

## 4. 禁止依赖

- **不得** `import` `@/layout/**`
- **不得** 外模块深路径 import
- **不得** 承担 Filter 剔除语义的主真源（`showCompleted` 仅呈现/辅助 list 下推）
- 不把 View CRUD、筛选 clause 写入本域

---

## 5. 状态落点

| 状态 | 落点 |
|------|------|
| 个人 / 页面默认 | Tauri store `display-options-preferences.json` |
| 读取 / 写入 | Query keys + mutations |
| 页面键 | `TaskDisplayPageKey`（含 `task:view:{id}`） |
| **不进** filter URL `f` | Display 与临时筛选分离 |
