# StoneFlow Row System 架构重构方案

## 0. 文档定位

这份文档用于约束 StoneFlow 的列表行系统重构。

本次重构的核心目标不是简单地把 `TaskRow`、`ProjectRow` 合并成一个组件，而是建立一套长期稳定、可扩展、可维护的 **Row System**。

这套 Row System 会成为 StoneFlow 后续任务列表、项目列表、搜索结果、归档列表、标签列表、视图列表等场景的基础 UI 架构。

---

## 1. 背景

StoneFlow 当前页面结构大致如下：

```txt
AppShell
├── ShellHeader
├── Sidebar
├── ShellFooter
└── MainCard
    ├── MainCardHeader
    │   ├── Breadcrumb
    │   └── HeaderActions
    └── MainCardBody
        ├── ViewToolbar
        └── ListBoard
            ├── ListGroup
            │   ├── ListGroupHeader
            │   └── Row
            └── ListGroup
                ├── ListGroupHeader
                └── Row
```

当前主要问题在于：

1. 不同类型的列表行可能会逐渐分裂成 `TaskRow`、`ProjectRow`、`SearchRow`、`ArchiveRow` 等多套相似结构。
2. 行内的优先级、状态、项目、日期、提醒、标签等字段会不断增加，如果没有统一架构，容易形成大量重复样式和重复交互。
3. Row 是 StoneFlow 最基础、最频繁出现的 UI 单元，需要提前建立清晰边界。
4. 需要兼顾 Linear / Raycast 风格的轻量列表体验，而不是做成笨重的表格系统。

因此，本次重构需要在 **统一性、扩展性、简单性、性能、开发效率** 之间取得平衡。

---

## 2. 重构目标

### 2.1 产品目标

StoneFlow 的列表行应该具备以下体验：

- 轻量、紧凑、稳定。
- hover 时出现勾选框，不造成布局抖动。
- 左侧信息清晰：优先级、状态、图标、名称。
- 右侧信息可插拔：项目、截止时间、计划时间、提醒时间、创建时间、标签等。
- 所有可点击字段都可以打开对应下拉框、弹层或选择器。
- 整体风格保持 shadcn 原生组件质感，不额外堆叠复杂 UI。

### 2.2 工程目标

Row System 需要满足：

- **KISS**：保持简单，不提前引入过度抽象。
- **DRY**：统一行壳、按钮、布局和交互规范，避免重复实现。
- **单一职责**：RowShell 不关心业务，Cell 不关心行布局，Adapter 只负责装配。
- **模块化**：每个字段都是独立 Cell，可独立开发、替换、测试。
- **可扩展**：后续可以自然扩展标签、归档时间、重复任务、子任务、负责人等字段。
- **性能稳定**：避免行级组件过重，为未来虚拟列表和大数据量列表留空间。

---

## 3. 命名规范

### 3.1 统一术语

| 旧称 / 模糊称呼 | 推荐命名 | 说明 |
|---|---|---|
| raw | row | 列表行，统一使用 Row |
| broad | board | 列表板块容器，统一使用 Board |
| section | group | 分组，统一使用 Group |
| taskraw | TaskRow | 任务行装配器 |
| projectraw | ProjectRow | 项目行装配器 |

### 3.2 核心命名

```txt
MainCard
ListBoard
ListGroup
ListGroupHeader
RowShell
RowSelectionCell
RowTitleCell
RowMetaButton
RowActionButton
TaskRow
ProjectRow
SearchResultRow
```

### 3.3 命名原则

- 容器使用 `Board`、`Group`、`Shell`。
- 行级基础结构使用 `RowShell`。
- 行内字段使用 `Cell`。
- 业务实体装配器使用 `TaskRow`、`ProjectRow`。
- 通用按钮外壳使用 `RowMetaButton`、`RowActionButton`。
- 不使用 `UniversalRow`、`CommonRow`、`BaseBusinessRow` 等容易失控的命名。

---

## 4. 核心架构选择

### 4.1 不采用巨大 UniversalRow

不推荐：

```tsx
<UniversalRow
  type="task"
  showPriority
  showStatus
  showProject
  showDueDate
  showReminder
  showCreatedAt
/>
```

这种方案短期看起来复用度高，但后期会快速失控。

典型问题：

- 组件内部充满 `if task`、`if project`、`if archived`、`if completed`。
- 业务逻辑和布局逻辑混在一起。
- 新增字段时需要持续修改同一个大组件。
- 每个场景的特殊行为都会污染全局 Row。
- 类型越来越复杂，维护成本越来越高。

### 4.2 采用 RowShell + Slots + Cells + Adapter

推荐架构：

```txt
RowShell
├── SelectionSlot
├── LeadingSlot
├── TitleSlot
└── TrailingSlot
```

业务实体通过 Adapter 进行装配：

