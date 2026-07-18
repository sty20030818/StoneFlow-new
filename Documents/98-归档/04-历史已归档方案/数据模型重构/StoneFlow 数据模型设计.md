> 版本：V1 草案
> 定位：个人 Todo 桌面端应用
> 数据库：SQLite
> ID 策略：UUID v7
> 核心原则：**扁平结构、强筛选、强捕获、可追踪历史**

---

## 1. 设计目标

StoneFlow V1 的数据模型服务于一个明确目标：

> 用尽可能克制的数据结构，支撑一个完整、稳定、可扩展的个人任务系统。

StoneFlow 不做复杂的项目管理树，也不做团队协作系统。它的核心不是"把事情层层分类"，而是：

1. 快速捕获任务；
2. 将任务整理到合适的上下文；
3. 通过视图找到现在该做的事情；
4. 记录任务和项目的生命周期；
5. 为未来标签、重复任务、附件、任务关系等能力预留扩展空间。

---

## 2. 核心结构

StoneFlow V1 的核心结构只有三层：

```txt
Space
  └── Project
        └── Task
```

### 2.1 明确不做的层级

V1 明确不支持：

```txt
❌ 子 Space
❌ 子 Project
❌ 子 Task
```

### 2.2 核心对象职责

| 对象 | 定义 | 职责 |
|---|---|---|
| Space | 顶级上下文 / 工作域 | 切换大的生活、工作、项目语境 |
| Project | Space 下的一层目标容器 | 管理一组有共同目标的任务 |
| Task | 扁平执行单元 | 记录、计划、执行、完成具体事项 |
| View | 保存的筛选 / 排序 / 分组规则 | 从任务或项目中筛出工作入口 |
| Setting | 用户偏好和 UI 配置 | 控制导航、默认行为、界面表现 |
| Activity | 操作历史 | 记录对象发生过什么变化 |

---

## 3. V1 数据表总览

V1 确定落地的核心表：

```txt
spaces
projects
tasks
views
settings
activity_events
activity_changes
```

暂不落地、进入未来待办的表：

```txt
tags
task_tags
recurrence_rules / recurring_tasks
task_links
task_attachments
task_relations
comments
```

---

## 4. Space 模型

### 4.1 定义

> **Space = 顶级上下文 / 工作域 / 生活域。**

例如：

```txt
个人
与光
StoneFlow
学习
生活
```

Space 是顶部 Scope 的来源。用户通过 Space Switcher 切换当前数据范围。

### 4.2 字段定义

```ts
type Space = {
  id: string

  name: string
  iconKey: string
  colorKey: string

  isDefault: boolean
  sortOrder: number

  archivedAt: string | null
  deletedAt: string | null

  createdAt: string
  updatedAt: string
}
```

### 4.3 字段说明

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `id` | `string` | 是 | UUID v7，主键 |
| `name` | `string` | 是 | Space 名称 |
| `iconKey` | `string` | 是 | Space 图标 key，用于 Space Switcher |
| `colorKey` | `string` | 是 | Space 色彩 key，用于视觉识别 |
| `isDefault` | `boolean` | 是 | 是否为默认 Space |
| `sortOrder` | `number` | 是 | 排序字段，暂时可不暴露 UI |
| `archivedAt` | `string \| null` | 否 | 归档时间 |
| `deletedAt` | `string \| null` | 否 | 删除时间，软删除 |
| `createdAt` | `string` | 是 | 创建时间 |
| `updatedAt` | `string` | 是 | 更新时间 |

### 4.4 Space 规则

1. Task 必须属于某个 Space。
2. Project 必须属于某个 Space。
3. 系统必须保证只有一个默认 Space。
4. 快速创建任务时，如果当前 Scope 为「全部」，使用默认 Space。
5. Space 可以归档。
6. Space 可以删除。
7. 删除 Space 会同步删除该 Space 下所有 Project 和 Task。
8. 归档 Space 会同步归档该 Space 下所有 Project 和 Task。
9. 删除和归档均使用软状态字段，不直接物理删除。

### 4.5 Space 生命周期

```txt
Active
  ↓ archive
Archived
  ↓ restore
Active

Active / Archived
  ↓ delete
Trash
```

### 4.6 Space 不做什么

| 不做 | 原因 |
|---|---|
| 子 Space | 避免层级复杂化 |
| Space description | V1 中 Space 只做顶级上下文，不做文档容器 |
| Space 多选 | V1 只支持「单选 + 全部」|

---

## 5. Project 模型

### 5.1 定义

> **Project = Space 下的一层目标容器。**

Project 不嵌套，不做子项目。

例如：

```txt
与光 / 官网重构
StoneFlow / V1 收官
个人 / 健身计划
```

### 5.2 字段定义

