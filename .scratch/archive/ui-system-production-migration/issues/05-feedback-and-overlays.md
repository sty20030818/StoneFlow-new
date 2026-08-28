# 05 — 收口 Feedback 与 Overlay 生命周期

**What to build:** 审计真实 Empty/Loading/Error/Retry/Toast 与 Dropdown/Popover/Context Menu/Modal/AlertDialog/Sheet 消费者，只修复仍偏离 HeroUI 原生语义和焦点生命周期的路径，并删除对应自建状态机或局部皮肤；不为未来业务预建新的 Feedback 或 Modal 平台。

**Blocked by:** 01 — 收敛共享主题与 HeroUI Recipe。

**Status:** completed

**Primary write scope:** `src/features/danger-confirm/`、`src/layout/overlays/ShellOverlays.tsx`、`src/layout/CreateDialogShell.tsx`、`src/features/entity-detail/components/EntityDetailDrawerHost.tsx`、`src/features/launcher/results/ContinuousToast.tsx`、`src/features/settings/components/panels/SettingsGeneralPanel.tsx`、`SettingsSidebarPanel.tsx`、`SettingsSyncPanel.tsx`、`src/features/sync/components/SyncConfigDialog.tsx` 及其现有测试；Sidebar/Task Row 结构由 Ticket 03/04 拥有。

- [x] 审计 `src/app/providers/AppProviders.tsx`、Settings Feedback panels、路由反馈和 `src/features/launcher/results/ContinuousToast.tsx`；Empty、Loading、Success、Warning、Error 与 Retry 使用一致语义，失败保留用户输入，成功清理旧错误，异步反馈不重复、不残留、不意外丢失，已符合项保持不动。
- [x] 修正 `src/features/sync/components/SyncConfigDialog.tsx` 保存失败只有 Danger Alert、Footer 仍显示普通“保存配置”的重复恢复路径；失败态提供唯一明确的 Danger“重试保存”，重试期间禁用重复提交，成功后关闭，失败继续保留输入与错误。
- [x] 审计 `src/features/danger-confirm/runtime/DangerConfirmProvider.tsx` 与真实危险动作；不可逆确认继续使用 AlertDialog，普通错误恢复不伪装成危险确认，Danger 文案、按钮和取消路径保持业务合同。
- [x] 审计 `src/layout/overlays/ShellOverlays.tsx`、Task/Project/Lifecycle Context Menu 与实际 Dropdown/Popover/Modal/Sheet 消费者；保留 HeroUI Portal、Escape、外点关闭、Tab 循环、初始焦点、触屏长按与关闭后焦点恢复，并在真实 Action Menu 中维持左侧图标/标题、右侧勾选/Kbd、搜索头部和危险项的清晰结构。
- [x] Context Menu 必须继续使用 HeroUI 原生 Trigger 的坐标和长按状态机；产品内容皮肤放在普通子节点，禁止通过自定义 render/class 覆盖行为 Trigger 或复制锚点算法。
- [x] Modal 只迁移已有消费者；危险确认继续使用 AlertDialog，复杂侧栏流程继续使用 Sheet，不增加业务 Modal 类型系统、通用 Feedback/Overlay wrapper、第二套 Toast bus 或第二套焦点管理器。
- [x] 本 ticket 不修改共享 CSS；若发现共享 recipe 缺口，先回到 Ticket 01 串行处理。消费者迁移后删除自建焦点状态、祖先 ring、局部 Overlay skin、残留 Portal 清理旁路和零消费者 wrapper。
- [x] 在 `src/features/danger-confirm/runtime/DangerConfirmProvider.test.tsx`、`src/layout/overlays/ShellOverlayFocus.test.tsx`、`src/layout/CreateDialogShell.test.tsx`、`src/features/entity-detail/components/EntityDetailDrawerHost.test.tsx`、`src/features/launcher/LauncherPage.test.tsx`、`src/features/settings/components/SettingsPage.test.tsx`、`src/features/sync/components/SyncConfigDialog.test.tsx` 与 `src/layout/ShellEscapePriority.test.tsx` 中覆盖 Escape、外点、Danger、Portal 清理和焦点恢复，并运行 `bun typecheck`、`bun lint`、`bun run lint:boundaries` 与 `git diff --check`；不修改共享 CSS。

## 实施证据

- 保存失败路径只保留 Danger Alert 内的 HeroUI Danger「重试保存」；普通 Footer 保存入口在失败态移除。重试期间 Button 进入 pending/disabled，输入和错误保留；成功时清除旧错误并关闭弹窗。
- `AppProviders`、Settings Feedback 与 Launcher 连续创建提示已直接使用 HeroUI Toast/Alert 的语义状态。Danger Confirm 继续使用 AlertDialog；Task、Project、Lifecycle 右键菜单继续使用 HeroUI Pro ContextMenu Trigger 的坐标和长按状态机；详情侧栏继续使用 Sheet。
- 未新增 Feedback/Modal 类型系统、Overlay wrapper、Toast bus、焦点管理器或共享 CSS；现有 Portal、Escape、外点、Tab、初始焦点与关闭后焦点恢复合同保持不变。
- 自动化：本 ticket 指定的 8 个 DOM 测试文件、73 个测试通过；合并后的 `bun typecheck`、`bun lint`、`bun run lint:boundaries`、`bun format:check` 与 `git diff --check` 由整合门禁复核。
- 未启动服务或浏览器；触屏长按、Main/Launcher Portal、Tauri/WebView 与真实设备视觉仍由 Ticket 06 的统一产品验收交接处理。