```txt
TaskRow
└── RowShell
    ├── RowSelectionCell
    ├── TaskPriorityCell
    ├── TaskStatusCell
    ├── TaskIconCell
    ├── TaskTitleCell
    ├── TaskDueDateCell
    ├── TaskScheduledDateCell
    ├── TaskReminderCell
    ├── TaskProjectCell
    └── TaskCreatedAtCell
```

核心思想：

> RowShell 统一结构，Cell 统一颗粒度，Adapter 统一装配。

---

## 5. 架构分层

## 5.1 Layer 1：基础 UI 层

位置建议：

```txt
src/shared/ui/row/
```

这一层只负责行系统的通用视觉、布局和基础交互。

推荐文件：

```txt
src/shared/ui/row/
├── row-shell.tsx
├── row-selection-cell.tsx
├── row-title-cell.tsx
├── row-meta-button.tsx
├── row-action-button.tsx
├── row.types.ts
└── index.ts
```

### RowShell 职责

RowShell 负责：

- 行级布局。
- hover 状态。
- selected 状态。
- active 状态。
- disabled 状态。
- focus-visible 样式。
- selection cell 的固定占位。
- leading / title / trailing 区域排布。
- 行点击事件。
- 键盘可达性基础支持。

RowShell 不负责：

- 不读取 Task / Project / Tag 等业务类型。
- 不直接修改任务状态。
- 不直接打开业务 dropdown。
- 不判断 dueDate / project / priority 是否存在。
- 不包含具体业务字段样式。

### RowSelectionCell 职责

RowSelectionCell 负责：

- 勾选框展示。
- hover / selected / focus 时显示。
- 未显示时仍然占位。
- 点击时阻止触发行点击。
- 暴露 checked / indeterminate / disabled 状态。

### RowMetaButton 职责

RowMetaButton 负责：

- 统一行内右侧按钮样式。
- 使用 shadcn `Button` 原生 `outline` 风格。
- 支持 icon + label。
- 支持 active / muted / disabled 状态。
- 内部默认阻止事件冒泡。
- 不绑定任何具体业务。

### RowActionButton 职责

RowActionButton 用于更偏操作性的行内按钮，例如：

- 更多操作。
- 展开详情。
- 添加子项。
- 快捷编辑。

与 RowMetaButton 的区别：

| 组件 | 用途 |
|---|---|
| RowMetaButton | 展示和编辑元信息，如项目、日期、标签 |
| RowActionButton | 执行动作，如更多、删除、展开、添加 |

---

## 5.2 Layer 2：业务 Cell 层

位置建议：

```txt
src/entities/task/ui/cells/
src/entities/project/ui/cells/
```

示例：

```txt
src/entities/task/ui/cells/
├── task-title-cell.tsx
├── task-status-cell.tsx
├── task-priority-cell.tsx
├── task-icon-cell.tsx
├── task-project-cell.tsx
├── task-due-date-cell.tsx
├── task-scheduled-date-cell.tsx
├── task-reminder-cell.tsx
├── task-created-at-cell.tsx
└── task-tags-cell.tsx
```

### Cell 职责

每个 Cell 只负责一个字段。

例如 `TaskDueDateCell` 负责：

- 读取任务的截止时间。
- 使用 RowMetaButton 展示截止时间。
- 点击后打开日期选择器。
- 调用对应 mutation 更新截止时间。
- 更新成功后的本地状态同步。

不负责：

- Row 高度。
- Row hover。
- Row 是否 selected。
- title 如何省略。
- trailing 区域整体排序。

### Cell 的推荐结构

```txt
TaskDueDateCell
├── RowMetaButton
└── DatePickerPopover
```

```txt
TaskProjectCell
├── RowMetaButton
└── ProjectSelectDropdown
```

```txt
TaskStatusCell
├── RowMetaButton 或 RowActionButton
└── StatusDropdown
```

### Cell 设计原则

- 一个 Cell 只处理一个业务字段。
- Cell 内部可以组合 dropdown、popover、command、calendar 等组件。
- Cell 不重复写按钮样式，统一使用 RowMetaButton / RowActionButton。
- Cell 内部交互必须阻止冒泡，避免误触发行点击。
- Cell 可以 memo，但不要过早做复杂缓存。

---

## 5.3 Layer 3：Entity Adapter 层

位置建议：

```txt
src/entities/task/ui/task-row.tsx
src/entities/project/ui/project-row.tsx
src/entities/search/ui/search-result-row.tsx
```

Adapter 的职责是把业务实体翻译成 RowShell 需要的 slots。

### TaskRow 示例

```tsx
export function TaskRow({ task }: TaskRowProps) {
  return (
    <RowShell
      id={task.id}
      selection={<RowSelectionCell itemId={task.id} />}
      leading={[
        <TaskPriorityCell key="priority" task={task} />,
        <TaskStatusCell key="status" task={task} />,
        <TaskIconCell key="icon" task={task} />,
      ]}
      title={<TaskTitleCell task={task} />}
      trailing={[
        <TaskDueDateCell key="due-date" task={task} />,
        <TaskScheduledDateCell key="scheduled-date" task={task} />,
        <TaskReminderCell key="reminder" task={task} />,
        <TaskProjectCell key="project" task={task} />,
      ]}
      fixedTrailing={[
        <TaskCreatedAtCell key="created-at" task={task} />,
      ]}
    />
  )
}
```

