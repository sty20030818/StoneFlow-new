# 01 — 收敛共享主题与 HeroUI Recipe

**What to build:** 以八批 UI Lab 已确认目标为输入，审计生产主题和 HeroUI 共享 recipe，在 `theme.css` 与 `components.css` 两个既有 Owner 中一次性收敛后续切片需要的语义值、几何和交互状态；一致项保持不动，偏离项 hard cut，不把 Lab class 复制进产品。

**Blocked by:** 无。

**Status:** completed

**Primary write scope:** `src/styles/theme.css`、`src/styles/components.css`、`src/ui-lab/uiLab.css`，以及证明这些边界所需的现有检查脚本与测试；不修改产品 JSX、路由、业务状态或 HeroUI/React Aria 状态机。

- [x] 对照 `.scratch/archive/ui-lab-review/spec.md`、`src/styles/theme.css`、`src/styles/components.css` 与 `src/ui-lab/uiLab.css` 建立当前生产差异清单；只保留有真实消费者的差异，并把已符合项记录为 no-op 证据。
- [x] 在 `src/styles/theme.css` 复核并收口 Warning 强度、现有中性状态、Accent Soft、Focus、Control/Surface/Overlay/Pill 圆角和 `28/32/36px` 控件高度；Sidebar 与 Task Row 的参考色必须映射语义 token，不在产品组件硬编码 Linear 色值，也不为 Sidebar 改写同时服务启动壳的 Surface token。
- [x] 在 `src/styles/components.css` 复核并收口 Checkbox `4px`、MenuItem Control `6px`、Breadcrumb Ghost、Sidebar Rest/Hover/Current/Current-hover/Disabled、Row/List Rest/Hover/Selected/Selected-hover 和具体组件 Focus-visible；保留 HeroUI 的结构、状态机、动画、Overlay 与可访问性。
- [x] 删除 `src/ui-lab/uiLab.css` 中已由生产主题或共享 recipe 拥有的目标重复规则，只保留 Lab Shell、fixture 布局、预览隔离与无法进入生产 Owner 的演示几何。
- [x] 确认生产 Feature/Page 没有 HeroUI 私有 skin、`!important`、祖先通用 ring、第二套 token/variant runtime 或一对一 wrapper；发现真实共享缺口只能在本 ticket 串行收口，不把修补责任留给 Ticket 02–05。
- [x] 为共享规则补充最小行为/边界证据，运行 `bun run scripts/check-shell-theme-sync.ts`、`bun test scripts/check-shell-theme-sync.test.ts scripts/check-feature-boundaries.test.ts`、`bun run test:dom src/ui-lab/UiLabApp.test.tsx`、`bun run check:animations`、`bun typecheck`、`bun lint`、`bun run lint:boundaries`、`bun format:check` 与 `git diff --check`；不得用 class 快照替代用户可观察状态。
- [x] 完成本 ticket 后形成可提交基线；Ticket 02–05 不再修改 `src/styles/theme.css`、`src/styles/components.css` 或 `src/ui-lab/uiLab.css`。若后续审计发现真正的共享缺口，先停止并行并回到本 Owner 串行修正。

## 完成证据

- Hard cut：中性 Rest/Hover/Pressed 收敛为 `#efeff0 / #e7e7e8 / #e1e1e2`，Task Row 的选中态继续由可切换 Accent 派生；没有把 Linear 色值写进产品组件。
- 共享 Owner：Checkbox、Breadcrumb、Sidebar、Row 与 List recipe 已归入 `theme.css` / `components.css`；`uiLab.css` 删除重复实现，只保留 TaskBoard、Menu Search 与 Invalid Feedback fixture。
- HeroUI 原生职责：Checkbox 状态与动画、Sidebar Tree、ListView GridList、Overlay 和可访问性均保持由 HeroUI / React Aria 管理；Sidebar 删除本地 `32px` 覆盖后恢复 HeroUI Pro 原生 `36px`。
- No-op：Warning `#c88a22`、`6/8/12px` 与 Pill 圆角、`28/32/36px` 控件高度、MenuItem `6px`、Tabs Panel 焦点均已符合已确认目标，未为一致项制造改动。
- 防回流：既有 feature boundary 检查新增 CSS Owner 规则，拒绝 UI Lab 重新持有共享 selector、非 Lab token 及实际色值。
- 自动验证：所列命令全部通过；`bun lint` 仅保留仓库既有 React warnings，无 error。未启动新开发服务或浏览器，真实应用视觉验收留给后续产品切片。
