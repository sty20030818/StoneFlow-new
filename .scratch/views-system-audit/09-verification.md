# 09 验证记录

更新日期：2026-09-14。状态：`implemented-awaiting-acceptance`。对应 [09 ticket](./issues/09-views-system-acceptance.md)、[父规格](./spec.md)与 [47 条故事覆盖表](./09-coverage.md)。实现与证据随本票提交；未覆盖的验收和历史策略继续保留，未将整个工作包结案归档。

## 当前结论与版本边界

隔离原生主窗口已证明项目、独立事项、所有任务保存后能恢复默认查询；Saved View 的另存、覆盖、恢复和空 Draft 也已操作。项目与 Saved 的完整 AX 窗口序列经连续拼接、只读库 ID 映射，确认同一查询下 337 个唯一任务及完整顺序一致；项目已选数量保持 38。尾页 sticky 已修复并原生复测通过，窄窗编辑、键盘保存／取消／重试及焦点恢复已有具体记录。VoiceOver、200% 缩放、真实设备同步及历史策略仍未闭合。

| 层面 | 本轮证据 | 能证明的范围 |
| --- | --- | --- |
| 构建与运行 | 首轮为 `fc8a9de6`；最终 `StoneFlow Views Acceptance.app` 加入 09 当前源码，[manifest](./evidence-09/build-source.json)的 8 个改动路径已与工作树核对一致；[新构建日志](/tmp/stoneflow-ticket09-native-fixed-build.log)记录 beforeBuild 通过、Rust 构建 49.22 秒、成功生成 bundle | 新构建包含 sticky 修复；原生 UI 使用 `tauri://localhost`。界面仍显示版本 0.2.0，版本字符串不代替源码来源 |
| 原生交互 | 仓内保存[项目结果](./evidence-09/project-all.jpg)、[分组计数](./evidence-09/group-counts.jpg)、[sticky 修复前](./evidence-09/sticky-before.jpg)／[修复后](./evidence-09/sticky-after.jpg)、[窄窗弹窗](./evidence-09/narrow-editor.jpg)五张实际 JPEG；临时 AX 文本编号 00–96 补充过程 | 实际 Tauri 主窗口的操作、可见成员、计数、URL、选中项和部分焦点；不以文件编号推断每次操作成功 |
| 原生增量验证 | 基于 `51da8063` 的[顺序证据](./evidence-09/native-order.json)与[键盘证据](./evidence-09/native-keyboard.json)，包含原生查询选项、逐窗口任务、前后 AX 和独立只读映射 | 证明这一组查询设置下两入口的完整实际顺序，以及具体键盘操作；不把 AX 比较称为人眼逐 ID 验收，也不替代读屏与真实设备同步 |
| 本地持久化 | [首轮证明](./evidence-09/database-save.json)的 31 项检查与[最终证明](./evidence-09/database-edit.json)的 22 项检查均为 true | 对独立测试库已有 View／Outbox 的只读核验；不是额外执行一次 CRUD，也不证明远端上传或其他设备接收 |
| 自动回归 | 09 新增真实菜单保存两条、原始非法 filters 恢复一条、sticky 两条，并运行最终根检查 | 真实组件／Router／API adapter 与测试 IPC、临时 SQLite／协议夹具各自的验证范围，不能替代原生或跨设备 |

原生数据库是独立标识 `com.stonefish.stoneflow.views-acceptance` 下的合成测试库。00 及后续状态显示“同步未配置远端”；未执行 PostgreSQL 上传／下载、未核验正式用户数据。核心截图与数据库证明已保存在 [evidence-09](./evidence-09/)；临时 AX 文件和构建信息仅补充操作过程。

## 原生操作与本地库核验

下表未带链接的 AX 文件名相对 `/private/tmp/stoneflow-ticket09-native-evidence`；持久化证据使用仓内相对链接。完整操作步骤沿用[覆盖表](./09-coverage.md)，这里仅记录实际结果。

