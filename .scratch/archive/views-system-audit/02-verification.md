# Ticket 02 实施与验证

## 实施结果

- 四类页面（所有任务、独立事项、项目、Saved View）通过 `useViewSaveFlow` 保存提交时的完整定义快照；创建/另存导航至实际返回 ID，目标 URL 不带来源 Draft。覆盖仅提交当前 Saved View ID 与 filters；重命名仅提交 ID 与名称。
- 保存弹窗从 Filter 移回 View；FilterBar 只触发入口。TaskWorkspace 保持视觉组合，通过 overlays 挂载调用方弹窗，不持有 mutation、任务查询或第二份 View store。
- 写入失败保留名称与 Draft；写入成功但打开失败保留 saved ID，重试只打开。关闭、切来源、同源 Draft 改变和新会话都使旧 UI 完成失效，底层 mutation 缓存失效仍执行。
- `useCurrentRouteSource` 隔离已渲染页面与尚在加载的目标 URL；Default 选择在一次导航中更新 v 并删除 f。base 更新不自动清除等价 Draft，用户编辑/恢复与成功导航拥有 URL 写回。
- 跨 Query key 不再展示可操作的旧任务；同 key 后台刷新保留当前结果。A2 与 View / task-workspace 说明已同步，旧跨域原始 mutation 导出已删除。

## 自动验证

- 真实 Router delayed-loader 用例先复现：旧页面用自己的 options/base 清掉目标 v/f；修后隔离来源通过。同页点击后的同步选中与清 f 已通过，无需新增本地 selection intent。
- `ViewSaving.test.tsx`：10 个真实 Memory Router / Query / 页面 / TaskBoard / mock IPC 用例；混合 todo/doing/waiting/done 夹具同时断言可见任务、实际输入、返回 ID、Default/全部切换、前进后退、显式空 Draft、失败重试与关闭迟到。创建和覆盖的真实 history blocker 用例修前失败、修后通过。
- `useViewSaveFlow.test.tsx`：8 个真实 Router 用例；修前 5 项失败，修后通过。覆盖阻止/允许（每次只执行一次 blocker）、beforeLoad/lazy 失败不改 URL、只打开重试、提交快照/防重复、关闭/新会话/同源 f 变化与缓存失效。
- 组件与管理回归、目录共 8 文件 68 测试通过，详见 [UI 验证记录](./02-ui-verification.md)。

最终根级门禁全部通过：

| 命令 | 结果 |
| --- | --- |
| `bun typecheck` | 通过 |
| `bun lint` | 通过，无警告 |
| `bun run lint:boundaries` | 25 features 通过，HeroUI 与 repository 合同通过 |
| `bun format:check` | 940 文件通过 |
| `bun run test:run` | 212 文件、1,231 测试通过（58.47 秒） |
| `bun run test:release` | 14 文件、153 测试通过（21.02 秒） |
| `git diff --check` | 通过 |

本票未修改 Rust，不重复将 01 的 Rust 结果作为本票新证据。

首次全量在共享 flow blocker 修复落地前运行：1,219 通过、3 失败（两个真实 blocker 和一个 ProjectPage 旧 mock 接口）。已修根因与测试组合，未跳过或放宽断言。

## 当前路由契约与限制

当前 TanStack Router 在 history blocker 拒绝时不结束 navigate Promise。保存用例先预加载目标，随后使用该版本 Router 自身 documentNavigation 所用的 History blocker 契约检查一次，再提交已获允许的导航；接缝集中在共享 flow，并由真实 history.block 测试覆盖。升级至可观测 blocked 结果的 Router 后删除该接缝。

当前 Saved View 路由没有数据 loader；预加载可在来源 URL 改变前报告 chunk / beforeLoad 失败。本票不宣称支持任意未来新增 loader 在路由提交后失败时恢复已卸载的来源表单；新增这种路由行为时必须扩展相应恢复测试和所有权。

## 浏览器与原生

已使用现有 UI Lab 通过 CUA 检查 480×320、640×480 长名称/长错误、滚动、底部按钮、Tab/Escape、焦点恢复、等待关闭及仅打开恢复。具体几何与操作见 [UI 验证记录](./02-ui-verification.md)。结束已恢复 viewport。

CUA inventory 中 StoneFlow 原生应用未运行，现有普通网页入口缺少 Tauri invoke；本轮没有启动长期开发服务或操作正式数据实例。实际 Tauri 主窗口原始项目场景尚未验收，因此本票保持 implemented-awaiting-acceptance，不能以 UI Lab 或 mock IPC 代替原生结论。

## Git 范围

01 和既有规格/tickets 已按用户确认提交为 `70bbca2d fix(views): 修复同步编码与视图编辑恢复`，提交后工作区干净。02 在此之后实施，全部保持未暂存；未推送。
