# 任务集合查询与虚拟列表性能重构 - Plan

## 方案概述

把任务集合从「一次拉全集 + 全量 DOM 行」升级为：

1. **Application 唯一读模型**：`TaskQuery`（scope / lifecycle|status filters / placement / sort / cursor window）由单一 executor 执行；`list_tasks` 与 `run_task_view` 都映射到它，不再各写一套 enrichment。
2. **Infrastructure 批量化**：SQL 下推可见性与 status/lifecycle；space/project 名 `WHERE id IN (...)` 一次取回；去掉主路径上的串行 `get`。
3. **列表投影**：IPC 列表项不含 `note`；详情/预览单独读。
4. **Presentation 唯一 Board**：基于 `@tanstack/react-virtual` 的 Virtual Board，所有任务集合场景共用；hover/selection 不驱动整表 React 协调；重交互按需挂载。
5. **产品默认**：「未完成任务」筛选项置顶并默认激活，降低首屏集合；「所有任务」仍可看全量。

原则：KISS、DRY、单一职责、高内聚低耦合、**分叉越少越好**、允许破坏性删除兼容层。目标规模 **≤2k** 可见任务。

---

## 备选方案与取舍

### 1. 虚拟列表库：`@tanstack/react-virtual` vs `react-virtuoso`

| 维度 | `@tanstack/react-virtual`（采用） | `react-virtuoso`（放弃） |
|---|---|---|
| 与现有栈 | 已有 Query / Router，心智一致 | 新增另一套列表框架 |
| 控制权 | 低层 window API，贴合自定义 Board / section / selection shell | 高阶 List/Grouped 组件，易与现有 Board 抢职责 |
| 分组 + 折叠 section | 自管 sticky header / 展平索引，工作量大但边界清晰 | `GroupedVirtuoso` 开箱快，但 Collapsible + 选区 clone 难对齐 |
| 键盘导航 / 多选 / peek | 自行接现有 shortcut 运行时 | 需绕过库的 scroll/focus 假设 |
| 与 cursor 续拉 | `useVirtualizer` + 自管 data append 自然 | 也支持，但数据模型更绑库 |
| 包体与锁定 | 小、可替换 | 意见更多，迁移成本更高 |
| 长期 | Board 是 StoneFlow 自有交互面，应拥有布局算法 | 适合「标准 feed/聊天」而非本 App Board |

**结论：采用 `@tanstack/react-virtual`。**  
不引入 virtuoso，不双库。若未来出现真正标准无限 feed，再评估；任务 Board 不因此分叉。

### 2. 数据窗口：cursor vs 一次全量 + 仅虚拟 DOM

| 方案 | 结论 |
|---|---|
| 仅虚拟化、仍一次拉全量 | 滚动可救，**打开**在 2k 级仍 IPC+JSON+React 协调过重；拒绝作为终态 |
| 传统 offset 分页 UI | 桌面执行台体验差；放弃 |
| **cursor / keyset 窗口 + 虚拟 DOM**（采用） | 打开只付首窗成本；滚动续拉；与虚拟列表同构 |

首屏窗口建议默认 **100–200** 条（实现常量，可调）；续拉同尺寸。SPEC 不写死数字验收，以「有界窗口 + 续拉」行为验收。

### 3. 读路径形态

| 方案 | 结论 |
|---|---|
| All 专用 query | 分叉；拒绝 |
| 保留 `list_tasks` 与 `run_task_view` 两套 enrichment | 现状 bug 源（list 未去重 N+1）；拒绝 |
| **单一 `TaskQuery` executor**（采用） | View 只负责 definition → query；list 页直接构 query |

Command 层可暂时保留 `list_tasks` / `run_task_view` 两个 IPC 名（减少前端一次改完的面），但 **application 内必须单实现**；条件允许时再收成一个 `query_tasks` command。优先删 application/storage 双轨，不优先炫 IPC 改名。

### 4. 列表是否含 note

