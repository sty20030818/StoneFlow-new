# 01 — 让 UI Lab Catalog 同时承载完整总账与审查预览

**What to build:** 扩展现有单一 `uiLabCatalog`，让同一目录既能登记“可搜索但不挂载预览”的 ledger-only 组件，也能登记进入人工批次的 review unit；用户能够搜索、选择并理解两类条目，而已有第一至八批、单预览挂载和键盘路径保持不变。

**Blocked by:** None — can start immediately.

**Status:** completed

**Primary write scope:** `src/ui-lab/uiLabCatalog.tsx`、`src/ui-lab/UiLabApp.tsx`、`src/ui-lab/UiLabApp.test.tsx`；只在确有必要时调整 `src/ui-lab/uiLab.css`。

- [x] Catalog 以一个最小判别模型表达 ledger-only 与 review unit；两者共用稳定 id、名称、来源、Owner、消费者、采用状态、覆盖方式与验证边界，不建立第二份 JSON/Markdown registry。
- [x] 现有 53 个条目的 id、预览、第一至八批成员和 `done/external` 结论保持不变；本 ticket 不重做已确认视觉。
- [x] ledger-only 条目可以通过名称、关键词、来源和消费者搜索并查看详情；“可搜索”不会被误标为“Lab 已渲染”或“已批准迁移”。
- [x] review unit 仍然一次只挂载当前一个 Preview；选择 ledger-only 条目时不挂载空壳 Preview，也不遗留前一条目的 Portal、监听器或状态。
- [x] 详情明确显示当前 Owner、推荐 Owner、`Keep/Simplify/Candidate/Real-app-only` 处置、消费位置、组合父项及无独立预览理由；未知值明确标示，不静默猜测。
- [x] 批次导航只列 review unit，分类与搜索目录可以列两类记录；从搜索结果选择 ledger-only 后仍能可靠返回批次或分类导航。
- [x] 批次完整性规则改为“每个 review unit 恰好属于一个批次，ledger-only 不要求批次”；批次引用不存在条目、重复引用或漏掉 review unit 时测试失败。
- [x] 第一至八批进度继续从 catalog 派生，全部历史完成项仍显示完成，`real-app-only` 不计入可在 Lab 完成的分母。
- [x] 至少用一个真实生产组件验证 ledger-only 全路径；旧类型或旧目录形状被取代后直接删除，不保留兼容 alias 或双写适配。
- [x] UI Lab 根级 DOM 测试覆盖 ledger-only 搜索与详情、无 Preview 挂载、review unit 单挂载、批次完整性和基本键盘路径；不新增按条目划分的测试套件。
- [x] 产品代码不反向依赖新目录能力，生产构建入口不变化，不新增 Provider、插件协议、通用 registry 抽象或依赖。

## Verification

- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx`
- `bun typecheck`
- `bun lint`
- `bun run lint:boundaries`
- `bun format:check`
- `git diff --check`

## Evidence

- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx`：5/5 通过。
- `bun typecheck`、`bun lint`、`bun run lint:boundaries`、`bun format:check`、`git diff --check`：通过；Lint 仅保留仓库既有 warning。
