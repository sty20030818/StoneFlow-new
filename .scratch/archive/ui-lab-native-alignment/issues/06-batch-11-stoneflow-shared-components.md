# 06 — 建立第十一批 StoneFlow 共享产品组件审查面

**What to build:** 使用真实公开产品组件和轻量 fixture 建立第十一批，展示 StoneFlow 共享产品合同、上游原料和 Owner；没有一对一上游等价物的产品组件不被强行包装或替换。

**Blocked by:** 03 — 跑通 Upstream、Token 与 Current 的隔离对照。

**Status:** complete — 7/7 reviewable units confirmed, 3 external

**Primary write scope:** 新增一个第十一批 sample/fixture 模块、catalog 注册入口和必要的根级测试；初始建面不为 Lab 修改生产公共面，用户审查后只在真实所有者修正 AppBreadcrumb、SpaceEditorDialog、Tooltip 空原因和 RowShell 共享状态 recipe，不新增 props、导出或第二套组件。

- [x] 第十一批包含十个 review unit：PageFrame；Tooltip family；AppBreadcrumb；ShellSidebar/SidebarNavRow；RowShell；AppScrollArea；SettingsToggleRow；GlobalSearchResults；Task Detail 公共组件；Space Editor 组件。
- [x] 所有单元列出定义路径、真实消费者、组合父项与上游原料；`Product` Owner 不因使用 HeroUI 原料而被误标为替换候选。
- [x] PageFrame 使用真实 Root、Header、Toolbar、Body/VirtualizedBody，覆盖标题、Breadcrumb、Actions、Filter、长中文和窄宽组合。
- [x] Tooltip family 覆盖 ActionTooltip、DisabledActionTooltip、OverflowTooltip 的真实触发、快捷键、禁用原因和溢出合同，不复制 Trigger 合并逻辑。
- [x] AppBreadcrumb 使用最小 Router fixture 覆盖祖先、当前项、截断和 `aria-current`；ShellSidebar/SidebarNavRow 保留既有组合覆盖并把真实窗口状态转交应用验收。
- [x] RowShell 使用真实组件覆盖 active、selected、hover source、pending、连续选择位置和尾部动作，不复制行状态机。
- [x] AppScrollArea 使用真实 viewport contract，只验证滚动、sticky/长内容边界，不搭建第二个虚拟数据平台。
- [x] SettingsToggleRow 与 GlobalSearchResults 保持组合覆盖，分别关联 CellSwitch 与 ListView；不为 Lab 深导入私有组件或复制 JSX。
- [x] Task Detail 与 Space Editor 仅在公开接口可轻量组合时渲染；需要 Autosave、Query、Submit Registry、Tauri 或新公开 API 的部分标为组合覆盖或 `real-app-only`。
- [x] 不能为 Lab 深导入 Feature 私有实现、复制生产 JSX、伪造大量 Router/Store/Tauri runtime，或新增 facade/wrapper。
- [x] 初始建面保持生产实现不变；用户审查后只实施本批暴露的 Breadcrumb、Tooltip、RowShell、AppScrollArea 证据与 Space Editor 间距修复，不改依赖、数据或公共导出。

实现与人工复审均已完成；七个可见单元标为 `done`。三个未渲染单元继续标为 `external`，不伪装为已审查。

## 人工审查进展

- [x] PageFrame：Current 可接受。
- [x] Tooltip family：禁用按钮不再显示“请至少选择一个”的提示。
- [x] AppBreadcrumb：当前任务右侧内容不再遮挡。
- [x] RowShell：选中 `#e8e8f4`、单独 hover `#efeff0`、selected + hover `#dedeea` 已恢复并通过复审。
- [x] AppScrollArea：预览已能区分 viewport、sticky header 与滚动内容边界。
- [x] Task Detail：当前只展示 Empty，用户确认该边界可接受。
- [x] Space Editor：下方产品选项已恢复垂直间距。
- `external`：ShellSidebar/SidebarNavRow、SettingsToggleRow、GlobalSearchResults 未渲染，按用户要求不进行视觉审查。

## Verification

- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx src/shared/components/AppBreadcrumb.test.tsx src/shared/components/tooltip/Tooltip.test.tsx src/features/space/components/SpaceEditorDialog.test.tsx src/shared/components/row/RowShell.test.tsx`
- `bun test scripts/check-row-shell-state-styles.test.ts`
- `bun run test:scripts`
- `bun typecheck`
- `bun lint`
- `bun run lint:boundaries`
- `bun format:check`
- `bun run build`
- `git diff --check`
- `git diff --cached --check`

## Implementation evidence

- 七个单元直接渲染生产公开组件；`ShellSidebar/SidebarNavRow` 为 `real-app-only`，`SettingsToggleRow` 与 `GlobalSearchResults` 为 `covered-in-composition`，没有扩生产 public API。目录状态同步为 7 个 `done` 与 3 个 `external`。
- Tooltip 的禁用样例保留动作名与快捷键但不伪造原因；AppBreadcrumb 让中间长祖先先收缩、长 current 在必要时继续收缩；AppScrollArea 样例明确展示真实 viewport、sticky header 与滚动层次；SpaceEditorDialog 只在两个产品选项分组前恢复 16px 纵向间距，不接管 HeroUI 内部槽位。
- RowShell 的普通 hover、selected 与 selected + hover 由固定语义 token 分别持有，并补齐非 interactive 静态 fixture 的 `data-selected + data-hovered` 组合；不再借用随 Accent 改变的 soft 色。
- Catalog 现在从关联产品登记派生并合并定义路径、消费者、组合父项和真实上游原料；`SettingsToggleRow` 显式收窄为直接原料 `CellSwitch`，不再继承同文件兄弟组件的 Card/Surface。
- 聚焦 DOM 测试 5 files / 39 tests、RowShell 样式合同测试 1/1、根级 scripts 测试 19 files / 168 tests 均通过；`bun typecheck`、`bun lint`、`bun run lint:boundaries`、`bun format:check`、`bun run build`、`git diff --check` 与 `git diff --cached --check` 通过，lint 与构建仅保留任务外既有 warnings。
- 浏览器在 400px 窄宽下实测 Breadcrumb 根容器右边界 288px、长 current 右边界 286px、overflow 0px，中间祖先先截断且 current 在必要时继续收缩；AppScrollArea viewport 238px、scrollHeight 585px；Space Editor 三个产品分组的两处相邻间距均为 16px。生产构建仍只有 `index.html` 与 `launcher.html`；未修改依赖、锁文件或公共导出。用户已确认第十一批可见单元无问题。
