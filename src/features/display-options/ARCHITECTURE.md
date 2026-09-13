# display-options · 任务列表显示选项

> 作用：描述 **当前已落地** 的 `src/features/display-options` 边界  
> 最后更新：2026-09-13

---

## 1. 职责 / 不负责

**负责：**

- 任务列表**呈现**：分组、子分组、排序、方向、完成项排序、空分组、字段可见性
- 页面级偏好键（`TaskDisplayPageKey`）与默认值 / 归一化
- 偏好读写（workspace default + personal override，renderer localStorage）
- `normalizeTaskWindowOrder`（只输出有效排序意图）及 `applyTaskDisplayOptionsToTasks`（保留统一查询顺序，投影分组与字段）
- 工具条「显示」入口（`DisplayOptionsButton`）与面板（方向内嵌、设为默认 / 恢复默认）
- 面板表面固定为紧凑的左标签、右控件行；属性使用 pill，底栏只保留重置与设为默认

**不负责：**

- 筛选公式 / FilterQuery / Save View（→ `@/features/filter` / `view`）
- 任务集合成员资格（未完成、今天、已完成等由 Default / Saved View 查询决定）
- 任务数据获取与 mutation（→ `@/features/task`）
- 页面路由与场景编排

---

## 2. 目录（简树）

```txt
src/features/display-options/
├── ARCHITECTURE.md
├── index.ts
├── core/                 # pageKey · 类型 · 默认值 · normalize
├── api/displayOptions.ts # renderer localStorage 持久化
├── model/                # keys · queries · mutations · useTaskDisplayOptions
├── adapters/task/        # apply · groups；不再执行任务排序
└── components/           # Button · Panel · Popover
```

---

## 3. Public 最小集

| 类 | 符号 |
|----|------|
| 类型 / 键 | `TaskDisplayPageKey` · `TaskDisplayPropertyKey` · `TaskDisplayPreferenceRecord` · `createTaskDisplayViewPageKey` · `getTaskDisplayTimestampProperty` |
| Hook | `useTaskDisplayOptions`（含 `setAsDefault` / `resetToDefault`） |
| API | `updateTaskDisplayPreference`（迁移等） |
| 适配 | `normalizeTaskWindowOrder` · `applyTaskDisplayOptionsToTasks` · `createTaskDisplayApplyContext` |
| UI | `DisplayOptionsButton` |

---

## 4. 禁止依赖

- **不得** `import` `@/layout/**`
- **不得** 外模块深路径 import
- **不得** 根据任务状态增删列表成员；成员资格属于 Default / Saved View 与 Filter
- 不把 View CRUD、筛选 clause 写入本域

---

## 5. 状态落点

| 状态 | 落点 |
|------|------|
| 个人 / 页面默认 | renderer `localStorage` 的独立页面键 |
| 读取 / 写入 | Query keys + mutations |
| 页面键 | `TaskDisplayPageKey`（含 `task:view:{id}`） |
| **不进** filter URL `f` | Display 与临时筛选分离 |

`visibleProperties` 的创建时间与更新时间互斥，也允许都不选择。`getTaskDisplayTimestampProperty` 是共同规则：保留输入列表最后出现的时间项，显示面板新选择追加到末尾；再次点击已选时间项可关闭。偏好读取、写入与 Row 渲染共用这一规则，存量双时间偏好在既有归一化入口收敛，不增加存储字段或迁移旁路。属性按钮的展示顺序由页面 capabilities 决定，不重排用户选择序列。

排序选择经页面 scene、Query key 和运行 IPC 进入 Rust 统一查询；Display 不在已加载页上执行第二次排序。共享窗口合同只含 `orderBy/orderDirection/completedOrder`，smart/manual 的无效方向归一为 asc，面板隐藏方向按钮。完成项 recency 文案为“已完成置底，最近优先”，执行顺序由统一查询拥有，并可覆盖已完成任务的 manual 位置。偏好仍由页面本机键持久化，加载完成后才发首屏请求，不进入 Saved View 定义、URL Filter Draft 或 count-only 查询。

现有分组按上游输入顺序保留组内任务。完整主/子分组的分页前缀后续接入相同查询合同；当前不分组的有序结果已经使用完整窗口顺序，不将客户端分组投影宣称为完整分组分页。
