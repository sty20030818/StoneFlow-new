# 06 — 建立第十一批 StoneFlow 共享产品组件审查面

**What to build:** 使用真实公开产品组件和轻量 fixture 建立第十一批，展示 StoneFlow 共享产品合同、上游原料和 Owner；没有一对一上游等价物的产品组件不被强行包装或替换。

**Blocked by:** 03 — 跑通 Upstream、Token 与 Current 的隔离对照。

**Status:** planned

**Primary write scope:** 新增一个第十一批 sample/fixture 模块、catalog 注册入口和必要的根级测试；生产公开组件只作为 import 来源，不为 Lab 修改其 props、导出或公共合同。

- [ ] 第十一批包含十个 review unit：PageFrame；Tooltip family；AppBreadcrumb；ShellSidebar/SidebarNavRow；RowShell；AppScrollArea；SettingsToggleRow；GlobalSearchResults；Task Detail 公共组件；Space Editor 组件。
- [ ] 所有单元列出定义路径、真实消费者、组合父项与上游原料；`Product` Owner 不因使用 HeroUI 原料而被误标为替换候选。
- [ ] PageFrame 使用真实 Root、Header、Toolbar、Body/VirtualizedBody，覆盖标题、Breadcrumb、Actions、Filter、长中文和窄宽组合。
- [ ] Tooltip family 覆盖 ActionTooltip、DisabledActionTooltip、OverflowTooltip 的真实触发、快捷键、禁用原因和溢出合同，不复制 Trigger 合并逻辑。
- [ ] AppBreadcrumb 使用最小 Router fixture 覆盖祖先、当前项、截断和 `aria-current`；ShellSidebar/SidebarNavRow 覆盖密度、hover/current/disabled 与长项目名。
- [ ] RowShell 使用真实组件覆盖 active、selected、hover source、pending、连续选择位置和尾部动作，不复制行状态机。
- [ ] AppScrollArea 使用真实 viewport contract，只验证滚动、sticky/长内容边界，不搭建第二个虚拟数据平台。
- [ ] SettingsToggleRow 与 GlobalSearchResults 使用无副作用受控 fixture，分别保留 CellSwitch 与 ListView 的上游语义。
- [ ] Task Detail 与 Space Editor 仅在公开接口可轻量组合时渲染；需要 Autosave、Query、Submit Registry、Tauri 或新公开 API 的部分标为组合覆盖或 `real-app-only`。
- [ ] 不能为 Lab 深导入 Feature 私有实现、复制生产 JSX、伪造大量 Router/Store/Tauri runtime，或新增 facade/wrapper。
- [ ] Current 视觉、生产实现及第一至八批结论均保持不变；第十一批进入待人工审查状态。

## Verification

- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx`
- 对新增的非平凡受控 fixture 留一个最小聚焦交互测试
- `bun typecheck`
- `bun lint`
- `bun run lint:boundaries`
- `bun format:check`
- `git diff --check`
