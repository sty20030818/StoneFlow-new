# 任务集合查询与虚拟列表性能重构 - Spec

## 背景与目标

「所有空间」落地后，`scope=all` 与单 Space 共用同一套「所有任务 / 视图」读路径与 Board 渲染。本机实测量级约为 **5 Space / 138 条可见任务**，打开 All 与滚动均明显卡顿。根因不是文案或路由，而是：

1. **读路径**：跨 Space 全量拉取 + space/project 回填串行 N+1（且 list 路径未去重）+ 列表 DTO 过胖。
2. **写渲染**：Board 对全量任务 `map` 进 DOM，无虚拟化；hover 状态上提导致整表 re-render；每行挂满 ContextMenu / Metadata dropdown / placement groups。
3. **默认集合**：`viewKey=all` 默认含 done/canceled，「所有任务」页首屏即最大集合。

目标量级已确认：**≤2k 任务**仍应流畅打开与滚动。本任务做**长期最优、允许破坏性重构**的收口：统一查询引擎、窗口化读取、列表投影瘦身、统一 Virtual Board、行交互隔离与按需挂载；并在「所有任务」筛选条增加「未完成任务」且默认激活。

本任务取代「靠 All 特判 / 前端假分页 / 兼容双 DTO」等半吊子优化路径。

## 范围

- **后端读模型**：合并 `list_tasks` 与 `run_task_view` 的候选集/enrichment 为同一 Task 查询执行路径；SQL 侧过滤；`WHERE id IN (...)` 批量补 space/project 名；禁止串行 `get` 循环。
- **列表投影**：列表契约去掉 `note` 等详情字段；详情/预览仍走 detail 读路径。
- **窗口化查询**：cursor / keyset 窗口（首屏有限条 + 滚动续拉），All 与单 Space、系统 View / 自定义 View **同一窗口语义**。
- **前端 Board**：所有任务集合场景（所有任务页、独立事项、项目页任务板、视图页）共用**同一** Virtual Board，不按 scope 分叉。
- **行渲染**：hover 不再用父级 React state 刷全表；行 `memo`；ContextMenu / dropdown options **按需挂载**；placement groups Board 级计算一次。
- **产品筛选**：「所有任务」页筛选条在「所有任务」**之前**增加「未完成任务」（排除 `done` + `canceled`），**默认激活**；「所有任务」仍可一键看含已完成/已取消的全量（受窗口与虚拟列表约束）。
- **依赖**：引入 `@tanstack/react-virtual`（选型见 PLAN）；删除因双轨产生的冗余兼容代码。
- **文档**：同步 A2 / A3 / 相关 feature ARCHITECTURE 中与列表读模型、Board 性能约定冲突的描述。

## 不做什么

- 不做「仅 All scope」的第二套 Board / 第二套 query 特判分支。
- 不引入 react-virtuoso（选型见 PLAN；不双库并存）。
- 不重做同步协议、outbox、领域归属不变式（Task 仍永远属于具体 Space；`all` 不是 `space_id`）。
- 不在本任务做标签、多人共享、全局搜索重构、项目总览增强。
- 不做传统网页分页控件（页码条）；窗口是滚动续拉，对用户尽量无感。
- 不把 note 编辑、详情布局、创建流程重做进本任务。
- 不保留「旧 list DTO 含 note + 新投影」双契约兼容层；一切换，测试与调用方同步改。
- 不在本任务解决非任务集合列表（如侧栏项目树、历史下拉）的虚拟化，除非与共享 Board 基建偶然重叠。

## 用户场景与需求

### US-1：打开执行台要快

作为同时使用多个 Space 的个人用户，我想打开「所有空间 → 所有任务」时在可感知的短时间内看到首屏任务，以便立刻扫优先级与状态，而不是卡住等全量渲染。

### US-2：滚动要顺

作为用户，我在数百到约两千条任务的状态 Board 上滚动、悬停、多选时，界面应当保持可交互帧率，以便连续处理任务。

### US-3：默认先看未完成

作为用户，我进入「所有任务」时默认只想看到未完成工作（排除已完成与已取消），并仍能一键切到「所有任务」看全量，以便执行台与归档浏览分层。

### US-4：视图与所有任务同一套性能契约

作为用户，我在系统 View / 自定义 View 下跨 Space 或单 Space 浏览时，打开与滚动体验应与「所有任务」同级，而不是视图页仍卡。

### US-5：操作语义不缩水

作为用户，我仍要能在列表上改状态/优先级/日期/归属、多选批量、键盘快捷键与预览，以便性能优化不牺牲执行能力。

## 能力边界

| 维度 | 契约 |
|---|---|
| 目标规模 | 活跃数据集约 **≤2k** 可见任务时，首屏打开与滚动可接受（具体阈值见验收；不以保证 10k+ 为硬指标） |
| 默认筛选 | 「所有任务」页（`variant=all`，含 All scope 与单 Space）筛选条：**默认「未完成任务」** = 排除 `status ∈ {done, canceled}`；「所有任务」= 不限 status（仍受生命周期/归档规则约束） |
| 窗口 | 查询返回有界窗口；滚动接近末尾续拉；客户端不假设一次拿到全集 |
| 投影 | 列表项无 `note`；需要正文时走 detail/preview 查询 |
| Board 唯一性 | Task 集合 UI 只有一套 Virtual Board 实现；Scene 只接线 |
| 分叉 | 禁止 `if (scope === 'all')` 性能特判路径成为长期架构；scope 只影响 query 参数 |
| 破坏性 | 接受 list IPC 契约变更、Board 内部 API 重构、删除双轨 enrichment |

