# Views 系统审计

审计时间：2026-09-13；代码基线：`5324f423` 及当前工作树。审计不修改生产代码或用户数据。原有 9 个暂存文件保持不变；本目录仅保存审计报告和隔离探针。

## 结论与用户场景

**Block：确认 10 项问题，优先处理同步后无法修改、失败无反馈与保存流程不完整。** 默认视图、保存视图、临时筛选分开的领域方向可以保留；当前缺口主要在边界接线、反馈和执行一致性。

用户场景：在“未完成”添加“待执行”筛选，保存视图后看不到新视图；切换选中项后任务仍只有待执行。

已查明的事实：

- 正在运行的调试进程打开正式 SQLite 数据库。只读查询发现 1 条 Saved View，创建于北京时间 2026-09-13 00:12:36，定义为 `space + standalone + active + status is todo`。**保存已成功；该记录的 context 是独立事项，不是项目。** 没有据此推断用户实际点了什么。
- 该独立事项范围当前是待执行 6 条、已完成 2 条，没有进行中或等待中。恢复“未完成”仍返回同样 6 条符合当前数据；切换“全部”应返回 8 条。
- 该记录 `group_by_json` 已经是非 JSON 文本 `none`，第 1 项同步缺陷在本地数据中实际存在。
- 项目、全部任务、独立事项的保存回调只创建并清除临时筛选，没有打开返回的新 View；当前工具条又只列内置项。用户在原页看不到保存结果是确定的流程缺口。
- 真实 Router + PageFrame + 筛选会话的隔离探针证明：“待执行 → 全部”能删除 `f`，“保存后 clearTemp”能恢复空附加筛选。Task Query key、调用参数和 SQL 均包含当前基线及筛选，未发现默认定义被覆盖的路径。
- **“真正切到全部后仍只有 6 条”的原生现场尚未复现。** 当前调试可执行文件不能被可用原生 UI 工具选中；UI Lab 也没有渲染 Views 完整页面。不能用隔离测试通过替代这一现场结论。

## 范围与依据

覆盖 Default View、Filter Draft、保存/覆盖、Saved View Library、详情切换、编辑/删除、Query 缓存、统一任务执行器、SQLite/Outbox、同步物化、旧定义解码，以及任务视图的 Display 选项。

技术栈：React 19、TanStack Router/Query、HeroUI、Tailwind、Tauri 2、Rust/SeaORM/SQLite。遵循 `AGENTS.md`、`docs/agents/domain.md`、`docs/agents/issue-tracker.md`、`Documents/01-架构/A1-领域模型.md`、`A2-系统设计.md`、`A3-界面系统.md`，以及 view/filter/task-workspace/display-options/styles 的既有职责边界。

领域不变量：Default View 不入库；Saved View 保存 `scope + context + baseViewKey + filters`；Filter Draft 仅由 URL `f` 持有；Display 不进入 Saved View 定义。项目 context 不允许通过删除普通筛选移除，且应与 scope 一致。没有新建平行领域模型或 ADR。

## 已确认问题

严重度 HIGH 表示阻断操作、误导结果或系统性失败；MEDIUM 表示可用性、效率或一致性缺陷。边界问题的条件与当前现场分开标明。