```ts
type Project = {
  id: string
  spaceId: string

  name: string
  description: string | null
  dueAt: string | null

  sortOrder: number

  completedAt: string | null

  archivedAt: string | null
  archivedByType: 'space' | 'project' | 'self' | null
  archivedById: string | null

  deletedAt: string | null
  deletedByType: 'space' | 'project' | 'self' | null
  deletedById: string | null

  createdAt: string
  updatedAt: string
}
```

> 备注：Project 理论上不会被 Project 归档或删除，但为了统一恢复来源模型，`archivedByType` / `deletedByType` 保留通用枚举。Project 常见来源为 `self` 或 `space`。

### 5.3 字段说明

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `id` | `string` | 是 | UUID v7，主键 |
| `spaceId` | `string` | 是 | 所属 Space |
| `name` | `string` | 是 | Project 名称 |
| `description` | `string \| null` | 否 | 项目说明，轻量文本 |
| `dueAt` | `string \| null` | 否 | 项目级截止时间 |
| `sortOrder` | `number` | 是 | Sidebar / Project 列表排序 |
| `completedAt` | `string \| null` | 否 | 项目完成时间 |
| `archivedAt` | `string \| null` | 否 | 项目归档时间 |
| `archivedByType` | `string \| null` | 否 | 归档来源类型 |
| `archivedById` | `string \| null` | 否 | 归档来源 ID |
| `deletedAt` | `string \| null` | 否 | 项目删除时间 |
| `deletedByType` | `string \| null` | 否 | 删除来源类型 |
| `deletedById` | `string \| null` | 否 | 删除来源 ID |
| `createdAt` | `string` | 是 | 创建时间 |
| `updatedAt` | `string` | 是 | 更新时间 |

### 5.4 Project 状态计算

Project 不单独存 `status` 字段，通过时间字段计算状态。

```ts
function getProjectState(project: Project) {
  if (project.deletedAt) return 'deleted'
  if (project.archivedAt && project.completedAt) return 'completed_archived'
  if (project.archivedAt) return 'archived'
  if (project.completedAt) return 'completed'
  return 'active'
}
```

### 5.5 Project 生命周期

```txt
Active
  ↓ complete
Completed
  ↓ archive
Archived
  ↓ delete
Trash
```

同时允许：

```txt
Active → Archived
Active → Trash
Completed → Trash
```

### 5.6 Project 规则

1. Project 必须属于一个 Space。
2. Project 不支持嵌套。
3. Project 可以为空描述。
4. Project 可以没有 `dueAt`。
5. Project 可以完成。
6. Project 可以归档。
7. Project 可以删除。
8. 删除 Project 会同步删除其下所有 Task。
9. 归档 Project 会同步归档其下所有 Task。
10. 恢复 Project 默认只恢复 Project，不自动恢复 Task。
11. Project 完成不等于归档。
12. Project 归档不等于完成。

### 5.7 completedAt 与 archivedAt 区别

| 字段 | 含义 | 是否影响可见性 |
|---|---|---:|
| `completedAt` | 项目目标完成 | 不一定隐藏 |
| `archivedAt` | 项目从日常工作区收起 | 默认隐藏 |
| `deletedAt` | 项目进入回收站 | 隐藏，仅 Trash 可见 |

### 5.8 Project 不做什么

| 不做 | 原因 |
|---|---|
| 子 Project | 避免树结构复杂化 |
| Project icon/color | V1 保持 Project 轻量，视觉识别交给 Space |
| Project status 字段 | 可由 completedAt / archivedAt / deletedAt 计算 |
| Project progress 字段 | 可从 Task 统计计算 |
| Project taskCount 字段 | 可从 Task 查询计算 |

---

## 6. Task 模型

### 6.1 定义

> **Task = 扁平的执行单元。**

Task 不支持子任务。所有任务都处于同一层级，通过 Space、Project、Inbox、View 组织。

### 6.2 字段定义

```ts
type Task = {
  id: string

  spaceId: string
  projectId: string | null

  title: string
  note: string | null

  status: 'todo' | 'doing' | 'waiting' | 'done' | 'canceled'
  statusChangedAt: string

  priority: 0 | 1 | 2 | 3 | 4

  inboxAt: string | null

  dueAt: string | null
  scheduledAt: string | null
  reminderAt: string | null

  sortOrder: number

  completedAt: string | null
  canceledAt: string | null

  archivedAt: string | null
  archivedByType: 'space' | 'project' | 'self' | null
  archivedById: string | null

  deletedAt: string | null
  deletedByType: 'space' | 'project' | 'self' | null
  deletedById: string | null

  createdAt: string
  updatedAt: string
}
```

