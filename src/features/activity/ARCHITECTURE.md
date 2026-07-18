# activity · 实体活动时间线

> 作用：描述 **当前已落地** 的 `src/features/activity` 边界  
> 最后更新：2026-07-18

---

## 1. 职责 / 不负责

**负责：**

- 按实体拉取活动时间线（`getEntityActivities`）
- React Query hook（`useEntityActivitiesQuery`）
- 开发用 Activity debug 页（`ActivityDebugPage`）

**不负责：**

- 时间线展示样式与字段映射（→ `task/detail` 内 `TaskActivityTimeline`）
- 写入活动记录（后端 / 各域 mutation 侧）
- 生产路由壳编排（debug 路由在 `routes/`）

---

## 2. 目录（简树）

```txt
src/features/activity/
├── ARCHITECTURE.md
├── index.ts
├── api/getEntityActivities.ts
├── hooks/                # activityKeys · useEntityActivitiesQuery
└── components/
    └── ActivityDebugPage.tsx
```

---

## 3. Public 最小集（要点）

| 类 | 符号 |
|----|------|
| 类型 | `ActivityEntityType` · `ActivityActorType` · `ActivitySourceType` · `GetEntityActivitiesRequest` · `ActivityTimelineEntry` · `ActivityTimelineChange` |
| API | `getEntityActivities` |
| Query | `useEntityActivitiesQuery` · `activityKeys` |
| Debug | `ActivityDebugPage` · `ActivityDebugLoadState` |

---

## 4. 禁止依赖

- **不得** `import` `@/layout/**`
- **不得** 外模块深路径 import
- 不在本域实现任务/项目 UI 或 mutation
- 消费方（如 `task` 详情）只 import 类型与 query public

---

## 5. 装配点

| 位置 | 挂载 |
|------|------|
| `task/detail/TaskActivityTimeline.tsx` | `useEntityActivitiesQuery` + 条目类型 |
| `routes/-activity-debug-route.tsx` | `ActivityDebugPage` · `getEntityActivities` |
| `routes/-activity-debug-search.ts` | `ActivityEntityType` |

---

## 6. 状态落点（URL | Query | UI）

| 状态 | 落点 |
|------|------|
| 时间线条目 | **Query** `activityKeys` + `useEntityActivitiesQuery` |
| Debug 页筛选 | **URL search**（`routes/-activity-debug-search`） |
| Debug 加载态 | **UI** `ActivityDebugLoadState`（页内） |
