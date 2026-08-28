# 06 — 完成清理并交接真实应用验收

**What to build:** 在五个生产 Owner 切片全部合并后执行一次全仓收口，删除被替代的 Lab 目标重复规则、旧实现和兼容路径，运行完整工程门禁，并把 Main/Launcher/Tauri/WebView 的未执行项交给既有统一产品验收工作包；自动化完成与真实设备验收必须保持两条证据边界。

**Blocked by:** 02 — 迁移标准控件与 Action 语义；03 — 统一导航与 Shell 状态；04 — 统一集合、搜索与 Task 工作面；05 — 收口 Feedback 与 Overlay 生命周期。

**Status:** ready-for-agent

**Primary write scope:** 默认不拥有新的生产实现文件；只更新本工作包状态、既有统一产品验收中的前置工程证据，以及 Owner tickets 已明确列出的残留删除项。发现新行为或新残留必须退回对应 Owner ticket。

- [ ] 对照本工作包六个 tickets、`.scratch/archive/ui-lab-review/spec.md` 与 `ADR-0003` 复核所有已确认目标；不存在仍依赖旧错误行为的真实消费者，no-op 审计也有明确证据。
- [ ] 验证 Ticket 01～05 已删除各自明确列出的 `src/ui-lab/uiLab.css` 目标重复规则、旧自实现、shadcn 遗留、feature 私有 HeroUI skin、兼容 alias、fallback、零消费者 wrapper/export 和无退出条件双轨；只删除 Owner tickets 已登记的漏项，新发现的行为或跨模块残留必须退回对应 Owner，不在 cleanup 中顺手重构。
- [ ] 扫描并证明生产源码不反向依赖 `src/ui-lab/`，Feature/Page 不覆盖 HeroUI 私有状态/内部度量，不存在新的 design-system runtime、token 镜像、通用 facade 或页面补丁。
- [ ] 运行 `bun run check`、`bun run build` 与 `git diff --check`；若环境导致 Rust、真实设备或签名步骤无法执行，必须记录精确边界并保持外部项未完成，不能用 jsdom、build 或静态扫描替代。
- [ ] 在 `.scratch/unified-product-acceptance/spec.md` 只增加本轮工作包链接、最终提交或 diff、自动化门禁摘要及受影响的既有条目，不复制原有九项，也不提前勾选 Main、Launcher、macOS WKWebView、Windows WebView2、窗口断点、100%/125% 缩放、跨窗口 Accent、Portal 或真实业务数据。
- [ ] 仅在长期合同实际变化时同步 `Documents/01-架构/A3-界面系统.md` 与 ADR 关联链接；不新增领域文档、平行 ADR 或重复 UI 规范。
- [ ] 全部检查通过后将六个 ticket 勾选完成，把本工作包整体移至 `.scratch/archive/ui-system-production-migration/` 并冻结；归档不等于真实应用验收通过，后续设备问题必须新建独立工作包。