### 6.3 字段说明

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `id` | `string` | 是 | UUID v7，主键 |
| `spaceId` | `string` | 是 | 所属 Space |
| `projectId` | `string \| null` | 否 | 所属 Project，可为空 |
| `title` | `string` | 是 | 任务标题 |
| `note` | `string \| null` | 否 | 任务备注，轻量文本 |
| `status` | `TaskStatus` | 是 | 执行状态 |
| `statusChangedAt` | `string` | 是 | 状态最近一次变化时间 |
| `priority` | `0 \| 1 \| 2 \| 3 \| 4` | 是 | 优先级 |
| `inboxAt` | `string \| null` | 否 | 是否处于 Inbox 待整理状态 |
| `dueAt` | `string \| null` | 否 | 截止时间 |
| `scheduledAt` | `string \| null` | 否 | 计划执行时间 |
| `reminderAt` | `string \| null` | 否 | 提醒时间 |
| `sortOrder` | `number` | 是 | 当前列表内手动排序 |
| `completedAt` | `string \| null` | 否 | 完成时间 |
| `canceledAt` | `string \| null` | 否 | 取消时间 |
| `archivedAt` | `string \| null` | 否 | 归档时间 |
| `archivedByType` | `string \| null` | 否 | 归档来源类型 |
| `archivedById` | `string \| null` | 否 | 归档来源 ID |
| `deletedAt` | `string \| null` | 否 | 删除时间 |
| `deletedByType` | `string \| null` | 否 | 删除来源类型 |
| `deletedById` | `string \| null` | 否 | 删除来源 ID |
| `createdAt` | `string` | 是 | 创建时间 |
| `updatedAt` | `string` | 是 | 更新时间 |

### 6.4 Task Status

```ts
type TaskStatus = 'todo' | 'doing' | 'waiting' | 'done' | 'canceled'
```

| 状态 | 含义 |
|---|---|
| `todo` | 待处理，默认状态 |
| `doing` | 正在推进 |
| `waiting` | 等待外部条件、反馈或时机 |
| `done` | 已完成 |
| `canceled` | 决定不做了 |

### 6.5 Task 状态流转

```txt
todo
  ↓ start
doing
  ↓ complete
done

todo / doing
  ↓ wait
waiting
  ↓ resume
todo / doing

todo / doing / waiting
  ↓ cancel
canceled
```

生命周期操作独立于状态：

```txt
任意状态 → archive
任意状态 → delete
```

### 6.6 优先级

```ts
type TaskPriority = 0 | 1 | 2 | 3 | 4
```

| 值 | 含义 |
|---:|---|
| 0 | 无优先级 |
| 1 | 低 |
| 2 | 中 |
| 3 | 高 |
| 4 | 紧急 |

默认值：

```txt
priority = 0
```

### 6.7 时间字段语义

| 字段 | 含义 | 示例 |
|---|---|---|
| `scheduledAt` | 我打算什么时候做 | 今天晚上写数据模型 |
| `dueAt` | 最晚什么时候完成 | 周五前提交方案 |
| `reminderAt` | 什么时候提醒我 | 明天 10 点提醒 |

### 6.8 dueAt 与 scheduledAt 区别

```txt
scheduledAt = 我什么时候做
dueAt = 最晚什么时候交
```

示例：

| 场景 | scheduledAt | dueAt |
|---|---|---|
| 我打算周三做 | 周三 | null |
| 周五前必须提交 | null | 周五 |
| 周三做，周五截止 | 周三 | 周五 |
| 今天想做但没有死线 | 今天 | null |

### 6.9 Task 不做什么

| 不做 | 原因 |
|---|---|
| 子任务 | 避免形成变相子项目 |
| Task type | V1 所有任务都是 Task，不做 epic / note / idea |
| Duplicate 字段 | 未来作为任务关系处理，不进 V1 Task 表 |
| canceledReason | V1 不记录取消原因 |
| estimate | 避免变成重项目管理 |
| recurrenceRule | 重复任务后续独立设计 |
| tags 数组 | Tag 后续单独建模 |
| attachments 字段 | 附件后续独立建模 |

---

## 7. Inbox 模型

### 7.1 定义

> **Inbox = 待整理状态，不是 Project。**

Inbox 通过 Task 字段 `inboxAt` 表达。

```ts
inboxAt: string | null
```

### 7.2 三种任务归属状态

| 状态 | projectId | inboxAt | 说明 |
|---|---:|---:|---|
| Inbox 待整理 | `null` | 有值 | 捕获后还没整理 |
| No Project 已整理 | `null` | `null` | 已确认不属于任何项目 |
| Project 任务 | 有值 | `null` | 已归属具体项目 |

### 7.3 入 Inbox 规则

| 场景 | 是否进入 Inbox |
|---|---:|
| 快捷创建只填 title / note | 是 |
| 当前 Space 下创建但没选 Project | 是 |
| 当前 Scope 是「全部」时快捷创建 | 是，进入默认 Space 的 Inbox |
| Project 页面内创建 | 否 |
| 创建时明确选择 Project | 否 |
| 创建时明确选择 No Project | 否 |
| 外部导入 / AI 生成 | 默认是 |
| 手动 Move to Inbox | 是 |