| ID / 严重度 | 领域 | 位置 | 现状 | 建议 | 影响与证据 |
| --- | --- | --- | --- | --- | --- |
| V01 HIGH | 同步 / 持久化 | `src-tauri/crates/runtime/src/sync/cursor_pull.rs:1621`；`src-tauri/crates/application/src/view/service.rs:324,699` | 本地把 group_by 存成 JSON 字符串 `"none"`；上传解码后下载用 nullable_string 写成裸文本 `none`；后续 update 又尝试 JSON 解码旧值 | 统一同步序列化契约，并对已存在的错误文本制定有边界的数据修复；补 create→同步物化→rename/overwrite 往返验证 | 重命名/覆盖在构造 Outbox 差异时失败，事务不能提交。只读生产记录已确认该错误形状；未通过写入生产库来试错 |
| V02 HIGH | 交互 / 可访问性 | `src/features/filter/components/FilterBar.tsx:315`；`src/features/view/hooks/useViewsScene.ts:97,105,144,331`；`src/app/providers/query/queryClient.ts:3` | 新建、覆盖、重命名只 finally 退出 pending，删除同样无失败反馈；Mutation 和 QueryClient 没有全局错误提示 | 在负责操作的 UI 保留输入、展示可被读出的具体错误和重试；删除失败提供明确反馈 | V01 等真实错误发生时，用户只能看到按钮恢复或列表没变化，无法判断是否保存成功 |
| V03 HIGH | 数据错误隔离 | `src-tauri/crates/application/src/view/service.rs:236`；`src-tauri/crates/runtime/src/sync/cursor_pull.rs:999` | list_views 对全部行先 scope JSON 解码/校验，才按 scope 过滤与隔离坏定义；单个坏 scope 会提前返回错误 | 将 scope 解码异常纳入逐行隔离，保留可清理入口；同步输入结构校验与读取隔离配套 | 单条坏记录能使所有 scope 的库读取失败。当前生产记录 scope 有效，**这不是本次新视图不显示的已证实原因** |
| V04 MEDIUM | 保存流程 / 信息架构 | `src/features/project/hooks/useProjectDetailScene.ts:129`；`src/features/task/hooks/useTaskListScene.ts:108`；对照 `src/features/view/hooks/useViewsScene.ts:272` | 普通任务页创建后丢弃新 View 返回值，仅 clearTemp；工具条只有内置项。Saved View 详情另存却会导航新 View | 普通页另存成功后进入返回的新 View 详情；保留视图库作为统一管理入口 | 保存结果缺少可见落点，三个入口行为不一致。无需把全部 Saved View 塞进项目工具条，也无需改 Default View 持久化模型 |
| V05 MEDIUM | 筛选状态 / Layout | `src/features/filter/components/FilterMenu.tsx:43,53`；`src/features/filter/core/normalize.ts:125`；`src/features/filter/components/FilterBar.tsx:50` | 菜单只识别 is。已保存 is_not 生效时菜单全未选；clean FilterBar 隐藏，重命名弹窗不展示完整定义；再次选同字段会删除负向条件改成 is | 让当前完整条件有准确可达的检查入口，菜单表达排除状态与替换语义 | 负向定义在实际查询和可见选择间失真。保持 clean View 不重复展示 chips 的既有约定即可，不必重做整个 FilterBar |
| V06 MEDIUM | Display 执行一致性 | `src/features/display-options/components/DisplayOptionsPanel.tsx:117,168,194`；`src/features/display-options/adapters/task/task-display-groups.ts:17`；`task-display-apply.ts:51`；`task-display-compare.ts:45` | 子分组、显示空分组、完成按近到远可操作和保存；adapter 不消费 subGroupBy/completedOrder，includeEmptySections 固定 false | 实现已经承诺的选项；暂不支持的能力应从 capability 和 UI 中收回 | 生产纯函数探针确认三项切换后对应结果不变；现有 UI 测试只验回调 payload |
| V07 MEDIUM | 排序 | `src/features/display-options/core/task-display-defaults.ts:52`；`src/features/display-options/adapters/task/task-display-compare.ts:77`；`src-tauri/crates/storage/src/repositories/task_repository/view_query.rs:36` | 项目默认 manual；SQL 返回 position/id 顺序，却被前端改为 updatedAt DESC/id | manual 保留上游稳定顺序，并修正冻结错误行为的测试 | 探针输入 first/second、仅 second 更新时间更新，输出 second/first。更新元数据即可改变所谓手动位置；不必为此增加新 DTO 字段 |
| V08 MEDIUM | 读取恢复 / Writing | `src/features/view/components/ViewsPage.tsx:87`；`src/features/view/components/SavedViewPage.tsx:105` | 读取失败提示“稍后重试”，但库没有重试动作，详情只有返回库；scene 未暴露相应 refetch | 错误状态提供重试，继续保留返回库 | 用户无法在当前页面执行提示要求的恢复动作；与任务结果已有重试能力不一致 |
| V09 MEDIUM | 查询边界 | `src-tauri/crates/application/src/view/service.rs:544`；`src-tauri/crates/storage/src/repositories/task_repository/view_query.rs:58,106` | View 校验项目 UUID 格式，但不检查项目存在及与 space scope 的一致性；矛盾定义被接受后执行成空结果 | 在 View 用例落实 A1 的存在/归属约束，并明确项目跨 Space 移动后的 View 行为 | 是后端允许的无效定义边界；正常前端是否生成这种组合没有复现，不归因于本次 standalone 记录 |
| V10 MEDIUM | 空结果文案 | `src/features/project/hooks/useProjectDetailScene.ts:106` | 今天/已完成/临时筛选返回 0 项，也显示“当前项目没有任务”“先放进第一项” | 区分项目确实为空与当前视图无匹配，后者引导调整视图或筛选 | 会把已有任务描述成不存在；无需为了文案额外加载全量任务 |