| 方案 | 结论 |
|---|---|
| 保留 note「以防万一」 | 2k 条放大 payload；拒绝 |
| **列表无 note，detail 再取**（采用） | 破坏旧契约；调用方与测试同步改；无兼容双字段 |

### 5. 默认「未完成」实现位置

| 方案 | 结论 |
|---|---|
| 仅改 `viewKey` 为 active | 与「所有任务」文案/筛选条心智冲突；且视图语义纠缠 |
| 仅服务端硬编码 All 默认 | 单 Space 所有任务不一致；分叉 |
| **筛选条「未完成任务」默认激活，前端 filter 或下推 status 排除 done/canceled**（采用） | 与 UI 一致；All/单 Space 同构；用户可切回「所有任务」 |

实现优先：**构造 list query 时把默认未完成映射为 status 约束下推 SQL**（打开更快）；前端 pill 与 query 单一状态源，避免「前端滤一遍、后端又全量」。

### 6. Hover 模型

| 方案 | 结论 |
|---|---|
| 保持 `hoveredId` state 在 Scope 顶 + render-prop 灌全表 | 滚动/划过主因之一；拒绝 |
| **行内 CSS `:hover` 展示选择控件 + shortcut 目标用 ref/document 查询**（采用） | 预览 peek 仍可用 pointer 命中行 id，不经全表 setState |
| 每行 `useSyncExternalStore` 订 hover | 可行但过重；作备选 |

### 7. 行交互挂载

| 方案 | 结论 |
|---|---|
| 每行常驻 ContextMenu 全树 + 每行 build placement groups | 现状；拒绝 |
| **Board 级 placement groups + open 时再 mount menu/dropdown content**（采用） | 视口内行也轻 |

---

## 目标架构

### 分层职责

```text
Presentation (React)
  TaskListScene / ViewsScene / ProjectTaskScene
    → useTaskCollectionScene（filter / display / selection 编排）
    → VirtualTaskBoard（唯一列表壳）
         ├─ Section headers（status / custom）
         ├─ useVirtualizer（视口行）
         └─ TaskRow（memo）
              ├─ RowShell 展示
              └─ Interactions 按需（menu / metadata open）

Application (Rust)
  TaskQuery { scope, statuses?, placement, sort, cursor, limit }
  TaskQueryService::query → TaskQueryPage { items, next_cursor }
  ViewService::run_task_view → resolve definition → TaskQueryService::query

Infrastructure (Rust/SQLite)
  task_repository::query_page(...)  -- filter/sort/limit in SQL
  lookup::spaces_by_ids / projects_by_ids  -- single IN query each
```

### 删除 / 收口

| 删除或收口 | 原因 |
|---|---|
| `TaskSpaceReader::list_by_ids` 串行 for-get 主路径 | N+1 |
| `load_space_map` 未去重 id 列表 | 重复查询 |
| 列表 DTO 的 `note` | 投影过胖 |
| Board 全量 `tasks.map` 无窗口 | 滚动根因 |
| Scope 顶 `hoveredId` 驱动全表 | 悬停根因 |
| 「只给 All 加速」的 if 分支 | 分叉 |

### 模块落点（前端）

建议长期目录（可分 PR 迁，但**逻辑边界一次钉死**）：

```text
src/features/task/
  query/           # keys, useTaskQuery, IPC 映射（唯一读入口）
  collection/      # filter/display/selection 纯编排（现 useTaskCollectionScene 收口）
  board/           # VirtualTaskBoard, sections, virtualizer glue
  row/             # TaskRow view + lazy interactions
  shortcuts/       # 不持有 hover React state 的命令运行时
```

`shared/components/board` 只保留无业务的布局原语（header、空态、loading）；**虚拟化与 Task 行语义在 task feature**，避免 shared 依赖 task 类型倒灌。

---

## 数据流

### A. 打开「所有任务」（默认未完成）

