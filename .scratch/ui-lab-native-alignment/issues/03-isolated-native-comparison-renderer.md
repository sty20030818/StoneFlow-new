# 03 — 跑通 Upstream、Token 与 Current 的隔离对照

**What to build:** 以 Button 和一个最小 Overlay 为首个端到端样例，建立仅开发环境可达的隔离 renderer，让同一 fixture 可以可信比较锁定版本 Upstream、StoneFlow Token 和当前生产样式；Overlay 留在各自 Document，生产入口和构建仍只有 Main 与 Launcher。

**Blocked by:** 02 — 建立完整生产组件总账与 HeroUI 漂移门禁。

**Status:** planned

**Primary write scope:** `ui-lab.html`、新增的开发期 baseline HTML/entry/CSS、`src/ui-lab/**` 对照宿主与共享 fixture、UI Lab 根级 DOM/边界测试；`vite.config.ts` 的正式 build inputs 只作验证，不主动扩张。

- [ ] Upstream renderer 只加载锁定版本 HeroUI OSS/Pro 官方 CSS 与默认 Light，不加载 StoneFlow `fonts.css`、`theme.css`、`components.css`、`base.css` 或 `uiLab.css`，也不调用 `bootstrapAppearance()`。
- [ ] Token renderer 加载官方 CSS、`fonts.css` 与 `theme.css`，明确不加载 `components.css` 或 `base.css`；`base.css` 作为 Foundation 单独归因。
- [ ] Current 继续直接复用真实 `src/styles/index.css`，不复制、拼接或维护第二份生产样式链。
- [ ] Upstream 与 Token 运行在各自隔离 Document/frame，Portal root、焦点和 Overlay 均留在该 Document；根作用域 recipe 不从 Current 泄漏进去。
- [ ] Button 与一个最小 Overlay 的数据、props、状态和文案由同一 fixture 模块复用；父页面只传 fixture id 与必要的可序列化选择，不建立通用 RPC、第二套状态机或复制 JSX。
- [ ] 对照详情按实际差异显示 Upstream、Token、Current；可观察结果相同时只渲染一次并标记 `Upstream · 无覆盖`，不为凑齐栏位创建重复面板。
- [ ] ledger-only、`real-app-only` 或无法忠实隔离的条目不伪造 baseline；详情显示具体限制并转 Current、Product Composition 或真实应用验收。
- [ ] 隔离 frame 有明确可访问名称以及加载、无效 fixture 和失败反馈；键盘可以进入和离开 frame，父 Lab 的搜索与选择状态不被子 renderer 接管。
- [ ] Current 是冻结目标；对照 UI 明确说明“原生”是实现参考而非视觉自动迁移，用户没有批准的差异不会进入生产。
- [ ] 隔离入口只在 UI Lab 开发访问中可达，不进入 Main、Launcher、Tauri 路由/菜单或生产 build input；`bun run build` 后产物仍只有正式入口。
- [ ] HeroUI Pro 只在私有本地 Lab 使用，不复制上游源码、官网正文或公开托管 baseline。
- [ ] DOM/边界测试证明 mode 选择、fixture 选择、单对照挂载、入口隔离与清理；视觉差异由浏览器人工检查，不通过 className 或 jsdom 截图代签。
- [ ] 浏览器人工 smoke 至少检查 Button 的默认、Hover、Pressed、Focus-visible、Disabled 与 Pending，并确认三层字体、圆角、颜色和状态没有样式串扰。
- [ ] 不新增生产依赖、第二 Provider、runtime theme switch、feature flag、兼容 alias 或 Lab 专用组件 wrapper。

## Verification

- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx`
- 隔离 renderer 的聚焦 DOM/边界测试（使用最终文件名）
- `bun run build`
- 检查 `dist/` 不包含 UI Lab 或 baseline HTML
- 浏览器人工 smoke 复用用户已经打开的 Chrome 与现有 UI Lab 服务；未经明确要求不启动新服务或另开浏览器
- `bun typecheck`
- `bun lint`
- `bun run lint:boundaries`
- `bun format:check`
- `git diff --check`
