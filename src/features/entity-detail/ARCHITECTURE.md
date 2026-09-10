# entity-detail · 实体详情导航

> 作用：描述 `src/features/entity-detail` 的稳定职责与本轮定稿容器合同
> 最后更新：2026-09-10

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

- 从列表打开任务只写入 `?task=`；关闭后只保留动画退出期间的不可交互画面，退出完成后只渲染列表。
- 窗口 `<1024px` 时详情始终呈现为 HeroUI Sheet，`>=1024px` 时始终呈现为 Main surface 内的 HeroUI Pro Resizable Aside。跨断点只替换容器，不改 URL、不关闭 active task、不触发 canonical 导航或历史兼容逻辑。
- Aside 限制为最小 `320px`、默认 `360px`、最大 `440px`；列表 Panel 最小 `352px`。Sheet 和 Aside 复用同一详情 view model、草稿、autosave 与 scroll snapshot，不复制业务状态。
- canonical 完整页只由 Aside/Sheet Header 或其他明确用户动作打开；打开前 flush 草稿，宽度变化永远不自动进入或退出完整页。
- `task` 详情 view model 在 dirty 时注册唯一 Router blocker；因此关闭、切换、Sheet dismiss、Back 与完整页导航共用同一“flush 成功后离开”合同。本域不复制保存分支。
- 本域只消费 Shell controller 已派生的 `isCompact` 完成容器选择，不增加详情呈现偏好、断点媒体查询监听或响应式 store；动效只监听系统的减少动态效果偏好。
- Desktop Aside 只在开合时过渡拥有实际占位的外层 Panel。`EntityDetailDrawerHost.tsx` 用唯一原生 WAAPI ``panel.animate([{ maxWidth: `${fromWidth}px` }, { maxWidth: `${toWidth}px` }], { duration: 200, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'both' })`` 表达实际宽度过渡；打开终点 `expandedWidth` 来自 Resizable 自然布局测量，关闭终点为 `0`。首次打开从 `0` 开始，通过 `queueMicrotask` 等待子 Panel 注册后的布局再测量终点；反转先读取当前画面宽度，再取消旧动画并重新测量终点。不再使用 CSS transition 或固定动画上限；动画会短暂改变列表宽度并产生布局成本，不是纯合成动画，但不需要每帧 React state。
- 开合均冻结内部内容宽度，避免反复换行；打开完成后释放动画和冻结宽度，将尺寸交回 Resizable。Resizable 继续拥有拖拽权重和会话宽度，不使用 `collapsible`；入场期间组内 `pointerdown` 或分隔柄 `keydown` 在捕获阶段同步释放动画：`cancel`、清空动画 ref 与内容 `width`，再交给 Resizable；正常入场完成复用同一释放逻辑，不依赖异步 finish 事件完成交互交接。任务切换与拖拽不重播。`prefers-reduced-motion` 已开启时跳过动画，运行中开启则立即 `finish`；反转或卸载时 `cancel`。
- 宿主复用现有 `@react-aria/utils` 的 `useExitAnimation`，motion ref 指向真正的外层 Panel；关闭先同步启动 WAAPI，再由退出 hook 等待完成后卸载。只保留最后 taskId 的呈现快照，不增加第二份业务 open state、计时器或动画运行库。关闭立即让详情 `inert` / `aria-hidden`、禁用拖拽柄并恢复列表焦点；快速重开取消旧退出，沿当前画面反向打开。compact 将真实 `isOpen` 传给持续挂载的 HeroUI Sheet，由上游处理原生退出动效，退出结束再卸载详情 view model。