```text
Route → useTaskListScene
  → filter state: pill = incomplete（默认）
  → TaskQuery {
        scope,
        statuses: [todo, doing, waiting],  // 未完成
        placement: all | standalone,
        sort: board 默认,
        cursor: null,
        limit: PAGE
     }
  → invoke query / list_tasks(新契约)
  → TaskQueryPage { items, next_cursor }
  → display-options 排序/分组（若分组可在服务端或客户端窗口内做；见下）
  → VirtualTaskBoard(items)
  → virtualizer 只挂载视口行
```

### B. 切换「所有任务」pill

```text
pill = all
  → statuses: 空（不限 status，仍 archived/deleted 规则）
  → 重置 cursor，重新 query 首窗
  → 虚拟列表回到顶部（可接受；与筛选变更一致）
```

### C. 滚动续拉

```text
virtualizer 接近末尾 && next_cursor
  → fetchNextPage（TanStack Query infinite 或手动 append）
  → items = [...prev, ...next]
  → 保持 scroll offset
```

### D. 视图页

```text
useViewsScene
  → run_task_view 或 query_tasks({ filters from view + overrides, scope, cursor })
  → 同一 VirtualTaskBoard
```

### E. 行变更

```text
mutation → 乐观 patch 当前 window 缓存中对应 id
  或 invalidate 当前 query key 后 refetch 当前窗口
优先：按 id patch，避免整窗闪烁。
```

### 分组（status Board）与窗口的关系

现状：客户端 `groupBy(status)` 再分 section。

窗口化后有两种合法策略：

| 策略 | 说明 | 采用阶段 |
|---|---|---|
| **窗口内分组** | 服务端按全局 sort 返回扁平页；客户端只对**已加载 items**分组 | 第一实现（KISS） |
| 服务端按 status 分段窗口 | 每 section 独立 cursor | 仅当窗口内分组导致 section 计数不准且产品强依赖时再上 |

**采用窗口内分组为 V1 终态可接受行为**：section 计数 = 已加载窗口内数量，或显示「已加载 n（还有更多）」；不在本任务做完美全局 count（可列后续）。若产品强要求 section 角标为全局精确 count，另开查询 `count_by_status`，不阻塞主路径。

**组内排序**：仍保证优先级可扫；sort 下推 SQL，避免只在窗口内局部排序造成「跨页乱序」。全局 sort 键必须稳定且出现在 cursor 中。

### Cursor 设计（建议）

与默认 Board 排序对齐，例如：

```text
ORDER BY status_rank, priority DESC, position ASC, id ASC
cursor = (status_rank, priority, position, id)
```

或更简单先：

```text
ORDER BY position ASC, id ASC
cursor = (position, id)
```

**约束**：cursor 字段必须与 `ORDER BY` 完全一致；禁止 offset。具体键在实现时按 display 默认 sort 钉死，并写单测覆盖「页连接无重复/无空洞」。

---

## 前端 Virtual Board 设计要点

### 结构

```text
VirtualTaskBoard
  for each visible section (status or custom):
    sticky / static SectionHeader
    virtual rows window for that section
      OR flatten: [header, row, row, header, row...] 单一 virtualizer
```

**推荐：单一 virtualizer + 展平索引**（header 作为 sticky 或非 sticky 特殊 item），避免多 virtualizer 滚动容器打架。

### 行组件

```text
TaskRow (memo)
  props: taskId, task snapshot, selected, active, callbacks(stable), placementGroups(stable)
  hover: CSS
  menu: ContextMenu 仅 Trigger 常驻；Content lazy
  metadata: trigger 常驻轻量；options 在 open 时创建
```

### Shortcut / 预览

- `TaskRowShortcutScope` **删除**「hoveredId state → children(state) 重渲全表」。
- 键盘目标：维护 `focusedTaskId`（已有 selection）即可；pointer 目标：`document.elementFromPoint` 或行 `data-task-id` + ref registry。
- Peek 预览：pointer enter 行时写 **ref 或 preview store**，不要抬到 Board 根 state 触发所有行 props 变化。

### 与现有 Board 原语

