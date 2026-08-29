# 08 — 建立第十三批 Shell、Settings、Launcher 与反馈场景

**What to build:** 建立九个代表性产品场景，以真实生产公开组件验证组合层级、Owner 与可移植状态；窗口、WebView、Portal、真实命令和跨窗口行为明确保留为 `real-app-only`。

**Blocked by:** 07 — 建立第十二批 Task 与集合组合审查面。

**Status:** planned

**Primary write scope:** 新增一个第十三批 sample/fixture 模块、catalog 注册入口与必要的根级测试；Shell、Settings、Launcher、Entity Detail、Update、Danger Confirm、Toast、Space Editor 生产模块只读。

- [ ] 第十三批包含九个 review unit：Shell；Task Detail；Settings/sync；Entity Detail；Launcher；Update；Danger Confirm；Toast/recovery；Space Editor。
- [ ] Shell 场景复用 Sidebar、Breadcrumb、PageFrame 公共组件，只提供长中文、窄宽、当前态和必要导航数据，不复制完整应用 Shell。
- [ ] Task Detail 复用第十二批 Metadata/Timeline 结果，只展示公开可组合的 Header、Section、Save/Feedback 与布局合同，不复制完整 Router、Query 或 Store。
- [ ] Settings/sync 覆盖默认、保存中、成功、失败与重试；使用本地可逆状态，不调用真实同步、持久化或 Tauri Command。
- [ ] Entity Detail 展示 Resizable/Sheet 的可移植组合；真实断点、Portal 归属、窗口几何和焦点恢复标为 `real-app-only`。
- [ ] Launcher 只验证内容 Surface、输入、结果、空态和恢复反馈；窗口激活、全局快捷键、原生关闭和真实提交不在 Lab 伪造。
- [ ] Update、Danger Confirm 与 Toast 使用本地可逆状态触发，不执行更新、删除、下载、外部写入或其他副作用。
- [ ] Space Editor 使用真实公开表单与 ColorSwatchPicker；不持久化 Space，不为 Lab 暴露新的产品 API。
- [ ] 每个场景列出上游原料、Product Owner、消费位置和浏览器/真实应用验证边界；浏览器结果不标成 Tauri/WebView 已通过。
- [ ] 场景只包含揭示层级、状态和 Owner 所需的最小数据，不建设第二个 Router、Provider、QueryClient、Store 或桌面 host。
- [ ] Current 视觉、生产代码、生产样式、依赖及历史批次均无变化；第十三批只在用户实际确认后完成。

## Verification

- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx`
- 聚焦验证至少一个 Overlay 关闭后无残留 Portal
- `bun typecheck`
- `bun lint`
- `bun run lint:boundaries`
- `bun format:check`
- `git diff --check`
