# layout 架构短契约

> 作用：描述 `src/layout` 的稳定职责与本轮定稿装配边界
> 总览：`src/ARCHITECTURE.md`
> 最后更新：2026-09-12

---

## 1. 当前真实心智

`layout/` **不是**业务页面目录，也不是共享 UI 基建目录。

当前负责：

1. **工作区壳层**骨架与跨 feature **装配**（Provider、命令/批量接线、Chrome）
2. **Overlays 挂载**；必须常驻的 controller / store owner 保持 eager，About、Changelog、Create、Update 等低频 presentation 按首次打开 lazy load；页面框架在 `shared/components/page-frame`
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

`ShellOverlays` 只订阅轻量 open intent，并挂各 feature 的 lazy host；创建表单集中在按需加载的 `ShellCreationOverlays`。关闭状态不得提前实例化 Markdown 解析、完整更新对话框或创建表单图，也不为所有 Dialog 建立通用 loader abstraction。

**创建归属与组合：** Shell 只提供打开意图、初始化 Space 与任务放大状态，不保存创建会话内的归属副本。Task / Project 各自的 RHF 表单是会话归属、输入与提交的唯一事实源；`ShellCreationOverlays` 通过 `renderHeader` 组合槽提供 `CreateDialogHeader`，由领域表单直接传入当前 Space、选择动作与 pending 状态。`CreateDialogShell` 只持有 Modal 容器、可访问标题和关闭行为，Header 不通过 effect、Portal 或另一份 store 同步表单；领域仍不得反向导入 Layout。

创建提交只允许当前仍挂载的表单处理成功反馈、关闭与导航。用户关闭后，已发出的写入仍按原合同完成，但迟到的结果不能关闭后来打开的创建窗口；Task / Project 复用 `useCreateSessionActive` 维护这一生命周期边界，不增加持久化会话或草稿状态。

Modal、AlertDialog 与模态 Sheet 的根键盘边界必须放行 Tab / Shift+Tab，让事件到达 React Aria 在 document 冒泡阶段注册的 FocusScope，统一负责首尾回绕与跳过禁用控件；不得另写焦点循环或正数 tabIndex。其余按键继续隔离背景快捷键，未消费的 Escape 交给上游，已被消费的 Escape 不再穿透外层。创建壳沿用同一规则，内层表单框架不额外裁切，避免属性按钮的焦点边在内容起点被切掉。

UI Lab 仅 `createDialogSamples` 样例可直接消费 `ShellCreationOverlays` 和 `useShellCreateDialogState` 两个既有装配入口，用隔离的内存 Query / Router / IPC 验收真实创建组合，避免复制静态外壳。该例外由精确 source → target 门禁限定，不开放其他 Layout 导入；检测到原生 Tauri 环境时样例拒绝运行。

**设置模式侧栏** 在 `features/settings`（`SettingsSidebar` + `SETTINGS_NAV_GROUPS`），壳只挂载。

**分区 / spaceId 真相：** 直接读 `shellRoute` + `scope`（`ShellRouteLayout`），**无**可写 nav store 镜像。

**壳层几何：** `ShellChrome` 是 Header、Sidebar、Main region 与 Footer 的唯一 Frame owner。Frame 为桌面 Main region 提供尾侧 `8px` gutter；`Sidebar.Main` 只提供唯一 `<main>` landmark 与 HeroUI inset surface，并清零上游默认外边距。compact Main region 不保留 gutter。Header、开屏骨架和 `index.html` 静态首帧必须同步同一高度合同。

**窗口拖动：** 静态首帧与 React 加载 / 错误骨架的顶部直接声明 Tauri drag region，不等待业务数据。就绪后由 `ShellHeader` 唯一挂载 `useWindowBackdropDrag`，仅处理原生环境、左键及真实 Header 盒内的事件。直接命中 Modal / AlertDialog / Command / Sheet 遮罩，或 Header 处于 inert 子树、事件落到 body 且存在实际弹窗遮罩时，消费 pointerdown / click 并调用 Tauri `startDragging`，保持弹窗及其嵌套浮层。仅普通 Dropdown / Popover 打开时，inert body 上的顶栏 pointerdown 阻止默认失焦并捕获当前 pointer，避免按住后焦点跳到首项、移入菜单释放时误执行；事件继续传播，由 React Aria 在松开 click 时关闭浮层，随后才能用新手势拖动窗口。不提升背景 Header、不移除 inert、不增加可聚焦元素，也不接管弹窗 Header、Sheet 正文或表单控件。普通区域的外点关闭、Tab / Escape 与已有标题栏拖动保持；原生失败记录错误，浏览器环境不拦截。此路径仍依赖 WebView 处理事件，不保证 JS 阻塞时可拖动。

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