- 保留 `BoardEmptyState` / `BoardLoadingState` / header 视觉。
- `BoardRows` 的 selection `cloneElement` 分组若与虚拟化冲突：**删除该实现**，改选中行自身样式 / 相邻选中用 CSS 或轻量 wrapper，不在虚拟窗口外对全部 children 做 toArray。

---

## 后端实现要点

### Query 输入（逻辑形状）

```text
TaskQuery {
  scope: All | Space(space_id),
  placement: All | Project(id) | Standalone,
  statuses: Option<Vec<WorkStatus>>,  // None = 不限（仍非归档删除）
  // View 额外：due/planned 等 filters 继续走 list_for_view 能力并入同一 builder
  sort: Vec<SortRule>,
  cursor: Option<TaskCursor>,
  limit: u32,
}
TaskQueryPage {
  items: Vec<TaskListItemDto>,  // 无 note
  next_cursor: Option<TaskCursor>,
}
```

### Enrichment

```text
tasks page
  → unique space_ids / project_ids
  → SELECT ... WHERE id IN (...)
  → map names
```

`list_by_ids` 若保留，**必须**改为单次 IN；禁止 for get。更好：repository 直接提供 `map_by_ids`。

### View 路径

```text
run_task_view
  → resolve system/custom definition
  → merge override filters
  → TaskQuery { ... , statuses from filters, due..., cursor, limit }
  → same page DTO
```

内存 `retain` + 全表 `list_candidates` 的路径应收缩为：能下推的全部下推；仅本地时区语义难下推的（today/overdue 边界）可在 SQL 用 UTC 近似 + 应用层二次滤，或存 local date 生成列——**本任务优先：日期边界用现有 ISO 字段比较 + 文档化时区限制**，不为完美时区上新列（除非测试证明必要）。

### 索引

已有例如 `ix_tasks_view_space_status_due`、`ix_tasks_view_status_due`。实现时用 `EXPLAIN QUERY PLAN` 验证 All scope（无 space 过滤）走 status/due/position 相关索引；不足则加：

```text
(tasks archived_at, deleted_at, status, position, id)  -- 示意，以 EXPLAIN 为准
```

不预先堆索引；以测量驱动。

---

## 筛选条产品映射

「所有任务」页 pills（`variant=all`）：

| 顺序 | Pill | 语义 |
|---|---|---|
| 1 | **未完成任务**（默认） | 排除 done、canceled |
| 2 | 所有任务 | 不限 status（未归档） |
| 3 | 独立事项 | `project_id IS NULL`（可与未完成组合策略：见下） |
| 4+ | 单状态 | doing / todo / waiting / done / canceled |

**组合规则（钉死，避免歧义）：**

- 「未完成任务」与「所有任务」、单状态 pill **互斥**（同一 status 维度）。
- 「独立事项」是 **placement 维度**，可与未完成/所有/单状态叠加（与现 standaloneOnly 一致）。
- 默认：未完成 + 非 standaloneOnly。

实现落点：`src/features/task/hooks/list-scene/variantConfig.ts` 的 `ALL_TASK_FILTERS` 与 `useTaskListScene` toolbar pills；`useTaskPageFilterController` 增加 incomplete 语义或映射到 statusValues 预填。

**与服务端**：pill 状态是 query 的输入，不是「全量拉回再 filter」的唯一手段。

---

## 分阶段落地（实现顺序，非 TASKS）

> 正式勾选任务在方案确认后写入 TASKS.md。此处只规定依赖方向，保证每一阶段可单独验证。

| 阶段 | 目标 | 验证焦点 |
|---|---|---|
| **S0** | 批量 IN lookup + list 去重；列表 DTO 去 note | AC-4, AC-5, AC-12 部分 |
| **S1** | 「未完成任务」pill + 默认；status 下推 | AC-1, AC-2, AC-3 |
| **S2** | 行隔离：hover/menu/placement 上提与懒挂载 | AC-7, AC-10 |
| **S3** | `@tanstack/react-virtual` Virtual Board 全场景接入 | AC-6, AC-9, AC-10 |
| **S4** | cursor 窗口 + 续拉 + Query infinite | AC-8, AC-11 |
| **S5** | 合并 TaskQuery executor；删旧 enrichment 主路径；文档同步 | AC-5, AC-9, AC-12 |

