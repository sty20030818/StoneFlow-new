# 03 — 统一导航与 Shell 状态

**What to build:** 将 Breadcrumb、Sidebar、Command 与 Settings Navigation 的真实生产消费者对齐到已确认的圆角 Ghost、36px 导航密度、中性三态和叶子 Focus-visible，同时保留现有路由、导航数据、快捷键与 HeroUI 键盘行为。

**Blocked by:** 01 — 收敛共享主题与 HeroUI Recipe。

**Status:** completed

**Primary write scope:** `src/shared/components/AppBreadcrumb.tsx`、`src/layout/ShellSidebar.tsx`、`src/layout/sidebar/SidebarNavRow.tsx`、`src/features/settings/components/SettingsSidebar.tsx`、`src/features/settings/components/SettingsPage.tsx`、`src/features/command/components/CommandMenu.tsx`、`src/features/command/components/CommandMenuListPrimitives.tsx`、`src/shared/components/page-frame/PageFrame.tsx` 及其现有测试。

- [x] 修正 `src/shared/components/AppBreadcrumb.tsx` 仍固定 `h-5` 的祖先项，使其使用 28px 圆角填充式 Ghost；Rest 无整条灰底，Hover 无蓝色或下划线。当前项只保留 `aria-current='page'`，不得使用无 `href` 的 `role='link'` 或进入 Tab 序。
- [x] 将 `src/features/settings/components/SettingsPage.tsx` 直接组合的另一套 `Breadcrumbs` hard cut 到共享 `AppBreadcrumb`，并审计 Task、Project、Lifecycle、Views 等现有调用方不再需要页面级视觉补丁。
- [x] 审计 `src/layout/ShellSidebar.tsx`、`src/layout/sidebar/SidebarNavRow.tsx` 与相关 Shell 组合；导航行统一 36px，并正确区分 Rest、Hover、Current、Current-hover、Disabled 与 Focus-visible，Hover 必须可感知，键盘焦点不得出现直角框或白角。
- [x] 审计 `src/shared/components/page-frame/PageFrame.tsx`、`src/features/command/components/CommandMenu.tsx`、`src/features/command/components/CommandMenuListPrimitives.tsx` 与 `src/features/settings/components/SettingsSidebar.tsx` 的复合焦点；真实叶子拥有 Focus-visible，Command/Settings Navigation 在 Tab 或 Escape 后不得给祖先留下双框。
- [x] 保持 `src/app/navigation/breadcrumb.ts`、Router、Shell controller、导航数据、方向键与快捷键合同不变；不新增 Breadcrumb/Sidebar facade，不让导航模型持有视觉规则。
- [x] 迁移全部真实消费者后删除局部导航 skin、旧链接态、祖先 ring 和零消费者兼容出口；本 ticket 不修改共享 CSS，若 Ticket 01 recipe 不足则先回到 Ticket 01 串行处理。
- [x] 当前没有生产 Tabs 消费者，不为 Lab 样例新增实现；只回归扫描 Ticket 01 的共享 Focus recipe，不创建 Tabs 平台或页面 fixture。
- [x] 在 `src/shared/components/AppBreadcrumb.test.tsx` 补充“只有祖先可聚焦、当前项不是 link”，并通过 `src/app/navigation/breadcrumb.test.ts`、`src/layout/ShellSidebar.test.tsx`、`src/layout/sidebar/SidebarNavRow.test.tsx`、`src/features/settings/components/SettingsSidebar.test.tsx`、`src/features/command/components/CommandMenu.test.tsx`、`src/shared/components/page-frame/PageFrame.test.tsx` 及 `src/layout/ShellHeader.test.tsx` 覆盖 Pointer、Keyboard、Current、Disabled 与焦点恢复；运行 `bun typecheck`、`bun lint`、`bun run lint:boundaries` 与 `git diff --check`，不修改共享 CSS。

## Evidence

- `AppBreadcrumb` 删除局部 `h-5` 与假 link 语义；祖先仍由 TanStack Router `Link` 导航，当前项只保留 `aria-current='page'`。Settings 页删除平行 `Breadcrumbs` 组合并复用该公共路径。
- `ShellSidebar` / `SidebarNavRow` 已直接使用 HeroUI Pro Sidebar 的 36px 原生密度与 Ticket 01 共享三态；`Command` / `SettingsSidebar` / `PageFrame` 无局部 ring、outline 或页面级 skin，因此保持上游焦点与键盘状态机不变。
- 自动化：Unit 1 个文件 / 7 个用例，DOM 8 个文件 / 63 个用例通过；`bun typecheck`、`bun lint`（仅既有 warning）、`bun run lint:boundaries`、定向 `oxfmt --check` 与 `git diff --check` 通过。
- 未验证：本 Ticket 未启动新服务或浏览器；Main / Tauri / WebView 中的最终视觉与真实焦点恢复继续由统一产品验收工作包所有。
