# Collection Scene 与页面框架重构 - Spec

## 背景与目标

当前所有任务、独立事项、View、项目总览、项目详情、归档、回收站等集合页面都使用 `EntityScene`。它统一了外观骨架，却没有统一页面能力：`EntityScene` 通过可选槽位和 `boardKind` 分发业务 Board，调用方可以漏传 Header、Toolbar、Board Action 或 Bulk Bar；adapter 与 `MainCard.Toolbar` 又用空函数或无功能按钮掩盖缺失能力。

独立事项页是该问题的直接证据。它使用 `TaskBoard`，但默认 `groupBy: none` 被转换成唯一的 `all` 分组，`TaskBoard` 进一步特判为纯任务行，因此失去项目详情页已有的状态分组 Board 结构。

本任务以破坏性重构建立两层明确模型：

```text
PageFrame：所有工作区页面的视觉骨架
  ├── Header
  ├── Toolbar
  ├── Body
  ├── Footer
  └── Bulk bar

Collection Scene：按实体负责完整页面能力
  ├── TaskCollectionScene
  ├── ProjectCollectionScene
  └── LifecycleCollectionScene
```

目标不是构建新的万能 Scene，而是让每一个集合页面都有可验证的结构契约；任务集合页共享完整任务 Board，差异只留在数据源、合法动作和页面专属 Header。

## 已确认产品决策

- 所有任务、独立事项、View、项目详情中的任务区都属于任务集合页面，默认展示完整的状态分组 Board。
- 独立事项不是简化版任务列表。它与项目详情共享同一 Task Collection 结构；差异仅限于独立事项数据源、创建默认归属和项目字段是否可编辑。
- 项目总览、归档、回收站也共享同一 PageFrame，但分别使用 Project 与 Lifecycle 的实体集合原型；不得强迫不同实体使用 TaskBoard 契约。
- 设置与任务/项目详情不是集合页面。它们使用 PageFrame 或其底层布局原语，但不伪装成 Collection Scene。
- 当前 `layout: list | board` 没有驱动不同渲染器。为避免虚假能力，本任务删除该展示选项及其存量偏好字段；未来需要真实 Kanban 或第二渲染器时另开任务，从独立的渲染器契约开始。
- 不保留旧 `EntityScene(props)`、`boardKind`、adapter 或 display-layout 兼容层。

## 范围

- 将 `EntityScene` 降级为无业务依赖的 PageFrame 布局原语，或以等价名称替换；最终布局层不得 import task、project、lifecycle。
- 建立任务、项目、生命周期三种显式 Collection Scene，并迁移所有工作区集合页。
- 将重复的任务展示、选择、预览、批量操作和 Board 接线收口到 task 域的共享 Task Collection 能力。
- 让独立事项默认显示与项目详情一致的状态分组 Board。
- 删除不安全的空 action fallback、Toolbar 无功能默认按钮、`boardKind` DTO 和三个 BoardAdapter。
- 删除当前无真实渲染语义的 `layout` 选项、持久化字段、UI 控件、测试与兼容归一化。
- 补页面结构和行为测试，并更新受影响模块的长期架构文档。

## 不做什么

- 不实现 Kanban、列拖拽或新的任务视觉布局。
- 不改变任务、项目、归档、回收站的领域数据模型、Tauri command 或 TanStack Query 刷新边界。
- 不处理“创建项目后跳转”与归档删除报错；它们是独立的行为修复任务，不能混入本次结构迁移。
- 不重画整个 MainCard 视觉系统；本任务只移除假动作并保证既有页面结构一致。

## 目标架构

```text
Route
  -> 专属页面组件
       -> PageFrame
            -> PageFrame.Header
            -> PageFrame.Toolbar
            -> Task | Project | Lifecycle Collection Scene
            -> PageFrame.Footer / BulkBar

TaskCollectionScene
  -> task 域的展示规则、筛选、选择、预览、批量动作、空态和 Board
  -> 数据源由 all / standalone / view / project detail 提供

ProjectCollectionScene
  -> project 域的项目 Board、选择、批量动作与空态

LifecycleCollectionScene
  -> lifecycle 域的分组、选择、恢复、删除与空态
```

### PageFrame

`PageFrame` 只拥有滚动容器、Header、Toolbar、Body、Footer 和浮动批量操作条的布局顺序。它不接受 `boardKind`，不导入任一业务 Feature，不持有查询、mutation、实体 DTO 或页面 variant。

布局原语可用 compound component 组合，但集合页不得直接拼装一个任意槽位包。Collection Scene 负责保证 Header、Toolbar、实体 Body、Loading、Empty、Error 和 Bulk Bar 的一致结构。

### TaskCollectionScene

