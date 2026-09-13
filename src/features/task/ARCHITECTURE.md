# task · 任务域

> 定稿最优架构。写法见 [`CONVENTIONS.md`](../../CONVENTIONS.md)。最后更新：2026-09-13

---

## 1. 心智

```txt
列表薄页 / project / view
  → TaskListSceneView | useTaskListScene
  → useTaskCollectionScene（展示 / 选择 / 预览 / 批量 / Board 接线）
  → TaskBoard + filter / display / selection / preview

详情
  → TaskPage | TaskDetailContent | TaskPreview（detail/）
  → Sheet / Aside 容器选择与显式完整页导航由 entity-detail 拥有

创建
  → 壳 Overlays 挂 TaskCreateContent
  → create/taskCreateForm（schema · 默认值 · toCreateInput）

打开策略
  → model/taskOpenStrategy（命令 open path · 壳 detail 判定）

批量 / 命令
  → bulk/（动作定义 + adapter）
  → commands/registerTaskCommands（壳层唯一 CommandRuntime）
  → shortcuts/useTaskRowCommandShortcuts（只做按键匹配与目标投影）
```

跨模块只使用稳定入口：完整 facade 走 `@/features/task`，IO 窄入口走 `@/features/task/api`，placement 纯契约走 `@/features/task/contract`，文案与指示器走 `@/features/task/presentation`。
**禁止** `features/task` → `@/layout/**`。

---

## 2. 目录结构（定稿）

```txt
src/features/task/
├── ARCHITECTURE.md
├── index.ts                 # 主 public
├── contract.ts              # placement 窄契约（避主 barrel 环）
├── presentation.ts          # 文案与纯展示指示器窄契约
├── api/                     # IO only（唯一 invoke）；index.ts 是跨 feature 窄入口
├── hooks/
│   ├── task.keys|queries|mutations
	│   ├── useTaskListController · useTaskSelection · useTaskData · filter
	│   ├── useTaskCollectionScene.ts # 任务集合的唯一交互编排
	│   ├── useTaskListScene.ts  # all / standalone 数据源与页面差异
	│   └── list-scene/          # variant 配置
├── model/                   # 纯规则 + indicators（无 React hook）
├── create/                  # 创建表单内核
├── bulk/                    # 批量动作 + adapter
├── commands/                # registerTaskCommands · buildTaskCommandContext
├── components/              # Board · Row · Create · ListSceneView · ContextMenu(+helpers/items)
├── detail/                  # 详情子树；preview = Provider 壳 + store/helpers/register
└── shortcuts/               # Scope 壳 + controller/navigation/runtime/scroll/guards
```

---

## 3. Public 要点

| 类 | 示例 |
|----|------|
| 列表 | `TaskListSceneView` · `TaskBoard` · `useTaskCollectionScene` |
| 创建 | `TaskCreateContent` · `taskCreateSchema` · `toTaskCreateInput` |
| 打开策略 | `resolveCommandOpenTargetPath` · `resolveShellDetailState` |
| 筛选 | `useTaskPageFilterController` |
| 命令选中 | `buildTaskCommandSelection` |
| placement | 类型 + `buildTaskPlacementGroups` · `./contract` |
| 展示 | status / priority 文案与指示器 · `./presentation` |
| 批量 | `taskBulkActions` · `createTaskBulkAdapter` |
| 命令 | `registerTaskCommands`（行快捷键投影后进入壳层唯一 Runtime） |
| 详情 | `TaskPage` · `TaskDetailContent` · `TaskPreview` · Preview Provider/controller |
| 列表编排 | `useTaskListController` · `useTaskSelection` · `useTaskQueryData` / Query |
| 展示 | `PriorityIcon` · `TaskStatusIndicator` · 标签 formatters |
| IO | `runTaskQuery` · `countTaskQuery` · `getTaskDetail` · `createTask` · `deleteTask` · `restoreTask` 等（仅已有外消费者） |

任务窗口只在首屏返回 `totalCount`，续页仅取 items；侧栏 badge 使用同一查询定义的 count-only 入口，不拉取任务窗口或 lookup。

新增导出前确认已有外消费者；禁止预防性撑大 public。导出须符合 CONVENTIONS TSDoc L1。

---

## 4. 与其它模块

| 协作 | 方向 |
|------|------|
| bulk-action | 引擎在 bulk-action；本域贡献 actions/adapter |
| command | 经 `registerTaskCommands` 注入 handlers |
| page-frame | 列表页组合纯页面框架；Board 走本域 public |
| display-options | SQL 返回的组身份投影为唯一 `TaskDisplaySection[]`；本域展平、折叠并连接集合交互 |
| shell-dialogs | 创建对话框状态在壳；本域只出表单内容 |
| metadata-fields | placement 归本域；status/priority 图标由本域注入 |
| launcher | 创建内核 / 标签 formatters 复用本域 public |
| navigation | 命令的 path-only open 策略在本域；列表详情的 Sheet / Aside 容器选择与 canonical 显式导航由 `entity-detail` 拥有 |

任务查询窗口中的 `TaskQueryItem.group/subGroup` 是两级组身份真源；Display 将同路径的已加载成员合并为唯一 `TaskDisplaySection[]`，主组的可选 `children` 只包含一层叶组，保留查询顺序。子组 key 为 `JSON.stringify([parent.key, subGroup.key])`，同名子组不共享身份。`buildTaskBoardFlatItems({ sections, collapsedGroupKeys })` 只展平这份投影，不按状态重新分组、不另排任务。header 的稳定 key 为 `h:${section.key}`，`parentKey/parentLabel` 为 null 表示主级，非 null 表示子级；不另存深度。`header.tasks` 对父组保留全部已加载后代，对子组只保留本组成员。父折叠移除全部后代 header/row，子折叠仅移除自身行，不清除子组已有折叠偏好。