### ProjectRow 示例

```tsx
export function ProjectRow({ project }: ProjectRowProps) {
  return (
    <RowShell
      id={project.id}
      selection={<RowSelectionCell itemId={project.id} />}
      leading={[
        <ProjectIconCell key="icon" project={project} />,
      ]}
      title={<ProjectTitleCell project={project} />}
      trailing={[
        <ProjectTaskCountCell key="task-count" project={project} />,
        <ProjectUpdatedAtCell key="updated-at" project={project} />,
      ]}
      fixedTrailing={[
        <ProjectCreatedAtCell key="created-at" project={project} />,
      ]}
    />
  )
}
```

### Adapter 原则

Adapter 应该很薄。

Adapter 负责：

- 选择哪些 Cell 出现在这一行。
- 决定 leading / title / trailing / fixedTrailing 的顺序。
- 传入实体数据。
- 绑定行级点击事件，例如打开详情 drawer。

Adapter 不负责：

- 写复杂样式。
- 写复杂业务逻辑。
- 直接处理具体字段 mutation。
- 判断过多视图规则。

---

## 6. RowShell 布局设计

## 6.1 推荐使用 CSS Grid

RowShell 内部推荐使用 CSS Grid，而不是纯 flex。

推荐结构：

```txt
| Selection | Leading | Title | Trailing | FixedTrailing |
```

原因：

- checkbox hover 出现时不造成布局跳动。
- title 区域可以稳定省略。
- 右侧按钮不会挤乱左侧区域。
- fixedTrailing 可以确保创建时间永远在最右边。
- 未来支持不同密度和虚拟列表更稳定。

### 推荐 grid 模型

```txt
grid-template-columns:
  selection-width
  auto
  minmax(0, 1fr)
  auto
  auto
```

概念上：

```txt
SelectionSlot    固定宽度
LeadingSlot      内容自适应
TitleSlot        占据剩余空间，允许省略
TrailingSlot     内容自适应
FixedTrailing    固定靠右
```

## 6.2 SelectionSlot

SelectionSlot 必须永远占位。

未 hover 时：

```txt
checkbox opacity: 0
但宽度仍然存在
```

hover / focus / selected 时：

```txt
checkbox opacity: 1
```

这样可以保证列表行在 hover 时不发生横向抖动。

## 6.3 LeadingSlot

LeadingSlot 用于承载左侧可插拔字段。

任务行典型顺序：

```txt
PriorityCell | StatusCell | IconCell
```

项目行典型顺序：

```txt
ProjectIconCell
```

RowShell 不关心这些 Cell 的具体含义，只负责排列。

## 6.4 TitleSlot

TitleSlot 是 Row 的主内容区域。

要求：

- 必须支持 `min-width: 0`。
- 文本需要支持单行省略。
- 可以扩展副标题，但默认不要做双行。
- 行点击主要落在 title 区域和 row 空白区域。

## 6.5 TrailingSlot

TrailingSlot 用于右侧动态元信息。

常见内容：

```txt
DueDateCell
ScheduledDateCell
ReminderCell
ProjectCell
TagsCell
```

这些 Cell 的显示可以根据视图、实体类型、字段是否存在决定。

## 6.6 FixedTrailingSlot

FixedTrailingSlot 用于永远靠最右侧的字段。

当前建议放：

```txt
CreatedAtCell
```

后续也可以放：

```txt
ArchivedAtCell
UpdatedAtCell
```

是否显示 fixedTrailing 由 Adapter 决定。

---

## 7. 左侧结构规范

任务行左侧推荐顺序：

```txt
SelectionCell | PriorityCell | StatusCell | IconCell | TitleCell
```

### 7.1 SelectionCell

- 必须存在。
- 必须固定占位。
- hover 显示。
- selected 时常驻显示。
- 点击不触发行打开详情。

### 7.2 PriorityCell

- 可选。
- 用于展示和修改优先级。
- 推荐使用信号强度类图标，保持一眼可识别。
- 点击打开优先级 dropdown。

### 7.3 StatusCell

- 可选。
- 用于展示和修改任务状态。
- 点击打开状态 dropdown。
- 已完成、已取消状态应该保持视觉克制，不要过强干扰主列表。

### 7.4 IconCell

- 可选。
- 用于任务类型、项目类型、来源类型等图标。
- 如果没有 icon，则不渲染该 Cell。
- 不要为不存在的 icon 强行占位，避免左侧过宽。

### 7.5 TitleCell

- 必须存在。
- 是 Row 的主语义。
- 支持完成态、取消态的弱化样式。
- 不直接处理整行布局。

---

## 8. 右侧结构规范

任务行右侧推荐顺序：