### 7.4 出 Inbox 规则

| 动作 | 是否出 Inbox |
|---|---:|
| 移动到 Project | 是 |
| 标记为 No Project | 是 |
| 完成任务 | 是 |
| 取消任务 | 是 |
| 归档任务 | 是 |
| 删除任务 | 是 |
| 设置 priority | 否 |
| 设置 dueAt | 否 |
| 设置 scheduledAt | 否 |
| 设置 reminderAt | 否 |
| 修改 note | 否 |

### 7.5 Inbox 原则

> Inbox 不是"缺字段任务列表"，而是"还没被确认归属的捕获池"。

---

## 8. View 模型

### 8.1 定义

> **View = 保存下来的筛选、排序、分组规则。**

Task 不属于 View。View 不拥有数据，只负责查询数据。

### 8.2 字段定义

```ts
type View = {
  id: string

  name: string
  description: string | null

  type: 'system' | 'custom'
  entityType: 'task' | 'project'

  key: string | null

  filters: Record<string, unknown>
  sort: Array<{
    field: string
    direction: 'asc' | 'desc'
  }>
  groupBy: string | null

  isVisible: boolean
  sortOrder: number

  createdAt: string
  updatedAt: string
}
```

### 8.3 字段说明

| 字段 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `id` | `string` | 是 | UUID v7，主键 |
| `name` | `string` | 是 | View 显示名称 |
| `description` | `string \| null` | 否 | View 说明 |
| `type` | `system \| custom` | 是 | 系统视图或用户视图 |
| `entityType` | `task \| project` | 是 | View 作用对象 |
| `key` | `string \| null` | 否 | 系统 View 稳定 key |
| `filters` | `JSON` | 是 | 筛选条件 |
| `sort` | `JSON` | 是 | 排序规则 |
| `groupBy` | `string \| null` | 否 | 分组字段 |
| `isVisible` | `boolean` | 是 | 是否显示在 Views / Project Overview 中 |
| `sortOrder` | `number` | 是 | View 排序 |
| `createdAt` | `string` | 是 | 创建时间 |
| `updatedAt` | `string` | 是 | 更新时间 |

### 8.4 View Scope 原则

View 不绑定 Space。

当前数据范围由顶部 Space Switcher 控制：

```txt
当前 Scope = 与光
点击 Today = 与光的 Today

当前 Scope = 全部
点击 Today = 所有 Space 的 Today
```

原则：

```txt
Scope 在外面，Filter 在 View 里面。
```

### 8.5 Task View Filter 协议

V1 使用受控 JSON，不做任意复杂条件树。

```ts
type TaskViewFilters = {
  status?: Array<'todo' | 'doing' | 'waiting' | 'done' | 'canceled'>

  priority?: {
    eq?: number
    gte?: number
    lte?: number
  }

  inbox?: boolean

  project?: {
    mode: 'any' | 'none' | 'specific'
    ids?: string[]
  }

  due?: DateFilter
  scheduled?: DateFilter
  created?: DateFilter
  updated?: DateFilter
  completed?: DateFilter

  archived?: boolean
  deleted?: boolean
}
```

```ts
type DateFilter = {
  mode:
    | 'today'
    | 'tomorrow'
    | 'this_week'
    | 'next_week'
    | 'overdue'
    | 'future'
    | 'past'
    | 'between'
    | 'none'
    | 'not_none'

  from?: string
  to?: string
}
```

### 8.6 系统 Task Views

V1 默认创建这些系统 Task Views：

| key | 名称 | 默认可见 | 说明 |
|---|---|---:|---|
| `today` | Today | 是 | 今天计划、今天截止、已逾期未完成 |
| `focus` | Focus | 是 | 高优先级且可执行任务 |
| `upcoming` | Upcoming | 是 | 未来计划或未来截止任务 |
| `recently_added` | Recently Added | 是 | 最近创建的任务 |
| `waiting` | Waiting | 是 | 等待中的任务 |
| `overdue` | Overdue | 是 | 已逾期未完成任务 |

> 备注：所有页面一开始默认可见。

### 8.7 系统 Project Views

Project Overview 默认包含：

| key | 名称 | 默认可见 | 说明 |
|---|---|---:|---|
| `active_projects` | Active | 是 | 未完成、未归档、未删除 |
| `completed_projects` | Completed | 是 | 已完成、未归档、未删除 |
| `archived_projects` | Archived | 是 | 已归档、未删除 |
| `all_projects` | All | 是 | 所有未删除项目 |

### 8.8 View 不做什么

