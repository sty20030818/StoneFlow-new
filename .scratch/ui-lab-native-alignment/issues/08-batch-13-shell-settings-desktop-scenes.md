# 08 — 建立第十三批 Shell、Settings、Launcher 与反馈场景

**What to build:** 建立九个代表性产品场景，以真实生产公开组件验证组合层级、Owner 与可移植状态；窗口、WebView、Portal、真实命令和跨窗口行为明确保留为 `real-app-only`。

**Blocked by:** 07 — 建立第十二批 Task 与集合组合审查面。

**Status:** implemented — pending manual review

**Primary write scope:** 新增一个第十三批 sample/fixture 模块、catalog 注册入口与必要的根级测试；Shell、Settings、Launcher、Entity Detail、Update、Danger Confirm、Toast、Space Editor 生产模块只读。

- [x] 第十三批包含九个 review unit：Shell；Task Detail；Settings/sync；Entity Detail；Launcher；Update；Danger Confirm；Toast/recovery；Space Editor。
- [x] Shell 复用真实 PageFrame 与 AppBreadcrumb，并链接第三、十一批 Sidebar 证据；不复制完整应用 Shell 或导航树。
- [x] Task Detail 复用第十二批 Metadata 结果、公开 TaskPageState 与已确认保存反馈；私有 Header、Autosave、Timeline、Router、Query 和 Store 明确留在产品路径。
- [x] Settings/sync 覆盖默认、保存中、成功、失败与重试；真实 SyncConfigDialog 只使用本地受控状态，不调用同步、持久化或 Tauri Command。
- [x] Entity Detail 复用第七批 Sheet 焦点场景并链接第十批 Resizable 原料；真实断点、Portal 归属、窗口几何和 DrawerHost 焦点恢复标为真实应用边界。
- [x] Launcher 只验证内容 Surface、输入、结果、空态和恢复反馈；窗口激活、全局快捷键、原生关闭和真实提交不在 Lab 伪造。
- [x] Update、Danger Confirm 与 Toast 使用本地可逆状态或真实公开 Provider 触发，不执行更新、删除、下载、外部写入或其他副作用。
- [x] Space Editor 使用真实公开表单与 ColorSwatchPicker；不持久化 Space，不为 Lab 暴露新的产品 API。
- [x] 每个场景列出上游原料、Product Owner、消费位置和浏览器/真实应用验证边界；浏览器结果不标成 Tauri/WebView 已通过。
- [x] 场景只包含揭示层级、状态和 Owner 所需的最小数据，不建设第二个 Router、QueryClient、Store 或桌面 host；Provider 仅复用生产公开边界。
- [x] Current 视觉、生产代码、生产样式、依赖及历史批次均无变化；第十三批只在用户实际确认后完成。

实现已完成；第十三批目录状态保持 `pending`，等待用户逐项人工确认。

## Verification

- `bun run test:dom -- src/ui-lab/UiLabApp.test.tsx`
- 聚焦验证至少一个 Overlay 关闭后无残留 Portal
- `bun typecheck`
- `bun lint`
- `bun run lint:boundaries`
- `bun format:check`
- `git diff --check`

## Implementation evidence

- 九个产品场景全部进入同一 catalog，Owner 保持 Product；每项通过 `inventoryRefs` 复用生产总账，不复制消费者清单。
- Shell、Task Detail、Launcher、Entity Detail、Update、Toast 与 Space Editor 复用既有 fixture；新增代码只承担真实 SyncConfigDialog 的本地失败/重试，以及真实 DangerConfirmProvider 的无副作用结果。
- 聚焦测试验证 SyncConfigDialog 首次失败、重试关闭和关闭后的 Portal 清理；自动化结果不能代替第十三批人工视觉审查。
