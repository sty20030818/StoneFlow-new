# project-overview · 项目总览

> 定稿最优架构。写法见 [`CONVENTIONS.md`](../../CONVENTIONS.md)。最后更新：2026-09-02

---

## 1. 心智

```txt
routes 薄页
  → ProjectOverviewPage（薄壳）
  → useProjectOverviewScene（视图轨 / 分组 / 唯一 collection owner）
  → PageFrame.CollectionBody + ProjectBoard（组合 project public）

不负责
  → project CRUD / overview 数据 hook（→ project）
  → ProjectRowAdapter（→ project）
  → layout
```

跨模块 **只** `import { ProjectOverviewPage } from '@/features/project-overview'`。
**禁止** `features/project-overview` → `@/layout/**`。
**Keep** 独立 scene（不并回 project）。

---

## 2. 目录结构（定稿）

```txt
src/features/project-overview/
├── ARCHITECTURE.md
├── index.ts
├── hooks/useProjectOverviewScene.ts
└── components/ProjectOverviewPage.tsx
```

---

## 3. Public 要点

| 类 | 示例 |
|----|------|
| 页面 | `ProjectOverviewPage` |

仅此一个对外导出。

---

## 4. 与其它模块

| 协作 | 方向 |
|------|------|
| project | overview 数据 + mutations + command selection |
| view | `useViewsQuery('project')` 侧栏视图轨 |
| selection / command | 页编排持有 collection，行与右键消费 Command projection |
| bulk-action / shell-dialogs | Command Runtime 统一执行与危险确认 |
| page-frame | `CollectionBody` 提供集合页唯一真实 viewport；普通内容 `Body` 不参与 |
| routes | 极薄挂 Page |

Project Overview 的 query owner 把精确 `refetch` 作为 `onRetry` 传给 ProjectBoard；Board 只渲染错误与重试动作。Project Row 内容与动作仍归 project Adapter，共享层只提供 Row 状态壳、五槽排版、连续选择占位、Section Header anatomy 与 `44px` / `36px` / `2px` 几何。

---

## 5. 变更纪律

改定稿目录或 public 时更新本文件。`bun run check`（或至少 tsc + boundaries + project-overview vitest）。