| 不做 | 原因 |
|---|---|
| 任意复杂 AND/OR 条件树 | V1 保持实现可控 |
| View 绑定 Space | 避免 Space 切换心智复杂 |
| View 拥有 Task | View 只是查询，不是容器 |

---

## 9. Settings 模型

### 9.1 定义

> **Settings = 用户偏好和 UI 行为配置。**

Settings 不存业务对象，只存配置。

### 9.2 字段定义

```ts
type Setting = {
  key: string
  value: unknown

  createdAt: string
  updatedAt: string
}
```

### 9.3 Settings 表规则

1. 使用通用 key-value 表。
2. `value` 存 JSON 字符串。
3. 不为每个设置单独建字段。
4. 业务数据不进入 Settings。

### 9.4 默认 Settings Keys

```txt
app.sidebar
app.quickCreate
app.taskDefaults
app.ui
```

### 9.5 app.sidebar

```ts
type SidebarSettings = {
  mainItems: {
    inbox: SidebarItemSetting
    allTasks: SidebarItemSetting
    views: SidebarItemSetting
    projectOverview: SidebarItemSetting
  }

  projectSection: {
    visible: boolean
    order: number
    collapsed: boolean
    showCounts: boolean
    showCompleted: boolean
    maxVisible: number | null
  }

  footerItems: {
    archive: SidebarItemSetting
    trash: SidebarItemSetting
  }

  width: number
}

 type SidebarItemSetting = {
  visible: boolean
  order: number
}
```

默认值：

```json
{
  "mainItems": {
    "inbox": { "visible": true, "order": 100 },
    "allTasks": { "visible": true, "order": 200 },
    "views": { "visible": true, "order": 300 },
    "projectOverview": { "visible": true, "order": 400 }
  },
  "projectSection": {
    "visible": true,
    "order": 500,
    "collapsed": false,
    "showCounts": true,
    "showCompleted": true,
    "maxVisible": null
  },
  "footerItems": {
    "archive": { "visible": true, "order": 900 },
    "trash": { "visible": true, "order": 1000 }
  },
  "width": 256
}
```

### 9.6 app.quickCreate

```ts
type QuickCreateSettings = {
  defaultSpaceStrategy: 'current_or_default'
  whenScopeAll: 'default_space'
  defaultInboxBehavior: 'inbox_when_no_project'
  allowNoProjectShortcut: boolean
  defaultOpenAfterCreate: boolean
}
```

### 9.7 app.taskDefaults

默认值：

```json
{
  "status": "todo",
  "priority": 0,
  "projectId": null,
  "dueAt": null,
  "scheduledAt": null,
  "reminderAt": null
}
```

### 9.8 app.ui

```ts
type UISettings = {
  theme: 'light' | 'dark' | 'system'
  density: 'comfortable' | 'compact'
  sidebarWidth: number
  taskDrawerWidth: number
}
```

### 9.9 Settings 不存什么

| 不存 | 原因 |
|---|---|
| Space 数据 | 属于业务实体 |
| Project 数据 | 属于业务实体 |
| Task 数据 | 属于业务实体 |
| View 筛选条件 | 属于 View 自身 |
| View 可见度 | 属于 View 自身 |
| Activity | 属于历史记录 |

---

## 10. Activity 模型

### 10.1 定义

> **Activity = 操作历史。**

主表保存当前状态，Activity 保存变化历史。

```txt
spaces / projects / tasks / views = 当前事实
activity_events / activity_changes = 历史变化
```

### 10.2 为什么要两张表

一次用户操作可能改多个字段。

例如完成任务会同时修改：

```txt
status
statusChangedAt
completedAt
inboxAt
updatedAt
```

所以使用两张表：

```txt
activity_events  = 一次操作
activity_changes = 本次操作中的字段变化
```

### 10.3 activity_events

```ts
type ActivityEvent = {
  id: string

  entityType: 'task' | 'project' | 'space' | 'view' | 'setting'
  entityId: string

  action: string

  actorType: 'user' | 'system' | 'ai'
  source: 'app' | 'shortcut' | 'command' | 'import' | 'automation'

  summary: string | null
  metadata: Record<string, unknown> | null

  createdAt: string
}
```

### 10.4 activity_changes

```ts
type ActivityChange = {
  id: string

  eventId: string

  field: string
  oldValue: unknown | null
  newValue: unknown | null

  createdAt: string
}
```

### 10.5 Activity 规则

1. Activity 从 V1 开始完整落地。
2. Activity 不替代主表字段。
3. Activity 不用于实时计算当前状态。
4. 用户不手动创建 Activity。
5. 用户操作业务对象后，系统自动写入 Activity。
6. 不记录每一次输入，只记录有效保存后的变更。
7. Activity 不等于评论，评论未来另做。

### 10.6 Task Actions

