# entity-detail · 实体详情导航

> 作用：描述 `src/features/entity-detail` 的稳定职责与本轮定稿容器合同
> 最后更新：2026-08-16

---

## 1. 职责 / 不负责

**负责：**

- 任务详情的 URL search 契约：`?task=`
- 解析、构建、清理 search 参数
- 任务/项目 canonical 完整页的显式导航（`useEntityDetailController`）
- 唯一详情宿主：`<1024px` 用 HeroUI Sheet、`>=1024px` 用 HeroUI Pro Resizable Aside 挂载同一 `TaskDetailContent`，并负责 Aside 会话宽度、scroll snapshot 与关闭后焦点恢复

**不负责：**

- 任务/项目详情内容与 mutation（→ `@/features/task` · `@/features/project`）
- 命令打开路径策略（→ `task` `model/taskOpenStrategy`）
- `Space` Peek 状态与内容（→ `@/features/task`）
- Sidebar 响应式偏好；详情只消费 Shell 已派生的 `isCompact`，不拥有第二份断点 state/store

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
| 类型 | `EntityDetailKind` · `EntityDetailTarget` · `EntityDetailDrawerTarget` · `EntityDetailRouteState` · `EntityDetailNavigationTarget` · `EntityDetailParseResult` |
| Search | `parseEntityDetailRouteState` · `buildEntityDetailSearch` · `clearEntityDetailSearch` · `normalizeEntityDetailId` |
| 导航 | `openEntityDrawerTarget` · `closeEntityDrawerTarget` · `resolveEntityPageTarget` |
| 控制 | `useEntityDetailController` |
| UI | `EntityDetailDrawerHost` |

`Drawer` 后缀是现存 public 符号名；它表示列表上下文内的详情意图，具体由窗口断点呈现为 Sheet 或 Aside。

---

## 4. 禁止依赖

- **不得** `import` `@/layout/**`
- **不得** 外模块深路径 import
- 跨域仅 `task` / `project` public（详情组件与 `getXxxDetail` 预检）
- 不在本域实现侧栏或命令 handler
- 不持久化详情呈现偏好，不建立全局或跨 feature 响应式 store，不增加容器宽度分流

---

## 5. 装配点

| 位置 | 挂载 |
|------|------|
| `layout/ShellMain.tsx` | `EntityDetailDrawerHost` + `EntityDetailRouteState` + 关闭回调 |
| `layout/model/useShellCommandSystem.ts` | `useEntityDetailController` |
| 列表/创建场景 | `task` · `view` · `lifecycle` · `project` 等消费 controller |

---

## 6. 状态落点（URL | Query | UI）

| 状态 | 落点 |
|------|------|
| 当前列表详情意图 | **URL search** `task` 查询参数；断点只改变 Sheet/Aside 容器，历史 `project` 参数只负责清理 |
| Sheet / Aside 开闭 | **URL**（controller 驱动 `navigate`，非独立 store） |
| 独立详情页 | **URL** pathname（`resolveEntityPageTarget` → `app/navigation`） |
| 详情数据 | **Query**（在 `task` / `project` 详情子树，非本域） |

## 7. 自适应打开合同

- 从列表打开任务只写入 `?task=`；未打开任务时只渲染列表。
- 窗口 `<1024px` 时详情始终呈现为 HeroUI Sheet，`>=1024px` 时始终呈现为 Main surface 内的 HeroUI Pro Resizable Aside。跨断点只替换容器，不改 URL、不关闭 active task、不触发 canonical 导航或历史兼容逻辑。
- Aside 限制为最小 `320px`、默认 `360px`、最大 `440px`；列表 Panel 最小 `352px`。Sheet 和 Aside 复用同一详情 view model、草稿、autosave 与 scroll snapshot，不复制业务状态。
- canonical 完整页只由 Aside/Sheet Header 或其他明确用户动作打开；打开前 flush 草稿，宽度变化永远不自动进入或退出完整页。
- 本域只消费 Shell controller 已派生的 `isCompact` 完成容器选择，不增加详情呈现偏好、媒体查询监听或响应式 store。