## 已排除与尚未定性

已排除：

- 当前 create_view 生成独立 ID，没有覆盖代码定义 Default View 的路径。
- View CRUD 统一失效 `['views']`，包含视图库与 Saved View 结果，不是单纯漏做列表缓存失效。
- Task Query key 没遗漏 scope/context/baseViewKey/filters，切换请求完成后替换旧集合的既有测试通过。
- 名称没有被本轮怀疑的最大长度约束，不报告“超长名称无提示”的假问题。
- 不把项目明确选择的桌面密度、clean View 隐藏 chips、提交中允许关闭弹窗当作缺陷。

尚需产品契约或正常 producer 证据：

1. **分页与排序**：SQL 先按 position/id 取 150 条，再只排序已加载集合；第一屏不保证是整个结果的最高优先级或最早截止任务。需要明确是否要求完整结果排序，再选择稳定游标方案；不能靠全量 materialize 绕开。
2. **FilterQuery 规范化**：后端接受重复同 field/op 的 clauses，SQL 用 AND；前端合并 values 后为 OR。正常前端保存已先 normalize；存量/同步输入是否能进入该形状，需有真实 producer/往返验证。
3. **本周定义**：执行器使用今天至下周一，排除本周已经过去的日期；应明确“本周”还是“本周剩余”。
4. **项目移动**：需要明确已保存的固定项目 context 跟随项目、失效提示还是禁止矛盾 scope；本轮没有写入新领域决策。

## 界面覆盖

| Domain | 检查证据 | 结论 / 边界 |
| --- | --- | --- |
| Accessibility | 列表、菜单、表单命名、键盘测试、loading/error 代码 | V02；真实辅助技术朗读及 200% 缩放未验证 |
| Layout | 保存路径、工具条、Library/Detail、负向筛选入口 | V04/V05；窄窗、长名 pills、320px 裁切未验证 |
| Writing | 操作文案、空态和失败恢复 | V08/V10 |
| Typography | 既有语义类、截断与组件源码 | 未新增推测性缺陷；实际排版未验证 |
| Colors | 既有 token/组件用法 | 渲染对比度未验证，不能声称通过 |
| UI | 保存状态、菜单行为、现有组件交互测试 | V02/V05；原生页面视觉未验证 |

make-interfaces-feel-better 的五类：Typography/Surfaces/Icons 做了源码检查，没有据外观猜测增加问题；Animations 未发现本轮需要改变的自定义动效，未进行 10% 速度运行复查；Performance 只追踪计算与加载范围，未做帧率/耗时性能测量。

UI Lab 实际交互：搜索 View，打开 ViewEditorDialog 与 Collection Pages。两者明确显示“未在 UI Lab 渲染”，所以不把目录登记当作完整流程验收。尝试定位正在运行的 debug executable，原生 UI 工具不能选择该进程；没有启动另一份应用或开发服务。

## 验证

