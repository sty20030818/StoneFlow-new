# 09 — 收口覆盖缺口与发布边界

**What to build:** 让维护者能够看到完整的 StoneFlow 与 HeroUI 审查目录、筛选未覆盖和仅真实应用验证项，并以一次系统浏览器走查、自动化门禁和真实生产产物证明 UI Lab 已形成可信观察面且没有进入正式产品；发现的 UI 问题只形成后续工作的证据，不在本 ticket 顺手修复。

**Blocked by:** 02 — 让视觉基线、Actions 与 PageFrame 组合可审查；03 — 让 Fields 与 Settings Form 完整状态可审查；04 — 让 Navigation 与 Shell/Sidebar 语义和密度可审查；05 — 让 Collections 与 Task 工作面可审查；06 — 让 Feedback 与 Launcher 生命周期可审查；07 — 让 Overlays 与 Task Detail 焦点生命周期可审查；08 — 交付可用于决策的 HeroUI 候选库。

**Status:** ready-for-agent

- [ ] StoneFlow 目录完整呈现 Foundations、Actions、Fields、Navigation、Collections、Feedback、Overlays、Product Scenes 八类，HeroUI 目录完整呈现“已采用”“替换候选”“探索中”三类；空类或缺口不会被静默隐藏。
- [ ] 审查者可筛选缺失样例、待归属和仅真实应用验证项；每个未在 Lab 渲染的条目都有可理解原因，覆盖元数据不承载负责人、优先级或迁移进度，也不形成第二套 issue tracker。
- [ ] 每个可渲染样例都有唯一主要 owner、真实来源、适用状态与验证边界；产品组合可以列依赖，但不会被重复计算为新的基础组件。
- [ ] Button 语义、Breadcrumb 当前项、Sidebar 密度、Field 指针/键盘焦点等已知种子问题均能在目录中复现或被明确指向真实应用验证，但本 ticket 不顺带修复这些问题。
- [ ] 唯一 Lab 根级 DOM 集成测试通过，覆盖默认视图、视图切换、分类、搜索、选择、空结果、键盘可达性和仅当前预览挂载；测试不依赖 className、具体 CSS 值或截图。
- [ ] 浏览器人工矩阵完成代表性 Rest、Hover、Pressed、Selected/Current、Pointer Focus、Keyboard Focus Visible、Open、Disabled、Loading、Invalid、长中文和窄容器检查，并记录仍需后续 ticket 的共享问题。
- [ ] 自动边界门禁能拒绝生产代码反向依赖 Lab，以及 Lab 深导入 Feature 私有实现；相应自动化检查通过。
- [ ] 有限源码审查确认 Lab 没有引入平行 token、共享 recipe、专用 reset、一对一包装层或兼容别名；该结论不依赖虚构的视觉所有权自动 lint。
- [ ] 生产构建完成后 Main 与 Launcher 入口存在，Lab HTML 不存在；Tauri 发布配置、生产导航、正式路由和桌面菜单均没有 Lab 入口。
- [ ] Main/Launcher 的 Portal、WebView 激活、窗口断点、缩放和跨窗口一致性继续标为统一产品验收的 real-app-only 项；本 ticket 不以 Lab 通过代签这些结果。
- [ ] 全部约定的类型、Lint、边界、格式、动效与生产构建检查通过；没有引入 Storybook、Playwright、截图服务、运行时插件系统或新生产依赖。
- [ ] 当新增样例已不能发现新的共享规则、状态缺口或迁移机会时停止扩张；未完成的产品修复和 HeroUI 迁移另建独立 ticket。
