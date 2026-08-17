# HeroUI-only UI 平台、Linear 浅色设计系统与键盘交互重写 - Tasks

> 当前状态：阶段 3。阶段 A–G 已完成，下一步从阶段 H 的 T60 开始。

## 当前阶段

- 阶段 A–G 已完成；下一步执行阶段 H 的 T60。Windows WebView2 不属于本任务验收范围，也不阻塞后续阶段。
- 执行任意 task 前，必须重读 [SPEC.md](./SPEC.md) 对应 AC 与 [PLAN.md](./PLAN.md) 对应方案；后续 task 默认按编号顺序依赖。
- 任一锁定包 API、供应链访问、性能或产品合同与 PLAN 冲突时，先在本文件「与 SPEC/PLAN 的实施偏差」登记并停止相关切片，不得静默增加兼容层。

## 阶段任务

**阶段 A：决策固化、供应链与迁移基线**

- [x] T1 在 `Documents/01-架构/adr/ADR-0002-heroui-ui-platform.md` 创建 ADR，固化 HeroUI-only 依赖方向、Pro 供应链、Tailwind/HeroUI 主题、产品组合例外与 StoneFlow 第一方零动画决策；不提前改写尚未落地的长期架构文档。
  _对应验收标准：AC-1, AC-2, AC-3, AC-40, AC-41_

- [x] T2（任务发起人验收 U0）确认使用 CollectUI 工作流，并在仓库外 `mktemp -d` 隔离目录通过进程环境注入 `HEROUI_KEY`，以 `hpsetup@4.7.0` 完成 `@heroui-pro/react@1.0.0-beta.8` 下载 smoke；脱敏结果、文件数、解包字节数、manifest/tree SHA-256 写入 `Documents/99-素材/03-验证/heroui-refactor/supply-chain-smoke.json`，失败时写入「阻塞」并停止 T8 及之后的依赖迁移。
  - 不记录 Key、账号、私有下载地址或 CDN 响应正文，不配置 CI secret；本项不宣称已验证 HeroUI 官方 license、seat、entitlement 或 Updates Window。
  _对应验收标准：AC-40_

- [x] T3 依据 `src/routeTree.gen.ts`、`src/app/providers/AppProviders.tsx`、`src/layout/overlays/ShellOverlays.tsx`、`src/launcher.tsx` 与全仓 import graph 复核用户可达表面，并生成 `Documents/99-素材/03-验证/heroui-refactor/migration-inventory.json` 作为唯一迁移/删除清单。
  - 每条至少包含 `path`、`kind`、`ownerTask`、`disposition`；盘点 `src/shared/components/base/`、`src/shared/components/patterns/`、旧 `--sf-*` 与第一方动画消费者，校正 D/E/I/J/K/L 的唯一 hard-cut 归属，F/G 只拥有共享宿主。
  _对应验收标准：AC-2, AC-38, AC-39, AC-41_

- [x] T4 在 `Documents/99-素材/01-图片/heroui-ui-refactor-baseline/` 保存迁移前主壳、Sidebar、TaskBoard、Command、ContextMenu、详情、Settings、Update 与 Launcher 截图，并在本文件登记 macOS WKWebView 的设备、系统/WebView 版本与验收负责人。
  - 现有 9 份有效 macOS 证据覆盖主壳/Sidebar、TaskBoard 稀疏与密集场景、Command、两张 ContextMenu、任务详情、Settings/Update 与 Launcher；迁移前截图只记录功能与特殊细节，不要求凑齐终态精确视口。
  - macOS 登记：MacBook Air `Mac17,3`、macOS `26.6.2 (25G82)`、WebKit `21624.5.1.11.2`，当前验收负责人为任务发起人；首轮可见内容区观察值为 `1249×853`，实际性能基线由 T6 修正版运行结果登记。
  - Windows 构建、平台分支与产品支持继续保留；本任务不要求 Windows 截图、设备或负责人，也不宣称 Windows 已验证。
  _对应验收标准：AC-11, AC-13, AC-38, AC-44_

- [x] T5 在 `src/features/task/testing/taskBoardPerformanceFixtures.ts` 与 `src/features/task/testing/taskBoardPerformanceFixtures.test.ts` 建立 PLAN 指定的两份确定性 fixture，验证 `2,000/20×100`、`200 loaded/10,000 total`、稳定 ID、总量与 seed 可重复。
  _对应验收标准：AC-37_
  _测试先行：`src/features/task/testing/taskBoardPerformanceFixtures.test.ts`_

- [x] T6 在 `src/routes/debug.task-board.tsx` 建立阶段 A/I/M 共用的真实 WebView 测量入口，使用 T5 fixture 在当前 production build 记录 macOS 基线到 `Documents/99-素材/03-验证/heroui-refactor/task-board-performance-before.json`，包含 commit、设备 CPU/内存、OS/WebView、构建模式、实际 viewport、seed、预热、5 次滚动、mounted row 峰值、mount/unmount 次数、重复 fetch 与 50 次 `scrollToTaskId → focus` 原始样本。
  - Rust 主窗口默认 inner size 保持 `1280×900`；系统压缩后记录运行时实际稳定 viewport，并要求迁移前后在同一 Mac、同一实际 viewport 比较，不设置精确尺寸拒绝门。
  - 修正版 production Tauri 基线实际 viewport 为 `1280×853@2x`；两份 fixture 均完成 1 次预热、5 次滚动与 50 次焦点原始采样。当前旧实现仅分别成功 `1/50`、`3/50` 次真实焦点恢复，此失败率作为后续集合焦点重构的迁移前事实保留。
  _对应验收标准：AC-33, AC-37_

