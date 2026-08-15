# entity-detail · 实体详情导航

> 作用：描述 **当前已落地** 的 `src/features/entity-detail` 边界  
> 最后更新：2026-08-15

---

## 1. 职责 / 不负责

**负责：**

- 宽屏任务详情 Aside 的 URL search 契约：`?task=`
- 解析、构建、清理 search 参数
- 任务详情响应式首次落点、active Aside 安全关闭与任务/项目完整页导航（`useEntityDetailController`）
- Main 内 Aside 宿主：用 HeroUI Pro Resizable 挂载 `TaskDetailContent`，并负责会话宽度、scroll snapshot、active Aside 的 compact 监听与关闭后焦点恢复

**不负责：**

- 任务/项目详情内容与 mutation（→ `@/features/task` · `@/features/project`）
- 命令打开路径策略（→ `task` `model/taskOpenStrategy`）
- `Space` Peek 状态与内容（→ `@/features/task`）
- Sidebar 响应式 state；这里只与 Sidebar controller 共享 `SHELL_DESKTOP_MEDIA_QUERY` 常量

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

`Drawer` 后缀是现存 public 符号名；当前产品语义和实际 DOM 均为非模态 Aside，不代表 Sheet/Drawer 呈现。

---

## 4. 禁止依赖

- **不得** `import` `@/layout/**`
- **不得** 外模块深路径 import
- 跨域仅 `task` / `project` public（详情组件与 `getXxxDetail` 预检）
- 不在本域实现任务 Sheet、侧栏或命令 handler
- 不持久化详情呈现偏好，不订阅原始 resize，也不按百分比或主区余量自动切换容器；只允许 active Aside 在生命周期内订阅共享的 `SHELL_DESKTOP_MEDIA_QUERY`

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
| 当前宽屏 Aside 任务 | **URL search** `task` 查询参数；历史 `project` 参数只负责清理 |
| Aside 开闭 | **URL**（controller 驱动 `navigate`，非独立 store） |
| 独立详情页 | **URL** pathname（`resolveEntityPageTarget` → `app/navigation`） |
| 详情数据 | **Query**（在 `task` / `project` 详情子树，非本域） |

## 7. 响应式打开合同

- `openTaskDetail` 在每次打开动作发生时调用一次 `matchMedia(SHELL_DESKTOP_MEDIA_QUERY)`：`>=1024px` 写入 `?task=` 并打开 Main 内 Aside，`<1024px` 直接解析并导航 canonical 完整页。
- active `?task=` Aside 在自身生命周期内订阅同一个 media query；从桌面宽度进入 compact 后先执行 `flushNow()`，只有保存成功且完成时仍为 compact，才复用标准 `onClose` 清除 `?task=` 并返回原列表。保存失败或完成时已重新变宽则保留 Aside 与 dirty draft。
- 窗口变宽本身不触发详情打开、关闭或导航；本域不建立 canonical promotion、历史兼容分支或共享响应式 store。
- Aside 默认 `400px`，会话拖宽限制 `400–560px`；本域没有任务 Sheet、`detailPresentation`、UI device preference、`ResizeObserver`、34% 或 `640px` 回退。
