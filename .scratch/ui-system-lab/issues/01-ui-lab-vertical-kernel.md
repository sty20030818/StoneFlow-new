# 01 — 建立 UI Lab 垂直内核并跑通 Button 双视图样例

**What to build:** 让开发者能够从独立开发入口打开使用 StoneFlow 真实主题的 UI Lab，在共用 Shell 中切换 StoneFlow 与 HeroUI、分类、搜索并一次检查一个真实 Button 样例；同时建立唯一的根级行为测试和生产隔离证据，使后续审查面可以沿同一条最小路径扩展。

**Blocked by:** None — can start immediately.

**Status:** completed

- [x] 开发者可以通过独立开发入口直接打开 UI Lab；入口不要求进入 Main、Launcher、业务路由、真实 Store 或 Tauri 流程，Lab 加载失败也不影响两类正式窗口。
- [x] UI Lab 默认进入 StoneFlow 视图，并可在 StoneFlow 与 HeroUI 两个视图之间切换；切换后不会保留属于上一视图的无效选择。
- [x] 两个视图共用同一套分类导航、搜索与预览布局，不出现两套相互漂移的 Shell。
- [x] StoneFlow 视图和 HeroUI“已采用”分类各有一个可操作的真实 Button 样例；两者使用项目锁定版本与当前实际主题，并清楚标示归属和用途，而不是复制静态按钮或新增一对一包装层。
- [x] 用户可以按样例名称或关键词找到 Button、选择样例、看到无结果反馈并一键清空查询。
- [x] 任意时刻 DOM 中只存在当前选中的预览；切换样例后旧预览会卸载，且不遗留 Portal、全局监听器或滚动锁。
- [x] 当前预览显示稳定名称、所属视图、分类、主要 owner、适用状态及“Lab 可验证/仅真实应用验证”边界。
- [x] 用户只用键盘即可切换视图、搜索、浏览分类和选择 Button；控件有可访问名称、可见焦点和合理顺序，选择后焦点不会无提示丢失。
- [x] 一个根级 DOM 集成测试从用户视角覆盖默认视图、双视图切换、搜索、选择、仅挂载当前样例、空结果与基本键盘路径，不以 className 或 CSS 数值作为证据。
- [x] 边界门禁能拒绝生产 Module 反向依赖 UI Lab；Lab 只能通过既有公开 Interface 消费生产能力，不为单个 Lab 消费者新增公共 facade。
- [x] 真实生产 Web 构建产物包含 Main 与 Launcher、但不包含 UI Lab 入口；Tauri 的发布入口与配置不引用 Lab，本 ticket 无需执行完整桌面打包，也不新增依赖。

## Evidence

- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx`：1 个根级行为测试通过，包含 Enter 键激活与焦点保持。
- `bun test scripts/check-feature-boundaries.test.ts` 与 `bun run lint:boundaries`：反向依赖、动态深导入、别名路径穿越和 Lab 私有导入门禁通过。
- `bun run build`：真实产物仅包含 `dist/index.html` 与 `dist/launcher.html`，不包含 `dist/ui-lab.html`。
- 本地浏览器：1440×900 与 375×800 通过；Tab/Enter 可切换视图并保持焦点，跳转链接可聚焦预览区；入口补齐 favicon 后无新增 console error。
- `bun typecheck`、`bun lint`、`bun format:check`、`bun run check:animations` 通过；未新增依赖，Tauri 与正式入口无 UI Lab 引用。
