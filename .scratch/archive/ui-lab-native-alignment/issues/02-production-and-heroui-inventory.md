# 02 — 建立完整生产组件总账与 HeroUI 漂移门禁

**What to build:** 审计 Main、Launcher 与共享生产路径，把所有具名 StoneFlow React UI 组件、生产使用的 HeroUI OSS/Pro 家族和锁定版本公开能力登记进同一 catalog，并用一个最小静态门禁阻止新的生产 HeroUI import 脱离目录。

**Blocked by:** 01 — 让 UI Lab Catalog 同时承载完整总账与审查预览。

**Status:** completed

**Primary write scope:** `src/ui-lab/uiLabCatalog.tsx`、新增的 `src/ui-lab/catalog/**` 清单模块（仅在单文件已明显妨碍维护时）、`scripts/check-feature-boundaries.ts` 及其聚焦测试、`src/ui-lab/UiLabApp.test.tsx`。

- [x] 以 `src/main.tsx`、`src/launcher.tsx` 的真实可达路径建立首次全量审计，纳入生产 `features/shared/Shell` 的具名 React UI 组件；排除 UI Lab、测试、归档、纯 debug、Hook、Store、Command、Provider、匿名片段和无独立 UI 合同的 render callback。
- [x] 每个 StoneFlow 条目记录定义路径、全部已知消费者、组合父项、Owner、覆盖方式和验证边界；纯叶子允许标为 `covered-in-composition`，不强迫创建独立 Demo。
- [x] 生产 HeroUI 快照至少覆盖规格确认的 42 个 OSS 与 11 个 Pro runtime 家族；`toast` 作为函数 API、`Selection` 作为类型单独记录，不混入组件计数。
- [x] 锁定版本 HeroUI OSS/Pro 的公开组件家族全部可搜索，并明确区分“生产已使用”“有真实替换对象的候选”“当前无场景”；未使用能力不计入生产覆盖率。
- [x] 同一组件家族只登记一次并列出全部消费者；只有视觉、行为或产品语义确实不同的用法才形成子预览。
- [x] 规格确认的九个重要产品组合场景全部进入总账，并连接对应产品组件与 HeroUI 原料；桌面专属部分标为 `real-app-only`。
- [x] `SearchField` 按真实生产消费者标为已使用，不再只显示为替换候选；ColorSwatchPicker、Disclosure、ProgressCircle、ScrollShadow、Surface、ActionBar、CellSelect、CellSwitch、Resizable、Timeline 至少完成登记。
- [x] 复用现有 repository boundary scanner 增加 HeroUI catalog drift 规则：扫描 Main、Launcher 和共享生产源码中的 `@heroui/react`、`@heroui-pro/react` runtime imports；任一家族未注册即失败，Lab、测试、归档、纯 debug 和 type-only import 不产生误报。
- [x] 门禁允许独立预览、组合覆盖、Upstream 无覆盖、候选、`real-app-only` 或“无预览并说明原因”；它不要求每个组件都有 Demo。
- [x] 漂移门禁与 Lab runtime 消费同一份纯 registration metadata；若 Preview 绑定必须留在 TSX，则只按稳定 id 连接，禁止在脚本中维护第二份组件 allowlist。
- [x] 不新增平行 runner、AST 平台、新依赖或“自动识别全部第一方 React 组件”的脆弱系统；`bun run lint:boundaries` 直接执行该门禁。
- [x] 门禁具有聚焦正反测试；测试证明已注册家族通过、未注册 runtime import 失败、alias、type-only、函数 API、公开 subpath 与排除路径不误报。
- [x] UI 中可以搜索并查看完整总账和 HeroUI 能力目录，但任意时刻仍只挂载当前一个 review unit，目录规模不会导致全部组件同时进入 DOM。
- [x] 本 ticket 只建立事实清单与门禁，不补组件预览、不修改生产组件或样式、不批准任何迁移。

## Verification

- `bun test scripts/check-feature-boundaries.test.ts`
- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx`
- `bun run lint:boundaries`
- `bun typecheck`
- `bun lint`
- `bun format:check`
- `git diff --check`

## Implementation evidence

- 首次生产清单登记 244 个具名 StoneFlow UI 组件与 16 个真实组合边界，其中包含规格要求的 9 个重点产品场景；`covered-in-composition` 的父项链接均可解析。
- 锁定版能力目录登记 84 个 HeroUI OSS 与 65 个 HeroUI Pro 公开组件 subpath；生产快照为 42 个 OSS 与 11 个 Pro runtime 家族，另单列 `toast` 函数 API 与 `Selection` 类型。
- `src/ui-lab/uiLabCatalog.tsx` 从两份纯 registration metadata 派生唯一运行时 catalog；既有 Preview 只通过稳定 id 合并，分类与搜索不会批量挂载预览。
- `scripts/check-feature-boundaries.ts` 复用既有 runner 增加 `heroui-catalog-drift`，并通过 alias、type-only、函数 API、subpath、排除路径和反例测试。
- 已通过本 ticket 全部自动化命令；`bun lint` 仅报告仓库既有 warning。浏览器视觉与真实 Tauri/WebView 验收不由本 ticket 代签。