```txt
DueDateCell | ScheduledDateCell | ReminderCell | TagsCell | ProjectCell | CreatedAtCell
```

如果需要严格满足“创建时间最右边”，则：

```txt
trailing = [DueDateCell, ScheduledDateCell, ReminderCell, TagsCell, ProjectCell]
fixedTrailing = [CreatedAtCell]
```

### 8.1 DueDateCell

- 截止时间。
- 使用日期图标 + 简短日期文字。
- 点击打开日期选择器。
- 逾期状态可以通过 active / danger 状态表达，但不要破坏整体克制风格。

### 8.2 ScheduledDateCell

- 计划时间。
- 用于表达任务计划在哪天处理。
- 点击打开日期选择器。
- 与 dueDate 视觉需要有区分，但不需要过度彩色化。

### 8.3 ReminderCell

- 提醒时间。
- 点击打开提醒设置 dropdown。
- 没有提醒时可以隐藏，或者在特定视图中显示空态按钮。

### 8.4 TagsCell

- 后续扩展。
- 可以显示一个或多个 tag。
- 如果 tag 很多，优先展示前 1-2 个，其余折叠为 `+N`。
- 点击打开标签选择器。

### 8.5 ProjectCell

- 所属项目。
- 点击打开项目选择器。
- 在项目详情页中可以选择隐藏，因为当前上下文已经是该项目。

### 8.6 CreatedAtCell

- 创建时间。
- 建议作为 fixedTrailing。
- 默认展示简短日期。
- 不一定需要可编辑。
- 如果不可编辑，可以不是 dropdown，但视觉仍应与 RowMetaButton 体系保持一致。

---

## 9. RowMetaButton 规范

所有行内元信息按钮统一使用 RowMetaButton。

### 9.1 视觉规范

RowMetaButton 默认使用：

```txt
Button variant="outline"
size="sm"
icon + label
```

要求：

- 高度与 Row 密度匹配。
- 图标和文字间距统一。
- hover 反馈轻量。
- active 状态清晰但不刺眼。
- disabled 状态弱化。
- 不在不同 Cell 里重复写按钮 className。

### 9.2 行为规范

RowMetaButton 内部默认处理：

```tsx
onClick={(event) => {
  event.stopPropagation()
  onClick?.(event)
}}
```

这样所有右侧按钮点击时都不会误触发 Row 的打开详情行为。

### 9.3 不推荐做法

不推荐：

```tsx
<RowMetaButton type="dueDate" />
<RowMetaButton type="project" />
<RowMetaButton type="reminder" />
```

原因：

- RowMetaButton 会被迫理解业务。
- 后期会变成另一个 UniversalRow。
- 业务变化会污染基础 UI 层。

推荐：

```tsx
<TaskDueDateCell>
  <RowMetaButton icon={...} label={...} />
</TaskDueDateCell>
```

---

## 10. Dropdown / Popover 规范

### 10.1 弹层归属

Dropdown / Popover 应该归属于具体 Cell。

示例：

```txt
TaskStatusCell
├── RowMetaButton
└── StatusDropdown
```

```txt
TaskProjectCell
├── RowMetaButton
└── ProjectSelectDropdown
```

```txt
TaskDueDateCell
├── RowMetaButton
└── DatePickerPopover
```

RowShell 不应该感知这些弹层。

### 10.2 事件边界

所有 Cell 内部的可交互元素必须阻止事件冒泡。

需要避免：

- 点击状态按钮时打开了任务详情。
- 点击日期按钮时触发了 Row selected。
- 点击项目 dropdown 时误触发行级快捷键。

### 10.3 弹层懒加载

对于复杂弹层，例如：

- 日期选择器。
- 项目选择 command。
- 标签选择 command。
- 提醒时间设置。

建议打开时再渲染，避免每一行都挂载大量复杂组件。

---

## 11. ListBoard / ListGroup 架构

Row System 不只包含 Row，也包含 Row 的上层列表结构。

推荐：

```txt
ListBoard
├── ListGroup
│   ├── ListGroupHeader
│   └── rows
└── ListGroup
    ├── ListGroupHeader
    └── rows
```

### 11.1 ListBoard 职责

ListBoard 负责：

- 承载当前视图的所有分组。
- 控制组与组之间的间距。
- 处理空状态。
- 处理 loading 状态。
- 为未来虚拟列表预留边界。

ListBoard 不负责：

- 具体任务字段展示。
- 具体行内按钮逻辑。
- 业务 mutation。

### 11.2 ListGroup 职责

ListGroup 负责：

- 单个分组区域。
- 分组 header。
- 分组展开 / 收起。
- 分组内 row 渲染。

### 11.3 ListGroupHeader 职责

ListGroupHeader 负责：

- 展示分组名称。
- 展示分组数量。
- 展开 / 收起按钮。
- 快速新增按钮。
- 分组级别操作。

ListGroupHeader 不应该和 TaskRow 混在一起。

---

## 12. 推荐目录结构

