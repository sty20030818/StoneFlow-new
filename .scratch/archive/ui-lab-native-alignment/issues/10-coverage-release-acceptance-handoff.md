# 10 — 收口覆盖、发布边界与真实应用验收交接

**What to build:** 在第一至十四批和所有目录工作完成后，统一验证完整清单、HeroUI 漂移门禁、隔离对照、生产构建边界与人工结论；只把真实桌面未验项交给既有统一产品验收，不在 cleanup 中顺手修改生产行为。

**Blocked by:** 09 — 完成第十四批替换候选与样式架构审查。

**Status:** complete — batch 13 9/9, batch 14 5/5；工作包已归档

**Primary write scope:** UI Lab catalog/根级测试中的最终缺口、本工作包 spec/ticket 状态、`.scratch/unified-product-acceptance/spec.md` 的最小交接记录及最终归档；新行为或新样式问题必须退回对应 Owner ticket。

- [x] 生产组件总账覆盖纳入范围的具名 StoneFlow React UI 组件；所有生产 HeroUI OSS/Pro runtime import 均有唯一 catalog 记录和消费位置。
- [x] 锁定版本 HeroUI 能力目录可搜索且明确区分已使用、候选和当前无场景；没有未解释的 HeroUI 覆盖缺口。
- [x] Ticket 02 的漂移门禁直接消费唯一 catalog 事实，不存在第二份 allowlist；缺失 runtime 家族时能报告组件和消费文件，type-only 与排除路径不误报。
- [x] Catalog 校验稳定 id、来源、消费者和覆盖理由；每个 review unit 恰好属于一个批次，ledger-only 不被强迫进入批次。
- [x] 第一至八批保持 `done/external`；第九至十四批只按用户实际确认结果完成，自动化不代签人工审查。
- [x] 所有 `Simplify`、候选和 Native/Current 待选择项都有 Owner、真实消费者、保留合同、预期删除项和后续处置；第十四批五项均确认 `Keep`，没有无退出条件双轨。
- [x] Upstream/Token 隔离 renderer、fixture 和 Portal 不进入生产依赖图；生产源码没有反向依赖 `src/ui-lab`。
- [x] `bun run build` 产物只包含 Main/Launcher 正式入口，不包含 UI Lab 或 baseline HTML/entry；Tauri 导航、菜单与配置不引用 Lab。
- [x] 浏览器人工记录只证明 Lab 的视觉、适用状态和候选决定；macOS WKWebView、Windows WebView2、100%/125% 缩放、窗口断点、真实 Portal/焦点和跨窗口状态保持未验并交给统一产品验收。
- [x] 统一产品验收只增加本工作包链接、自动化摘要和受影响条目，不复制清单、不提前勾选真实设备项。
- [x] 人工审查中已批准并实施的共享视觉变化同步到 `src/styles/ARCHITECTURE.md`；局部行为问题回到对应 Owner，不在 cleanup 复制补丁。
- [x] 全部检查与人工批次完成后整体移入 `.scratch/archive/ui-lab-native-alignment/`；归档不等于真实应用完成。

## Automation evidence

- Catalog、HeroUI 漂移与 baseline 边界继续由既有单一事实源和测试守护；第九至十四批为 47 项 `done`、5 项 `external`、0 项 `pending`。
- 新鲜 `bun run check`、`bun run build`、聚焦 UI Lab DOM 测试与 staged/unstaged `git diff --check` 均通过；前端 191 个文件共 961 项、Rust 233 项通过，7 项 PostgreSQL 集成测试因未提供数据库按既有条件忽略。
- 新鲜 `dist/` 只有 `index.html` 与 `launcher.html` 两个正式 HTML，且未匹配 UI Lab 或 baseline 标识；生产源码、Tauri 配置、Router 与菜单均无 Lab 引用。
- 人工审查中已按用户明确反馈修改字段表面、状态色、RowShell、ActionBar、Breadcrumb、SyncConfigDialog 等生产路径；没有新增依赖，第十四批也没有可实施的 `Simplify` 或候选替换。
- Ticket 03 Button 三层浏览器 smoke 与 Settings / Sync 最终视觉均已确认；第十四批五项 Keep 已由用户确认，不能由自动化反向改写。

## Verification

- `bun run check`
- `bun run build`
- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx`
- Ticket 02 建立的 HeroUI catalog 漂移门禁及聚焦测试
- `git diff --check`
- 检查 `dist/` 只有 Main/Launcher 正式 HTML
- 审查最终 diff，盘清已批准的生产视觉与局部行为变化，并确认没有局部重复皮肤、新依赖或兼容双轨
