# 09 验收覆盖与最终验证步骤

更新日期：2026-09-14。状态：`implemented-awaiting-acceptance`。

本文件归集[父规格](./spec.md)与[09 ticket](./issues/09-views-system-acceptance.md)的证据，不替代既有领域契约。01–08 已有逐票实现与自动化记录；09 已完成最终自动检查和隔离 Tauri 主窗口的代表性操作。三类来源保存后恢复 Default／全部、Saved View 编辑、异常项恢复入口与三页加载已有原生证据；尾页 sticky 标题错误已修复并在新构建复测通过。实现与证据随本票提交，剩余设备与辅助技术验收、历史策略仍待闭合，未将全包结案归档。分层证据见 [09 验证记录](./09-verification.md)。

## 47 条用户故事与完成判据

下表按共享入口合并故事，编号完整覆盖 1–47。这里的“已有证据”指对应测试与逐票记录，不能解释为当前全部验收项已完成。

| 故事 | V / AR | 当前生产入口 | 已有证据与边界 |
| --- | --- | --- | --- |
| 1–12：筛选、保存落点、四类来源、Default、恢复、空 Draft 与历史导航 | V04、AR1 | 四类工作台 scene → `useViewSaveFlow`；URL Filter Session 与 Default selection | [02 记录](./02-verification.md)；[ViewSaving](../../src/features/view/components/ViewSaving.test.tsx) 的四源保存完整链、覆盖、空 Draft、历史导航；09 新增真实菜单回归，且[原生项目／独立事项／所有任务及 Saved 编辑](./09-verification.md)已得到代表性结果 |
| 13–17：写入失败、删除失败、防重复与迟到完成 | V02、AR1 | 共享保存会话、ViewEditorDialog、ViewActionsMenu | [01](./01-verification.md)、[02](./02-verification.md)；[ViewManagement](../../src/features/view/components/ViewManagement.test.tsx)、[useViewSaveFlow](../../src/features/view/hooks/useViewSaveFlow.test.tsx) 验证输入保留、结果身份、导航失败只重试打开、关闭／新会话隔离 |
| 18–19：Library 与定义读取失败恢复 | V08 | ViewsPage、SavedViewPageState 与真实 refetch | [03 记录](./03-verification.md)；[ViewRecovery](../../src/features/view/components/ViewRecovery.test.tsx) 验证失败、pending 焦点、重试与返回 Library |
| 20–24：clean 检查、负向条件、即时编辑与界面密度 | V05 | FilterMenu、FilterClauseEditor、FilterBar | [04 记录](./04-verification.md)；[FilterMenu](../../src/features/filter/components/FilterMenu.test.tsx) 验证完整 scope/context/base、同字段独立条件、操作符保留、检查不写 URL、Escape 不撤回已应用修改、dirty 消失后焦点恢复 |
| 25–26：同步后再编辑、已知旧格式恢复 | V01、AR4 | View codec、repository、origin seed、协议预热／下载物化 | [01](./01-verification.md)、[03](./03-verification.md)；[真实 SQLite／协议往返](../../src-tauri/crates/runtime/src/sync/cursor_pull_view_tests.rs) 与[存量编辑事务](../../src-tauri/crates/storage/src/adapters/view.rs)。仅证明新版 producer 与有界旧格式；旧版混用、历史远端残缺定义仍待用户决策 |
| 27–29：坏定义隔离、说明与按 ID 清理 | V03、AR4 | View list DTO／API adapter → Library／不可用详情；ID 删除 | [03](./03-verification.md)、[04](./04-verification.md)；混合坏 scope／坏 filters 的 SQLite、同步与页面回归；09 原始非法 filters 的完整恢复链见下节 |
| 30–31：项目存在、归属和跨 Space 失效 | V09 | ViewService 的 create/update/list/run 校验；项目事件失效 | [03 记录](./03-verification.md)；[SQLite 项目边界](../../src-tauri/crates/storage/src/adapters/view.rs) 与 [ViewRecovery](../../src/features/view/components/ViewRecovery.test.tsx) 的迁出／迁回，证明不扩大、不自动重绑原定义 |
| 32–36：全局排序、稳定分页、窗口切换、manual 与总数 | V07、AR2 | 共同 TaskQuery 总序、SQL keyset、cursor、Query key、首屏摘要 | [05](./05-verification.md)、[06](./06-verification.md)、[08](./08-verification.md)；[337 条真实 SQLite 三页矩阵](../../src-tauri/crates/storage/src/repositories/task_repository/view_order/tests.rs)、[真实查询页面](../../src/features/task/components/TaskQueryEmptyState.test.tsx) 与慢旧续页隔离测试 |
| 37–40：子分组、一致折叠、已加载选择与空组 | V06、AR3 | Display 唯一 sections/children → flat model → TaskBoard／集合场景 | [06](./06-verification.md)、[07](./07-verification.md)、[08](./08-verification.md)；[真实页面](../../src/features/task/components/TaskQueryEmptyState.test.tsx) 覆盖两级交互、337 条三页、未到达非空组与真实零组、四类页面零结果开关；[Board](../../src/features/task/components/TaskBoard.test.tsx) 覆盖空组禁选和父按钮归焦 |
| 41：已完成置底、最近优先 | V06、AR2 | SQL 叶组顺序中的 completedOrder | [05](./05-verification.md)、[06](./06-verification.md)、[07](./07-verification.md)；真实 SQLite natural/recency 矩阵包含 mixed done、空 completedAt、manual 和主子组，不把完成项搬出叶组 |
| 42：本机偏好、设为默认与恢复 | AR1、AR3 | Display preference、capability 与有效窗口顺序 | [05](./05-verification.md)、[07](./07-verification.md)、[08](./08-verification.md)；[偏好测试](../../src/features/display-options/model/useTaskDisplayOptions.test.tsx) 与真实页面 rehydrate；View 创建／覆盖输入不保存 Display |
| 43–44：筛选空、真正无任务、首次加载与续页失败 | V10 | 共用任务空态、Query 状态与分页 sentinel | [03](./03-verification.md)、[04](./04-verification.md)、[08](./08-verification.md)；[TaskQueryEmptyState](../../src/features/task/components/TaskQueryEmptyState.test.tsx) 覆盖精确 count、首屏缺摘要／计数失败、无匹配调整入口与同 cursor 重试 |
| 45–47：键盘、辅助技术、窄窗、缩放与长列表体验 | V02、V05、V06、V08、AR3 | 生产弹窗／菜单、SubmitRegistry、单 viewport／sticky／预览与 focus bridge | [02 UI](./02-ui-verification.md)、[03](./03-verification.md)、[04](./04-verification.md) 有真实浏览器窄窗与键盘记录；[06](./06-verification.md)–[08](./08-verification.md) 有页面／Board 回归；[09 原生](./09-verification.md)已有取消归焦、预览关闭、End 续页、38 项选择稳定、sticky 新构建复测及 736×863 窄窗编辑／Tab／Escape 证据。VoiceOver、200% 缩放和完整快捷键矩阵未验 |