父子组共用 `TaskGroupHeader` 和 `onSectionOpenChange(groupKey, open)`，回调传完整 header key。组菜单只增删对应 header 的已加载成员，保留其他组的选择；共享 `BoardSectionContextMenu.selectedAll` 表示非空组的全部成员均已选中，因此单成员组可取消，部分选中的组仍可补选全部。`taskBoardCollection` 从同一 header 构建组成员映射，并为当前可导航任务提供 `rowLeafGroupKeyByKey`；Shift 范围选择以叶组为边界，不因父组同时拥有后代而跨越兄弟子组。`status` 仅作为当前组状态图标与创建预填的可选元数据，不从标签推断、不向非状态子组合成状态。状态创建动作同时保留页面传入的 `createProjectId`。

折叠偏好由 `useTaskCollectionScene` 按来源身份与有效 `groupBy/subGroupBy` 组合键读取 `useShellPreferenceStore.taskBoardCollapsedGroups`，值为完整 header key 数组，默认全部展开。本机持久化在重新打开页面后恢复；Default View 来源包含 scope、context 与 baseViewKey，Saved View 来源包含 scope 与 viewId。排序、筛选与日期基准不产生另一份折叠偏好，切换来源或主子分组配置不会串用其他组的状态。

层级标题继续使用共享槽与单行 `36px` 几何，正常子标题仅缩进 label，子标题吸顶时显示“父组 › 子组”；按钮与创建动作的可访问名称始终包含父名称。只保留一条 active/next sticky 顶替链，不叠两层吸顶。`onCollapseAll(restoreGroupKey)` 接收菜单所在组的主级 key，由场景所有者折叠全部父子组并输出一次父按钮焦点意图，即使此前没有任务焦点也能恢复。Board 对非当前 sticky 的组焦点目标先请求滚动，再由既有 focus bridge 等待标题挂载；当前 sticky 按钮不跳回其原始列表位置。

删除批次和待消费焦点意图绑定完整 `pagination.sourceKey`；切换查询窗口时丢弃旧批次，首次渲染就不向新 Board 暴露旧意图。Board 的 DOM 焦点桥同样按该 key 重建，并清除旧分组按钮的行重入目标；已消费但仍等待虚拟节点挂载的请求不能在新窗口兑现。该临时恢复身份包含查询条件，与保留本机折叠偏好的来源身份分开。

`TaskRowAdapter` 只把任务领域内容与动作装入共享 `RowLayout` 五槽；`RowShell` 是交互状态壳，连续选择与 `44px` 可见壳由 `BoardRowSlot` 拥有，分组标题 anatomy 由 `BoardSectionHeader` 提供。`TaskBoard` 拥有邻接计算、唯一虚拟 projection、已加载 flat items + 未结束分页 sentinel 的几何、sticky、`idle / loading / error / exhausted` 分页、append anchor 与 stable-id 焦点恢复，固定 Row / Header / gap 数值只消费共享集合几何。虚拟 item 仅在存在后继 item 时使用 stride，终项使用可见高度，因此不产生尾 gap；`totalCount` 不参与虚拟高度，分页结束后 sentinel 连同占位一并移除。切换查询、主子分组、排序或日期基准时重新读取首屏，旧来源结果与 cursor 不进入新集合；同 key 后台刷新保留已有集合。分页未结束时 `aria-rowcount=-1`，结束后报告当前可导航行数，并通过可访问 status 报告加载进度。生产不保留全量渲染 fallback，overscan 固定为 6，sticky 与 virtual row 的 `content-visibility` 保持现有合同。

任务正式详情合同：`Space` 只打开只读 Peek；列表点击或 `Enter` 只写入共享 `?task=` 详情意图。窗口 `<1024px` 时详情始终使用 HeroUI Sheet，`>=1024px` 时始终使用非模态 Aside；跨断点只换容器，不改 URL、不关闭、不跳 `TaskPage`。Aside 与 Sheet 复用同一任务详情 query、draft、autosave 和 mutation；dirty draft 由任务详情 view model 注册统一 Router blocker，切换 Row、关闭、Sheet dismiss、Back 与 canonical 导航都必须先成功 flush，失败时保留 URL、当前任务、草稿和错误。不可阻止的宿主卸载不是主要保存机制。Aside 列表 Panel 最小 `352px`，Aside 最小 `320px` / 默认 `360px` / 最大 `440px`。`TaskBoard` 只以自身容器宽度保留一档 `<560px` 紧凑布局，不与窗口或 Sidebar 状态耦合。任务域不拥有详情呈现偏好、断点 state 或容器分流逻辑。

---

Peek 的 source、目标、指针状态与关闭意图由 `useTaskPreviewStore` 同一 reducer 原子更新；Effect 只执行 `180ms` 关闭计时器和目标链接读取，不再在提交后修正目标。source 暂空保留最近可渲染任务，过期 source 注销与链接回执不得覆盖当前目标。自动保存的 dirty 标识从 React 中已确认的 base 与当前 draft 派生；ref 仅供事件和保存队列读取，不能成为渲染事实源。

## 5. 变更纪律

集合首屏读取遵循 [A3 界面系统](../../../Documents/01-架构/A3-界面系统.md) 的留白与加载语义合同，不恢复 Board 骨架。

改定稿目录或 public 时更新本文件。`bun run check`。