- [x] T7 完成阶段 A 收口：复核 ADR、供应链记录、表面归属、截图与性能产物未泄露凭据，在本文件登记证据；获准提交时引用 [PLAN「阶段提交文案」](./PLAN.md#阶段提交文案) 的阶段 A 文案，不自动提交。
  _对应验收标准：AC-38, AC-40_

**阶段 B：HeroUI 平台、主题与字体基础**

- [x] T8 按 PLAN 锁定版本修改 `package.json`、`bun.lock` 与安装配置，通过 `bunx hpsetup@4.7.0 --auto` 精确加入 HeroUI OSS/Pro、React Aria Components、`react-aria`、`react-stately` 及主项目实际必需的最小 trusted dependencies，核对缓存恢复产物树 SHA-256，并在全新隔离目录完成 frozen install、`bun run typecheck` 与 `bun run build`；不得照搬隔离 smoke 写入的 `@zowe/secrets-for-zowe-sdk`。
  - 不引入 `HeroUIProvider`；供应商若要求 Motion 依赖可精确锁定，但 `src/**` 不得 import、调用或封装其 API。
  _对应验收标准：AC-1, AC-3, AC-40, AC-41_

- [x] T9 重构 `src/styles/index.css` 并新建 `src/styles/theme.css`、`src/styles/components.css`，收紧 `src/styles/base.css`，建立 PLAN 规定的 HeroUI 官方 CSS 顺序与五文件终态骨架；迁移期只继续导入尚有消费者的 legacy CSS。
  - 新 theme 与旧 `--sf-*` 不双向映射，`components.css` 只接收 PLAN 明确允许的三类集中 recipe。
  _对应验收标准：AC-4, AC-5, AC-7, AC-12_

- [x] T10 在 `src/styles/theme.css` 与 `src/styles/components.css` 落地 SPEC 色彩、浅色状态、focus-visible、紧凑密度和公开 BEM/data-state 配方，并验证 Button、表单、Sidebar、Menu 与列表的状态对比度。
  - 唯一允许的 transition 规则是 `[data-resizing="true"]` 临时关闭 HeroUI Sidebar 官方过渡，不定义替代动画。
  _对应验收标准：AC-6, AC-7, AC-8, AC-9, AC-13_

- [x] T11 在 `public/fonts/` 加入带 OFL 许可的 Inter Variable WOFF2，重写 `src/styles/fonts.css` 为真实 400/500/600 与固定系统中文 fallback，并删除零引用的 Maple Mono、霞鹜文楷资产。
  - 保留 `font-synthesis: none`，通过 production build 与 U1 实际字形检查验证字体文件、family、weight 和 fallback 合同。
  _对应验收标准：AC-10, AC-12_

- [x] T12 更新 `index.html`、`launcher.html`、`src/main.tsx` 与 `src/launcher.tsx`，统一 `class="light" data-theme="stoneflow-light"` 和 `src/styles/index.css`；新增 `scripts/check-shell-theme-sync.ts` 及测试，校验 CSS theme、HTML boot shell 与 `src-tauri/crates/runtime/src/window/main.rs` 的首帧颜色不漂移。
  - 不设置根级 `data-reduce-motion="true"`，不建设 token 生成器。
  _对应验收标准：AC-6, AC-10, AC-11, AC-12_
  _测试先行：`scripts/check-shell-theme-sync.test.ts`_

- [x] T13 同步 `Documents/99-素材/02-HTML原型/stoneflow_heroui_light_v1.html` 到已确认色板、Inter/中文 fallback、密度与 HeroUI 状态，覆盖 Shell、表单、Menu、集合、导航 Sheet、任务详情 Aside、Toast 与 Progress。
  _对应验收标准：AC-6, AC-8, AC-9, AC-10, AC-13_

- [x] T14（任务发起人验收 U1）打开 T13 原型检查实际字形、色值层级、紧凑密度及 default/hover/pressed/open/focus/disabled/invalid 状态，并在本文件记录“通过”或精确偏差。
  - 只验证已确认方向是否正确实现，不重新开启色板选择；AI 不得代为勾选。
  _对应验收标准：AC-6, AC-8, AC-9, AC-10, AC-13_

- [x] T15 完成阶段 B 收口：运行根级类型、lint、边界、格式、相关测试与 production build，登记隔离安装、视觉 Gate 和零凭据证据；获准提交时引用 PLAN 的阶段 B 文案，不自动提交。
  _对应验收标准：AC-6, AC-10, AC-11, AC-40_

**阶段 C：StoneFlow 第一方动画清场**

- [x] T16 在 `scripts/check-no-first-party-animation.ts` 与 `scripts/check-no-first-party-animation.test.ts` 建立最小正反例扫描器，并接入 `package.json` 根级检查命令，禁止直接动画依赖/import、CSS/Tailwind 动画与过渡、平滑滚动、WAAPI 和 View Transition。
  - 必须允许 `[data-resizing="true"] { transition: none }`、静态 transform、非动画 rAF 与领域字段 `transition_status`。
  _对应验收标准：AC-41, AC-42, AC-43_
  _测试先行：`scripts/check-no-first-party-animation.test.ts`_

- [x] T17 在 `src/shared/components/base/button.tsx`、`badge.tsx`、`breadcrumb.tsx`、`input.tsx`、`input-group.tsx`、`textarea.tsx`、`checkbox.tsx`、`switch.tsx`、`selection-indicator.tsx` 与 `tabs.tsx` 删除 StoneFlow 自写 transition、duration/easing 和 active scale，保留控件状态、表单语义与静态几何。
  _对应验收标准：AC-39, AC-41, AC-42, AC-43_
  _测试先行：`src/shared/components/row/RowShell.test.tsx`、`src/shared/components/row/cells/SharedRowCells.test.tsx`_

- [x] T18 在 `src/shared/components/base/alert-dialog.tsx`、`dialog.tsx`、`sheet.tsx`、`popover.tsx`、`select.tsx`、`dropdown-menu.tsx`、`context-menu.tsx` 与 `tooltip.tsx` 删除 Radix fade/zoom/slide 及 StoneFlow 过渡，保留开闭、外点、Escape 和焦点回归行为。
  _对应验收标准：AC-39, AC-41, AC-42, AC-43_
  _测试先行：`src/shared/components/base/overlay-close-tooltip.test.tsx`、`src/layout/CreateDialogShell.test.tsx`_

- [x] T19 在 `src/shared/components/base/sidebar.tsx`、`sidebar-context.tsx`、`accordion.tsx` 与 `collapsible.tsx` 删除宽度插值、展开过渡与只为关闭过渡存在的双 rAF workaround，保留实时拖宽计算、持久化与焦点调度。
  _对应验收标准：AC-39, AC-41, AC-42, AC-43_
  _测试先行：`src/shared/components/base/sidebar.test.tsx`、`src/layout/ShellSidebar.test.tsx`_

- [x] T20 在 `src/shared/components/patterns/`、`src/shared/components/row/RowShell.tsx`、`src/shared/components/row/RowFieldCells.tsx` 与 `src/shared/components/row/cells/` 删除第一方 transition、spin/pulse 和 active scale，保留行选择几何、截断检测与状态语义。
  _对应验收标准：AC-39, AC-41, AC-42, AC-43_
  _测试先行：`src/shared/components/row/RowShell.test.tsx`、`src/shared/components/patterns/ShellFooterTooltip.test.tsx`_

- [x] T21 在 `src/layout/ShellChrome.tsx`、`src/layout/ShellHeader.tsx` 与 `src/layout/` 扫描出的其余生产消费者中删除第一方过渡和平滑滚动，保留 Tauri 拖拽区、直接操纵、静态几何与焦点调度。
  _对应验收标准：AC-39, AC-41, AC-42, AC-43_
  _测试先行：`src/layout/ShellSidebar.test.tsx`、`src/layout/ShellFooter.test.tsx`_

- [x] T22 在 `src/features/task/components/TaskBoard.tsx`、`src/features/task/detail/components/TaskLinkRow.tsx` 与 `src/features/task/` 扫描出的其余消费者中删除第一方过渡，保留 TanStack Virtual 的 transform、sticky/rAF 几何、焦点调度与领域 `transition_status`。
  _对应验收标准：AC-39, AC-41, AC-42, AC-43_
  _测试先行：`src/features/task/components/TaskBoard.test.tsx`、`src/features/task/detail/components/TaskLinkRow.test.tsx`_

- [x] T23 在 `src/features/display-options/components/`、`src/features/metadata-fields/components/` 与两个 feature 的展示适配代码中删除第一方过渡与 active scale，保留 query/mutation、菜单选择与字段结果。
  _对应验收标准：AC-39, AC-41, AC-42, AC-43_
  _测试先行：`src/features/display-options/components/DisplayOptionsPanel.test.tsx`、`src/features/metadata-fields/metadata-fields.test.tsx`_

- [x] T24 在 `src/features/launcher/chrome/`、`src/features/launcher/composer/`、`src/features/launcher/create/` 与 `src/features/launcher/results/` 删除第一方过渡和插值，保留 Launcher 透明窗口几何、搜索/创建状态与键盘行为。
  _对应验收标准：AC-39, AC-41, AC-42, AC-43_
  _测试先行：`src/features/launcher/LauncherPage.test.tsx`、`src/features/launcher/composer/controls/LauncherActionControls.test.tsx`_

- [x] T25 在 `src/features/settings/components/`、`src/features/sync/components/` 与其状态展示适配中删除第一方 transition/spin/pulse，保留加载、错误、同步结果、`aria-busy` 和 `aria-live`。
  _对应验收标准：AC-39, AC-41, AC-42, AC-43_
  _测试先行：`src/features/settings/components/SettingsPage.test.tsx`、`src/features/sync/components/SyncFooterStatusItem.test.tsx`_

- [x] T26 在 `src/features/update/components/` 删除第一方 transition/spin/pulse 与 SVG 进度插值，需要反馈时改用 HeroUI 官方 ProgressBar/ProgressCircle/Spinner 或静态文字，保留更新状态机、百分比、`role="progressbar"` 与错误结果。
  _对应验收标准：AC-39, AC-41, AC-42, AC-43_
  _测试先行：`src/features/update/components/UpdateDialog.test.tsx`、`src/features/update/components/UpdateFooterChip.test.tsx`_

- [x] T27 在 `src/features/app-info/components/`、`src/features/changelog/` 删除第一方过渡与 spin/pulse，保留版本加载、外链、Markdown、错误和空态。
  _对应验收标准：AC-39, AC-41, AC-42, AC-43_
  _测试先行：`src/features/app-info/components/AboutDialog.test.tsx`、`src/features/changelog/ChangelogDialog.test.tsx`_

- [x] T28 运行 `scripts/check-no-first-party-animation.ts` 取得全仓剩余命中清单，逐项删除 T17–T27 未覆盖的生产动画消费者并为所有 rAF、静态 transform 和 `[data-resizing]` allowlist 记录非动画理由；不得以扩大目录 allowlist 代替清理。
  _对应验收标准：AC-39, AC-41, AC-42, AC-43_

- [x] T29 从 `src/styles/index.css` 与 `package.json` 删除 StoneFlow 对 `tw-animate-css` 的直接 import/声明并更新 `bun.lock`；在 `src/test/HeroUIMotionContract.test.tsx` 建立只使用官方组件的锁版 probe，覆盖 Modal、Popover、Tooltip、Sheet、Sidebar、Toast 与 Progress 的正常卸载和 reduced-motion CSS 合同。
  - 产品集成与真实 WebView 动效留在所属迁移阶段和阶段 M 验收；锁定版 probe 失败时登记官方版本阻塞，不新增 feature 级动画补丁。
  _对应验收标准：AC-40, AC-41, AC-42, AC-44_
  _测试先行：`src/test/HeroUIMotionContract.test.tsx`_

- [x] T30 完成阶段 C 收口：运行动画扫描、根级检查和 production build，登记 HeroUI 传递依赖 allowlist 与 reduced-motion 证据；获准提交时引用 PLAN 的阶段 C 文案，不自动提交。
  _对应验收标准：AC-41, AC-42, AC-43, AC-44_

**阶段 D：Shell 与 Sidebar 三态**

- [x] T31 在 `src/layout/model/useShellSidebarController.ts` 与 `src/layout/model/shellSidebarController.test.ts` 建立 Sidebar 唯一状态 owner，覆盖 expanded/icon/compact、单一 `matchMedia(1024px)`、mobile Sheet、live/committed width 与响应式不覆盖持久偏好。
  _对应验收标准：AC-14, AC-15, AC-18, AC-19, AC-20_
  _测试先行：`src/layout/model/shellSidebarController.test.ts`_

- [x] T32 在 `src/layout/sidebar/SidebarResizeRail.tsx` 与 `src/layout/sidebar/SidebarResizeRail.test.tsx` 实现唯一可聚焦 separator，覆盖 `4px` click/drag 阈值、pointer capture、icon 拖动恢复、cancel 回滚、单次提交及 Enter/Space、Arrow、Shift+Arrow、Home/End。
  - 暴露可访问名称、当前宽度和 expanded/icon 状态；拖动期间只设置并清除 `data-resizing`。
  _对应验收标准：AC-15, AC-16, AC-17, AC-18, AC-42_
  _测试先行：`src/layout/sidebar/SidebarResizeRail.test.tsx`_

- [x] T33 将 `src/layout/ShellSidebar.tsx` 与 `src/layout/sidebar/` 重构为单一 `ShellSidebarNavigation`，直接组合 HeroUI Sidebar、Button、Tooltip、Menu、ContextMenu，保留 Space/Project/Settings 路由、badge、定制入口与危险确认，不创建 HeroUI 同名 wrapper；`<1024px` 不渲染 HeroUI 内建 `Sidebar.Mobile`，而由 T31 的唯一 compact 状态驱动导航 Sheet。
  _对应验收标准：AC-1, AC-3, AC-14, AC-19, AC-39_
  _测试先行：`src/layout/ShellSidebar.test.tsx`_

- [x] T34 将 `src/features/settings/components/SettingsSidebar.tsx` 的设置导航容器切到阶段 D 的 HeroUI Sidebar/compact Sheet 合同，保留 section route 与返回路径；设置表单内容仍归阶段 L。
  _对应验收标准：AC-1, AC-14, AC-19, AC-38, AC-39_
  _测试先行：`src/features/settings/components/SettingsSidebar.test.tsx`_

- [x] T35 在 `src/layout/ShellLayoutContent.tsx`、`src/layout/ShellChrome.tsx` 与 `src/layout/ShellMain.tsx` 组合 HeroUI `Sidebar.Provider`、Inset 与唯一 `Sidebar.Main`，让 grid 由 Sidebar 实际盒宽的 `auto` 轨道驱动；compact 时以 HeroUI Sheet 呈现同一导航且桌面占位为零，并新增 `src/layout/ShellLayoutContent.test.tsx` 验证结构。
  - 删除嵌套 `<main>`、第二份 reserved-width 几何和双导航挂载。
  _对应验收标准：AC-6, AC-14, AC-19, AC-20, AC-42_
  _测试先行：`src/layout/ShellLayoutContent.test.tsx`、`src/layout/ShellSidebar.test.tsx`_

- [x] T36 将 `src/layout/ShellHeader.tsx` 与 `src/layout/header/` 的标准控件切到 HeroUI，保留 Tauri drag region、窗口控制、历史导航与 Command Registry；复核 `src/layout/ShellFooter.tsx` 仅负责产品组件编排、没有本阶段可迁移的通用控件；`layout.toggleSidebar` 仍是唯一快捷键 owner。
  _对应验收标准：AC-1, AC-3, AC-20, AC-31, AC-39_
  _测试先行：`src/layout/ShellFooter.test.tsx`、`src/layout/header/NavBackForward.test.tsx`、`src/layout/header/UserAppMenu.test.tsx`_

- [x] T37 更新 `src/features/settings/api/shellDevicePreferences.ts`、`src/features/settings/model/useSidebarSettingsStore.ts`、`src/layout/ShellLayoutSkeleton.tsx` 与 `index.html`，复用现有 device port 持久化 `220–330px` 和 expanded/collapsed，统一冷启动骨架且不新增第一方过渡。
  _对应验收标准：AC-15, AC-18, AC-20, AC-42, AC-43_
  _测试先行：`src/features/settings/api/shellDevicePreferences.test.ts`、`src/features/settings/model/useSidebarSettingsStore.test.ts`_

- [x] T38 完成阶段 D 收口：验证 1024px 两侧、pointer/keyboard rail、单导航树、冷启动与 Tauri Header/Footer，运行根级门禁和 `bun run test:rust`；获准提交时引用 PLAN 的阶段 D 文案，不自动提交。
  _对应验收标准：AC-14, AC-16, AC-17, AC-19, AC-20_

**阶段 E：任务详情 Aside、Sheet 与完整页**

- [x] T39 修改 `src/features/settings/api/shellDevicePreferences.ts`、`src/features/settings/model/useSidebarSettingsStore.ts`、`src/features/settings/components/panels/SettingsGeneralPanel.tsx` 及测试，删除 `detailPresentation`、UI device preference、对应更新 action 与 Sheet/Aside 设置表面。
  - 旧 `stoneflow.shell.ui.device` 数据不迁移、不清理、不建兼容读取；零消费者后直接删除该链路。
  _对应验收标准：AC-21, AC-22, AC-23_
  _测试先行：`src/features/settings/api/shellDevicePreferences.test.ts`、`src/features/settings/model/useSidebarSettingsStore.test.ts`、`src/features/settings/components/SettingsPage.test.tsx`_

- [x] T40 删除 `src/layout/model/detailPresentation.ts`、`src/layout/model/detailPresentation.test.ts`、`src/layout/model/useDetailPresentation.ts` 与 `src/shared/lib/shellDetailGeometry.ts`，并清除详情呈现偏好、UI device preference 与共享详情几何模块。
  - T43 直接复用 Shell controller 的单一 `isCompact`，详情与 Sidebar 只分开拥有 open state，不恢复呈现偏好或第二份响应式 store。
  _对应验收标准：AC-21, AC-22, AC-23_
  _测试先行：`src/layout/model/shellSidebarController.test.ts`、`src/features/entity-detail/model/useEntityDetailController.test.tsx`_

- [x] T41 将 `src/features/task/detail/components/TaskDrawer.tsx` 重构为容器无关的 `TaskDetailContent.tsx`，并在 `src/features/task/detail/model/useTaskDetailViewModel.ts` 收敛 query、draft、autosave、mutation 与 busy state，使 Aside / Sheet 不复制领域逻辑。
  _对应验收标准：AC-21, AC-23, AC-25, AC-39_
  _测试先行：`src/features/task/detail/components/TaskDetailContent.test.tsx`_

- [x] T42 重构 `src/layout/ShellMain.tsx` 与 `src/features/entity-detail/components/EntityDetailDrawerHost.tsx`，建立 Main surface 内的 HeroUI Pro Resizable 非模态 Aside 基础，并保留容器无关详情内容。
  - 最终 Aside 几何、HeroUI Sheet 与断点互换由重开的 T43 收口。
  _对应验收标准：AC-21, AC-22, AC-23, AC-24, AC-39_
  _测试先行：`src/features/entity-detail/components/EntityDetailDrawerHost.test.tsx`、`src/features/task/detail/components/TaskDetailContent.test.tsx`_

- [x] T43 在 `src/features/entity-detail/components/EntityDetailDrawerHost.tsx`、`src/features/entity-detail/model/useEntityDetailController.ts`、`src/layout/ShellMain.tsx` 及列表 scene 中收口唯一详情容器合同：所有列表打开只写 `?task=`；窗口 `>=1024px` 渲染 HeroUI Pro Resizable Aside，`<1024px` 渲染 HeroUI Sheet。
  - Aside 中列表 Panel 最小 `352px`；Aside 最小 `320px`、默认 `360px`、最大 `440px`。任务列表只用 CSS container query 在 `<560px` 进入唯一紧凑档。
  - active 详情跨过 `1024px` 时只替换 Aside / Sheet 容器，保留 `?task=`、taskId、draft、autosave、scroll 与正常 Back/Forward；不导航、不自动关闭、不触发完整页。
  - 删除局部宽度观测、容器可分栏状态机、自动完整页导航及其 preflight / history 特例；保留 taskId 级 scroll snapshot、trigger entity ID 恢复协议。canonical 完整页只保留 Header 显式 flush 后打开入口。
  _对应验收标准：AC-23, AC-24, AC-25, AC-32, AC-43_
  _测试先行：`src/shared/autosave/useAutosaveController.test.tsx`、`src/features/entity-detail/model/useEntityDetailController.test.tsx`、`src/features/entity-detail/model/entityDetailNavigation.test.ts`、`src/features/entity-detail/components/EntityDetailDrawerHost.test.tsx`_

- [x] T44 将 `src/features/task/detail/components/TaskDetailHeader.tsx` 收口为任务标题、保存状态和“打开完整页”动作；导航前必须先 flush autosave，不承载呈现偏好。
  - `Space` 仍只打开 Peek；任务 Sheet 的 modal、Backdrop、Escape、外点关闭与焦点管理由 HeroUI 拥有。
  _对应验收标准：AC-19, AC-21, AC-22, AC-25, AC-30_
  _测试先行：`src/features/task/detail/components/TaskDetailHeader.test.tsx`、`src/features/task/detail/components/TaskPreview.test.tsx`、`src/features/entity-detail/components/EntityDetailDrawerHost.test.tsx`_

- [x] T45（任务发起人验收 U2）在真实 Tauri 中验证 Sidebar 点按/拖动/键盘、窗口 `1024px` 两侧的 Aside / Sheet、Aside 拖宽、列表容器紧凑档、显式完整页、草稿、scroll 与焦点，并在本文件记录“通过”或精确问题；AI 不得代为勾选。
	- `>=1024px` 应打开非模态 Aside：列表不小于 `352px`，Aside 可在 `320–440px` 拖宽且默认 `360px`，分隔区可键盘操作。`<1024px` 应使用带 Backdrop、Escape、外点关闭和焦点管理的 HeroUI Sheet。
	- 打开详情后反复跨过 `1024px`，应只替换 Aside / Sheet 容器；`?task=`、任务、草稿、autosave、scroll 和 history 保持，不自动关闭或跳完整页。Sidebar 同断点切换不得改写详情 open state。
	- 将列表容器调到 `560px` 两侧，只能出现一次紧凑/默认排版切换。同时验证 `Space` 只打开 Peek，Aside / Sheet Header 显式打开完整页前先 flush，Escape、显式关闭和浏览器 Back 恢复正确列表、scroll 与焦点。
	- 2026-08-14 首轮 U2 的导航 Sidebar、dirty 备注和焦点问题仍需回归；当时的偏好和双容器 open-state 问题不得回流。
	- 2026-08-17：任务发起人基于本轮真实 Tauri 连续复验确认 U2 通过；验收期间发现的 Sidebar、Space 切换、MainCard、Aside / Sheet、Backdrop、草稿保存、详情 Header 与关闭动作问题均已修正并复验，最终合同不再保留呈现偏好、局部宽度状态机或自动完整页分流。
  _对应验收标准：AC-14, AC-18, AC-21, AC-23, AC-24_

- [x] T46 完成阶段 E 收口：确认 U2 通过后运行详情/Sidebar 测试、根级门禁、production build 与 `bun run test:rust`；获准提交时引用 PLAN 的阶段 E 文案，不自动提交。
  _对应验收标准：AC-21, AC-22, AC-23, AC-24, AC-25_

**阶段 F：标准控件、表单与反馈组件族**

- [x] T47 将 `src/features/activity/components/ActivityDebugPage.tsx`、`src/routes/-activity-debug-route.tsx`、`src/routes/-router-feedback.tsx`、`src/routes/__root.tsx` 与迁移清单明确归属 T47 的 `src/routes/_shell/route.tsx` 直接切到 HeroUI Button、Input、Select、Link、EmptyState 与反馈组件，作为标准控件/表单最小真实 probe；不二次修改阶段 D/E 表面，不经过旧 base 重导出。
  _对应验收标准：AC-1, AC-3, AC-4, AC-38, AC-39_
  _测试先行：`src/features/activity/components/ActivityDebugPage.test.tsx`_

- [x] T48 将 `src/shared/components/ShortcutTokens.tsx`、`src/shared/components/shortcut-menu/ShortcutMenuItemHint.tsx`、`src/shared/components/main-card/MainCardLayout.tsx` 中仍有跨 feature 价值的产品语义改为直接组合 HeroUI，并删除只为旧皮肤存在的 pattern 消费；不把产品组件改成 HeroUI 透传 wrapper。
  _对应验收标准：AC-1, AC-3, AC-4, AC-5, AC-39_
  _测试先行：`src/shared/components/ShortcutTokens.test.tsx`、`src/shared/components/main-card/MainCardLayout.test.tsx`_

- [x] T49 将 `src/layout/ShellSidebar.tsx`、`src/shared/components/detail/DetailBody.tsx` 与 `src/shared/components/main-card/MainCardLayout.tsx` 的普通滚动容器改为 HeroUI ScrollShadow 或原生 overflow；`src/shared/components/AppScrollArea.tsx`、`src/shared/components/OverlayScrollbar.tsx` 只保留尚未迁移消费者和 TaskBoard 真实 viewport 例外，不叠加第二个 virtualizer。
  _对应验收标准：AC-3, AC-4, AC-5, AC-33_
  _测试先行：`src/shared/components/main-card/MainCardLayout.test.tsx`、`src/shared/components/AppScrollArea.test.tsx`、`src/features/task/components/TaskBoard.test.tsx`_

- [x] T50 完成阶段 F 收口：复核本阶段文件无旧 base/pattern/`--sf-*` 消费，运行根级门禁与 production build；只删除最后消费者已归零的 primitive，获准提交时引用 PLAN 的阶段 F 文案，不自动提交。
  _对应验收标准：AC-1, AC-2, AC-3, AC-4, AC-38_

**阶段 G：Overlay、Menu 与焦点基础**

- [x] T51 将 `src/shared/components/tooltip/ActionTooltip.tsx`、`src/shared/components/tooltip/DisabledActionTooltip.tsx` 与 `src/shared/components/tooltip/OverflowTooltip.tsx` 改为直接组合 HeroUI Tooltip，保留动作文案、快捷键、禁用原因、可访问名称与截断复测，一次性删除 Radix `Trigger/asChild` 兼容 API。
  _对应验收标准：AC-1, AC-3, AC-8, AC-32, AC-44_
  _测试先行：`src/shared/components/tooltip/Tooltip.test.tsx`_

- [x] T52 迁移 `src/layout/`、`src/shared/components/` 与 `src/features/command/` 中经全仓扫描确认的 Action/Disabled/Overflow Tooltip 调用方到 T51 API，并删除 `src/app/providers/AppProviders.tsx`、`src/launcher.tsx`、`src/test/TestInteractionProviders.tsx` 的旧 TooltipProvider；不改动命令、快捷键或 Shell 行为。
  _对应验收标准：AC-1, AC-3, AC-8, AC-32, AC-39_
  _测试先行：`src/layout/ShellSidebar.test.tsx`、`src/layout/header/NavBackForward.test.tsx`、`src/features/command/components/CommandActionTooltip.test.tsx`_

- [x] T53 迁移 `src/features/app-info/`、`bulk-action/`、`changelog/`、`display-options/`、`filter/`、`global-search/`、`launcher/`、`metadata-fields/`、`project/`、`settings/`、`sync/`、`task/`、`update/` 与 `view/` 中经全仓扫描确认的 Tooltip 调用方到 T51 API，保留各 feature 的 disabled reason、截断条件与快捷键。
  - 完成后以 `rg` 证明生产代码中 `TooltipProvider`、`ActionTooltip.Trigger` 和 `asChild` 旧调用归零，不以兼容 wrapper 收口。
  _对应验收标准：AC-1, AC-3, AC-8, AC-32, AC-39_
  _测试先行：`src/features/display-options/components/DisplayOptionsPanel.test.tsx`、`src/features/task/components/TaskRowAdapter.test.tsx`、`src/features/launcher/LauncherPage.test.tsx`_

- [x] T54 将 `src/features/danger-confirm/components/DangerConfirmDialog.tsx` hard cut 到 HeroUI AlertDialog/Modal，保留 Provider Promise、危险动作、取消结果与调用方确认语义。
  _对应验收标准：AC-1, AC-3, AC-30, AC-32, AC-39_
  _测试先行：`src/features/danger-confirm/runtime/DangerConfirmProvider.test.tsx`、`src/features/danger-confirm/model/dangerConfirm.test.ts`_

- [x] T55 将 `src/layout/CreateDialogShell.tsx` hard cut 到受控 HeroUI Modal 并更新 `src/layout/overlays/ShellOverlays.tsx`，保留创建表面 state、Escape 与正常 trigger restore；业务表单仍归阶段 K。
  _对应验收标准：AC-1, AC-3, AC-30, AC-32, AC-39_
  _测试先行：`src/layout/CreateDialogShell.test.tsx`_

- [x] T56 修改 `src/features/command/shortcuts/shortcut-dispatcher.ts`、`src/features/command/shortcuts/use-command-shortcuts.ts`、`src/layout/model/useShellCommandOpenRouting.ts`、`src/layout/model/useShellCommandSystem.ts`、`src/features/task/detail/model/useTaskPreviewController.ts` 与 `src/features/entity-detail/model/useEntityDetailController.ts`，统一事件消费、编辑/IME guard 与 Escape 层级，并在新增 `src/layout/ShellEscapePriority.test.tsx` 中覆盖“Menu/Dialog/Sheet → Detail Aside → Peek → Selection → 页面”的单次消费链。
	- Escape 的实际关层 owner 为 `src/layout/command-bridge/registerShellChromeCommands.ts`；现有 controller close port 已满足合同，未制造无行为改动。延迟挂载的任务创建意图也由同一 owner 优先关闭，不再穿透到底层。
  _对应验收标准：AC-29, AC-30, AC-31, AC-32, AC-34_
  _测试先行：`src/features/command/shortcuts/shortcut-dispatcher.test.ts`、`src/features/command/shortcuts/use-command-shortcuts.test.tsx`、`src/layout/ShellEscapePriority.test.tsx`_

- [x] T57 修改 `src/features/task/shortcuts/rowShortcutGuards.ts` 及测试，移除对 DOM selector 型 `src/shared/lib/modal-guard.ts`、`interaction-layer.ts` 的运行时依赖，证明 Overlay/编辑器/IME 内行级字符键不穿透。
  _对应验收标准：AC-29, AC-30, AC-31, AC-34_
  _测试先行：`src/features/task/shortcuts/TaskRowShortcutScope.test.tsx`、`src/features/task/shortcuts/rowTargetResolver.test.ts`_

- [x] T58 在 `src/layout/overlays/ShellOverlayFocus.test.tsx` 建立共享 Overlay 事件矩阵，覆盖 Tooltip→Menu、Popover→Dialog、ContextMenu submenu、Sheet、外点关闭、Escape 最高层消费与普通 trigger restore；虚拟 trigger 留给阶段 H/I bridge，真实 CSS reduced-motion 留给阶段 M WebView 验收。
  _对应验收标准：AC-8, AC-30, AC-32, AC-39, AC-44_
  _测试先行：`src/layout/overlays/ShellOverlayFocus.test.tsx`_

- [x] T59 完成阶段 G 收口：零消费者后删除旧 tooltip/alert-dialog 与旧 modal/interaction guard，保留仍由 I/J/K/L 消费的 Overlay primitive；运行焦点矩阵、动画扫描、根级门禁与 build，获准提交时引用 PLAN 的阶段 G 文案。
	- 已删除零消费者的旧 base Tooltip 与 `modal-guard`；base AlertDialog 仍由 T80 的 `BulkActionConfirmDialog` 消费，`interaction-layer` 仍由 T95 的 `EntityRowShortcutScope` 消费，按零消费者规则保留。
	- 收口证据：生产代码旧 Tooltip API 与已删除模块引用归零；193 个测试文件、1025 项测试通过，根级 typecheck、lint、format、边界、动画扫描及 production build 通过。
  _对应验收标准：AC-2, AC-3, AC-30, AC-32, AC-44_

**阶段 H：单一 Collection 交互基础**

- [ ] T60 在 `src/features/selection/model/collectionState.ts` 与测试中建立稳定 key 的纯投影与不变量，覆盖显式 `selectedKeys`、`focusedKey`、range anchor、`eligibleKeys`、`navigableKeys`、筛选裁剪、折叠、删除和增量加载。
  - 纯模型只产出 focus intent：折叠含 focusedKey 的分组时指向折叠按钮，再次进入时指向分组后首项或 collection root；anchor 不可导航时在下一次 range 前重置为当前 focusedKey，不在模型内操作 DOM。
  _对应验收标准：AC-27, AC-28, AC-34, AC-36_
  _测试先行：`src/features/selection/model/collectionState.test.ts`_

- [ ] T61 在 `src/features/selection/model/useCollectionInteraction.ts`、`src/features/selection/model/CommandSelectionProvider.tsx` 与 `src/features/bulk-action/core/command-bulk-selection-snapshot.ts` 以 `react-aria`/`react-stately` 公开 hooks 接入单一 owner，并在执行瞬间生成只读领域 snapshot；HeroUI 继续拥有高层标准集合外观，不读取其内部 manager。
  - 禁止 `'all'` sentinel、第二份可写选择或 snapshot 反向写 collection。
  _对应验收标准：AC-26, AC-28, AC-31, AC-34, AC-36_
  _测试先行：`src/features/selection/model/useCollectionInteraction.test.tsx`、`src/features/selection/model/CommandSelectionProvider.test.tsx`、`src/features/bulk-action/core/command-bulk-selection-snapshot.test.ts`_

- [ ] T62 在 `src/features/selection/shortcuts/useCollectionKeyboardAdapter.ts` 及测试中复用 `src/features/command/keybinding/input-guard.ts`，集中适配 `J/K`、`X`、`Space`、`Enter`、Shift range 与 loaded-only Cmd/Ctrl+A；React Aria 保持 Arrow、Home/End 和标准焦点 owner。
  - 覆盖 input、textarea、contenteditable、编辑器与 IME composition 隔离。
  _对应验收标准：AC-25, AC-26, AC-27, AC-28, AC-29_
  _测试先行：`src/features/selection/shortcuts/useCollectionKeyboardAdapter.test.tsx`_

- [ ] T63 在 `src/features/selection/model/collectionFocusBridge.ts` 与测试中实现 stable key/ref registry、分组折叠按钮 ref、collection root ref、scroll request、异步挂载后聚焦、虚拟 trigger 恢复及实体删除 fallback；禁止 `scroll + querySelector` 和 mounted keys 参与选择真相。
  _对应验收标准：AC-26, AC-32, AC-35, AC-36_
  _测试先行：`src/features/selection/model/collectionFocusBridge.test.ts`_

- [ ] T64 在 `src/features/selection/components/CollectionInteractionContract.test.tsx` 建立仅测试使用的简单平面集合 probe，验证 HeroUI Pro ListView 可直接承接的合同与必须下沉 hooks 的边界；不得新增生产通用 ListView wrapper。
  _对应验收标准：AC-25, AC-26, AC-27, AC-29, AC-34_
  _测试先行：`src/features/selection/components/CollectionInteractionContract.test.tsx`_

- [ ] T65 完成阶段 H 收口：运行 selection、command、bulk 测试及根级门禁/build，确认没有第二 selection owner 或 HeroUI 同名 wrapper；获准提交时引用 PLAN 的阶段 H 文案，不自动提交。
  _对应验收标准：AC-3, AC-31, AC-34_

**阶段 I：TaskBoard 交互与虚拟化 hard cut**

- [ ] T66 在 `src/features/task/model/taskBoardCollection.ts` 与 `src/features/task/model/taskBoardCollection.test.ts` 从现有 flat board 数据纯派生 eligibility、navigation、stable key/index、分组按钮 key 与删除 fallback，不复制 virtual geometry。
  - 测试必须覆盖折叠分组的 focus intent、再次进入 fallback 与不可导航 anchor 重置。
  _对应验收标准：AC-27, AC-28, AC-33, AC-34, AC-36_
  _测试先行：`src/features/task/model/taskBoardCollection.test.ts`_

- [ ] T67 在 `src/features/task/hooks/useTaskCollectionScene.ts`、`src/features/task/hooks/useTaskSelection.ts` 与 `src/features/task/components/TaskListSceneView.test.tsx` 将 TaskBoard 选择、焦点和 anchor 一次切到阶段 H collection state，领域 selection 只保留只读 snapshot，并向视图输出折叠/删除后的唯一 focus intent。
  _对应验收标准：AC-27, AC-32, AC-34, AC-35, AC-36_
  _测试先行：`src/features/task/components/TaskListSceneView.test.tsx`_

- [ ] T68 修改 `src/features/task/components/TaskBoard.tsx`、`src/features/task/components/TaskRowAdapter.tsx` 及测试，使用 React Aria Grid/GridList 类语义与真实 row focus，同时保留 Checkbox、状态、日期等行内控件的独立语义和事件边界。
  _对应验收标准：AC-13, AC-26, AC-29, AC-33, AC-34_
  _测试先行：`src/features/task/components/TaskBoard.test.tsx`、`src/features/task/components/TaskRowAdapter.test.tsx`_

- [ ] T69 在 `src/features/task/components/TaskBoard.tsx`、`src/features/task/components/taskBoardScroll.ts` 与测试中接入 stable key/ref focus bridge，向 bridge 注册 row、分组折叠按钮与 collection root，并保留 TanStack Virtual 的分组、sticky、range extractor、总高度、分页与 `scrollToTaskId`。
  - `TaskBoard.test.tsx` 覆盖“焦点行被折叠 → 折叠按钮 → 再次进入首项/root → anchor 重置”、删除聚焦行与离屏挂载后聚焦。
  _对应验收标准：AC-32, AC-33, AC-35, AC-36, AC-37_
  _测试先行：`src/features/task/components/TaskBoard.test.tsx`_

- [ ] T70 将 `src/features/task/components/TaskContextMenu.tsx`、`src/features/task/components/task-context-menu-items.tsx` 与 `src/features/task/components/TaskRowAdapter.tsx` hard cut 到 HeroUI Pro ContextMenu：右键已选行保留整组，未选行先单选并聚焦，关闭后经 bridge 恢复；领域 action、危险确认和 mutation 不变。
  _对应验收标准：AC-31, AC-32, AC-35, AC-39_
  _测试先行：`src/features/task/components/TaskRowAdapter.test.tsx`、`src/features/task/components/useTaskContextMenuBulkActions.test.tsx`_

- [ ] T71 在 `src/features/task/components/TaskBoard.tsx`、`src/features/task/components/TaskRowAdapter.tsx`、`src/features/task/model/indicators/PriorityIcon.tsx` 与 `src/features/task/model/indicators/TaskStatusIndicator.tsx` 重建单项/连续选择、优先级与状态视觉，分离 pointer hover 与真实焦点，不保留旧 `--sf-*` 视觉引用；随后删除 `src/features/task/shortcuts/` 中被新合同取代且零引用的视觉 hover、Shift session、DOM 查询与 row/list 双层快捷键。
  - Project/Lifecycle 尚有消费者的 `EntityRowShortcutScope` 不在本阶段提前删除。
  _对应验收标准：AC-2, AC-8, AC-26, AC-33, AC-36_
  _测试先行：`src/features/task/components/TaskBoard.test.tsx`、`src/features/selection/components/CollectionInteractionContract.test.tsx`_

- [ ] T72 使用阶段 A 已建立的 `src/routes/debug.task-board.tsx` 与 T5 fixture 把迁移后原始结果写入 `Documents/99-素材/03-验证/heroui-refactor/task-board-performance-after.json`，执行 5 次滚动、50 次 focus 延迟与 100 次键盘移动预算。
  _对应验收标准：AC-33, AC-35, AC-37_

- [ ] T73（任务发起人验收 U3）在 production Tauri build 完整验证 TaskBoard Arrow/J/K/Home/End、X、Shift、Space Peek、Enter 详情、Cmd/Ctrl+A、右键、Escape 与输入/IME 隔离，并在本文件记录“通过”或精确问题。
  - 另一定验证“折叠焦点行 → 分组按钮 → 再次进入”、删除聚焦行、离屏挂载后聚焦与 anchor 重置；执行者先提供固定步骤、录屏、性能比较与已知差异，AI 不得代为勾选。
  _对应验收标准：AC-26, AC-27, AC-32, AC-35, AC-36_

- [ ] T74 完成阶段 I 收口：确认 U3 与性能预算通过，运行 Task/Selection/Bulk 测试、根级门禁与 build，确认旧 TaskBoard 状态机零引用；获准提交时引用 PLAN 的阶段 I 文案。
  _对应验收标准：AC-33, AC-34, AC-35, AC-36, AC-37_

**阶段 J：Command、ContextMenu、ActionBar 与 Timeline**

- [ ] T75 修改 `src/features/command/core/command-runtime.ts`、`src/features/command/components/command-menu-model.ts` 及对应测试，输出 Command、ContextMenu、ActionBar、行操作和直接快捷键共用的 command ID、label、shortcut、enabled、disabled reason、目标 snapshot 与单一 execute 入口。
  _对应验收标准：AC-31, AC-39_
  _测试先行：`src/features/command/core/command-runtime.test.ts`、`src/features/command/components/command-menu-model.test.ts`_

- [ ] T76 将 `src/features/command/components/CommandMenu.tsx`、`src/features/command/components/CommandMenuListPrimitives.tsx`、`src/features/command/components/ScopedPickerCommandGroup.tsx` 与 `src/features/command/components/CommandMenuSelectionChips.tsx` hard cut 到 HeroUI Pro Command/Modal，保留异步搜索、scoped picker、最近使用、排序与 Runtime，删除官方组件已承担的输入聚焦和 pointer workaround。
  _对应验收标准：AC-29, AC-30, AC-31, AC-32, AC-39_
  _测试先行：`src/features/command/components/CommandMenu.test.tsx`_

- [ ] T77 将 `src/features/command/components/ShortcutHelp.tsx`、`src/features/command/components/ChordHint.tsx` 与 `src/features/command/components/command-menu-option-visuals.tsx` hard cut 到 HeroUI Pro Command/Kbd 展示，保留搜索、快捷键格式、chord 和 disabled reason，不新建第二份命令数据源。
  _对应验收标准：AC-3, AC-8, AC-31, AC-39_
  _测试先行：`src/features/command/components/ShortcutHelp.test.tsx`_

- [ ] T78 将 `src/features/task/components/TaskContextMenu.tsx`、`src/features/task/components/TaskRowAdapter.tsx` 与 `src/features/selection/shortcuts/useCollectionKeyboardAdapter.ts` 接到本阶段的统一 command 投影：导航、`X`、Shift range 与 Cmd/Ctrl+A 仍直接操作唯一 SelectionManager，只有 Space Peek、Enter 打开和领域 action 按 command ID 执行；不复制可用性、disabled reason 或 mutation。
  - 以 execute spy 证明 J/K/X/Shift/Cmd+A 不调用 Command Runtime，Space/Enter 才调用预期 command ID。
  _对应验收标准：AC-26, AC-27, AC-30, AC-31, AC-34_
  _测试先行：`src/features/selection/shortcuts/useCollectionKeyboardAdapter.test.tsx`、`src/features/command/core/command-runtime.test.ts`、`src/features/task/components/TaskRowAdapter.test.tsx`_

- [ ] T79 将 `src/shared/components/board/BoardSectionContextMenu.tsx` 迁移到 HeroUI Pro ContextMenu 并消费本阶段统一 command 投影，验证 submenu、右键目标、Escape 与 trigger restore；Sidebar 菜单已归阶段 D，Project/Lifecycle 菜单归阶段 K。
  _对应验收标准：AC-30, AC-31, AC-32, AC-39_
  _测试先行：`src/shared/components/board/Board.test.tsx`_

- [ ] T80 将 `src/features/bulk-action/components/BulkActionBar.tsx`、`src/features/bulk-action/components/BulkCommandMenuAction.tsx` 与 `src/layout/ShellBulkActionBoundary.tsx` hard cut 到 HeroUI Pro ActionBar/Command，保留 Registry、snapshot、mutation、toast 与 clear 规则；确认继续唯一调用阶段 G 的 `useDangerConfirm`。
  - 确认 `src/features/bulk-action/components/BulkActionConfirmDialog.tsx` 只有测试/barrel 消费后，删除该组件、测试与导出，不迁移成第二套确认表面。
  _对应验收标准：AC-27, AC-31, AC-32, AC-39_
  _测试先行：`src/features/bulk-action/components/BulkActionBar.test.tsx`、`src/features/bulk-action/core/bulk-action-runtime.test.ts`_

- [ ] T81 将 `src/features/task/detail/components/TaskActivityTimeline.tsx` hard cut 到 HeroUI Pro Timeline，保留 query、订阅、`taskActivityTimelineModel.tsx`、加载/错误/空态与“查看更多”，Timeline 只负责有序 chronology 视觉。
  _对应验收标准：AC-1, AC-3, AC-39_
  _测试先行：`src/features/task/detail/components/TaskActivityTimeline.test.tsx`、`src/features/task/detail/components/taskActivityTimelineModel.test.tsx`_

- [ ] T82 完成阶段 J 收口：全仓零引用后删除 `src/shared/components/base/command.tsx`、旧 bulk/chronology 壳与 `cmdk` 依赖，保留 K/L 尚有消费者的旧 Menu primitive；运行根级门禁/build，获准提交时引用 PLAN 的阶段 J 文案。
  _对应验收标准：AC-1, AC-2, AC-3, AC-31, AC-39_

**阶段 K：主要业务表面纵向迁移**

- [ ] T83 在 `src/features/project-overview/components/ProjectOverviewPage.tsx`、`src/features/project/components/ProjectBoard.tsx` 与 `src/features/project/components/ProjectPage.tsx` 完成项目浏览表面 HeroUI hard cut，保留分组、查询、路由、领域动作、错误与空态，不搬运旧 pattern class。
  _对应验收标准：AC-1, AC-3, AC-4, AC-38, AC-39_
  _测试先行：`src/features/project-overview/components/ProjectOverviewPage.test.tsx`、`src/features/project/components/ProjectBoard.test.tsx`、`src/features/project/components/ProjectPage.test.tsx`_

- [ ] T84 在 `src/features/project-overview/hooks/useProjectOverviewScene.ts`、`src/features/project/components/ProjectRowAdapter.tsx`、`src/features/project/components/ProjectContextMenu.tsx` 与 `src/features/project/components/ProjectCreateContent.tsx` 完成行、右键与创建表面的 HeroUI hard cut，将 scene 切到阶段 H collection 与阶段 J 的统一 command 投影。
  _对应验收标准：AC-1, AC-31, AC-34, AC-38, AC-39_
  _测试先行：`src/features/project/components/ProjectRowAdapter.test.tsx`、`src/features/project/components/ProjectCreateContent.test.tsx`、`src/features/project/model/buildProjectCommandSelection.test.ts`_

- [ ] T85 在 `src/features/lifecycle/hooks/useLifecycleScene.ts`、`src/features/lifecycle/components/LifecycleList.tsx`、`src/features/lifecycle/components/LifecycleBoard.tsx`、`src/features/lifecycle/components/LifecycleRowAdapter.tsx` 与 `src/features/lifecycle/components/LifecycleContextMenu.tsx` 完成 HeroUI hard cut，将 scene 切到阶段 H collection 与阶段 J 的统一 command 投影，保留恢复、回收、永久删除、危险确认和批量结果。
  _对应验收标准：AC-1, AC-31, AC-34, AC-38, AC-39_
  _测试先行：`src/features/lifecycle/components/LifecycleList.test.tsx`、`src/features/lifecycle/components/LifecycleBoard.test.tsx`、`src/features/lifecycle/components/LifecycleRowAdapter.test.tsx`_

- [ ] T86 在 `src/features/task/components/TaskCreateContent.tsx`、`src/features/task/components/TaskCreateMetaActions.tsx` 与 `src/features/task/create/taskCreateForm.ts` 完成任务创建 HeroUI 表单 hard cut，保留校验、默认值、归属/日期/优先级、错误与关闭结果。
  _对应验收标准：AC-1, AC-3, AC-4, AC-38, AC-39_
  _测试先行：`src/features/task/components/TaskCreateContent.test.tsx`、`src/features/task/create/taskCreateForm.test.ts`_

- [ ] T87 在 `src/features/task/detail/components/TaskPage.tsx`、`src/features/task/detail/components/TaskPageMain.tsx`、`src/features/task/detail/components/TaskPageSidebar.tsx`、`src/features/task/detail/components/TaskPageState.tsx`、`src/features/task/detail/components/TaskTitleField.tsx`、`src/features/task/detail/components/TaskNoteField.tsx`、`src/features/task/detail/components/TaskPreview.tsx` 与 `src/features/task/detail/components/taskPreviewTokens.ts` 复用阶段 E 的 `TaskDetailContent`/controller，并完成详情页面、核心编辑字段和独立 Peek 表面的 HeroUI hard cut。
  _对应验收标准：AC-1, AC-3, AC-21, AC-23, AC-39_
  _测试先行：`src/features/task/detail/components/TaskPage.test.tsx`、`src/features/task/detail/components/TaskDetailContent.test.tsx`_

- [ ] T88 在 `src/features/task/detail/components/TaskPropertiesSection.tsx`、`src/features/task/detail/components/TaskPlacementSection.tsx` 与对应测试迁移属性和归属字段到 HeroUI，保留同一 autosave/draft controller 与领域校验。
  _对应验收标准：AC-1, AC-3, AC-23, AC-39_
  _测试先行：`src/features/task/detail/components/TaskPropertiesSection.test.tsx`、`src/features/task/detail/components/TaskPlacementSection.test.tsx`_

- [ ] T89 在 `src/features/task/detail/components/TaskLinksSection.tsx`、`src/features/task/detail/components/TaskLinkEditorPopover.tsx` 与 `src/features/task/detail/components/TaskLinkRow.tsx` 完成链接表面 HeroUI hard cut，保留加载、创建、编辑、删除、错误和 Popover 焦点恢复。
  _对应验收标准：AC-1, AC-3, AC-23, AC-32, AC-39_
  _测试先行：`src/features/task/detail/components/TaskLinksSection.test.tsx`、`src/features/task/detail/components/TaskLinkRow.test.tsx`_

- [ ] T90 在 `src/features/global-search/components/GlobalSearchInput.tsx` 与 `src/features/global-search/components/GlobalSearchResults.tsx` 迁移搜索表面；高层 HeroUI ListView 满足时直接使用，需要 Linear 键位时复用阶段 H adapter，不复用 TaskBoard geometry bridge。
  _对应验收标准：AC-1, AC-26, AC-29, AC-34, AC-39_
  _测试先行：`src/features/global-search/components/GlobalSearchInput.test.tsx`、`src/features/global-search/components/GlobalSearchResults.test.tsx`_

- [ ] T91 在 `src/features/filter/components/FilterMenu.tsx`、`src/features/filter/components/FilterValueSubMenu.tsx`、`src/features/filter/components/FilterValueOption.tsx`、`src/features/filter/components/FilterBar.tsx` 与 `src/features/filter/components/PageFilterButton.tsx` 完成 Filter hard cut，保留 URL/session、嵌套菜单、disabled reason 与焦点恢复。
  _对应验收标准：AC-1, AC-3, AC-30, AC-32, AC-39_
  _测试先行：`src/features/filter/components/FilterBar.test.tsx`、`src/features/filter/components/FilterValueOption.test.tsx`、`src/features/filter/components/PageFilterButton.test.tsx`_

- [ ] T92 在 `src/features/display-options/components/DisplayOptionsButton.tsx`、`src/features/display-options/components/DisplayOptionsPanel.tsx`、`src/features/display-options/components/DisplayOptionsPopover.tsx` 与 `src/features/display-options/components/PropertyToggleGrid.tsx` 完成 Display Options hard cut，保留 query/mutation、能力约束、默认值、即时应用与焦点恢复。
  _对应验收标准：AC-1, AC-3, AC-4, AC-32, AC-39_
  _测试先行：`src/features/display-options/components/DisplayOptionsButton.test.tsx`、`src/features/display-options/components/DisplayOptionsPanel.test.tsx`_

- [ ] T93 在 `src/features/metadata-fields/components/`、`src/features/metadata-fields/core/metadata-icon-tokens.tsx` 与 `src/features/metadata-fields/presentation.ts` 完成字段选择、日期、自定义日期、placement 与图标装配的 HeroUI hard cut，保留 action spec、混合值、快捷数字选择与领域写入；`react-day-picker` 留到 Launcher 日期消费者迁完后的阶段 M 零引用清理。
  _对应验收标准：AC-1, AC-2, AC-3, AC-31, AC-39_
  _测试先行：`src/features/metadata-fields/metadata-fields.test.tsx`、`src/features/metadata-fields/components/CustomDateDialog.test.tsx`_

- [ ] T94 在 `src/features/space/components/SpaceEditorDialog.tsx`、`src/features/view/components/ViewEditorDialog.tsx`、`ViewsPage.tsx` 与 `ViewActionsMenu.tsx` 迁移 Space/View 创建编辑、列表和操作菜单，保留 schema、URL、查询、保存错误、危险操作与导航。
  _对应验收标准：AC-1, AC-3, AC-34, AC-38, AC-39_
  _测试先行：`src/features/space/components/SpaceEditorDialog.test.tsx`、`src/features/view/components/ViewEditorDialog.test.tsx`、`src/features/view/components/ViewsPage.test.tsx`_

- [ ] T95 全仓确认 Project/Lifecycle 迁移后旧选择实现零消费者，再删除 `src/features/selection/components/EntityRowShortcutScope.tsx`、`src/features/selection/model/useEntitySelection.ts`、`src/features/selection/model/entitySelection.ts` 及其实现细节测试，并同步清理 `src/features/selection/index.ts`、`src/features/selection/model/index.ts` 的旧导出；只保留阶段 H collection state 与只读领域 snapshot。
  _对应验收标准：AC-2, AC-26, AC-34, AC-36_
  _测试先行：`src/features/selection/model/collectionState.test.ts`、`src/features/project/model/buildProjectCommandSelection.test.ts`、`src/features/lifecycle/model/buildLifecycleCommandSelection.test.ts`_

- [ ] T96 完成阶段 K 收口：依据 T3 清单复核 `src/routes/` 与未归属长尾表面，逐表面验证领域结果、错误、确认和 autosave，删除本阶段最后消费者归零的旧 primitive/pattern，运行根级门禁/build；获准提交时引用 PLAN 的阶段 K 文案。
  _对应验收标准：AC-1, AC-2, AC-3, AC-38, AC-39_

**阶段 L：Settings、Update、About、Changelog 与 Launcher**

- [ ] T97 在 `src/features/settings/components/SettingsPage.tsx`、`src/features/settings/components/settingsShared.tsx` 与 `src/features/settings/components/panels/` 完成设置内容和表单的 HeroUI hard cut，复用阶段 D 已迁移的 Settings Sidebar 容器，保留 route section、返回路径、偏好读写、错误与阶段 D/E 的 Sidebar/Detail 合同。
  _对应验收标准：AC-1, AC-3, AC-18, AC-38, AC-39_
  _测试先行：`src/features/settings/components/SettingsPage.test.tsx`、`src/features/settings/components/SettingsSidebar.test.tsx`、`src/features/settings/api/shellDevicePreferences.test.ts`_

- [ ] T98 在 `src/features/sync/components/SyncConfigDialog.tsx`、`src/features/sync/components/SyncFooterStatusItem.tsx` 与 `src/features/sync/model/syncStatusPresentation.ts` 完成同步配置、状态反馈与展示投影 HeroUI hard cut，保留凭据边界、连接、错误、重试和静态 ARIA。
  _对应验收标准：AC-1, AC-39, AC-41, AC-42, AC-43_
  _测试先行：新增 `src/features/sync/components/SyncConfigDialog.test.tsx`、现有 `src/features/sync/components/SyncFooterStatusItem.test.tsx`_

- [ ] T99 在 `src/features/update/components/UpdateDialog.tsx`、`src/features/update/components/UpdateSettingsSection.tsx`、`src/features/update/components/UpdateSettingsSection.presentation.tsx`、`src/features/update/components/UpdateProgressRing.tsx`、`src/features/update/components/SystemStatusChip.tsx`、`src/features/update/components/UpdateFooterChip.tsx` 与 `src/features/update/components/UpdateStatusFooterItem.tsx` 完成更新 Modal/Progress/全局状态反馈 HeroUI hard cut，保留检查、下载、安装、错误、重试、pending restart 和静态 ARIA。
  _对应验收标准：AC-1, AC-39, AC-41, AC-42, AC-43_
  _测试先行：`src/features/update/components/UpdateDialog.test.tsx`、`src/features/update/hooks/useManualUpdateCheck.test.tsx`、`src/features/update/hooks/useUpdateInstallActions.test.tsx`_

- [ ] T100 在 `src/features/app-info/components/AboutDialog.tsx`、`src/features/app-info/components/AppVersionFooterItem.tsx` 与 `src/features/changelog/` 完成 About/Changelog HeroUI hard cut，保留版本、外链、Markdown、release channel、加载/错误/空态与关闭恢复。
  _对应验收标准：AC-1, AC-30, AC-32, AC-38, AC-39_
  _测试先行：`src/features/app-info/components/AboutDialog.test.tsx`、`src/features/changelog/ChangelogDialog.test.tsx`、`src/features/changelog/ChangelogRelease.test.tsx`_

- [ ] T101 在 `src/features/launcher/LauncherPage.tsx`、`src/features/launcher/chrome/LauncherSurface.tsx`、`src/features/launcher/chrome/LauncherPanel.tsx`、`src/features/launcher/chrome/LauncherFooter.tsx` 与 `src/features/launcher/create/CreateRow.tsx` 迁移 Launcher 壳和创建行到共享 HeroUI theme/font，保留透明窗口、原生 geometry、session lifecycle 与即时显示，不写 Launcher 第一方动画。
  _对应验收标准：AC-6, AC-10, AC-38, AC-42, AC-43_
  _测试先行：`src/features/launcher/LauncherPage.test.tsx`_

- [ ] T102 在 `src/features/launcher/composer/TitleInput.tsx`、`src/features/launcher/composer/PrimaryMetaBar.tsx`、`src/features/launcher/composer/AdvancedMetaBar.tsx` 与 `src/features/launcher/composer/controls/` 完成输入、metadata 和动作 HeroUI hard cut，保留草稿、快捷键、IME、校验与提交。
  _对应验收标准：AC-1, AC-26, AC-29, AC-34, AC-39_
  _测试先行：`src/features/launcher/composer/controls/LauncherActionControls.test.tsx`、`src/features/launcher/LauncherPage.test.tsx`、`src/features/launcher/domain/launcherDomainReducer.test.ts`_

- [ ] T103 在 `src/features/launcher/results/LauncherResults.tsx`、`src/features/launcher/results/SectionLabel.tsx`、`src/features/launcher/results/EmptyHint.tsx`、`src/features/launcher/results/ContinuousToast.tsx`、`src/features/launcher/results/adapters/ProjectResultRowAdapter.tsx` 与 `src/features/launcher/results/adapters/TaskResultRowAdapter.tsx` 完成结果集合、分组标题、空态与结果反馈 HeroUI hard cut，复用阶段 H collection，保留搜索、recent、真实焦点、Enter 与窗口关闭结果。
  _对应验收标准：AC-1, AC-26, AC-29, AC-34, AC-39_
  _测试先行：`src/features/launcher/LauncherPage.test.tsx`、`src/features/launcher/model/interleaveResults.test.ts`_

- [ ] T104 在 `src-tauri/crates/runtime/src/window/launcher/`、`src-tauri/crates/platform/src/launcher_window/` 与 `src-tauri/capabilities/launcher.json` 验证迁移未改变 Launcher 唤起、隐藏、焦点、几何和 warmup；只修复 UI 迁移造成的回归，不修改 Rust 业务协议。
  _对应验收标准：AC-38, AC-39, AC-42, AC-43_
  _测试先行：`src/features/launcher/session/sessionReducer.test.ts`；运行 `bun run test:rust`_

- [ ] T105（任务发起人验收 U4）依据 T3 清单遍历主要路径、Settings、Sync、Update、About、Changelog、Launcher、空态、错误与危险操作，并在本文件记录“通过”或精确问题。
  - 执行者先提供 production build、固定路径、截图/录屏、动画扫描与已知差异；AI 不得代为勾选。
  _对应验收标准：AC-38, AC-39, AC-41, AC-42, AC-43_

- [ ] T106 完成阶段 L 收口：确认 U4 通过后运行根级前端门禁、`bun run test:rust` 与 production build，复核 Launcher/系统反馈无自写动画；获准提交时引用 PLAN 的阶段 L 文案。
  _对应验收标准：AC-38, AC-39, AC-41, AC-43_

**阶段 M：旧系统删除、macOS 验收与文档收口**

- [ ] T107 在 `scripts/check-heroui-only.ts`、`scripts/check-heroui-only.test.ts` 与 `package.json` 建立最终零引用/边界门禁，读取 `Documents/99-素材/03-验证/heroui-refactor/migration-inventory.json` 并覆盖 Radix、shadcn、cmdk、Sonner、react-day-picker、CVA、旧 import/class/token 内容、旧 `--sf-*` 与 feature 通用皮肤硬编码；本项先保证扫描器正反例测试通过，仓库级扫描在 T109 清理后必须转绿。
  - 不按 `*Adapter*`、`*token*` 文件名判定删除；Project/Lifecycle/Task/Launcher 的产品 adapter 与 metadata 图标装配可作为终态边界。allowlist 只含 SPEC 登记的虚拟几何、拖拽尺寸、Tauri 窗口、实体数据色和 runtime progress；domain/application 不得导入 HeroUI。
  _对应验收标准：AC-1, AC-2, AC-3, AC-4, AC-5_
  _测试先行：`scripts/check-heroui-only.test.ts`_

- [ ] T108 严格依据 `Documents/99-素材/03-验证/heroui-refactor/migration-inventory.json` 与 T107 内容扫描结果，在 `src/shared/components/base/`、`src/shared/components/patterns/`、`src/shared/components/row/`、`src/shared/components/detail/` 与 `src/styles/` 删除零消费者旧 primitive、纯样式中间层、dark scaffold、legacy token/adapter 和无消费者实现细节测试，使 `src/styles/` 只剩 PLAN 规定的五个全局 CSS 文件及更新后的 `ARCHITECTURE.md`。
  - 不整批删除各 feature 中已重建的产品 adapter、数据 token 或图标装配；只删除精确证明为旧皮肤且零消费的文件。
  _对应验收标准：AC-1, AC-2, AC-3, AC-5, AC-12_

- [ ] T109 在 `package.json` 与 `bun.lock` 删除 T108 清场后全仓零消费者的 Radix/shadcn/cmdk/Sonner/react-day-picker/CVA 及旧动画直接依赖，并验证 CollectUI Key、私有源码和 CDN 响应正文未进入仓库、lockfile、日志或产物，同时让 HeroUI-only 仓库级扫描转绿。
  - `tw-animate-css` 只允许锁定版 HeroUI 官方链路传入。
  _对应验收标准：AC-2, AC-40, AC-41_

- [ ] T110 在全新隔离目录以进程环境注入 `HEROUI_KEY`，执行固定版 `hpsetup`、frozen install、类型检查和 production build，并核对缓存恢复或源站取得产物的树 SHA-256；在本文件登记命令、锁定版本与脱敏结果，树哈希或构建失败时登记阻塞，不改 lockfile 掩盖安装器、Key 或 peer 问题。
  _对应验收标准：AC-2, AC-38, AC-40, AC-41_

- [ ] T111 在 T4 登记的 macOS WKWebView 设备完成 Rust 默认 `1280×900` inner window 可得到的实际稳定 viewport、窗口 `1024px` 两侧的 Sidebar 与详情容器、列表 `560px` 容器两侧与最小窗口的视觉、键盘、焦点、VoiceOver 和 reduced-motion 验收，证据写入 `Documents/99-素材/03-验证/heroui-refactor/macos/`。
  _对应验收标准：AC-8, AC-11, AC-32, AC-44_

- [ ] T112 确认 Windows WebView2 不在本任务验收范围：复核现有 Windows 构建入口、Tauri 平台分支与产品支持未因迁移被删除，同时不得为未实测的 Windows 行为新增专门兼容层；本任务不采集 Windows 证据、不以 Windows 设备为阻塞，也不得宣称 Windows 已验证。
  _对应验收边界：SPEC「不做什么」第 11 项；本项不构成 Windows 验收证据_

- [ ] T113 使用 `src/routes/debug.task-board.tsx` 与 T5 fixture，在 T6 登记的同一台 macOS WKWebView、同一实际稳定 viewport 上复跑最终性能，比较 macOS 基线并验证 p95、mounted rows、mount/unmount、重复 fetch、挂载风暴、100 次键盘移动与 PLAN 回归预算，结果写入 `Documents/99-素材/03-验证/heroui-refactor/task-board-performance-final.json`。
  _对应验收标准：AC-33, AC-35, AC-37_

- [ ] T114 将已落地的 HeroUI-only 技术栈、Pro 供应链与全局界面合同同步到 `Documents/01-架构/A2-系统设计.md` 与 `Documents/01-架构/A3-界面系统.md`，只描述当前事实。
  _对应验收标准：AC-1, AC-4, AC-7, AC-38_

- [ ] T115 将五文件样式架构、HeroUI semantic theme、集中 recipe 与产品例外同步到 `src/styles/ARCHITECTURE.md` 与 `src/ARCHITECTURE.md`，删除旧 token/adapter 与 wrapper 边界陈述。
  _对应验收标准：AC-1, AC-2, AC-4, AC-7, AC-38_

- [ ] T116 将单一 collection、Command 投影与 ActionBar snapshot 边界同步到 `src/features/selection/ARCHITECTURE.md`、`src/features/command/ARCHITECTURE.md` 与 `src/features/bulk-action/ARCHITECTURE.md`，删除旧 keyboard-hover、重复 selection 与 cmdk 陈述。
  _对应验收标准：AC-2, AC-31, AC-34, AC-38_

- [ ] T117 将 Sidebar/Detail Shell 与 TaskBoard virtual bridge 的最终边界同步到 `src/layout/ARCHITECTURE.md`、新建的 `src/layout/DESIGN.md`、`src/features/entity-detail/ARCHITECTURE.md`、`src/features/task/ARCHITECTURE.md` 与新建的 `src/features/task/DESIGN.md`，删除旧 Radix Drawer、双焦点、窗口断点详情分流与自写动画陈述。
  _对应验收标准：AC-2, AC-21, AC-33, AC-34, AC-38_

- [ ] T118 将偏好、系统反馈与 Launcher 最终边界同步到 `src/features/settings/ARCHITECTURE.md`、`src/features/update/ARCHITECTURE.md` 与 `src/features/launcher/ARCHITECTURE.md`，不扩大到未改变的领域或 Rust 协议。
  _对应验收标准：AC-18, AC-38, AC-39, AC-41, AC-43_

- [ ] T119（任务发起人验收 U5）审阅 macOS 关键截图、录屏与 T113 性能报告，并在 T4 登记的 macOS 主设备完成端到端走查；必须同时通过 HeroUI-only、浅色视觉、键盘合同、第一方零动画、reduced-motion 与性能预算，且不得把结论扩张为 Windows 已验证。
  - 在本文件记录“通过”或精确问题；AI 不得代为勾选。
  _对应验收标准：AC-1, AC-11, AC-37, AC-41, AC-44_

- [ ] T120 完成阶段 M 收口：在 U5 通过后逐条核对 Definition of Done 与全部验收标准，在本文件完成记录留下证据；运行根级 `bun run typecheck`、`bun run lint`、`bun run lint:boundaries`、`bun run format:check`、`bun run test:run`、`bun run build`、`bun run test:rust` 与两项 UI 扫描，再归档并更新 `Documents/_INDEX.md`。
  - 未解决事项先转成独立后续任务，再将目录移至 `Documents/98-归档/02-已完成重构/2026-08-12-heroui-ui-interaction-system-refactor/` 并冻结 SPEC/PLAN/TASKS；获准提交时引用 PLAN 的阶段 M 文案，不自动提交。
  _对应验收标准：AC-1, AC-2, AC-38, AC-40, AC-41_

## 阻塞

- 当前阶段没有外部设备阻塞；Windows WebView2 不属于本任务验收范围。
- 已知与 HeroUI 重构无关的失败：根级 `bun run check` 的最后 Rust 阶段稳定失败于未改动的 `commands::spaces::tests::deleting_trashed_space_again_should_not_enqueue_another_operation` 文案断言；动画扫描、TypeScript、lint、模块边界、格式、1009 项前端测试、146 项 release 测试与 production build 均通过。该失败不阻塞已完成的阶段 D–F，但必须在 T120 最终收口前另行解决。
- T73、T105、T119 是尚未执行的人工 Gate，不在失败前视为阻塞。

## 与 SPEC/PLAN 的实施偏差

- 2026-08-13：任务发起人要求终态完全切到 HeroUI OSS/Pro，允许删除旧样式并从零重建；已同步到新版 SPEC/PLAN，旧版“保留 StoneFlow token 为视觉真相源”的方向作废。
- 2026-08-13：任务发起人确认 Linear 浅色方向、Sidebar 宽栏/窄栏/小窗隐藏三态、桌面任务详情 Sheet/Aside 与 Inter Variable；已同步到新版 SPEC/PLAN。
- 2026-08-13：任务发起人要求删除 Tailwind 动画库与所有 StoneFlow 自写动画，随后明确保留 HeroUI OSS/Pro 官方动效；已同步为“HeroUI 官方动效唯一来源、StoneFlow 第一方零动画”。
- 2026-08-13：任务发起人确认新版 SPEC 与 PLAN，授权进入阶段 3 拆分 TASKS；当前没有未决方案偏差。
- 2026-08-13：任务发起人选择其自建 CollectUI `hpsetup` 工作流并明确接受供应链风险；ADR、SPEC、PLAN 与本 TASKS 已统一为固定安装器/组件版本、进程环境注入 Key、隔离 smoke 和树 SHA-256 合同，不声称 HeroUI 官方授权已验证。
- 2026-08-13：任务发起人确认本任务只做 macOS WKWebView 验收；Windows 构建、平台分支与产品支持保留，但不采集、不阻塞、不宣称 Windows 已验证，也不为未实测行为新增专门兼容层。性能合同同步为同一 Mac、同一实际稳定 viewport 前后比较。
- 2026-08-13：T8 的干净环境首次暴露旧 `src/shared/components/base/command.tsx` 直接 import `cmdk` 却未声明根依赖；阶段 J 才删除该消费者，因此本阶段精确直锁 `cmdk@1.1.1`，不靠传递依赖，仍由 T82 在旧 Command hard cut 后删除。
- 2026-08-14：任务发起人确认源站无缓存下载是否成功与产品实现无关，接受固定版本缓存恢复作为当前供应链边界。T8 以已记录的 546 文件树 SHA-256、隔离 frozen install、typecheck 和 production build 为完成证据；仍保留源站与缓存同时不可用会阻断新环境安装的已知风险。
- 2026-08-14：阶段 C 根级检查暴露一个与 UI 重构无关、在未改动 Rust 文件中可单独复现的 Space 删除错误文案断言失败；未将其混入 HeroUI 重构修改，登记为 T120 前必须处理的仓库既有失败。
- 2026-08-14：阶段 E 的已连接 trigger 使用真实 DOM ref 恢复，trigger 卸载时回退到打开时捕获的 collection root；虚拟行离屏后重挂载并恢复当前实体行，仍按 PLAN 由阶段 H/I 的 stable key/ref bridge 完成，本阶段不新增 querySelector 兼容桥。
- 2026-08-16：任务发起人确认最终合同：列表打开只写 `?task=`；窗口 `<1024px` 始终使用 HeroUI Sheet，`>=1024px` 始终使用 Aside；跨断点只换容器，不改 URL、不关闭、不跳页。Sidebar 同用 `1024px` 产品边界但 owner 独立；列表最小 `352px`，Aside 最小/默认/最大为 `320/360/440px`，任务列表只保留 `<560px` 一档容器自适应；完整页仅显式打开。T43 据此再次重开。

## 完成记录

- 2026-08-12：完成代码、文档、HeroUI Skills/MCP 与 Sidebar 能力只读审计；写入阶段 1 SPEC。
- 2026-08-13：因终态目标扩大，作废旧版 SPEC/PLAN 并完成 Linear 官方样式边界、HeroUI 能力与 StoneFlow 样式债务复审。
- 2026-08-13：完成新版 SPEC、色板可访问性校准与用户截图方向复核；新版 SPEC 获确认。
- 2026-08-13：完成 HeroUI 官方能力、Sidebar 组合限制、集合状态、样式架构与动画来源压力审查；新版 PLAN 获确认。
- 2026-08-13：按《任务方案编写 SOP》完成 13 阶段、120 个 flat tasks、1 个供应链访问 Gate、5 个人工 Gate 与逐阶段收口拆分，进入阶段 3，尚未实施产品代码。
- 2026-08-13：完成 T1。新增 ADR-0002，固化 HeroUI-only、Tailwind/HeroUI theme、产品例外、第一方零动画与 CollectUI 固定供应链决策。
- 2026-08-13：完成 T2/U0。首轮位置参数诊断不计入验收；随后在新的仓库外临时目录以 `HEROUI_KEY` 进程环境变量重跑成功，记录 547 个文件、2,593,321 bytes、70 个 exports、30 个 peers 与当前 installed tree SHA-256。该缓存 smoke 只证明固定产物可取得；T8/T110 另以树 SHA-256、隔离 frozen install/typecheck/build 验收。
- 2026-08-13：完成 T3。首轮清单 213 条；T6 新增后又补入 7 个 benchmark route/page/access/fixture 条目，并统一交由 T113 在最终同合同比较后删除，当前共 220 条。
- 2026-08-13：完成 T5。两份确定性 TaskBoard fixture 及定向测试通过，覆盖 `2,000/20×100` 与 `200/10,000` 合同。
- 2026-08-13：完成 T4。现有 9 份有效 macOS 迁移前截图覆盖主壳/Sidebar、TaskBoard 稀疏/密集、Command、两张 ContextMenu、任务详情、Settings/Update 与 Launcher；迁移前证据不再承担终态精确视口验收。
- 2026-08-13：T6 首轮实现新增仅允许 production + Tauri + 显式构建开关访问的测量入口；审计发现固定 timer 步进使所谓 5 秒窗口实测约 7.1 秒，已改为基于 `performance.now()` 的截止时基，旧样本只保留为无效诊断且必须重跑。Windows 已移出本任务验收范围，T6 仍因修正版 macOS 真机基线未采集而保持未完成。
- 2026-08-13：曾加入 `1440×900` 精确视口拒绝门；后续合同已改为 Rust 默认 inner `1280×900`、记录系统压缩后的实际 viewport，并在同一 Mac、同一实际 viewport 前后比较，因此该拒绝门必须在 T6 真机重跑前移除。首轮观察到的实际内容视口为 `1249×853`，只作设备记录，不是固定拒绝条件。
- 2026-08-13：阶段性工程门禁通过：6 个定向 Vitest、typecheck、lint、feature boundaries、format check 与 production Vite build；凭据/私有 CDN 模式扫描零命中。未提交、未改动 Git 暂存区。
- 2026-08-13：完成 T6。移除精确 viewport 拒绝门后，以 commit `d545b99e0609f7e9213ac315e967510308794b34` 的 production Tauri bundle 在登记的 Mac 上重跑；实际 viewport 为 `1280×853@2x`。两份 fixture 各完成 5 次滚动和 50 次焦点采样，重复 fetch 均为 0；焦点恢复仅成功 `1/50` 与 `3/50`，作为旧交互实现的真实基线保留。
- 2026-08-13：完成 T7。ADR、220 条迁移清单、供应链 smoke、9 份视觉证据和 macOS 性能报告均已复核；定向 Vitest 6/6、typecheck、lint、feature boundaries、format check、production Vite build、JSON 解析与 `git diff --check` 通过，凭据/私有 CDN 模式扫描零命中。Tauri 已生成并运行 production app bundle；本地 updater 签名阶段因未提供私钥退出，不影响本次已生成 bundle 的基线采集。未提交、未改动 Git 暂存区。
- 2026-08-13：完成 T9–T13。建立 Tailwind → HeroUI OSS → HeroUI Pro 官方入口、light-only semantic theme、集中 BEM/data-state recipe、本地 Inter Variable/OFL、HTML/React/Rust 首帧同步检查和新版交互原型；旧字体引用归零并删除。迁移期旧 Tailwind 颜色 utility 已机械改名为 `legacy-*`，构建产物验证 HeroUI 官方 `--color-*` 与旧 `--sf-*` 不再互相覆盖。根级 typecheck、lint、边界、format check、967 项测试、同步测试、production build 与原型结构/脚本检查通过，凭据模式扫描零命中；T14/U1 等待任务发起人验收。
- 2026-08-14：完成 T14/U1。任务发起人确认此前已审阅相同的 Linear 浅色方向与原型，本轮无新增视觉偏差，按已确认结果通过字形、色值层级、紧凑密度及组件状态验收。
- 2026-08-14：完成 T8、T15与阶段 B 收口。任务发起人批准固定版本缓存恢复边界；依赖树哈希、隔离 frozen install/typecheck/build、根级 typecheck、lint、边界、format、967 项测试、production build、主题边界与零凭据扫描均通过。建议 commit 文案：`refactor(ui): 建立 HeroUI 浅色主题与字体基础`；未提交、未改动 Git 暂存区。
- 2026-08-14：完成 T16–T30 与阶段 C 收口。全仓第一方动画扫描转绿并接入根级 `check`；删除 StoneFlow 的 transition/animation/spin/pulse/active scale、旧 motion token、Sidebar 动画 workaround 及 `tw-animate-css` 直接依赖，只保留 HeroUI `@heroui/styles@3.2.4 -> tw-animate-css@1.4.0` 传递链。Modal、Popover、Tooltip、Sheet、Sidebar、Toast、Progress 锁版 probe 3/3、扫描器 2/2、970 项前端测试、146 项 release 测试及 production build 通过；保留的 rAF 仅用于 Sidebar/Scrollbar/TaskBoard 几何批处理与输入焦点调度，静态 transform 只承担虚拟化、居中和 off-canvas 几何。建议 commit 文案：`refactor(ui): 清除 StoneFlow 第一方动画代码`；未提交、未改动 Git 暂存区。
- 2026-08-14：完成 T31–T38 与阶段 D 收口。Shell 以单一 controller 管理 expanded/icon/compact、`1024px` 断点、Sheet 和 live/committed width；HeroUI Sidebar/ContextMenu/Tooltip/Dropdown 接管导航与 Header 标准控件，唯一产品 separator 负责点按、拖动和键盘调宽。删除旧 Sidebar facade/context/pattern，Inset 主面由唯一 `Sidebar.Main` 提供，compact Sheet 复用同一导航树且显式覆盖 HeroUI 内建 `768px` 隐藏规则；冷启动骨架与设备偏好同步。严格审查发现并修复实际 Sidebar 被锁回 `240px`、`≤768px` Sheet 导航隐藏、`500–639px` 缺少可点击入口和 Sheet 无显式关闭按钮四项问题。根级 typecheck、lint、模块边界、format check、第一方动画扫描、978 项前端测试、146 项 release 测试和 production build 通过；`test:rust` 仍仅有已登记的 Space 文案断言失败。建议 commit 文案：`refactor(shell): 重建 HeroUI 侧边栏三态`；未提交、未改动 Git 暂存区。
- 2026-08-14：完成 T39–T44 的首轮详情容器与自动化预检，建立单一 view model/content、taskId 级滚动快照、焦点恢复和 Back 基础；当时的呈现方案后续已被取代，自动化、根级门禁和 production build 结果只保留为基础能力历史证据。
- 2026-08-14：U2 首轮问题已按根因修正：恢复 HeroUI Sidebar 实际宽度与 icon 居中，并让 icon 模式彻底移除项目区占位；导航 Sheet 避让 macOS traffic lights 并删除冲突关闭按钮；呈现偏好移入通用设置，dirty 草稿不再被同任务刷新覆盖；详情 Sheet 以透明模态 Backdrop 真正 portal 到 Main card，模态期间侧栏按钮与 `[` 均不穿透。定向回归、typecheck、lint 与模块边界通过，等待真实 Tauri 复验。
- 2026-08-15：阶段 E 曾完成详情容器、草稿/autosave、路由、scroll 与焦点基础，并通过当时合同下的聚焦测试、全量前端测试、typecheck、lint、模块边界、格式、动画扫描与 production build。U2 后续发现任务列表缺少最小宽度，任务发起人确认当前最终合同并重开 T43；之前的自动化结果只作基础能力证据，不代表重开项已完成。
- 2026-08-15：旧 T43 容器分流实现曾通过当时合同下的聚焦测试、全量前端测试、typecheck、lint、模块边界、格式和 production build；该设计已被 2026-08-16 最终合同取代，不代表重开后的 T43 已完成。
- 2026-08-16：完成重开的 T43。Shell controller 只派生一份 `isCompact`；窗口 `<1024px` 使用 MainCard 内 HeroUI opaque Sheet，`>=1024px` 使用列表最小 `352px`、Aside `320/360/440px` 的 HeroUI Pro Resizable。跨断点保留同一 `?task=`、view model、草稿与滚动；TaskBoard 只用一条 `<560px` CSS container query 隐藏尾部元数据。旧 MainCard 宽度观测、自动完整页导航、preflight 与 history 特例已删除；窄窗导航 Sheet 与任务 Sheet 互斥。55 项聚焦测试、190 个文件共 1003 项前端测试、typecheck、lint、模块边界、格式、第一方动画扫描与 production build 均通过；T45/U2 仍待真实 Tauri 验收。建议 commit 文案：`refactor(task): 统一任务详情的 Sheet 与 Aside 响应式容器`；未提交、未改动 Git 暂存区。
- 2026-08-17：完成 T45/U2。任务发起人在真实 Tauri 中完成阶段 E 连续复验并确认通过；最终保留单一 `1024px` 边界、宽窗 Resizable Aside、窄窗 MainCard 内 Card Sheet、单一详情 view model、任务列表单档容器自适应及显式完整页入口。
- 2026-08-17：完成 T46 与阶段 E 收口。详情/Sidebar 聚焦测试 11 个文件共 69 项、全量前端 190 个文件共 1003 项、release 146 项、第一方动画扫描、typecheck、lint、模块边界、格式与 production build 均通过；`test:rust` 仅复现已登记且与本阶段无关的 Space 回收站文案断言失败，继续由 T120 收口。阶段 E 建议 commit 文案：`refactor(task): 收敛任务详情 Aside 与 Sheet`；本次只更新任务记录，不自动提交。
- 2026-08-17：完成 T47–T50 与阶段 F 收口。Activity Debug 和根/壳路由反馈直接切到 HeroUI 表单、Button、Link、EmptyState 与反馈组件；ShortcutTokens/MainCard 保留产品语义并直接组合 HeroUI Kbd/Button；普通 MainCard/Detail 使用 ScrollShadow，TaskBoard 三条页面路径通过显式 `PageFrame.VirtualizedBody` 继续拥有唯一 AppScrollArea viewport。`Sidebar.Content` 已由 HeroUI 提供 ScrollShadow，验证后不再嵌套第二层。删除零消费者的 Activity Debug/MainCard pattern、ShortcutMenuItemHint 与旧 Kbd primitive；AppScrollArea/OverlayScrollbar 因真实消费者继续保留。全量前端 191 个文件共 1009 项、release 146 项、第一方动画扫描、typecheck、lint、模块边界、格式与 production build 均通过；`test:rust` 仅复现已登记的 Space 回收站文案断言失败。阶段 F 建议 commit 文案：`refactor(ui): 迁移 HeroUI 标准控件与表单`；未提交、未改动 Git 暂存区。
