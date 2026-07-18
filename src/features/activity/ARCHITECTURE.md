# activity · 实体活动时间线

> 定稿最优架构。写法见 [`CONVENTIONS.md`](../../CONVENTIONS.md)。最后更新：2026-07-19

---

## 1. 心智

```txt
查询端口（单源）
  → getEntityActivities / useEntityActivitiesQuery
  → task 详情时间线 UI 只消费本域 public

不负责
  → 时间线展示映射（→ task/detail TaskActivityTimeline*）
  → 写入活动（后端 / 各域 mutation）
  → 主壳 chrome / layout
```

跨模块 **只** `import { … } from '@/features/activity'`。
**禁止** `features/activity` → `@/layout/**`。
**禁止** 另开第二套 activity 拉取路径。

---

## 2. 目录结构（定稿）

```txt
src/features/activity/
├── ARCHITECTURE.md
├── index.ts
├── api/getEntityActivities.ts
├── hooks/                   # keys · useEntityActivitiesQuery
└── components/
    └── ActivityDebugPage.tsx  # /debug/activity 展示壳
```

---

## 3. Public 要点

| 类 | 示例 |
|----|------|
| 类型 | `ActivityEntityType` · `ActivityTimelineEntry` · `ActivityTimelineChange` |
| IO / Query | `getEntityActivities` · `useEntityActivitiesQuery` |
| Debug | `ActivityDebugPage` · `ActivityDebugLoadState` |

新增导出前确认已有外消费者。`activityKeys`、请求/actor/source 细类型默认包内。

---

## 4. 与其它模块

| 协作 | 方向 |
|------|------|
| task/detail | 时间线 UI + 展示映射；数据只走本域 query |
| routes | debug 路由挂 `ActivityDebugPage` + `getEntityActivities` |
| layout | **禁**本域依赖 |

---

## 5. 变更纪律

改定稿目录或 public 时更新本文件。`bun run check`（或至少 tsc + boundaries + activity vitest）。
