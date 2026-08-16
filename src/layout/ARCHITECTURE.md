# layout 架构短契约

> 作用：描述 `src/layout` 的稳定职责与本轮定稿装配边界
> 总览：`src/ARCHITECTURE.md`
> 最后更新：2026-08-16

---

## 1. 当前真实心智

`layout/` **不是**业务页面目录，也不是共享 UI 基建目录。

当前负责：

1. **工作区壳层**骨架与跨 feature **装配**（Provider、命令/批量接线、Chrome）
2. **Overlays 挂载**；页面框架在 `shared/components/page-frame`
3. **ShellContext**：只读 `scope / shellRoute / currentSpaceId / activeSection`

```txt
routes/_shell → ShellRouteLayout
  → ShellRouteProvider + ShellProvider
  → AppLayout → ShellProviders → ShellBulkActionBoundary → ShellLayoutContent
       → ShellChrome / Overlays / Outlet
```

**features/** 不得 `import '@/layout/**'`。

---

## 2. 目录结构

```txt
src/layout/
├── ARCHITECTURE.md
├── AppLayout.tsx · ShellRouteLayout.tsx
├── ShellProviders.tsx · ShellBulkActionBoundary.tsx
├── ShellChrome.tsx · ShellHeader/Sidebar/Main/Footer
├── CreateDialogShell.tsx
├── config.ts                    # 侧栏导航项与分区标签（已去掉无用 drawer mock）
├── command-bridge/              # chrome register + compose 各域 register
├── model/
│   ├── ShellContext.tsx
│   ├── useShellCommandSystem.ts      # 命令 Host 薄编排
│   ├── useShellCommandHostContext.ts # CommandContext 切片
│   ├── useShellCommandOpenRouting.ts # IPC/打开意图
│   ├── useShellCommandProjects.ts    # 命令板项目列表
│   ├── runShellCommandBulkAction.ts  # 命令板 → bulk
│   ├── shellCommandTaskMeta.ts       # 命令板任务 meta handlers
│   └── useShellChromeData / CreateDialog …
├── overlays/ · header/ · sidebar/
└── …
```

**设置模式侧栏** 在 `features/settings`（`SettingsSidebar` + `SETTINGS_NAV_GROUPS`），壳只挂载。

**分区 / spaceId 真相：** 直接读 `shellRoute` + `scope`（`ShellRouteLayout`），**无**可写 nav store 镜像。

**任务详情装配：** `ShellMain` 挂载唯一 `EntityDetailDrawerHost`，列表打开动作只产生共享 `?task=` 意图。Shell controller 只派生一份 `isCompact`：`<1024px` 使用 HeroUI Sheet，`>=1024px` 在 Main surface 内使用 HeroUI Pro Resizable Aside。跨断点只替换容器，保留同一 URL、active task、草稿与滚动上下文，不关闭详情、不导航、不进入完整页。Aside 几何为列表最小 `352px`、Aside 最小 `320px` / 默认 `360px` / 最大 `440px`；layout 只负责容器装配与窄窗两张 Sheet 互斥，不拥有任务 query、草稿或 mutation。canonical 完整页只由用户显式动作打开。

---

## 3. ShellContext

| 字段             | 含义                       |
| ---------------- | -------------------------- |
| `scope`          | 当前工作区 scope           |
| `shellRoute`     | 解析后的产品路由语义       |
| `currentSpaceId` | 当前 space（all 时为回退） |
| `activeSection`  | 侧栏高亮分区               |

由 `ShellRouteLayout` 注入；需要 URL 真相的 feature 优先 navigation 或本 context，勿反向依赖 layout 组件树。

---

## 4. 变更纪律

壳变瘦或改装配链时更新本文件；`bun run check`。