- `bun run test:run src/features/filter/core src/features/filter/model/useListFilterSession.test.tsx src/features/task-workspace/model src/features/task/hooks/useTaskData.test.tsx src/features/view/hooks src/features/display-options`：14 文件、59 项通过。
- `bun run test:run src/features/view/components/ViewsPage.test.tsx src/features/view/components/ViewEditorDialog.test.tsx src/features/view/components/ViewActionsMenu.test.tsx src/features/filter/components/FilterBar.test.tsx`：4 文件、19 项通过。
- `cargo test --manifest-path src-tauri/Cargo.toml -p stoneflow-application -p stoneflow-storage view --lib`：13 项通过，其中 1 项是名称匹配到的 Project overview。
- `bun run test:run --config .scratch/views-system-audit/vitest.config.ts`：2 项隔离探针通过，直接组合生产 Router search parser、两个会话 hooks 和 PageFrame Toolbar；不包含数据库与真实项目场景装配。
- 两次直接调用生产 Display adapter 的纯函数探针，确认 V06/V07；它们记录现状，不把错误行为当作正确契约。
- SQLite 使用 `mode=ro`、`query_only=ON`，只读视图结构与聚合计数；没有输出任务正文或凭据，没有写回。
- 原有暂存区 SHA-256：`47699297f88d52c25ec63b5315c8d8482318bfc994eb902f5e4c4f468c28c053`；收尾须保持一致。

现有测试的关键缺口：没有覆盖“创建 → 同步物化 → 修改”的 ViewService 往返；没有“筛选 → 保存 → 打开新 View → 切回 Default”的整页回归；没有请求拒绝反馈与负向基线条件的完整交互验证。有些测试只验证 callback，manual 测试甚至固定了错误排序。

## 修复次序与决策依据

1. 先修 V01/V02：目前生产数据已经满足失败条件。序列化契约在共同边界修正，同时保留失败信息；对错误存量格式的恢复要有精确范围，不能批量猜测用户查询。
2. 修 V04/V05/V08/V10：保存后打开新 View、让当前定义可检查、提供真实重试与准确空态。Default/Saved/Draft 三个概念保持清楚，不增加第二套可写状态。
3. 修 V06/V07，再补 V03/V09 的边界隔离与校验。验证聚焦实际输出和往返，不以按钮能切换或缓存被 invalidated 代替行为证据。
4. 原生“全部仍是待执行”的现场另行闭合；目前只确认保存记录、数据分布和正常会话路径，不能宣称该症状已经复现或修好。

依照石头鱼的工程规则，本轮按真实状态所有者定位：持久化问题归序列化边界，导航归保存用例，筛选事实归 URL/定义，显示行为归共同 adapter。现有领域分工能承载修复，没有证据支持立即重写整套系统。涉及排序跨分页语义或项目移动策略的决定仍需确认，未写入新 ADR。

**最终判定：Block。** 完整原生交互、跨设备同步往返、辅助技术、窄屏及渲染对比度均未完成验收。以上是审计结果，不是修复完成声明。

## 补充：架构复核

这部分是结构性诊断和建议，尚未实施，也没有替代权威文档中的已确认决定。前面的功能问题不自动等于需要重构；以下四处都有跨模块的实际因果。

### 1. 工作台的流程所有权没有统一

`Documents/01-架构/A2-系统设计.md:33` 要求页面仅提供上下文、基线和专属动作，工作台统一接线查询、筛选、Display 与 Board；`src/features/task-workspace/ARCHITECTURE.md:14-19` 却明确不负责查询、执行和编排。代码遵循后一种边界：`TaskWorkspace.tsx:24-49` 是 UI 组合，保存与后续导航分别写在 `useTaskListScene.ts:108`、`useProjectDetailScene.ts:129` 和 `useViewsScene.ts:255`。

这不是“组件代码短”或“页面有 hook”本身的问题。实际重复的是保存当前查询、清除草稿、决定落点这套业务流程；三个入口已经出现不同结果。因此先统一此流程的所有者与输入/输出，页面只提供当前查询定义和必要的上下文。视觉 TaskWorkspace 可以继续保持纯组合，不必把项目 mutation、查询与导航全部塞进一个巨型 hook。实施时应先消除 A2 与局部模块文档的职责矛盾，不能静默选一份。

### 2. 完整结果的排序与分页缺少共同执行契约