| 操作链 | 实际结果 | 证据 |
| --- | --- | --- |
| 项目“未完成” → 待执行 → 保存 → 新 View → 未完成 → 全部 | 未完成 6 项，保存的待执行 2 项；返回未完成恢复 6 项，全部 8 项含已完成。新 View 被选中，返回项目后 URL 无 `f`，全部仅有 `v=all` | `01-project-active.txt`–`05-project-all.txt`；[项目全部截图](./evidence-09/project-all.jpg)；首轮 JSON 的 project scope/context/base 与 2 个 todo 成员检查 |
| 独立事项同链 | 3 → 1 → 3 → 5 项；保存后进入返回 ID，恢复默认查询不保留临时条件 | `06-standalone-active.txt`–`10-standalone-all.txt`；首轮 JSON 的 standalone 定义与 1 个 todo 成员 |
| 所有任务同链 | 未完成总数 212（加载 150），待执行及 Saved 为 71；返回未完成总数 212，再选全部总数 350（两者当时加载 150） | `11-alltasks-active.txt`–`15-alltasks-all.txt`；首轮 JSON 的 `context.kind=all` 与 71 个 todo 成员。此处不声称已加载完 350 项 |
| 三次创建的持久化 | 每项各一个 generation=1 的完整创建 Outbox，scope/context/base/filter 与 View 记录相符，旧 sort／group_by 占位字段保持 canonical 默认值 | 首轮 JSON。第一个项目 View 创建时名称仅为 `09`，后续已通过键盘编辑改为完整名称，见下方增量记录；中文粘贴不作为输入法组合验收 |
| Saved 条件编辑与另存 | 从原始 todo 条件改为 `is_not todo`；与 priority 条件组合可得到无匹配，移除 priority 后为 2 项；另存为长名称后进入不同 ID，原 View 仍保留 todo | `17-saved-standalone-clean.txt`–`24-copy-draft.txt`；最终 JSON 的 `copyAndOverwrite`。另存名称实际为“09｜独立事项排除待执行｜原生长名称另存验证” |
| 显式空 Draft、取消与恢复 | 清空额外条件后 URL 保留编码空数组，显示基线的 3 项；取消保存后仍保留空 Draft，焦点回到“保存”；恢复后无 `f`，回到已存负向条件的 2 项 | `25-copy-remove-status.txt`–`28-copy-restored-negative.txt` |
| 覆盖副本 | 加入 priority=1 后为 1 项；覆盖成功沿用副本 ID，URL 无 `f`。Outbox 为同 generation=1 的定义与时间戳 patch，原 View 未更新 | `29-copy-overwrite-draft.txt`、`30-copy-overwrite-success.txt`；最终 JSON 的副本 create → overwrite 与原记录快照比较 |
| 坏 filters 隔离、重试与删除 | 不可用详情提供重试读取；重试后仍不可用且焦点在重试按钮；删除后返回 Library，正常条目保留。本地坏行删除且恰有一个 generation=2 的 tombstone Outbox | `32-invalid-view.txt`–`34-invalid-deleted-library.txt`；最终 JSON 的 `badFiltersDeletion`。重读仍坏不等于模拟了读取网络失败恢复 |
| 已知旧 `none` 修复后重命名 | 读取后 canonical `none`、generation／创建时间不变、无读取修复 Outbox；重命名后仍是同 ID 和 generation=1，只有名称与时间戳 patch，5 项任务可读 | `35-old-none-open.txt`、`36-old-none-renamed.txt`；两份 JSON 的 legacy 检查。仅覆盖已知可等价旧格式 |
| 坏 scope 隔离与项目边界恢复 | 原生 `/all/views` 可见异常项，进入详情有不可用说明与重试／返回入口，不扩大任务查询；项目迁出／迁回、归档／恢复的可用性由 03 的 SQLite／真实页面回归验证 | `38-invalid-scope-library.txt`、`39-invalid-scope-detail.txt`；[03 验证](./03-verification.md)。当前没有项目跨 Space 移动 UI，`UpdateProjectInput`／Patch 不接受 `spaceId`，不为验收新增移动操作 |
| 项目 337 项主／子分组与续页 | “全部”从 150 → 300 → 337 项；显示空优先级组，高／低为 0；已加载组选择 38 项，后续展开／折叠和续页完成后仍为 38，未自动选择新增成员 | `42-large-all.txt`、`43-large-two-level-first-page.txt`、`48-large-select-loaded.txt`–`53-large-exhausted.txt`；[分组总数与已选 38](./evidence-09/group-counts.jpg) |
| 原生预览与 Saved 键盘分页 | 项目预览关闭回到“分页 016｜进行中”任务行；Saved 关闭预览后也返回该行。Saved 用 End 定位已加载尾行，再用 Page Down 到达分页入口，150 → 300 → 337，并到达末行“分页 320｜已取消” | `44-large-keyboard-child-header.txt`、`45-large-preview-restored.txt`、`61-saved-preview-closed.txt`、`64-saved-300.txt`、`65-saved-end-page-two.txt`、`66-saved-last-task.txt` |
| sticky 修复后的新构建复测 | Saved 初页 150，End 后用 Page Down 加载到 300，再用 End 到达下一窗口，最终加载全部 337；到末行“分页 320｜已取消”时，sticky 正确显示“无优先级 › 已取消 22” | `81-fixed-saved-first-page.txt`、`84-fixed-next-page.txt`、`85-fixed-third-page.txt`、`86-fixed-last-row.txt`；[修复后截图](./evidence-09/sticky-after.jpg) |
| 原生窄窗、长名称与编辑键盘 | 系统 Left 窗口操作后截图为 736×863；长名称视图仍显示正确的 1 个任务，编辑弹窗全部控件可见。Tab 明确到达关闭、取消、保存按钮；Escape 关闭后焦点回到“视图操作” | `87-native-narrow.txt`–`90-native-narrow-tab.txt`、`93-native-narrow-cancel-focus.txt`–`95-native-narrow-cancel-return.txt`；[窄窗编辑截图](./evidence-09/narrow-editor.jpg)。92 的 AX 未明确标记名称框焦点，不将其列为已确认 |
| 原生完整成员与顺序比较 | 两入口均为同 Space／项目、all 基线、空附加条件，使用优先级主组、状态子组、优先级降序、recency 与显示空组开启。Project 29 个窗口、最小重叠 7；Saved 42 个窗口、最小重叠 6。拼接后各 337 个唯一名称映射为 337 个唯一实际 ID，完整 ID 顺序相同，恰好覆盖目标项目全部可见任务 | [native-order.json](./evidence-09/native-order.json)。从首行开始用 Down 前进，每 12 步读完整 AX；Saved 已加载 150 的尾行用 Page Down 触达分页入口，继续到 300、337。独立复核重算窗口拼接、来源 URL 与只读库映射；显示属性开关差异不影响成员和排序 |
| 原生键盘保存与重试 | 编辑原项目 View：Tab 经关闭／名称／取消到保存，粘贴完整名称后 Return 保存；新名称为“09｜项目待执行｜键盘保存验收”，同 ID 仍显示两个待执行任务，焦点回视图操作。坏 scope 详情通过 Escape、Tab、Return 激活重试，等待与完成后均保留重试按钮焦点，定义仍明确不可用 | [native-keyboard.json](./evidence-09/native-keyboard.json)保留保存按钮焦点、保存后结果，以及重试前／中／后的 AX；证明实际键盘重读，不声称坏定义恢复成功或 VoiceOver 朗读通过 |

