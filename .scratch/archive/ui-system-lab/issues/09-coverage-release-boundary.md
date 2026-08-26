# 09 — 收口覆盖缺口与发布边界

**What to build:** 让维护者能够看到完整的 StoneFlow 与 HeroUI 审查目录、筛选未覆盖和仅真实应用验证项，并以一次系统浏览器走查、自动化门禁和真实生产产物证明 UI Lab 已形成可信观察面且没有进入正式产品；发现的 UI 问题只形成后续工作的证据，不在本 ticket 顺手修复。

**Blocked by:** 02 — 让视觉基线、Actions 与 PageFrame 组合可审查；03 — 让 Fields 与 Settings Form 完整状态可审查；04 — 让 Navigation 与 Shell/Sidebar 语义和密度可审查；05 — 让 Collections 与 Task 工作面可审查；06 — 让 Feedback 与 Launcher 生命周期可审查；07 — 让 Overlays 与 Task Detail 焦点生命周期可审查；08 — 交付可用于决策的 HeroUI 候选库。

**Status:** completed; archived; manual acceptance transferred

- [x] StoneFlow 目录完整呈现 Foundations、Actions、Fields、Navigation、Collections、Feedback、Overlays、Product Scenes 八类，HeroUI 目录完整呈现“已采用”“替换候选”“探索中”三类；空类或缺口不会被静默隐藏。
- [x] 审查者可筛选缺失样例、待归属和仅真实应用验证项；每个未在 Lab 渲染的条目都有可理解原因，覆盖元数据不承载负责人、优先级或迁移进度，也不形成第二套 issue tracker。
- [x] 每个可渲染样例都有唯一主要 owner、真实来源、适用状态与验证边界；产品组合可以列依赖，但不会被重复计算为新的基础组件。
- [x] Button 语义、Breadcrumb 当前项、Sidebar 密度、Field 指针/键盘焦点等已知种子问题均能在目录中复现或被明确指向真实应用验证，但本 ticket 不顺带修复这些问题。
- [x] 唯一 Lab 根级 DOM 集成测试通过，覆盖默认视图、视图切换、分类、搜索、选择、空结果、键盘可达性和仅当前预览挂载；测试不依赖 className、具体 CSS 值或截图。
- [x] 浏览器人工矩阵完成代表性 Rest、Hover、Pressed、Selected/Current、Pointer Focus、Keyboard Focus Visible、Open、Disabled、Loading、Invalid、长中文和窄容器检查，并记录仍需后续 ticket 的共享问题。
- [x] 自动边界门禁能拒绝生产代码反向依赖 Lab，以及 Lab 深导入 Feature 私有实现；相应自动化检查通过。
- [x] 有限源码审查确认 Lab 没有引入平行 token、共享 recipe、专用 reset、一对一包装层或兼容别名；该结论不依赖虚构的视觉所有权自动 lint。
- [x] 生产构建完成后 Main 与 Launcher 入口存在，Lab HTML 不存在；Tauri 发布配置、生产导航、正式路由和桌面菜单均没有 Lab 入口。
- [x] Main/Launcher 的 Portal、WebView 激活、窗口断点、缩放和跨窗口一致性继续标为统一产品验收的 real-app-only 项；本 ticket 不以 Lab 通过代签这些结果。
- [x] 全部约定的类型、Lint、边界、格式、动效与生产构建检查通过；没有引入 Storybook、Playwright、截图服务、运行时插件系统或新生产依赖。
- [x] 当新增样例已不能发现新的共享规则、状态缺口或迁移机会时停止扩张；未完成的产品修复和 HeroUI 迁移另建独立 ticket。

## Evidence

- 目录共 53 项：51 项在 Lab 渲染，2 项明确标为 real-app-only；StoneFlow 八类与 HeroUI 三类始终可见，缺失样例、待归属、仅真实应用和全部四种筛选均可操作。
- `bun test:dom src/ui-lab/UiLabApp.test.tsx`：唯一根级 DOM 集成测试 1/1 通过，覆盖双视图、分类、搜索、四类覆盖筛选、空状态、键盘路径、未渲染原因及旧预览卸载。
- 真实浏览器在 1440×900 与 375×800 下完成代表性 Rest、Hover、Pressed、Selected/Current、Pointer Focus、Keyboard Focus Visible、Open、Disabled、Loading、Invalid、长中文及窄容器走查；Modal 与 DatePicker 的 Escape 关闭、初始焦点和焦点恢复可用，浏览器控制台为 0 error / 0 warning。窄窗走查发现并修正了 Lab 预览滚动未复位与高内容向上溢出的实验室自身问题。
- 共享发现 1：真实 Breadcrumb 的祖先项 Hover 会出现下划线，当前项使用 Accent 蓝；样例中 TanStack 祖先 Link 与当前项同时暴露 `aria-current="page"`，需由后续独立产品 ticket 决定视觉和语义修复。
- 共享发现 2：Sidebar 的 32px/36px token 对照实际行高均约 38px，说明当前 Pro Sidebar 未消费该高度 token；当前态可操作但没有稳定暴露预期的 current 可访问语义，需后续独立审计 owner 与 recipe/slot 对接。
- 共享发现 3：文本 Input 经指针与键盘聚焦都会显示同一 Accent inset focus ring；这是真实浏览器结果，不由 Lab 覆盖，应在后续 Field 视觉规范 ticket 中决定是否区分两种交互模态。
- `bun typecheck`、`bun lint:boundaries`、`bun format:check`、`bun check:animations`、`bun lint`、脚本测试与 `bun run build` 通过；Lint 仅保留仓库既有 React Compiler warnings，构建仅保留依赖侧既有 BigInt target 与大 chunk warning。
- 生产产物包含 `dist/index.html` 与 `dist/launcher.html`，不包含 Lab HTML 或 Lab 字符串；生产源码、Tauri 配置、导航、正式路由和桌面菜单无 Lab 引用。依赖清单未变化，有限源码审查未发现平行 token、共享 recipe、专用 reset、一对一包装层或兼容别名。
- Main/Launcher 的 Portal、WebView 激活、窗口断点、缩放与跨窗口一致性没有在本轮代签，仍由[统一产品验收](../../../unified-product-acceptance/spec.md)负责。