允许 S0+S1 合并交付；**S3 不得晚于 S4 太多**——无虚拟化的续拉会把 DOM 再次堆满。推荐 **S3 与 S4 同一大波**，或 S3 紧接 S4。

---

## 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 虚拟化破坏键盘导航 / 多选范围 / scrollIntoView | 回归严重 | 快捷键单测 + 手动清单；`scrollToIndex` API |
| 窗口内 section 计数 ≠ 全局 | 角标「不准」 | 文案/UI 不承诺全局 count；或后续 count 查询 |
| cursor 与多 sort 规则不一致导致漏行/重复 | 数据错误 | 页连接测试；cursor 与 ORDER BY 绑定代码生成或单测断言 |
| 去 note 后某 UI 仍读 list.note | 运行时 undefined | 全库 grep + 类型删除字段迫使编译失败 |
| View 日期本地时区 | 边界任务多/少一天 | 保持与现网 run_task_view 语义一致；单测钉 today/overdue |
| 首屏 limit 过大或过小 | 慢或一直转圈 | 常量可调；默认 100–200 |
| 乐观更新与窗口拼接 | 行消失/幽灵 | mutation 后按 id patch；跨窗移动任务时 invalidate |
| 依赖新增 | 包体 | 仅 `@tanstack/react-virtual`；不 lock virtuoso |

---

## 测试策略

| 层 | 内容 |
|---|---|
| Rust | query page 无重复/无空洞；IN lookup 次数；scope=all + statuses 过滤；cursor 续页 |
| TS 契约 | `TaskListItem` 无 note；api mapper |
| 组件 | pills 顺序与默认；Virtual Board 只渲染有界行（可测 render 次数或 data 属性数量） |
| 交互 | 改状态/批量在虚拟列表仍可用（定向测） |
| 手工 | 本机 138+ 条 All：打开、滚动、hover、续拉、切 pill |

---

## 完成后需要同步的长期文档

| 文档 | 同步点 |
|---|---|
| [A2 系统设计](../01-架构/A2-系统设计.md) | 任务列表读模型、窗口化、列表投影 |
| [A3 界面系统](../01-架构/A3-界面系统.md) | Board 虚拟化、默认「未完成任务」筛选 |
| `src/features/task/ARCHITECTURE.md`（若有） | query / board / row 边界 |
| `src/features/view/ARCHITECTURE.md`（若有） | 共用 TaskQuery / Virtual Board |
| [所有空间 SPEC 量级假设](../../98-归档/02-已完成重构/2026-07-31-all-spaces-task-workspace/SPEC.md) | 归档说明或勘误：&lt;50 / 无虚拟列表已作废，由本任务取代性能基线 |
| 根或模块 README 若提及 list 契约 | 去 note |

若窗口化 + 统一 query 构成跨模块难逆转决策，归档前评估是否补一条 ADR（见文档体系 SOP）；本 PLAN 已足够执行，不强制先写 ADR。

---

## 方案结论（给确认用）

1. **库**：`@tanstack/react-virtual`，不用 virtuoso。  
2. **读**：单一 TaskQuery + 批量 lookup + 列表无 note + cursor 窗口。  
3. **写 UI**：唯一 Virtual Board；行 memo；hover 非全表 state；交互懒挂载。  
4. **产品**：筛选条「未完成任务」在「所有任务」前，**默认激活**。  
5. **分叉**：全场景共用，禁止 All 特判性能路径。  
6. **破坏性**：接受契约与 Board 内破，不留双 DTO / 串行 list_by_ids 主路径。

**请确认本 PLAN 后，再进入 TASKS 拆解（SOP 门禁：方案与任务不同轮生成）。**