```ts
type TaskActivityAction =
  | 'task.created'
  | 'task.title.updated'
  | 'task.note.updated'
  | 'task.status.changed'
  | 'task.priority.changed'
  | 'task.inbox.entered'
  | 'task.inbox.left'
  | 'task.moved.space'
  | 'task.moved.project'
  | 'task.due.updated'
  | 'task.scheduled.updated'
  | 'task.reminder.updated'
  | 'task.completed'
  | 'task.reopened'
  | 'task.canceled'
  | 'task.archived'
  | 'task.restored'
  | 'task.deleted'
  | 'task.permanently_deleted'
  | 'task.sort.changed'
```

### 10.7 Project Actions

```ts
type ProjectActivityAction =
  | 'project.created'
  | 'project.name.updated'
  | 'project.description.updated'
  | 'project.due.updated'
  | 'project.completed'
  | 'project.reopened'
  | 'project.archived'
  | 'project.restored'
  | 'project.deleted'
  | 'project.permanently_deleted'
  | 'project.sort.changed'
```

### 10.8 Space Actions

```ts
type SpaceActivityAction =
  | 'space.created'
  | 'space.name.updated'
  | 'space.icon.updated'
  | 'space.color.updated'
  | 'space.default.changed'
  | 'space.archived'
  | 'space.restored'
  | 'space.deleted'
  | 'space.permanently_deleted'
  | 'space.sort.changed'
```

### 10.9 View / Settings Actions

```ts
type ConfigActivityAction =
  | 'view.created'
  | 'view.updated'
  | 'view.deleted'
  | 'view.visibility.changed'
  | 'settings.updated'
```

---

## 11. 删除、归档、恢复规则

### 11.1 删除规则

| 操作 | 规则 |
|---|---|
| 删除 Space | 同步删除 Space 下所有 Project / Task |
| 删除 Project | 同步删除 Project 下所有 Task |
| 删除 Task | 只删除自己 |

删除使用：

```ts
deletedAt = now
```

同步删除时记录来源：

```ts
deletedByType = 'space' | 'project' | 'self'
deletedById = sourceId
```

### 11.2 归档规则

| 操作 | 规则 |
|---|---|
| 归档 Space | 同步归档 Space 下所有 Project / Task |
| 归档 Project | 同步归档 Project 下所有 Task |
| 归档 Task | 只归档自己 |

归档使用：

```ts
archivedAt = now
```

同步归档时记录来源：

```ts
archivedByType = 'space' | 'project' | 'self'
archivedById = sourceId
```

### 11.3 恢复规则

#### 恢复 Space

V1 默认：

```txt
只恢复 Space，不自动恢复 Project / Task
```

#### 恢复 Project

V1 默认：

```txt
只恢复 Project，不自动恢复 Task
```

#### 恢复 Task

规则：

```txt
1. 如果原 Space 存在且未删除，则恢复到原 Space。
2. 如果原 Space 不存在或已删除，则恢复到默认 Space。
3. 如果原 Project 存在且未删除，则恢复到原 Project。
4. 如果原 Project 不存在或已删除，则 projectId = null，inboxAt = now。
```

一句话：

> 恢复 Task 时，能回原位置就回原位置；回不去就进入可用 Space 的 Inbox。

### 11.4 为什么记录来源字段

虽然 V1 恢复父级时不自动恢复子级，但保留来源字段是为了未来支持：

```txt
恢复 Space 及其内容
恢复 Project 及其任务
```

---

## 12. 页面查询规则

### 12.1 当前 Scope

顶部 Space Switcher 控制当前 Scope：

```txt
全部
个人
与光
StoneFlow
...
```

查询时统一加：

```txt
spaceId in currentScope
```

如果 Scope 为「全部」，则不限制具体 Space。

### 12.2 Inbox

```txt
spaceId in currentScope
inboxAt is not null
deletedAt is null
archivedAt is null
status in todo / doing / waiting
```

### 12.3 All Tasks

默认：

```txt
spaceId in currentScope
deletedAt is null
archivedAt is null
```

页面内可筛选：

```txt
Active / Completed / Canceled / Archived / All
```

其中：

```txt
Active = todo + doing + waiting
```

### 12.4 Today

```txt
spaceId in currentScope
deletedAt is null
archivedAt is null
status in todo / doing / waiting
AND (
  scheduledAt is today
  OR dueAt is today
  OR dueAt < today
)
```

### 12.5 Focus

```txt
spaceId in currentScope
deletedAt is null
archivedAt is null
status in todo / doing
priority >= 3
```

### 12.6 Upcoming

```txt
spaceId in currentScope
deletedAt is null
archivedAt is null
status in todo / doing / waiting
AND (
  scheduledAt > today
  OR dueAt > today
)
```

### 12.7 Recently Added

```txt
spaceId in currentScope
deletedAt is null
archivedAt is null
ORDER BY createdAt DESC
```