任务集合由 task 域拥有。它的稳定输入是任务数据状态、展示页面 key、允许的项目归属能力、创建动作及必要的页面专属操作；不可见的能力不得传空函数，所显示的交互必须有真实 action。

任务集合内部拥有：

- 状态分组 Board 与可见字段；
- 展示设置、筛选、选择、键盘焦点和 Preview 注册；
- Task Row 的打开、更新、归档、删除、批量操作和空态；
- 可复用的 loading、error、empty 边界。

页面只负责提供数据源和专属 composition：

| 页面 | 数据源与专属差异 |
| --- | --- |
| 所有任务 | 当前 Scope 的全部任务；允许项目切换。 |
| 独立事项 | `projectId = null`；新任务默认独立；不允许项目字段编辑。 |
| View | View run 结果、View 标签和编辑菜单。 |
| 项目详情 | 当前项目任务、项目 Header 动作；新任务默认归属该项目；不允许项目字段编辑。 |

### Project 与 Lifecycle Collection

ProjectCollectionScene 与 LifecycleCollectionScene 不共享 Task DTO 或 TaskBoard。二者只共享 PageFrame 与通用 selection/bulk 基础设施；项目操作和生命周期操作继续归各自 Feature。

### 展示设置

展示设置的职责限定为真实存在的任务集合能力：分组、排序、完成项顺序和可见字段。`layout` 不是当前可交付能力，必须整体移除，而不是继续作为只改变可选分组范围的隐含开关。

所有任务、独立事项、View 和项目详情的默认分组均为 `status`。不同页面仍可按其权限限制可选分组和字段，但没有页面可以因为 `groupBy: none` 自动退化为没有 Board Section 的裸行列表。

## 依赖与模块边界

| 模块 | 允许职责 | 禁止职责 |
| --- | --- | --- |
| `shared/components/page-frame` | 视觉骨架与通用布局原语 | 业务实体、Board 分发、查询、mutation。 |
| `features/task` | Task Collection、TaskBoard、任务展示和交互 | 依赖 PageFrame 之外的跨域页面实现。 |
| `features/project` | 项目详情 Header、项目数据与 Project Collection | 复制 Task Collection wiring。 |
| `features/view` | View CRUD、View 数据源与专属 toolbar | 复制 TaskBoard action wiring。 |
| `features/lifecycle` | 生命周期数据、动作与 Lifecycle Collection | 借用 Task/Project Board 语义。 |
| route | loader、scope 解析和薄装配 | 页面业务状态或 Board 细节。 |

依赖方向必须是 `route -> feature page -> shared PageFrame`。业务 Feature 可以组合 task 的公开 Task Collection 契约；shared 不得反向 import 任一业务 Feature。

## 验收标准

- 所有任务、独立事项、View、项目详情都渲染相同层级的 Task Collection：页面 Header、Toolbar、状态分组 Board、Empty/Loading/Error 与 Bulk Bar。
- 独立事项首次进入时至少显示状态分组 Header，不再进入单 `all` 分组的纯行特判。
- 页面上每一个可见操作都有真实 handler；没有空 action fallback、无功能默认 Toolbar 按钮或隐藏的缺失能力。
- `shared` / PageFrame 不 import task、project、lifecycle；删除 `EntityScene` 的 `boardKind` 和三个 Adapter。
- 任务展示设置中不存在 `layout` 字段、控件、存储偏好或兼容归一化；没有遗留的无效“列表/看板”切换。
- Task Collection 的核心 wiring 不在 all、standalone、view、project detail 四处复制。
- 任务、项目、生命周期页各自保留领域行为，且既有 route、scope、Query key、缓存失效和实体操作语义不回归。
- 通过定向单元/组件测试、根目录 typecheck、lint 和相关 Vitest 测试；结束前检索确认旧术语与 Adapter 无生产残留。

## 风险与迁移原则

- 这是跨 Feature UI 组合重构，风险主要来自选择、快捷键、Preview 与 Bulk Bar 的隐式接线。每迁移一种页面都必须先有行为测试，再删除旧路径。
- `layout` 偏好可能存在于本地存储或后端展示偏好中。允许破坏性删除，但必须在同一变更删除读写与 schema 字段，不能静默保留死数据。
- 不提前抽象 Provider。只有 Task Collection 的多个嵌套子组件确实需要同一状态与动作时才使用 scoped context；否则保持显式 props 与局部 hook。

## 完成后需同步的长期文档

- `src/ARCHITECTURE.md`
- `src/features/task/ARCHITECTURE.md`
- `src/features/project/ARCHITECTURE.md`
- `src/features/view/ARCHITECTURE.md`
- `src/features/lifecycle/ARCHITECTURE.md`
- 新 PageFrame 所在一级模块的架构文档
- `Documents/01-架构/A2-系统设计.md` 与 `A3-界面系统.md`，仅在最终边界或全局页面规则发生变化时更新。
