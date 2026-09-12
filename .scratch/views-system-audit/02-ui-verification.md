# Ticket 02 UI 验证记录

## 本轮范围与状态

保存弹窗由 Filter 迁入 View，`ViewSaveDialog` 与 `ViewEditorDialog` 消费同一个 `ViewSaveFlow` 契约。`FilterBar` 只调用打开动作；`TaskWorkspace` 的 overlays 槽仅承担布局挂载。创建、覆盖、重命名的异步会话、写入结果与导航恢复由共享 flow 负责。

本节是子任务的组件/静态证据。浏览器几何见末尾主任务补充；组件与浏览器证据不代表原生验收通过。

## 已运行验证

以下 8 个文件共 **68 测试通过**（Vitest DOM，15.29 秒）：

```bash
bun run test:run \
  src/features/view/components/ViewSaveDialog.test.tsx \
  src/features/view/components/ViewEditorDialog.test.tsx \
  src/features/view/components/ViewsPage.test.tsx \
  src/features/view/components/ViewActionsMenu.test.tsx \
  src/features/view/components/ViewManagement.test.tsx \
  src/features/filter/components/FilterBar.test.tsx \
  src/features/filter/components/PageFilterButton.test.tsx \
  src/ui-lab/UiLabApp.test.tsx
```

| 范围 | 实际断言 |
| --- | --- |
| 保存/覆盖 | 表单 submit 提交 trim 后名称；覆盖无需名称；FilterBar 仅触发打开动作 |
| 等待与写入失败 | 名称只读但保留焦点；正在提交的按钮使用 HeroUI `isPending`，保持可聚焦；pending 不调用 UI 写入回调；失败保留名称并展示 `role=alert` |
| 打开恢复 | `savedView` 存在时只调用 `retryOpen`；创建总回调次数不增加；新 session 清空旧草稿 |
| 覆盖后的焦点 | 覆盖按钮在 write → open → open-error 时保留原 DOM 和焦点，只改变为“打开已保存视图”；`submittedMode` 仅用于保留按钮位置，不持有异步结果 |
| 创建/重命名 | 两种模式使用受控 flow；编辑只传名称和 View ID；创建保留 context 与基线构建规则；同一表单收到新 session 后重置 |
| 键盘接缝 | ViewEditorDialog Tab/Shift+Tab 首尾回绕；保存/打开恢复接入 SubmitRegistry；表单 submit 与按钮回调均覆盖 |
| 原管理路径 | 真实 Router/Query + mock IPC 的 Library 重命名/删除失败重试及详情迟到删除继续通过 |
| 目录 | 新组件 group、直接消费者、HeroUI 消费登记及 UI Lab 样例引用通过目录测试 |

受影响 UI 文件的根脚本 `bun lint <paths>`、`bun run lint:boundaries`、`git diff --check` 已通过。格式已通过根 `bun format <paths>` 处理。全仓 typecheck 与最终全量测试由主任务汇总，未用本节代替。

较早扩大运行曾包含并发实现中的 `ViewSaving.test.tsx`：其两个 blocker 恢复用例当时失败，已交共享 flow 所有者处理；该结果不纳入上述 68 个 UI/管理回归通过数。

## UI Lab 入口与证据边界

- 地址：`http://localhost:5173/ui-lab.html`
- 搜索“保存视图”，sampleId：`stoneflow-view-management-recovery`
- 样例名称：保存视图 · 保存与管理恢复
- 先选择“可提交 / 等待中 / 写入失败 / 已保存但未打开”，再打开“保存 / 覆盖示例”或“从视图库创建示例”；列表操作菜单可进入重命名/删除。
- 保存/编辑是明确标记的受控视觉状态例，提交回调固定展示长错误；不会复制共享 flow，也不执行 IPC、正式数据库或真实导航。删除操作仅改变样例内存。
- 长错误包含中文和连续英文，组件使用 `wrap-anywhere`；这只是样例与代码事实，尚不能据此认定窄窗口布局通过。
- UI Lab 只有 SubmitRegistryProvider；注册与调用接缝有组件测试，真实壳层快捷键分发仍需主窗口验证。

## 浏览器与原生验收

子任务 CUA 的 `cua.getState()` 返回 `browsers: []`。分别尝试 `createBrowserTab('iab', ...)` 和主任务提供的 `createBrowserTab('1', ...)`，均返回 `Browser is not available`。未获得页面 DOM、几何或截图，没有创建 tab 或修改 viewport。主任务已接管可用的浏览器 surface。

### 主任务浏览器补充

2026-09-13，主任务通过 CUA 打开已有 `localhost:5173/ui-lab.html`，使用上述生产组件样例。未启动开发服务，未向正式数据库写入。

| 窗口 / 场景 | 实测 |
| --- | --- |
| 480×320，保存长名称 + 长写入错误 | dialog `(x=48,y=16,w=384,h=288)`；三个底部按钮均 `y=259,h=32`，底边 291，完全在窗口内 |
| 480×320，错误滚动 | body clientHeight 178、scrollHeight 310，滚到底 scrollTop 132；clientWidth = scrollWidth = 364，无横向溢出；截图已在本次工具记录展示 |
| 480×320，键盘关闭 | 最后“重试保存”按 Tab 回到“关闭保存视图”；Escape 关闭，焦点回到“保存 / 覆盖示例” |
| 480×320，已保存但未打开 | 只显示“关闭”和“打开已保存视图”；Enter 调用打开恢复，样例反馈“此受控样例不进行导航或再次写入”，关闭后焦点回到入口 |
| 640×480，等待状态 | dialog `(128,145,384,190)`；名称 `readOnly=true, disabled=false`；取消与右上关闭可用，Escape 可关闭且恢复入口焦点 |
| 640×480，视图库创建 + 长错误 | dialog `(40,40,560,400)`；底部取消/重试按钮底边 427；body clientHeight 258、scrollHeight 634，scrollTop 可到 376；clientWidth = scrollWidth = 540 |
| 640×480，创建键盘 | 输入长名称后滚动到底，最后“重试保存”按 Tab 回到右上关闭；Escape 关闭并恢复“从视图库创建示例”焦点 |

结束时已调用 viewport.reset()。初次打开曾因 catalog 缺 direct consumer 空白，修复登记后刷新并完成以上检查；该缺口已由目录测试覆盖。

限制：UI Lab 是受控状态例；写入、真实导航和异步时序由真实 Router/Query/页面的 mock IPC 测试另证。CUA inventory 中 StoneFlow 原生应用未运行；本轮没有启动正式数据实例，实际 Tauri 原场景、真实壳层快捷键和 VoiceOver 尚未验收。