窄窗测试结束后已通过 Window → Return to Previous Size 恢复窗口尺寸，过程补充记录为 `96-native-window-restored.txt`。

后续完整顺序与键盘增量验收也已结束，恢复普通窗口、测试 Space1 与有效视图；没有继续操作原生数据。

原生完整顺序证据来自键盘操作、连续重叠的完整 AX 窗口序列与隔离库只读 ID 映射，不是仅看计数或抽查可见行。它证明记录中的这一组设置；其他排序组合仍由 [05](./05-verification.md)–[08](./08-verification.md) 的 SQLite 与真实页面矩阵证明，不将一次原生比较扩张为全部组合通过。

## sticky 修复与观察限制

- **sticky 尾页标题错误已修复并复测。** [修复前](./evidence-09/sticky-before.jpg)在已取消尾页仍显示“等待中 22”；[useTaskBoardSticky](../../src/features/task/hooks/useTaskBoardSticky.ts)现在以同一个 reconcile 在每次 layout commit 校正标题，同组滚动继续通过 RAF 更新相邻标题推挤。两条[真实 virtualizer 回归](../../src/features/task/hooks/useTaskBoardSticky.test.tsx)先红后绿，包含冻结 RAF 场景；新构建[相同尾页](./evidence-09/sticky-after.jpg)标题已正确。测试 fixture 直接读取未 memo 的真实 API，仅该行有带解释的 `react/incompatible-library` 免除；没有新增依赖。
- **clean Filter 菜单不能仅凭 AX 下结论。** 打开／关闭后 URL、结果未变，但当前 CUA 对菜单的 AX 读取未暴露完整条件 header；不能据此声称 header 缺失或读屏通过。已有 [04](./04-verification.md)的组件／浏览器完整条件证据继续有效。
- **VoiceOver 与 200% 缩放待验。** 当前 CUA 可见的原生 View 菜单只有 Toggle Full Screen；全屏、736×863 窄窗或已有 UI Lab 检查不能替代真实 200% 缩放。键盘保存／取消／重试、归焦和列表导航按上述具体记录计入。
- `57-saved-scroll-page-two.txt` 与 `58-saved-scroll-second-page.txt` 的滚动尝试没有成功，不作为续页证据；采用 64／65 的明确计数变化。`63-saved-page-two-loaded.png` 只有 140×172 的 Stage Manager 缩略图，不用于布局、清晰度或全窗口判断。
- 依[父规格](./spec.md)的页面流程接缝，创建／覆盖／删除失败、导航失败和迟到请求由 01／02 的真实页面故障注入回归证明；不额外要求在原生制造同一故障。原生坏定义“重试仍不可用”只证明该键盘读取交互，不能改写为故障恢复成功；错误朗读仍未验。