```txt
src/
├── app/
│   └── shell/
│       ├── app-shell.tsx
│       ├── shell-header.tsx
│       ├── shell-sidebar.tsx
│       ├── shell-footer.tsx
│       └── main-card/
│           ├── main-card.tsx
│           ├── main-card-header.tsx
│           ├── main-card-body.tsx
│           └── index.ts
│
├── shared/
│   └── ui/
│       ├── row/
│       │   ├── row-shell.tsx
│       │   ├── row-selection-cell.tsx
│       │   ├── row-title-cell.tsx
│       │   ├── row-meta-button.tsx
│       │   ├── row-action-button.tsx
│       │   ├── row.types.ts
│       │   └── index.ts
│       │
│       ├── list-board/
│       │   ├── list-board.tsx
│       │   ├── list-group.tsx
│       │   ├── list-group-header.tsx
│       │   ├── list-empty-state.tsx
│       │   ├── list-loading-state.tsx
│       │   └── index.ts
│       │
│       └── interactive/
│           ├── stop-propagation.tsx
│           └── index.ts
│
├── entities/
│   ├── task/
│   │   ├── model/
│   │   │   ├── task.types.ts
│   │   │   ├── task.selectors.ts
│   │   │   └── index.ts
│   │   ├── ui/
│   │   │   ├── task-row.tsx
│   │   │   └── cells/
│   │   │       ├── task-title-cell.tsx
│   │   │       ├── task-status-cell.tsx
│   │   │       ├── task-priority-cell.tsx
│   │   │       ├── task-icon-cell.tsx
│   │   │       ├── task-project-cell.tsx
│   │   │       ├── task-due-date-cell.tsx
│   │   │       ├── task-scheduled-date-cell.tsx
│   │   │       ├── task-reminder-cell.tsx
│   │   │       ├── task-created-at-cell.tsx
│   │   │       └── task-tags-cell.tsx
│   │   └── index.ts
│   │
│   ├── project/
│   │   ├── model/
│   │   ├── ui/
│   │   │   ├── project-row.tsx
│   │   │   └── cells/
│   │   │       ├── project-title-cell.tsx
│   │   │       ├── project-icon-cell.tsx
│   │   │       ├── project-task-count-cell.tsx
│   │   │       ├── project-created-at-cell.tsx
│   │   │       └── project-updated-at-cell.tsx
│   │   └── index.ts
│   │
│   └── search/
│       └── ui/
│           ├── search-result-row.tsx
│           └── cells/
│
└── features/
    ├── task-status/
    ├── task-priority/
    ├── task-date/
    ├── task-project/
    ├── task-reminder/
    ├── task-tags/
    └── task-selection/
```

---

## 13. Props 设计建议

## 13.1 RowShell Props

推荐概念结构：

```ts
export type RowShellProps = {
  id: string

  selected?: boolean
  active?: boolean
  disabled?: boolean

  density?: 'compact' | 'default' | 'comfortable'

  selection?: React.ReactNode
  leading?: React.ReactNode[]
  title: React.ReactNode
  trailing?: React.ReactNode[]
  fixedTrailing?: React.ReactNode[]

  onClick?: () => void
  onDoubleClick?: () => void
  onContextMenu?: (event: React.MouseEvent) => void

  className?: string
}
```

### 设计说明

- `title` 必填，因为每一行都必须有主语义。
- `selection` 可选，但任务行中应该始终传入。
- `leading`、`trailing`、`fixedTrailing` 都是数组，方便控制顺序。
- `density` 预留密度能力，但不要一开始做太复杂。
- `RowShell` 不接受 `task`、`project` 等业务实体。

## 13.2 RowMetaButton Props

推荐概念结构：

```ts
export type RowMetaButtonProps = {
  icon?: React.ReactNode
  label?: React.ReactNode
  active?: boolean
  muted?: boolean
  disabled?: boolean
  title?: string
  onClick?: (event: React.MouseEvent) => void
  className?: string
}
```

### 设计说明

- `label` 可以是字符串，也可以是格式化后的节点。
- `active` 表示字段已设置或当前高亮。
- `muted` 表示弱化展示。
- `disabled` 表示不可交互。
- 不传业务 type。

---

## 14. 数据流与状态管理边界

### 14.1 RowShell 数据流

RowShell 只接收 UI 状态：

```txt
selected
active
disabled
density
```

RowShell 不直接读取 store。

### 14.2 Cell 数据流

Cell 可以读取自己需要的数据，也可以由 Adapter 传入。

当前阶段推荐：

```txt
TaskRow 接收 task
TaskRow 把 task 传给各个 Cell
Cell 内部处理对应字段展示与 mutation
```

这样简单直接，适合当前阶段。

### 14.3 后续优化方向

当列表数据量变大时，可以逐步改成：

```txt
TaskRow 只传 taskId
每个 Cell 按需订阅自己的字段
```

例如：

```tsx
<TaskDueDateCell taskId={task.id} />
```

这样可以减少整行重渲染，但当前不必提前引入。

