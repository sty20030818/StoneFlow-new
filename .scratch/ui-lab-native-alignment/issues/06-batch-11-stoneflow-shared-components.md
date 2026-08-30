# 06 — 建立第十一批 StoneFlow 共享产品组件审查面

**What to build:** 使用真实公开产品组件和轻量 fixture 建立第十一批，展示 StoneFlow 共享产品合同、上游原料和 Owner；没有一对一上游等价物的产品组件不被强行包装或替换。

**Blocked by:** 03 — 跑通 Upstream、Token 与 Current 的隔离对照。

**Status:** implemented — pending manual review

**Primary write scope:** 新增一个第十一批 sample/fixture 模块、catalog 注册入口和必要的根级测试；生产公开组件只作为 import 来源，不为 Lab 修改其 props、导出或公共合同。

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
- [x] Current 视觉、生产实现及第一至八批结论均保持不变；第十一批进入待人工审查状态。

实现已完成；第十一批目录状态保持 `pending`，等待用户逐项人工确认。

## Verification

- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx`
- 对新增的非平凡受控 fixture 留一个最小聚焦交互测试
- `bun typecheck`
- `bun lint`
- `bun run lint:boundaries`
- `bun format:check`
- `git diff --check`

## Implementation evidence

- 七个单元直接渲染生产公开组件；`ShellSidebar/SidebarNavRow` 为 `real-app-only`，`SettingsToggleRow` 与 `GlobalSearchResults` 为 `covered-in-composition`，没有扩生产 public API。
- Catalog 现在从关联产品登记派生并合并定义路径、消费者、组合父项和真实上游原料；`SettingsToggleRow` 显式收窄为直接原料 `CellSwitch`，不再继承同文件兄弟组件的 Card/Surface。
- 聚焦 DOM 测试 1 file / 10 tests 通过，包含真实 `SpaceEditorDialog` 打开、校验、提交和关闭；`bun typecheck`、`bun lint`、`bun run lint:boundaries`、`bun format:check`、`bun run build` 与 `git diff --check` 通过，lint 仅保留任务外既有 warnings。
- 生产构建仍只有 `index.html` 与 `launcher.html`；未修改生产组件、样式、依赖或锁文件。第十一批视觉结论仍待用户人工审查。