V01–V10 与 AR1–AR4 均有上表对应入口。AR1 的 mutation／会话／导航集中在 View；AR2 的顺序与 cursor 共用执行定义；AR3 只有一份 Display 分组投影与 Board renderer；AR4 的严格业务与保留异常定义 codec 各有明确消费者。09 继续核对最终消费者与权威文档，不另建平行实现。

## 09 新增的跨票回归

| 组合路径 | 测试与当前证据 |
| --- | --- |
| clean 检查 → 实际正／负向筛选编辑 → 保存 → Default／全部 | [ViewSaving.test.tsx](../../src/features/view/components/ViewSaving.test.tsx) 的“项目未完成从干净菜单编辑 是／不是 待执行，保存后返回默认视图不残留筛选”两条参数化用例，从真实 FilterMenu 生成 Draft，再校验保存请求、返回 ID、Saved View 运算符及任务成员；返回未完成／全部后检查空条件、URL、选中项和实际结果。整个保存文件 **12/12** 通过，文件 lint、format、diff 检查通过。已有四源保存回归继续覆盖其他来源 |
| raw 非法 filters → API adapter → Library 不可用 → ID 删除 → 正常 View 执行 | [ViewRecovery.test.tsx](../../src/features/view/components/ViewRecovery.test.tsx) 的“原始非法筛选经真实适配器隔离为不可用视图，按 ID 删除后正常视图仍可执行”。IPC 仅返回 `is_not [done, unknown]` 原始条件，不预制 definitionError；页面实际显示错误、禁止运行／编辑／覆盖，键盘删除只移除该 ID，正常 View 仍显示任务。聚焦用例通过；整个恢复文件 **7/7** 通过；该文件 lint、format:check、diff 检查通过。未改生产逻辑 |
| 原生 End 跳转 → 虚拟窗口提交 → sticky 跟随当前子组 | [useTaskBoardSticky.test.tsx](../../src/features/task/hooks/useTaskBoardSticky.test.tsx)两条回归先红后绿，包含真实 `useVirtualizer` 与冻结 RAF，覆盖布局提交更新标题和同组滚动推挤；新构建[尾页截图](./evidence-09/sticky-after.jpg)显示“无优先级 › 已取消 22” |

