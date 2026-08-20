# 05 — 加深产品 Module 并删除旧视觉轨道

**What to build:** 维护者只沿着“全局主题 → 公共 recipe → 深产品 Module”理解 StoneFlow 界面；浅转发层、class-string pattern、平行基础组件与旧 token adapter 全部 hard cut。

**Blocked by:** 04 — 重建全局视觉核心并迁移代表表面

**Status:** implemented

- [x] `PageFrame` 吸收 MainCard 的 Root、Header、Toolbar 与普通/虚拟 Body；浅层 GhostAction 删除，由真实消费者直接组合 HeroUI Button 与既有 `ActionTooltip`；随后删除 `shared/components/main-card`，不保留 re-export。
- [x] `RowShell` 只保留 `RowSelectionGroupPosition` 语义类型、行根结构与状态组合；零消费者 Actions 与 task-only cell 接口直接删除或归回 task owner。Board section header 归 Board，TaskBoard 外层选择组高度/gap/sticky/virtual 几何留在 TaskBoard，`row-tokens.ts` 与 class map 均已删除。
- [x] 删除零消费者 Detail 实现；Header/Footer/PageLayout/Section 与仍有价值的 SaveStatus/滚动结构回到唯一的 task detail owner，删除 `detailTokens.ts`、shared detail barrel 与目录，不建立新的共享 Detail Module。
- [x] `AppScrollArea` 继续隐藏真实 viewport、ref context、OverlayScrollbar、RAF、ResizeObserver、MutationObserver 与 `data-scroll-extent` 合同，但删除 scrollbar 皮肤参数、`viewportProps` 等全部无生产消费者配置；测试只穿过缩小后的 Interface。
- [x] 保留 `ActionTooltip` 等能隐藏 React Aria props/ref 合并或真实产品行为的深 Module；不因清理视觉层误删它们。
- [x] `shell-chrome` 与 `shell-footer` 的必要窗口/轨道几何回到对应 Layout Module；删除零消费者 pattern、死组件与只验证旧 pattern 的测试。
- [x] `RowMetaButton`、`TagsCell` 等零消费者链直接删除；task-only row cell 回到 task owner，随后删除整个 `shared/components/base`，不建立同名 wrapper。
- [x] 删除整个 `shared/components/patterns`、旧 primitive/semantic/layout token 链、Dark 扩展、shadcn adapter、旧 alias 与零消费者 utility；最终 `styles/index.css` 只保留 Tailwind、HeroUI OSS/Pro、fonts、theme、components、base。
- [x] 删除旧浅 Module 的单元测试，用新深 Module Interface 的用户可观察行为测试取代；不测试内部 class 字符串或转发层。
- [x] 同步 `src/ARCHITECTURE.md`、`src/styles/ARCHITECTURE.md`、`src/shared/components/page-frame/ARCHITECTURE.md`、A3 与 ADR-0002 的最终代码事实；不得让文档宣布不存在的兼容层或仍存在的旧入口。
- [x] 不新增 `shared/ui`、视觉 Facade、Provider、CVA、TypeScript token、通用 Surface/Tone/Radius 参数、兼容出口或新依赖。

## Review record

- `styles/index.css` 只保留七个正式入口；冷灰 Light、六 Accent、`6/8/12px` 圆角及 Tailwind 语义映射继续由 `theme.css` 单一拥有，滚动容器基础行为归 `base.css`。
- `PageFrame` 成为唯一页级骨架；`RowShell` 只公开根与选择组语义；task detail 与 task row cell 均回到唯一 task owner。TaskBoard、Board header、Shell 与滚动条只保留各自真实几何/行为合同。
- `shared/components/base`、`patterns`、`detail`、`main-card`、旧 style token/adapter/Dark/utility、死组件、兼容 barrel 与内部 class 测试均已 hard cut；没有 re-export 或同名 wrapper。
- Feature boundary 门禁增加旧视觉路径与 alias 扫描，Shell theme sync 固定唯一 style import 顺序；禁止被删除入口回流。

## Verification record

- `bun run test:dom`：102 files / 435 tests 通过；`bun run test:unit`：82 files / 441 tests 通过。
- `bun run test:scripts`：17 files / 155 tests 通过；旧轨回流、视觉所有权、style import 与 cold-start 同步 fixtures 通过。
- `bun run typecheck`、`bun run lint`、`bun run lint:boundaries`、`bun run format:check`、`bun run check:animations` 通过；Lint 仅输出仓库既有 warning。
- `bun run build` 通过；保留依赖侧既有 BigInt target 与大 chunk warning。
- `package.json`、`bun.lock` 与用户暂存区未修改；未暂存、未 commit、未 push。
- 尚未执行真实 Tauri Main/Launcher 视觉与完整状态走查；该项不能由 jsdom 或构建替代，留待 Ticket 06 集成验收。

## Must preserve

- TaskBoard `44/34/2px` 测量、虚拟 total height、sticky/push layer、分页 spacer、scroll-to-task 与容器查询。
- Sidebar 动态宽度、resize rail、三态与 `<1024px` Sheet。
- Detail Aside/Sheet URL、草稿、自动保存、Resizable 与滚动合同。
- Launcher 透明原生窗、跨平台半径、真实 focus、IME、Arrow/Enter/Escape 与连续创建。
- Main/Launcher/Tauri cold-start 中性值同步；允许最小 host 重复，但必须由既有同步检查保护。

## Verification

- `rg`/静态门禁确认 `shared/components/patterns`、`shared/components/base`、旧 token、shadcn adapter、Dark 和兼容 alias 零消费者且目录已删除。
- PageFrame、RowShell、Board、Detail、AppScrollArea、ActionTooltip、Shell 与 Launcher 的 Interface 行为测试通过。
- TaskBoard model/scroll/virtualization、Sidebar resize、Detail container 与 Launcher 生命周期回归通过。
- `bun run typecheck`、`bun run lint`、`bun run lint:boundaries`、`bun run format:check`、`bun run check:animations`、相关 DOM/脚本测试、生产构建与 `git diff --check` 通过。
- `package.json` 与 `bun.lock` 不修改；没有暂存、commit 或 push。