---

## 15. 样式原则

### 15.1 总原则

StoneFlow 的 Row 样式应该遵循：

- 使用 Tailwind CSS v4。
- 优先使用 shadcn 原生组件风格。
- 通过全局设计令牌控制颜色、圆角、间距、hover。
- 不在业务 Cell 中散落大量重复 className。
- Row 的高度、间距、hover、选中态由 RowShell 统一控制。

### 15.2 RowShell 样式边界

RowShell 负责：

```txt
height
padding
gap
border-radius
hover background
selected background
focus-visible ring
cursor
transition
```

Cell 不应该重复控制这些。

### 15.3 Cell 样式边界

Cell 负责：

```txt
自身 icon 尺寸
自身文本格式
自身 active / muted 语义
自身 dropdown trigger 状态
```

Cell 不负责：

```txt
行高
行背景
行 hover
行 selected
整行 padding
```

### 15.4 Button 样式收敛

所有行内按钮统一走：

```txt
RowMetaButton
RowActionButton
```

不要在每个 Cell 中直接写：

```tsx
<Button variant="outline" size="sm" className="...">
```

除非有明确例外。

---

## 16. 交互原则

### 16.1 行点击

Row 本身点击一般用于：

- 打开任务详情。
- 打开项目详情。
- 设置 active row。
- 进入详情 drawer。

### 16.2 Cell 点击

Cell 点击用于：

- 修改状态。
- 修改优先级。
- 修改日期。
- 修改项目。
- 修改标签。
- 打开字段专属弹层。

Cell 点击必须阻止冒泡。

### 16.3 键盘交互

RowShell 后续应支持：

- 上下移动 active row。
- Enter 打开详情。
- Space 选择当前行。
- Esc 关闭弹层或取消选中。

当前阶段可以只预留结构，不必一次做完。

### 16.4 右键菜单

RowShell 可以暴露：

```tsx
onContextMenu
```

但具体菜单内容建议交给 Adapter 或上层 feature。

---

## 17. 性能原则

### 17.1 当前阶段必须注意

- RowShell 保持轻量。
- Cell 组件尽量小。
- 不要在 RowShell 中做复杂业务计算。
- 不要每个 Row 都挂载复杂 dropdown 内容。
- Dropdown / Popover 内容尽量打开时再渲染。
- title 区域必须 `min-w-0`，避免布局异常。
- 列表数据计算放在上层 selector 或 view model 中。

### 17.2 当前阶段不必提前做

- 不必一开始就上虚拟列表。
- 不必一开始就做完整 Column Engine。
- 不必一开始就做用户自定义列。
- 不必一开始就做复杂拖拽排序。
- 不必过度拆分到每个 Cell 独立订阅 store。

### 17.3 后续性能升级路线

当单列表达到几百条以上，再考虑：

1. 引入虚拟列表。
2. Row 从传入完整 task 改为传入 taskId。
3. Cell 按字段订阅。
4. Dropdown 内容懒加载。
5. 使用稳定 key 和 memo 减少重渲染。

---

## 18. 与未来 Cell Registry 的关系

当前阶段不建议直接做完整 Cell Registry。

但代码结构要为未来预留空间。

### 18.1 当前阶段

使用显式装配：

```tsx
<TaskRow task={task} />
```

内部手动写：

```tsx
leading={[...]}
trailing={[...]}
```

优点：

- 简单。
- 直观。
- 类型清晰。
- 方便调试。
- 不过度工程化。

### 18.2 未来阶段

当出现视图列配置需求时，再引入：

```ts
const taskRowCellRegistry = {
  priority: TaskPriorityCell,
  status: TaskStatusCell,
  dueDate: TaskDueDateCell,
  scheduledDate: TaskScheduledDateCell,
  reminder: TaskReminderCell,
  project: TaskProjectCell,
  createdAt: TaskCreatedAtCell,
}
```

然后不同视图可以配置：

```ts
const todayViewRowConfig = {
  leading: ['priority', 'status'],
  trailing: ['scheduledDate', 'dueDate', 'project'],
  fixedTrailing: ['createdAt'],
}
```

### 18.3 引入 Registry 的时机

只有出现以下需求时才引入：

- 用户可以自定义显示哪些字段。
- 不同视图需要大量不同列组合。
- 标签、时间、项目、负责人等字段需要统一配置开关。
- 搜索结果、归档、项目详情等页面的 Row 组合越来越多。

否则保持显式装配即可。

---

## 19. 三种方案对比

## 19.1 方案 A：RowShell + Slots

```txt
RowShell 负责统一壳
TaskRow / ProjectRow 负责传 slots
每个 Cell 独立负责自己的业务
```

优点：

- 简单。
- 好理解。
- 好维护。
- 好重构。
- 对 shadcn 友好。
- 最符合当前 StoneFlow 阶段。

缺点：

- 每个实体仍然需要一个 Row Adapter。
- 如果后续视图列配置很多，需要再升级 Registry。

结论：

