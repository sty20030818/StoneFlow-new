# 10 — 收口覆盖、发布边界与真实应用验收交接

**What to build:** 在第一至十四批和所有目录工作完成后，统一验证完整清单、HeroUI 漂移门禁、隔离对照、生产构建边界与人工结论；只把真实桌面未验项交给既有统一产品验收，不在 cleanup 中顺手修改生产行为。

**Blocked by:** 09 — 完成第十四批替换候选与样式架构审查。

**Status:** implemented — 自动化收口与统一验收交接完成；待人工审查及归档

**Primary write scope:** UI Lab catalog/根级测试中的最终缺口、本工作包 spec/ticket 状态、`.scratch/unified-product-acceptance/spec.md` 的最小交接记录及最终归档；新行为或新样式问题必须退回对应 Owner ticket。

- [x] 生产组件总账覆盖纳入范围的具名 StoneFlow React UI 组件；所有生产 HeroUI OSS/Pro runtime import 均有唯一 catalog 记录和消费位置。
- [x] 锁定版本 HeroUI 能力目录可搜索且明确区分已使用、候选和当前无场景；没有未解释的 HeroUI 覆盖缺口。
- [x] Ticket 02 的漂移门禁直接消费唯一 catalog 事实，不存在第二份 allowlist；缺失 runtime 家族时能报告组件和消费文件，type-only 与排除路径不误报。
- [x] Catalog 校验稳定 id、来源、消费者和覆盖理由；每个 review unit 恰好属于一个批次，ledger-only 不被强迫进入批次。
- [x] 第一至八批保持 `done/external`；第九至十四批只按用户实际确认结果完成，自动化不代签人工审查。
- [ ] 所有 `Simplify`、候选和 Native/Current 待选择项都有 Owner、真实消费者、保留合同、预期删除项和后续处置；没有无退出条件双轨。
- [x] Upstream/Token 隔离 renderer、fixture 和 Portal 不进入生产依赖图；生产源码没有反向依赖 `src/ui-lab`。
- [x] `bun run build` 产物只包含 Main/Launcher 正式入口，不包含 UI Lab 或 baseline HTML/entry；Tauri 导航、菜单与配置不引用 Lab。
- [x] 浏览器人工记录只证明 Lab 的视觉、适用状态和候选决定；macOS WKWebView、Windows WebView2、100%/125% 缩放、窗口断点、真实 Portal/焦点和跨窗口状态保持未验并交给统一产品验收。
- [x] 统一产品验收只增加本工作包链接、自动化摘要和受影响条目，不复制清单、不提前勾选真实设备项。
- [x] 若长期生产样式合同没有实际变化，不修改 `src/styles/ARCHITECTURE.md`；若发现生产行为问题，退回对应 Owner 或建立后续生产规格，不在本 ticket 修复。
- [ ] 全部检查与人工批次完成后更新本工作包状态并整体移入 `.scratch/archive/ui-lab-native-alignment/`；归档不等于真实应用或后续生产迁移完成。

## Automation evidence

- Catalog、HeroUI 漂移与 baseline 边界继续由既有单一事实源和测试守护；第一至八批保持 `done/external`，第九至十四批共 52 项保持 `pending`。
- `bun run check`、`bun run build`、聚焦 UI Lab DOM 测试与 `git diff --check` 通过；完整工作台测试在全套并发下使用 10 秒上限，避免默认 5 秒把负载波动误报为失败。
- 新鲜 `dist/` 只有 `index.html` 与 `launcher.html` 两个正式 HTML，且未匹配 UI Lab 或 baseline 标识；生产源码、Tauri 配置、Router 与菜单均无 Lab 引用。
- 本工作包没有修改生产视觉、业务行为、依赖或长期样式合同；当前没有已批准的 `Simplify` 或生产迁移。
- Ticket 03 浏览器 smoke、第九至十四批人工审查与五项 Keep 推荐仍待用户确认，不能由上述自动化代签。

## Verification

- `bun run check`
- `bun run build`
- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx`
- Ticket 02 建立的 HeroUI catalog 漂移门禁及聚焦测试
- `git diff --check`
- 检查 `dist/` 只有 Main/Launcher 正式 HTML
- 审查最终 diff，确认没有生产视觉、业务行为、依赖或兼容双轨变化