09 已删除被正式页面回归替代的隔离 Router 探针及专用配置，并移除无外域消费者的 `useViewsQuery` 公共导出／单纯转出的 hooks barrel；内部真实查询继续由 View owner 使用。四类来源均经 `useViewSaveFlow`；生产代码无 `customSections`／`statusOrder` 分组旁路，测试内的局部排序夹具仍有用途。旧 schema/wire 字段、精确 `none` 恢复与 Router blocker 接缝仍有当前消费者和退出条件，不作为死代码删除。

sticky 修复后的最终检查由主任务实际运行并复核：全 Vitest **220 文件／1344 项**通过（85.35 秒）；全 scripts **21 文件／197 项**通过（32.93 秒，包含 release）；根 typecheck、lint、boundaries、animations 通过，format:check 最终 **951 文件**通过。Rust 沿用本轮已通过的 **302 项／12 项外部 PostgreSQL 忽略**；随后未修改 Rust，故未重复运行。新增回归和类型检查均纳入最终通过结果。

## 09 原生证据摘要

独立 `StoneFlow Views Acceptance` 主窗口使用合成数据且同步未配置。首轮基于 `fc8a9de6`；最终复测构建加入 09 当前源码，构建 manifest 的文件 hash 与工作树一致。原始现场的代表性链已记录：[项目](./evidence-09/project-all.jpg)待执行 2 项 → 返回未完成 6 项 → 全部 8 项；独立事项为 1 → 3 → 5；所有任务为 71 → 总数 212 → 总数 350（后两步当时只加载 150 项）。Saved View 另存／覆盖／恢复及显式空 Draft、坏 filters 删除、旧 `none` 读取修复后重命名、坏 scope 隔离均有界面或本地库记录。

项目与 Saved 两个入口都达到 150 → 300 → 337 项；项目[原先选中的 38 项](./evidence-09/group-counts.jpg)在续页后仍为 38，Saved 使用键盘 End 到达尾页。发现的[sticky 错组标题](./evidence-09/sticky-before.jpg)已经修复：新构建再次加载 150 → 300 → 337，末行“分页 320｜已取消”对应的[标题正确为“无优先级 › 已取消 22”](./evidence-09/sticky-after.jpg)。这些证据不等于人工逐 ID 比对两入口的全部顺序。736×863 原生[窄窗编辑弹窗](./evidence-09/narrow-editor.jpg)全部控件可见，Tab 可达关闭／取消／保存，Escape 返回视图操作。完整索引、数据库断言和观察限制见 [09 验证记录](./09-verification.md)。

## 用户可操作的最终验证步骤

以下为可复查的操作步骤，不是全部未执行的清单；本轮已完成部分见 [09 验证记录](./09-verification.md)，尚未覆盖的步骤保留待验。在已获准的隔离测试副本中使用含项目任务、独立事项及 todo/doing/waiting/done 的数据；排序分页使用超过两页的混合数据。正式库只做已获准的只读核验，不靠更改正式任务制造复现。

