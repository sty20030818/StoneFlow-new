# layout 架构短契约

> 作用：描述 **当前已落地** 的 `src/layout` 职责与装配边界  
> 总览：`src/ARCHITECTURE.md`  
> 最后更新：2026-07-17

---

## 1. 当前真实心智

`layout/` **不是**业务页面目录，也不是共享 UI 基建目录。

当前负责：

1. **工作区壳层**骨架与跨 feature **装配**（Provider、命令/批量接线、Chrome）  
2. **Overlays 挂载**；页级 EntityScene 在 `features/entity-scene`  
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
├── ShellChrome.tsx · ShellHeader/Sidebar/Main/Footer/Drawer
├── CreateDialogShell.tsx
├── config.ts                    # 侧栏导航项与分区标签（已去掉无用 drawer mock）
├── command-bridge/              # 命令 Host compose
├── model/
│   ├── ShellContext.tsx         # 只读壳上下文
│   ├── useShellCommandSystem.ts # 命令宿主编排
│   ├── shellCommandTaskMeta.ts  # 命令板任务 meta handlers
│   └── useShellChromeData / CreateDialog / nav store …
├── overlays/ · header/ · sidebar/
└── …
```

**设置模式侧栏** 在 `features/settings`（`SettingsSidebar` + `SETTINGS_NAV_GROUPS`），壳只挂载。

---

## 3. ShellContext

| 字段 | 含义 |
|------|------|
| `scope` | 当前工作区 scope |
| `shellRoute` | 解析后的产品路由语义 |
| `currentSpaceId` | 当前 space（all 时为回退） |
| `activeSection` | 侧栏高亮分区 |

由 `ShellRouteLayout` 注入；需要 URL 真相的 feature 优先 navigation 或本 context，勿反向依赖 layout 组件树。

---

## 4. 变更纪律

壳变瘦或改装配链时更新本文件；`bun run check`。