现有 A2:48 把排序归 Display，A2:61 固定按 `(position,id)` 取窗口；`src/shared/types/view.ts:48` 的请求没有排序，SQL 在 `view_query.rs:36` 截页，前端 `task-display-apply.ts:22` 再排序当前已加载项。各层可以同时遵守文档，组合后却无法保证完整集合按用户指定顺序出现。

例如最高优先级任务在 position 第 151 条，第一页 150 条内排序永远不能把它排到首位。若产品要求完整结果排序，推荐保留 Display 偏好在本机、Saved View 仍只保存查询成员定义，但运行请求携带当前排序；排序执行、稳定 cursor 和 Query key 共用一套顺序契约。Count 仍仅依据成员资格。前端继续持有字段显示、分组呈现和已加载项的虚拟几何。

便宜替代是明确只对已加载任务排序，保留当前执行边界；这是降低产品保证，需要界面明确表达。全量取回再排序违背现有性能基线，不建议采用。排序参与请求不等于排序必须写入 Saved View。

### 3. 声明通用分组，底层仍然围绕 TaskStatus 建模

`task-display-types.ts:21-33` 同时输出 sections、customSections 与 statusOrder；`task-display-apply.ts:35-46` 对状态分组丢弃已生成 sections，交给 `taskBoardModel.ts:78` 再分组，其他维度走 `:62-75` 的固定 `open:true` 分支。`taskBoardModel.ts:45` 的折叠状态是 TaskStatus[]，`TaskBoard.tsx:791` 只有 status 分组得到展开回调，`:799` 的非 status 分组也拿不到当前组任务。

因此“分组换一种属性”会改变折叠和组操作能力，子分组也没有对应的执行投影。这比少写几个选项分支更深。若要保持当前通用分组承诺，推荐 Display 产出唯一分组结果，Board 按稳定 group key 消费；status 作为创建任务等领域动作的可选元数据，而非所有组的身份类型。折叠/选择继续归集合交互所有者，虚拟列表 renderer 不另起一套。

若产品只需要状态分组具备完整交互，可选择收缩 capability，明确其他分组的有限能力。这个替代能减少改动，但必须同步产品承诺，不能让面板继续声称支持没有执行路径的行为。

### 4. View 业务定义被旧存储字段和分散协议编码牵制

`service.rs:301` 声明 sort/group 已退出产品契约，却在 `:324` 更新时重新解码旧行的全部协议字段。旧 group_by 格式能阻断纯重命名，说明兼容存储细节穿透了业务成功条件。保留旧列本身没有问题，继续依赖它决定当前业务是否成功才是问题。

同一数据库行到协议字段的编码分散在 `application/src/view/service.rs:678`、`runtime/src/sync/origin_seed.rs:350`、`runtime/src/sync/cursor_pull.rs:546`。反向物化在 `cursor_pull.rs:996,1612` 再解释一次字段，且未复用定义校验。API 输入和存储读取已经复用了 validate_definition，不应把它们误报为需要重写的重复校验。

推荐只收敛 View 的具体编码与验证边界：当前定义产生业务差异，兼容字段由边界输出 canonical 值；CRUD、seed 与同步物化使用同一套协议映射。对无效、不可无损迁移和损坏记录提供一致的逐条隔离。可以保留当前 schema 和 wire shape，不需要立即删列。物理删除旧列或协议字段必须另核对旧设备消费者，不能在普通修复中顺带完成。

### 应保留的部分与验证方式

Default / Saved / Draft 分离、URL 持有 Draft、Query 持有业务缓存、Display 偏好留在本机、Rust 统一成员查询执行器、Board 只计算已加载项几何，这些方向已有清楚的职责，不应为了“改架构”换技术栈或再加一套 View store。

工程保障还需要从零散回调检查补到跨边界行为：保存→落点、定义→同步→再修改、排序→分页窗口、分组投影→折叠和选择。优先复用现有测试工具，少量契约回归比新增大量逐组件快照更有价值。

建议先收敛保存流程与 View codec，再明确完整结果排序保证和分组交互承诺，最后落地相应执行边界。本节只完成源码/文档复核，沿用上一轮已经运行的验证证据，没有新增生产变更或数据库写入。