> 当前推荐方案。

## 19.2 方案 B：Row Engine + Cell Registry

```txt
通过配置决定每一行显示哪些 Cell
```

优点：

- 极致 DRY。
- 未来视图配置能力强。
- 支持用户自定义字段比较方便。

缺点：

- 当前阶段复杂度偏高。
- 类型设计更重。
- 容易过度工程化。
- 调试成本更高。

结论：

> 适合作为未来 V2，不建议现在直接上。

## 19.3 方案 C：Table / Column 架构

```txt
每个字段都是 column，类似数据表格系统
```

优点：

- 排序、过滤、隐藏列能力强。
- 适合高级数据视图。

缺点：

- 容易变成表格 UI。
- 不符合 StoneFlow 当前的 Linear / Raycast 轻列表体验。
- 主任务列表会显得过重。

结论：

> 不适合作为主列表架构，可作为未来高级视图单独引入。

---

## 20. 最终推荐方案

StoneFlow 当前阶段采用：

```txt
RowShell + Slots + Cell Components + Thin Entity Adapter
```

也就是：

```txt
统一壳子：RowShell
统一按钮：RowMetaButton / RowActionButton
统一列表容器：ListBoard / ListGroup
独立字段：StatusCell / PriorityCell / DateCell / ProjectCell
薄装配器：TaskRow / ProjectRow / SearchResultRow
```

这套方案具备：

- 足够统一。
- 足够简单。
- 足够可扩展。
- 不会过度工程化。
- 后续可以平滑升级到 Cell Registry。

---

## 21. 破坏性重构路线

## P0：锁定命名与边界

目标：统一术语，避免后续混乱。

任务：

- `raw` 统一改为 `row`。
- `broad` 统一改为 `board`。
- `section` 统一改为 `group`。
- 明确 `RowShell`、`Cell`、`Adapter` 的职责。
- 明确 `ListBoard`、`ListGroup`、`ListGroupHeader` 的职责。

产出：

```txt
shared/ui/row 基础目录
shared/ui/list-board 基础目录
```

---

## P1：建立 shared Row 基础设施

目标：先做无业务基础组件。

任务：

- 新建 `RowShell`。
- 新建 `RowSelectionCell`。
- 新建 `RowTitleCell`。
- 新建 `RowMetaButton`。
- 新建 `RowActionButton`。
- 定义 `row.types.ts`。
- 完成基础 hover / selected / focus / disabled 样式。

验收标准：

- RowShell 不引用任何 Task / Project 类型。
- RowSelectionCell hover 显示时不造成布局抖动。
- RowMetaButton 可以稳定复用。
- 行点击和按钮点击不会冲突。

---

## P2：用 TaskRowV2 验证架构

目标：优先重构任务行，验证完整链路。

任务：

- 新建 `TaskRowV2`。
- 新建任务相关 Cell：
  - `TaskTitleCell`
  - `TaskStatusCell`
  - `TaskPriorityCell`
  - `TaskIconCell`
  - `TaskDueDateCell`
  - `TaskScheduledDateCell`
  - `TaskReminderCell`
  - `TaskProjectCell`
  - `TaskCreatedAtCell`
- 在一个页面或实验入口中替换原 TaskRow。
- 保留旧 TaskRow，避免一次性破坏全部页面。

验收标准：

- TaskRowV2 视觉上与当前列表保持一致或更稳定。
- 左侧 checkbox hover 不抖动。
- 优先级、状态、项目、日期按钮可正常打开对应弹层。
- 点击行可以打开详情。
- 点击 Cell 不会打开详情。

---

## P3：迁移 ListBoard / ListGroup

目标：把列表容器也统一。

任务：

- 新建 `ListBoard`。
- 新建 `ListGroup`。
- 新建 `ListGroupHeader`。
- 将当前按状态分组的任务列表迁移到新结构。
- 统一 group header 的展开、数量、添加按钮。

验收标准：

- 所有状态分组使用同一个 ListGroup。
- GroupHeader 不和 TaskRow 混写。
- 分组展开 / 收起逻辑稳定。
- 后续项目列表可以直接复用 ListBoard / ListGroup。

---

## P4：迁移 ProjectRow / SearchResultRow

目标：验证 RowShell 对多实体的适配能力。

任务：

- 新建 `ProjectRow`。
- 新建 project cells。
- 新建 `SearchResultRow`。
- 将项目列表、搜索结果、归档列表逐步迁移到 RowShell。

验收标准：

- ProjectRow 和 TaskRow 共用 RowShell。
- ProjectRow 不复制 TaskRow 的布局代码。
- SearchResultRow 可以根据来源展示不同 Cell。

---

## P5：清理旧实现

目标：移除重复代码，完成架构收敛。

任务：

- 删除旧 TaskRow。
- 删除旧 ProjectRow。
- 删除散落的行内按钮样式。
- 删除重复 hover / selected 样式。
- 统一导出 shared row 组件。

验收标准：

