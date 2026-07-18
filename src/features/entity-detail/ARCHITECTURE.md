# entity-detail · 实体详情导航

> 作用：描述 **当前已落地** 的 `src/features/entity-detail` 边界  
> 最后更新：2026-07-18

---

## 1. 职责 / 不负责

**负责：**

- 实体详情 URL search 契约：`?task=` / `?project=`
- 解析、构建、清理 search 参数
- 抽屉开关与独立详情页导航（`useEntityDetailController`）
- 壳层抽屉宿主：按 kind 分发 `TaskDrawer` / 项目占位

**不负责：**

- 任务/项目详情内容与 mutation（→ `@/features/task` · `@/features/project`）
- Sheet 外壳与布局（→ `layout/ShellDrawer`）
- 命令打开路径策略（→ `task` `model/taskOpenStrategy`）

---

## 2. 目录（简树）

```txt
src/features/entity-detail/
├── ARCHITECTURE.md
├── index.ts
├── model/
│   ├── entityDetailTypes.ts
│   ├── entityDetailRouteState.ts
│   ├── entityDetailNavigation.ts
│   └── useEntityDetailController.ts
└── components/
    └── EntityDetailDrawerHost.tsx
```

---

## 3. Public 最小集（要点）

| 类 | 符号 |
|----|------|
| 类型 | `EntityDetailKind` · `EntityDetailTarget` · `EntityDetailRouteState` · `EntityDetailOpenMode` · `EntityDetailNavigationTarget` · `EntityDetailParseResult` |
| Search | `parseEntityDetailRouteState` · `buildEntityDetailSearch` · `clearEntityDetailSearch` · `normalizeEntityDetailId` |
| 导航 | `openEntityDrawerTarget` · `closeEntityDrawerTarget` · `resolveEntityPageTarget` |
| 控制 | `useEntityDetailController` |
| UI | `EntityDetailDrawerHost` |

---

## 4. 禁止依赖

- **不得** `import` `@/layout/**`
- **不得** 外模块深路径 import
- 跨域仅 `task` / `project` public（详情组件与 `getXxxDetail` 预检）
- 不在本域实现 Sheet、侧栏或命令 handler

---

## 5. 装配点

| 位置 | 挂载 |
|------|------|
| `layout/ShellDrawer.tsx` | `EntityDetailDrawerHost` + 关闭回调 |
| `layout/ShellMain.tsx` | `EntityDetailRouteState` 类型 |
| `layout/model/useShellCommandSystem.ts` | `useEntityDetailController` |
| 列表/创建场景 | `task` · `view` · `lifecycle` · `project` 等消费 controller |

---

## 6. 状态落点（URL | Query | UI）

| 状态 | 落点 |
|------|------|
| 当前打开实体 | **URL search** `task` / `project` 查询参数 |
| 抽屉开闭 | **URL**（controller 驱动 `navigate`，非独立 store） |
| 独立详情页 | **URL** pathname（`resolveEntityPageTarget` → `app/navigation`） |
| 详情数据 | **Query**（在 `task` / `project` 详情子树，非本域） |