## 自动检查与消费者收口

sticky 修复及测试类型修正后，主任务实际运行并复核：

| 检查 | 结果 |
| --- | --- |
| 全 Vitest | 220 文件，1344 项通过；85.35 秒 |
| 全 scripts | 21 文件，197 项通过，包含 release；32.93 秒 |
| Rust workspace | 沿用本轮 302 项通过、12 项外部 PostgreSQL 用例按既有条件忽略；随后未改 Rust，未重复运行 |
| 根静态门禁 | typecheck、lint、boundaries、animations 通过；format:check 最终 951 文件通过。先前测试 `exact: true` 的类型错误已修正，最终 typecheck 已通过 |
| 09 聚焦新增回归 | [ViewSaving](../../src/features/view/components/ViewSaving.test.tsx)共 12/12，通过真实菜单的正／负向保存两条；[ViewRecovery](../../src/features/view/components/ViewRecovery.test.tsx)共 7/7，通过原始非法 filters → 实际 adapter → Library → ID 删除一条；两文件 lint／format／diff 检查通过 |
| sticky 回归与构建 | [useTaskBoardSticky](../../src/features/task/hooks/useTaskBoardSticky.test.tsx)两条先红后绿，已纳入全 Vitest；beforeBuild 通过，Debug Rust 构建 49.22 秒，成功生成新应用并完成上述原生复测 |

四类来源均使用 `useViewSaveFlow`，`useViewsQuery` 仅保留 View 内部消费者；生产 `customSections`／`statusOrder` 分组旁路无残留，测试局部夹具变量有实际用途。已删除被正式页面回归替代的临时 Router 探针和专用配置；保留仍有消费者的 codec、精确旧格式恢复及 Router blocker 接缝。各项权威契约继续由既有模块文档负责，本记录不另建定义。

以上自动结果包含 sticky 最终修复与测试，原生修复证据来自同一源码 manifest 的新构建；以后若继续修改，再按影响补充检查。

本次增量只更新验收记录与两份原生证据，未修改生产代码。主任务重算窗口拼接、337 个唯一 ID 映射、两入口顺序及键盘焦点断言均通过；根 `format:check` 为 953 文件通过，`git diff --check` 通过。未重复运行上表已通过的代码测试。

## 仍需闭合

1. VoiceOver 与真实 200% 缩放；其余现场项目按[覆盖表](./09-coverage.md)核对，不把已有页面故障注入另扩为原生故障门槛。
2. 实际远端与真实设备同步。本轮本地协议记录数为 0；已读取的 delete 证据是待同步 Outbox tombstone，不是远端或其他设备的删除确认。
3. **旧版混用策略待用户答复**：是否所有写入设备统一升级，或需要支持 0.2.0 与新版混用。
4. **历史远端完整定义来源与恢复策略待用户答复**：缺少完整记录时现行行为是明确失败、不推进 cursor；本机 hydrate 不会凭空恢复远端丢失字段。新版同步夹具通过不代表历史自动修复。

后两项沿用 [01](./01-verification.md)与 [03](./03-verification.md)的已有边界。本记录不授权额外远端写入或扩张兼容范围。09 实现与证据随本票提交，状态保持 `implemented-awaiting-acceptance`，整个工作包尚未结案归档。