### 12.8 Waiting

```txt
spaceId in currentScope
deletedAt is null
archivedAt is null
status = waiting
```

### 12.9 Overdue

```txt
spaceId in currentScope
deletedAt is null
archivedAt is null
status in todo / doing / waiting
dueAt < today
```

### 12.10 Project Overview

```txt
spaceId in currentScope
deletedAt is null
```

Tabs：

```txt
Active: completedAt is null AND archivedAt is null
Completed: completedAt is not null AND archivedAt is null
Archived: archivedAt is not null
All: deletedAt is null
```

### 12.11 Project Detail

```txt
projectId = currentProject.id
deletedAt is null
archivedAt is null
```

默认可显示 Active，页面内支持切换 Completed / Canceled / All。

### 12.12 No Project

```txt
spaceId in currentScope
projectId is null
inboxAt is null
deletedAt is null
archivedAt is null
```

### 12.13 Archive

```txt
spaceId in currentScope
archivedAt is not null
deletedAt is null
```

Archive 页面可展示：

```txt
Spaces
Projects
Tasks
```

### 12.14 Trash

```txt
deletedAt is not null
```

如果 Scope 不是「全部」，额外加：

```txt
spaceId in currentScope
```

---

## 13. Sidebar 与数据模型关系

### 13.1 Sidebar 默认结构

```txt
[ Space Switcher ]

Inbox
All Tasks
Views
Project Overview

────────────

Projects
  Project A
  Project B
  Project C

────────────

Archive
Trash
```

### 13.2 Sidebar 规则

1. Space Switcher 控制全局 Scope。
2. Sidebar 主入口由 `app.sidebar` 控制可见度。
3. Views 下的具体 Tabs 由 `views.isVisible` 控制。
4. Projects 快捷区展示当前 Scope 下的 Projects。
5. Archive / Trash 位于 Footer。
6. 所有入口默认可见。

---

## 14. 默认初始化 Seed

### 14.1 默认 Space

```ts
{
  name: '个人',
  iconKey: 'user',
  colorKey: 'blue',
  isDefault: true,
  sortOrder: 1000
}
```

### 14.2 默认 Task

```json
{
  "status": "todo",
  "priority": 0,
  "projectId": null,
  "dueAt": null,
  "scheduledAt": null,
  "reminderAt": null
}
```

### 14.3 默认 Views

Task Views：

```txt
Today
Focus
Upcoming
Recently Added
Waiting
Overdue
```

Project Views：

```txt
Active
Completed
Archived
All
```

全部默认可见。

### 14.4 默认 Sidebar

全部入口默认可见。

---

## 15. SQLite Schema

### 15.1 Spaces

```sql
CREATE TABLE spaces (
  id TEXT PRIMARY KEY,

  name TEXT NOT NULL,
  icon_key TEXT NOT NULL,
  color_key TEXT NOT NULL,

  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,

  archived_at TEXT,
  deleted_at TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_spaces_default_unique
ON spaces(is_default)
WHERE is_default = 1;

CREATE INDEX idx_spaces_visible
ON spaces(deleted_at, archived_at, sort_order);
```

### 15.2 Projects

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,

  name TEXT NOT NULL,
  description TEXT,
  due_at TEXT,

  sort_order INTEGER NOT NULL DEFAULT 0,

  completed_at TEXT,

  archived_at TEXT,
  archived_by_type TEXT,
  archived_by_id TEXT,

  deleted_at TEXT,
  deleted_by_type TEXT,
  deleted_by_id TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (space_id) REFERENCES spaces(id)
);

CREATE INDEX idx_projects_space_visible
ON projects(space_id, deleted_at, archived_at, completed_at, sort_order);

CREATE INDEX idx_projects_due
ON projects(due_at);

CREATE UNIQUE INDEX idx_projects_space_name_unique
ON projects(space_id, name)
WHERE deleted_at IS NULL;
```

### 15.3 Tasks

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,

  space_id TEXT NOT NULL,
  project_id TEXT,

  title TEXT NOT NULL,
  note TEXT,

  status TEXT NOT NULL DEFAULT 'todo',
  status_changed_at TEXT NOT NULL,

  priority INTEGER NOT NULL DEFAULT 0,

  inbox_at TEXT,

  due_at TEXT,
  scheduled_at TEXT,
  reminder_at TEXT,

  sort_order INTEGER NOT NULL DEFAULT 0,

  completed_at TEXT,
  canceled_at TEXT,

  archived_at TEXT,
  archived_by_type TEXT,
  archived_by_id TEXT,

  deleted_at TEXT,
  deleted_by_type TEXT,
  deleted_by_id TEXT,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (space_id) REFERENCES spaces(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX idx_tasks_space_visible
ON tasks(space_id, deleted_at, archived_at, status);

CREATE INDEX idx_tasks_project
ON tasks(project_id, deleted_at, archived_at, sort_order);

CREATE INDEX idx_tasks_inbox
ON tasks(space_id, inbox_at, deleted_at, archived_at);

CREATE INDEX idx_tasks_due
ON tasks(due_at);

CREATE INDEX idx_tasks_scheduled
ON tasks(scheduled_at);

CREATE INDEX idx_tasks_priority
ON tasks(priority);

CREATE INDEX idx_tasks_created
ON tasks(created_at DESC);

CREATE INDEX idx_tasks_status_changed
ON tasks(status, status_changed_at);
```

