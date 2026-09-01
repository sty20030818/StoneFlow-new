# 08 — 建立第十三批 Shell、Settings、Launcher 与反馈场景

**What to build:** 建立九个代表性产品场景，以真实生产公开组件验证组合层级、Owner 与可移植状态；窗口、WebView、Portal、真实命令和跨窗口行为明确保留为 `real-app-only`。

**Blocked by:** 07 — 建立第十二批 Task 与集合组合审查面。

**Status:** complete — 9/9 confirmed

**Primary write scope:** 第十三批 sample/fixture、catalog 注册、审查记录与必要测试；生产改动限于 SyncConfigDialog 的焦点、原位保存动作、成功 Toast、弹窗内联失败反馈与说明间距，删除 SettingsSyncPanel 的重复成功反馈状态，并把 Alert 语义表面收回共享 recipe。

- [x] 第十三批包含九个 review unit：Shell；Task Detail；Settings/sync；Entity Detail；Launcher；Update；Danger Confirm；Toast/recovery；Space Editor。
- [x] Shell 复用真实 PageFrame 与 AppBreadcrumb，并链接第三、十一批 Sidebar 证据；不复制完整应用 Shell 或导航树。
- [x] Task Detail 复用第十二批 Metadata 结果、公开 TaskPageState 与已确认保存反馈；私有 Header、Autosave、Timeline、Router、Query 和 Store 明确留在产品路径。
- [x] Settings/sync 覆盖默认、保存中、成功、显式失败与同一动作再次保存；真实 SyncConfigDialog 成功时显示 Toast，失败时在弹窗内保留错误与同一保存动作，fixture 只使用本地受控状态，不调用同步、持久化或 Tauri Command。
- [x] Entity Detail 复用第七批 Sheet 焦点场景并链接第十批 Resizable 原料；真实断点、Portal 归属、窗口几何和 DrawerHost 焦点恢复标为真实应用边界。
- [x] Launcher 只验证内容 Surface、输入、结果、空态和恢复反馈；窗口激活、全局快捷键、原生关闭和真实提交不在 Lab 伪造。
- [x] Update、Danger Confirm 与 Toast 使用本地可逆状态或真实公开 Provider 触发，不执行更新、删除、下载、外部写入或其他副作用。
- [x] Space Editor 使用真实公开表单与 ColorSwatchPicker；不持久化 Space，不为 Lab 暴露新的产品 API。
- [x] 每个场景列出上游原料、Product Owner、消费位置和浏览器/真实应用验证边界；浏览器结果不标成 Tauri/WebView 已通过。
- [x] 场景只包含揭示层级、状态和 Owner 所需的最小数据，不建设第二个 Router、QueryClient、Store 或桌面 host；Provider 仅复用生产公开边界。
- [x] 生产改动修正第 3 项暴露的焦点、原位保存动作、成功 Toast 与弹窗内联失败反馈；Alert 的中性/语义表面由 `components.css` 单一管理，不在调用方复制皮肤，且不新增依赖。

实现与人工审查均已完成；用户已确认九个场景，Settings / Sync 的最终结论包含共享 Alert 语义表面与连接串说明间距。

## 人工审查进展

- [x] Shell：当前只复用第十一批 PageFrame，真实桌面 Shell 继续属于外部验收边界。
- [x] Task Detail：当前只组合第十一批 Empty 与第十二批 Metadata，保留为组合覆盖边界。
- [x] Settings / Sync：打开后聚焦连接串；完整连接串说明保留上下间距；失败在弹窗内保留原因、输入与同一保存动作；成功关窗并显示 Toast。
- [x] Entity Detail：Current 可接受。
- [x] Launcher：Current 可接受。
- [x] Update：Current 可接受。
- [x] Danger Confirm：Current 可接受。
- [x] Toast / Recovery：Current 可接受。
- [x] Space Editor：Current 可接受。

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
- Shell、Task Detail、Launcher、Entity Detail、Update、Toast 与 Space Editor 复用既有 fixture；Settings / Sync 普通入口触发成功 Toast，显式故障入口仅失败一次并在弹窗内保留错误与同一保存动作，只有成功反馈使用 UI Lab 根 Toast.Provider。
- 聚焦测试验证 SyncConfigDialog 初始焦点、成功 Toast、内联失败反馈、同一保存动作的原位恢复、成功后的焦点返回和 Portal 清理；自动化结果不能代替第十三批人工视觉审查。
- 用户最终确认 Settings / Sync 与全局 Alert 方向，Batch 13 由 `8/9` 收口为 `9/9`；真实 Main、Launcher 与 WebView 仍交给统一产品验收。
