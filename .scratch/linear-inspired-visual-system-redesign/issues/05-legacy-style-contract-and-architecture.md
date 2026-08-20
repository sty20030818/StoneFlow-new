# 05 — 加深产品 Module 并删除旧视觉轨道

**What to build:** 维护者只沿着“全局主题 → 公共 recipe → 深产品 Module”理解 StoneFlow 界面；浅转发层、class-string pattern、平行基础组件与旧 token adapter 全部 hard cut。

**Blocked by:** 04 — 重建全局视觉核心并迁移代表表面

**Status:** ready-for-agent

- [ ] `PageFrame` 吸收 MainCard 的 Root、Header、Toolbar 与普通/虚拟 Body；浅层 GhostAction 删除，由真实消费者直接组合 HeroUI Button 与既有 `ActionTooltip`；随后删除 `shared/components/main-card`，不保留 re-export。
- [ ] `RowShell` 只吸收 `RowSelectionGroupPosition` 语义类型、行根结构、状态组合与 Actions；Board section header 归 Board，TaskBoard 外层选择组高度/gap/sticky/virtual 几何留在 TaskBoard，随后删除 `row-tokens.ts` 且不重新导出 class map。
- [ ] 删除零消费者 Detail 实现；Header/Footer/PageLayout/Section 与仍有价值的 SaveStatus/滚动结构回到唯一的 task detail owner，删除 `detailTokens.ts`、shared detail barrel 与目录，不建立新的共享 Detail Module。
- [ ] `AppScrollArea` 继续隐藏真实 viewport、ref context、OverlayScrollbar、RAF、ResizeObserver、MutationObserver 与 `data-scroll-extent` 合同，但删除 scrollbar 皮肤参数、`viewportProps` 等全部无生产消费者配置；测试只穿过缩小后的 Interface。
- [ ] 保留 `ActionTooltip` 等能隐藏 React Aria props/ref 合并或真实产品行为的深 Module；不因清理视觉层误删它们。
- [ ] `shell-chrome` 与 `shell-footer` 的必要窗口/轨道几何回到对应 Layout Module；删除零消费者 pattern、死组件与只验证旧 pattern 的测试。
- [ ] 将 `RowMetaButton` 等最后真实消费者迁到 HeroUI Interface 或所属产品 Module，随后删除整个 `shared/components/base`，不建立同名 wrapper。
- [ ] 删除整个 `shared/components/patterns`、旧 primitive/semantic/layout token 链、Dark 扩展、shadcn adapter、旧 alias 与零消费者 utility；最终 `styles/index.css` 只保留 Tailwind、HeroUI OSS/Pro、fonts、theme、components、base。
- [ ] 删除旧浅 Module 的单元测试，用新深 Module Interface 的用户可观察行为测试取代；不测试内部 class 字符串或转发层。
- [ ] 同步 `src/ARCHITECTURE.md`、`src/styles/ARCHITECTURE.md`、`src/shared/components/page-frame/ARCHITECTURE.md`、A3 与 ADR-0002 的最终代码事实；不得让文档宣布不存在的兼容层或仍存在的旧入口。
- [ ] 不新增 `shared/ui`、视觉 Facade、Provider、CVA、TypeScript token、通用 Surface/Tone/Radius 参数、兼容出口或新依赖。

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