### 15.4 Views

```sql
CREATE TABLE views (
  id TEXT PRIMARY KEY,

  name TEXT NOT NULL,
  description TEXT,

  type TEXT NOT NULL,
  entity_type TEXT NOT NULL,

  key TEXT,

  filters TEXT NOT NULL,
  sort TEXT NOT NULL,
  group_by TEXT,

  is_visible INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_views_system_key
ON views(key)
WHERE key IS NOT NULL;

CREATE INDEX idx_views_entity_visible
ON views(entity_type, is_visible, sort_order);
```

### 15.5 Settings

```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 15.6 activity_events

```sql
CREATE TABLE activity_events (
  id TEXT PRIMARY KEY,

  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,

  action TEXT NOT NULL,

  actor_type TEXT NOT NULL DEFAULT 'user',
  source TEXT NOT NULL DEFAULT 'app',

  summary TEXT,
  metadata TEXT,

  created_at TEXT NOT NULL
);

CREATE INDEX idx_activity_events_entity
ON activity_events(entity_type, entity_id, created_at DESC);

CREATE INDEX idx_activity_events_action
ON activity_events(action, created_at DESC);
```

### 15.7 activity_changes

```sql
CREATE TABLE activity_changes (
  id TEXT PRIMARY KEY,

  event_id TEXT NOT NULL,

  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,

  created_at TEXT NOT NULL,

  FOREIGN KEY (event_id) REFERENCES activity_events(id)
);

CREATE INDEX idx_activity_changes_event
ON activity_changes(event_id);

CREATE INDEX idx_activity_changes_field
ON activity_changes(field);
```

---

## 16. V1 明确不做

| 模块 | V1 是否做 | 说明 |
|---|---:|---|
| 子项目 | 不做 | 保持 Project 单层 |
| 子任务 | 不做 | 保持 Task 扁平 |
| Tags | 不做 | 后续独立设计 |
| 重复任务 | 不做 | 后续独立设计 |
| 附件 / 链接 | 不做 | 后续独立设计 |
| 任务关系 | 不做 | Duplicate / Related / Blocked 后续设计 |
| Comments | 不做 | Activity 不等于评论 |
| 多提醒 | 不做 | V1 仅 `reminderAt` |
| Space 多选 | 不做 | V1 单选 + 全部 |
| 自定义 Status | 不做 | V1 固定 5 个状态 |
| Project icon/color | 不做 | V1 仅 Space 有 icon/color |
| Task estimate | 不做 | 避免重项目管理 |

---

## 17. 未来待办

### 17.1 Tags

未来独立设计：

```txt
全局 Tag 或 Space 内 Tag
Tag 可选颜色
Tag 可显示在 Sidebar
Tag 可参与 View 筛选
```

可能表：

```txt
tags
task_tags
```

### 17.2 重复任务

未来独立设计：

```txt
每日 / 每周 / 每月
完成后生成下一次
跳过一次
修改本次 / 修改全部
```

### 17.3 附件 / 链接

未来独立设计：

```txt
网页链接
本地文件
图片
截图
外部引用
```

可能表：

```txt
task_links
task_attachments
```

### 17.4 任务关系

未来可能支持：

```txt
Duplicate
Related
Blocked by
```

可能表：

```txt
task_relations
```

### 17.5 Comments

未来如需用户手写评论，单独设计：

```txt
comments
```

---

## 18. 总结

StoneFlow V1 的数据模型核心是：

```txt
业务核心：spaces / projects / tasks
组织入口：views / settings
历史追踪：activity_events / activity_changes
```

最重要的设计取舍是：

1. 不做树结构；
2. 不做子项目；
3. 不做子任务；
4. Inbox 是待整理状态，不是 Project；
5. Project 可以为空，形成 No Project 状态；
6. View 是筛选规则，不拥有任务；
7. 主表保存当前状态，Activity 保存历史变化；
8. 删除 / 归档使用软状态，并记录来源；
9. V1 聚焦核心任务流，Tags / 重复任务 / 附件 / 关系全部后置。

最终原则：

> **StoneFlow 不是文件夹树，而是一个以 Space 为 Scope、Project 为归属、Task 为执行单元、View 为工作入口的个人任务系统。**