## Definition of Done

- 全部编号验收标准通过定向自动化测试和/或可复现的手动验证步骤。
- 本机或等价数据集（≥100 条、含 All scope）上：打开「所有任务」与滚动无明显掉帧；无「悬停一行全表重绘」类行为。
- `list_tasks` / `run_task_view`（或其后继统一 command）读路径无串行 N+1；列表 payload 不含 note。
- 所有任务集合入口共用 Virtual Board；无第二套列表实现残留。
- 筛选条「未完成任务」默认激活且语义正确；切到「所有任务」可看到 done/canceled。
- 相关 typecheck / boundaries / 定向 Vitest / 触及的 `cargo test` 通过。
- PLAN 登记的长期文档已同步或明确记入归档前同步清单。

## 验收标准

- **AC-1**：当用户打开「所有任务」页（All scope 或单 Space）时，系统应当默认激活「未完成任务」筛选，且列表中不出现 `status` 为 `done` 或 `canceled` 的任务。
- **AC-2**：当用户在「所有任务」页点击筛选「所有任务」时，系统应当展示当前生命周期规则下的任务（可含 done/canceled，仍不含已归档/已删除，与既有 lifecycle 约定一致），且「未完成任务」不再处于激活态。
- **AC-3**：当用户在筛选条看到选项顺序时，系统应当保证「未完成任务」出现在「所有任务」之前。
- **AC-4**：当列表查询返回任务项时，系统应当不在列表契约中包含 `note` 字段；当用户打开任务详情或预览时，系统应当仍能读取完整 note。
- **AC-5**：当 `list_tasks` 或统一后的任务列表查询在 `scope=all` 下执行时，系统应当对 space/project 名称使用批量查询（单次或有界次数 IN 查询），不得对每条任务串行 `get`；相同 space/project id 不得重复查询。
- **AC-6**：当可见任务数量达到数百级（验收参照 ≥200，目标能力 ≤2k）时，系统应当仅将视口附近有界数量的任务行挂载为完整交互 DOM（虚拟列表），而不是为全部任务各挂一棵完整行树。
- **AC-7**：当用户指针在任务行之间移动产生 hover 变化时，系统不得因 hover 状态导致整表所有任务行全面重新协调渲染（允许单行或局部更新）。
- **AC-8**：当用户在 Virtual Board 上滚动接近当前已加载窗口末尾且服务端仍有更多匹配任务时，系统应当自动续拉下一窗口并拼接到列表，且不重置用户滚动位置到顶部。
- **AC-9**：当用户在视图页（系统 View 或自定义 View）查看任务列表时，系统应当使用与「所有任务」相同的 Virtual Board 与同一查询窗口语义（仅 View definition / scope 参数不同）。
- **AC-10**：当用户在虚拟列表中对任务执行改状态、改优先级、多选批量或既有行快捷键时，系统应当保持与重构前一致的可观察业务结果（持久化成功且列表反映更新）。
- **AC-11**：如果统一查询或虚拟列表在加载/续拉失败，则系统应当展示可读错误态或保留已展示窗口并允许重试，不得静默空白且不得崩溃主窗口。
- **AC-12**：当重构完成时，代码库中不得再保留「列表 DTO 含 note」的并行契约，也不得再保留仅用于兼容旧 enrichment 的串行 `list_by_ids` 循环实现作为任务列表主路径。

## 关联模块

- `src-tauri/crates/application/src/task/`（list / query 编排）
- `src-tauri/crates/application/src/view/`（`run_task_view` 与统一 query 的衔接）
- `src-tauri/crates/storage/`（`list_visible` / `list_for_view`、批量 lookup、索引使用）
- `src-tauri/crates/runtime/src/commands/tasks.rs` 与 view 相关 commands
- `src/features/task/`（list scene、collection scene、Board、Row、filter pills）
- `src/features/view/`（ViewsPage / useViewsScene）
- `src/features/project/`（项目页任务板若共用 Board）
- `src/features/filter/`、`src/features/display-options/`
- `src/shared/components/board/`、`src/shared/components/row/`
- `src/shared/types/task.ts`（列表契约）
- `src/features/task/shortcuts/`（行快捷键与 hover 模型）

## 当前技术方案

**统一 TaskQuery 引擎 + 列表投影瘦身 + cursor 窗口 + 共用 `@tanstack/react-virtual` Virtual Board + 行交互隔离；「未完成任务」默认筛选。**

详细备选取舍、数据流、分阶段落地与风险见 [PLAN.md](PLAN.md)。

## 关联文档

- [任务方案编写 SOP](../任务方案编写SOP.md)
- [所有空间任务执行台落地](../../98-归档/02-已完成重构/2026-07-31-all-spaces-task-workspace/SPEC.md)（产品契约；本任务修正其「&lt;50 且不做虚拟列表」的量级假设）
- [P2 产品蓝图](../00-产品/P2-产品蓝图.md)
- [A2 系统设计](../01-架构/A2-系统设计.md)
- [A3 界面系统](../01-架构/A3-界面系统.md)
- 对话确认（2026-07-31）：目标规模 ≤2k；虚拟列表 + cursor 窗口；接受破坏性契约；Board 全场景共用；打开与滚动均卡；筛选增加默认「未完成任务」