| 步骤 | 操作 | 应记录的结果 |
| --- | --- | --- |
| 1. 原始项目链 | 在项目“未完成”打开筛选，加入“待执行”；保存为一个新名称；打开返回的新 Saved View；再点“未完成”，最后点“全部” | 保存后显示新名称；范围、项目、基线和条件准确。返回未完成恢复 todo/doing/waiting，全部包含 done；选中项、完整条件、实际任务 ID 与总数一致，旧临时筛选不残留 |
| 2. 另外两类来源 | 在“所有任务”与当前 Space 的“独立事项”各重复步骤 1 | 成功落点一致；独立事项不混入项目任务或其他 Space；Default 选项不新增持久化 View |
| 3. Saved View 编辑组合 | clean 时打开完整条件检查并关闭；再次打开，编辑一条排除条件及其值，再 Escape；分别试另存、覆盖、恢复和清空额外条件 | 仅检查不产生 Draft；明确编辑即时生效，排除不变包含，同字段其他条件保留。另存保留原 View；覆盖保留 ID 和固定边界；恢复只丢临时修改；显式空 Draft 显示原基线结果 |
| 4. 历史与重入 | 带临时条件刷新，再后退／前进；重新进入原 Saved View | URL、条件和结果一致；没有草稿与显式空草稿可区分 |
| 5. 全局顺序与分组 | 选择优先级／日期排序，检查原位置 151 条之后的优先任务；加载完三页。设置不同主／子分组，再切换“显示空分组”和“已完成置底，最近优先” | 首屏顺序正确；静态结果无重复遗漏。父子路径独立，同组追加不重复标题；未加载非空组不显示为零；空组开关不改变任务总数或重新读取窗口；recency 只在叶组内生效 |
| 6. 折叠、选择、预览与分页 | 续页未到时折叠并选择已加载组；加载后检查新增成员；在子组菜单折叠全部；键盘打开预览后关闭；滚动到下一页 | 新成员不自动选中，其他组不受影响；父组可恢复焦点；预览关闭回到原任务；sticky 不遮挡键盘目标，只有一个分页入口，不按总数制造空白高度 |
| 7. 可用性与恢复 | 在预置坏定义／项目迁出夹具中打开 Library 和详情；返回、重试或删除异常项。可控失败场景检查写入、读取、删除重试与提交中关闭 | 坏项不阻断正常 View，不扩大查询；删除按 ID。失败保留输入／原记录；写入成功但导航失败只打开已有 ID；迟到请求不导航旧页面或清新草稿。没有可控故障入口时保留自动化证据，不声称原生故障路径已验 |
| 8. 键盘、窄窗与缩放 | 用 Tab／Shift+Tab、Enter、Escape 及界面标示的快捷键完成保存、取消、重试、筛选和分组；使用长名称与无空格长错误；检查窄窗及 200% 缩放，并用 VoiceOver 读取错误 | 所有操作可达、焦点可见并正确恢复、恢复按钮不裁切；错误可感知。缩小窗口不能替代真实 200% 缩放；没有可操作缩放或读屏入口时明确记录未验 |
| 9. 真实设备同步 | 支持范围确认且测试远端获准后，在两个实际设备／副本上执行创建 → 同步 → 重命名／覆盖 → 同步 → 删除 | 记录双方构建版本、View ID、查询条件和实际任务结果；与本地 SQLite／协议往返分别记录，不把本地夹具写成跨设备通过 |

可在仓库根目录重跑对应自动回归，不需启动开发服务或连接正式数据库：

```bash
bun run test:dom src/features/view/components/ViewSaving.test.tsx src/features/view/components/ViewRecovery.test.tsx src/features/task/components/TaskQueryEmptyState.test.tsx
```

本轮根级自动检查结果见上节，新增构建 manifest 后的最后格式检查待补；后续若继续修改，应重跑受影响检查。人工步骤按实际证据逐项收口，本文件不更改 ticket 勾选状态。

## 尚未闭合的边界

- **真实设备同步、完整原生快捷键／VoiceOver／200% 缩放未验收。** 当前 CUA 的 View 菜单仅暴露 Toggle Full Screen，不能将全屏或窄窗当作 200% 缩放。UI Lab、jsdom 页面、隔离原生主窗口、本地 SQLite／协议夹具各自证明其覆盖层面。
- **clean 筛选完整标题的原生 AX 观察不足。** CUA 只暴露菜单，未暴露完整条件 header；这不足以断定界面缺少 header，也不能替代读屏验收。完整条件的组件／浏览器证据仍沿用 04。
- **0.2.0 与新版混用策略待用户答复。** 是否统一升级所有写入设备，或需要支持混用的迁移／冲突恢复，尚无已确认结论；不把没有答复当作批准。
- **历史远端残缺完整定义的恢复策略待用户答复。** 当前缺少可恢复完整记录时明确失败且不推进 cursor；已有本机 hydrate 不会自动修复远端丢失字段。不能据新版往返通过声称历史数据自动恢复。

后两项沿用 [01 验证记录](./01-verification.md)与[03 验证记录](./03-verification.md)的边界；本文件不扩张迁移、远端写入或旧设备支持范围。只有最终功能、架构和原始现场证据均闭合，才能把整个工作包标为完成。