- 行系统只有一套 RowShell。
- 行内元信息按钮只有一套 RowMetaButton。
- 不存在多个互相复制的 row layout。

---

## P6：预留 Registry，但不急着实现

目标：为未来视图列配置留口子。

任务：

- 梳理当前 Cell 名称。
- 保持 Cell 的 props 和导出稳定。
- 不引入完整 registry。
- 在文档中记录未来升级方向。

验收标准：

- 当前代码仍然是显式装配。
- 后续引入 registry 时不需要重写 Cell。

---

## 22. 开发规则

### 22.1 必须遵守

- RowShell 不允许 import 业务实体。
- RowShell 不允许发起业务 mutation。
- Cell 不允许控制整行布局。
- Cell 内部交互必须阻止冒泡。
- 行内按钮必须优先使用 RowMetaButton / RowActionButton。
- TaskRow / ProjectRow 只做装配，不写复杂业务逻辑。
- 创建时间等固定右侧字段走 fixedTrailing。
- checkbox 必须固定占位，不能 hover 时挤压布局。

### 22.2 尽量避免

- 避免创建 UniversalRow。
- 避免在一个 Cell 中处理多个业务字段。
- 避免在 TaskRow 中写大量 if / switch。
- 避免每个业务 Cell 直接写 shadcn Button 样式。
- 避免一开始就上完整 Cell Registry。
- 避免一开始就引入 TanStack Table 作为主列表基础。

### 22.3 可以接受

- 当前阶段 Adapter 里显式写 Cell 顺序。
- 当前阶段 TaskRow 把完整 task 传给 Cell。
- 当前阶段先保留旧 Row，使用 V2 并行验证。
- 当前阶段部分 Cell 先做静态展示，再逐步接入 dropdown。

---

## 23. 验收清单

### 23.1 架构验收

- [ ] RowShell 不依赖任何业务实体。
- [ ] TaskRow / ProjectRow 都基于 RowShell 实现。
- [ ] RowMetaButton 被多个 Cell 复用。
- [ ] SelectionCell 固定占位。
- [ ] ListBoard / ListGroup 与 Row 解耦。
- [ ] 业务 Cell 可以独立开发和替换。

### 23.2 交互验收

- [ ] hover 行时 checkbox 显示。
- [ ] checkbox 显示不造成行内容移动。
- [ ] 点击行打开详情。
- [ ] 点击状态按钮只打开状态 dropdown。
- [ ] 点击优先级按钮只打开优先级 dropdown。
- [ ] 点击日期按钮只打开日期选择器。
- [ ] 点击项目按钮只打开项目选择器。
- [ ] selected 状态下 checkbox 常驻显示。

### 23.3 视觉验收

- [ ] Row 高度统一。
- [ ] Row hover 背景统一。
- [ ] Row selected 背景统一。
- [ ] 左侧 Cell 间距统一。
- [ ] 右侧按钮高度统一。
- [ ] title 过长时正确省略。
- [ ] 创建时间稳定贴近最右侧。

### 23.4 性能验收

- [ ] RowShell 内没有复杂计算。
- [ ] Dropdown 内容不会在每一行无条件重渲染复杂内容。
- [ ] 列表重新渲染时没有明显卡顿。
- [ ] 后续可以平滑接入虚拟列表。

---

## 24. 后续扩展方向

### 24.1 标签系统

新增：

```txt
TaskTagsCell
TagsSelectDropdown
```

接入方式：

```tsx
trailing={[
  <TaskDueDateCell />,
  <TaskScheduledDateCell />,
  <TaskReminderCell />,
  <TaskTagsCell />,
  <TaskProjectCell />,
]}
```

### 24.2 归档列表

新增：

```txt
TaskArchivedAtCell
```

归档视图中：

```tsx
fixedTrailing={[
  <TaskArchivedAtCell />,
]}
```

### 24.3 搜索结果

新增：

```txt
SearchResultRow
SearchMatchedTextCell
SearchSourceCell
```

可以继续使用 RowShell，只是 title 和 trailing 不同。

### 24.4 高级视图

当需要类似表格的高级能力时，可以单独做：

```txt
DataView
ColumnView
```

不要污染主 Row System。

---

## 25. 最终结论

StoneFlow 的 Row 重构不应该追求一个万能组件，而应该建立一套稳定的 Row System。

最终架构为：

```txt
RowShell
负责统一行结构、布局、hover、selected、focus。

Cell
负责单个字段的展示和操作。

Adapter
负责把 Task / Project / SearchResult 等业务实体装配成 RowShell。

ListBoard / ListGroup
负责 Row 的上层列表组织。
```

当前阶段推荐采用：

```txt
RowShell + Slots + Cell Components + Thin Entity Adapter
```

这套方案符合 StoneFlow 当前需要：

- 简单。
- 清晰。
- 可持续。
- 可扩展。
- 不过度工程化。
- 适合长期演进。

一句话总结：

> 不做万能 Row，做一套可组合、可插拔、边界清晰的 Row System。

