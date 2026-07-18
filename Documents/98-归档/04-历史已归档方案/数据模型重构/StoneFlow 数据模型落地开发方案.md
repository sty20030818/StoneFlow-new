> 版本：V1 开发方案
> 目标：将 StoneFlow V1 已确定的数据模型完整落地为可运行、可验证、可迭代的桌面端 Todo 系统。
> 适用范围：SQLite 数据层、Repository / Service、状态管理、核心页面、核心交互、Activity、Settings、生命周期规则。
> 不包含：Tags、重复任务、附件 / 链接、任务关系、评论、子项目、子任务、Space 多选、自定义 Status。

---

## 0. 文档目标

这份文档不是单纯的功能清单，而是 StoneFlow V1 的 **开发路线图 + 数据模型落地方案 + 页面验收标准**。

它回答以下问题：

1. 每个数据模型应该在哪个阶段落地；
2. 每个阶段需要完成哪些小阶段；
3. 每个小阶段的代码产物、页面产物和验收标准是什么；
4. 哪些功能必须接入 Activity；
5. 哪些页面需要遵守 Space Scope；
6. 删除、归档、恢复、Inbox、No Project、Views 等规则如何落地；
7. V1 怎么保证开发过程不失控、不反复推翻基础结构。

---

## 1. V1 总体目标

V1 要落地一个完整可用的个人 Todo 桌面端系统。

核心能力包括：

```txt
Space Scope
Project 归属
Task 执行
Inbox 捕获
No Project 整理
Views 筛选
Archive / Trash 生命周期
Activity 操作历史
Settings 配置
Sidebar 导航
Task Drawer 详情编辑
```

V1 的核心体验目标：

> 用户可以快速捕获任务，整理到 Space / Project / No Project，通过 Today / Focus / Upcoming 等视图进入执行，并能追踪所有重要操作历史。

---

## 2. V1 明确不做

V1 不做以下内容：

| 模块 | 是否做 | 原因 |
|---|---:|---|
| 子项目 | 不做 | 避免树结构 |
| 子任务 | 不做 | 避免变相子项目 |
| Tags | 不做 | 后续独立设计 |
| 重复任务 | 不做 | 后续独立设计 |
| 附件 / 链接 | 不做 | 后续独立设计 |
| 任务关系 | 不做 | Duplicate / Related / Blocked 后续独立设计 |
| 评论 | 不做 | Activity 不等于 Comment |
| Space 多选 | 不做 | V1 只做单选 + 全部 |
| 自定义 Status | 不做 | V1 固定 5 个状态 |
| Project icon / color | 不做 | V1 只让 Space 有 icon / color |
| Task estimate | 不做 | 避免重项目管理 |
| 多提醒 | 不做 | V1 只有 `reminderAt` |

---

## 3. V1 核心数据表

V1 要落地的表：

```txt
spaces
projects
tasks
views
settings
activity_events
activity_changes
```

表职责：

| 表 | 职责 |
|---|---|
| `spaces` | 顶级上下文 |
| `projects` | Space 下的一层目标容器 |
| `tasks` | 扁平执行单元 |
| `views` | 保存筛选、排序、分组规则 |
| `settings` | UI 与行为配置 |
| `activity_events` | 一次操作事件 |
| `activity_changes` | 一次操作中的字段变化 |

---

## 4. 推荐开发顺序总览

V1 分成 11 个阶段：

| 阶段 | 名称 | 核心目标 | 主要模型 |
|---:|---|---|---|
| 0 | 工程基础与数据库基础 | SQLite、迁移、UUID、Repository 约定 | infra |
| 1 | Schema 与 Seed | 全表建表、默认 Space、默认 Views、默认 Settings | all schema |
| 2 | Activity 基础设施 | 操作历史从一开始可用 | activity |
| 3 | Settings 与 Sidebar 配置 | UI 配置、Sidebar 可见度、默认行为 | settings |
| 4 | Space 模型落地 | Space CRUD、Scope、Space Switcher | spaces |
| 5 | Project 模型落地 | Project CRUD、Project Overview、Projects 快捷区 | projects |
| 6 | Task 基础模型落地 | Task CRUD、Task List、Task Drawer | tasks |
| 7 | Inbox 工作流落地 | 快速捕获、整理、No Project | tasks.inboxAt |
| 8 | Task 执行能力落地 | Status、Priority、时间字段、排序 | tasks |
| 9 | Views 系统落地 | 系统 Views、自定义 View 基础、Filter 执行器 | views |
| 10 | Archive / Trash 生命周期落地 | 归档、删除、恢复、永久删除 | lifecycle |
| 11 | V1 页面整合与收口 | 全页面串联、边界测试、体验打磨 | all |

> 优化点：把 Schema 与 Seed 单独提前成阶段 1，保证所有后续功能都在稳定数据库基础上开发；Activity 放在业务 CRUD 之前，避免后补历史记录体系。

---

## 5. 推荐里程碑

如果按产品可用性拆分，可以分成 3 个里程碑。

### M1：基础可用

覆盖阶段：

```txt
阶段 0 - 阶段 7
```

结果：

```txt
可以创建 Space / Project / Task
可以快速捕获到 Inbox
可以整理到 Project / No Project
基础 Sidebar 可用
Task Drawer 可用
Activity 已接入
```

### M2：执行闭环

覆盖阶段：

```txt
阶段 8 - 阶段 9
```

结果：

```txt
Status / Priority / 时间字段完整
Today / Focus / Upcoming / Recently Added / Waiting / Overdue 可用
All Tasks 和 Views 可用
```

### M3：生命周期与完整性

覆盖阶段：

```txt
阶段 10 - 阶段 11
```

结果：

```txt
Archive / Trash / Restore 完整
Settings 可配置
全页面闭环
边界状态稳定
V1 可以继续 UI 打磨和真实使用
```

---

## 阶段 0：工程基础与数据库基础

### 0.1 阶段目标

建立数据模型落地所需的底层工程能力。

这一阶段不追求页面效果，只追求：

```txt
数据库可初始化
迁移可执行
Repository 有统一约定
时间 / ID 工具稳定
错误处理有基础规范
```

---

### 0.2 目录建议

建议数据相关结构：

```txt
src/
  db/
    client.ts
    migrations/
      0001_initial.sql
    migrate.ts
    seed.ts
  repositories/
    space.repository.ts
    project.repository.ts
    task.repository.ts
    view.repository.ts
    settings.repository.ts
    activity.repository.ts
  services/
    space.service.ts
    project.service.ts
    task.service.ts
    inbox.service.ts
    view.service.ts
    lifecycle.service.ts
    activity.service.ts
    settings.service.ts
  domain/
    space.types.ts
    project.types.ts
    task.types.ts
    view.types.ts
    settings.types.ts
    activity.types.ts
  utils/
    id.ts
    time.ts
    json.ts
```

> 备注：Repository 负责数据库读写，Service 负责业务规则。不要把删除联动、Inbox 出入、Activity 写入等规则散落在组件里。

---

### 0.3 SQLite 初始化

#### 需要实现

1. 数据库连接；
2. 本地数据库文件路径；
3. WAL 模式；
4. foreign keys 开启；
5. 基础查询封装；
6. 事务封装。

#### 建议初始化 SQL

```sql
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
```

#### 产物

```txt
db/client.ts
```

至少提供：

```ts
getDb()
run(sql, params)
get(sql, params)
all(sql, params)
transaction(fn)
```

#### 验收

```txt
应用启动后可以连接 SQLite
可以执行简单 SELECT 1
可以在事务中插入并回滚测试数据
```

---

### 0.4 Migration 系统

#### 需要实现

1. `schema_migrations` 表；
2. 自动扫描 migrations；
3. 按版本执行；
4. 防重复执行；
5. 失败回滚；
6. 打印迁移日志。

#### 表结构

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);
```

#### 产物

```txt
db/migrate.ts
```

#### 验收

```txt
首次启动执行所有 migration
再次启动不重复执行
migration 失败不会留下半成品结构
```

---

### 0.5 UUID V7 工具

#### 需要实现

统一 ID 生成方法：

```ts
createId(): string
```

#### 使用范围

所有主表：

```txt
spaces
projects
tasks
views
activity_events
activity_changes
```

Settings 的 key 是业务 key，不用 UUID。

#### 验收

```txt
所有新建实体 ID 来自 createId()
ID 可用于按时间大致排序
```

---

### 0.6 时间工具

#### 需要实现

```ts
nowIso(): string
startOfToday(): Date
endOfToday(): Date
isToday(value: string): boolean
toDateOnly(value: string): string
```

#### 设计要求

1. 存储统一使用 ISO string；
2. 查询 Today / Upcoming / Overdue 时必须经过统一时间工具；
3. 不要在各个页面里手写时间判断。

#### 验收

```txt
Today / Upcoming / Overdue 相关逻辑可复用同一套时间工具
```

---

### 0.7 Repository 基础约定

#### Repository 职责

Repository 只负责：

```txt
SQL 查询
实体映射
基础 CRUD
```

Repository 不负责：

```txt
Activity 写入
删除联动
归档联动
Inbox 出入规则
恢复兜底规则
```

这些由 Service 层负责。

#### 验收

```txt
每个核心表都有对应 repository 文件
组件不直接写 SQL
业务规则不写在 repository 里
```

---

## 阶段 1：Schema 与 Seed

### 1.1 阶段目标

一次性落地 V1 所有核心表结构和默认数据。

此阶段完成后，数据库应具备完整 V1 结构：

```txt
spaces
projects
tasks
views
settings
activity_events
activity_changes
```

---

### 1.2 创建完整 Schema

#### 需要建表

1. `spaces`
2. `projects`
3. `tasks`
4. `views`
5. `settings`
6. `activity_events`
7. `activity_changes`

#### 验收

```txt
数据库初始化后所有表存在
所有索引存在
所有外键存在
所有默认值存在
```

---

### 1.3 Seed 默认 Space

默认创建：

```txt
个人
```

字段：

```ts
{
  name: '个人',
  iconKey: 'user',
  colorKey: 'blue',
  isDefault: true,
  sortOrder: 1000
}
```

#### 规则

1. 如果已经存在默认 Space，不重复创建；
2. 如果没有默认 Space，创建默认 Space；
3. 只能存在一个 `isDefault = true` 的 Space。

#### 验收

```txt
首次启动有默认 Space「个人」
重复启动不会出现多个「个人」
默认 Space 唯一
```

---

### 1.4 Seed 默认 Task Views

默认 Task Views：

| key | name | 默认可见 |
|---|---|---:|
| `today` | Today | 是 |
| `focus` | Focus | 是 |
| `upcoming` | Upcoming | 是 |
| `recently_added` | Recently Added | 是 |
| `waiting` | Waiting | 是 |
| `overdue` | Overdue | 是 |

#### 规则

1. 系统 View 使用稳定 `key`；
2. 系统 View 不允许物理删除；
3. 用户可隐藏系统 View；
4. 重复启动不重复 seed。

#### 验收

```txt
views 表中存在 6 个 task system views
key 唯一
全部默认 visible
```

---

### 1.5 Seed 默认 Project Views

默认 Project Views：

| key | name | 默认可见 |
|---|---|---:|
| `active_projects` | Active | 是 |
| `completed_projects` | Completed | 是 |
| `archived_projects` | Archived | 是 |
| `all_projects` | All | 是 |

#### 验收

```txt
views 表中存在 4 个 project system views
Project Overview 能读取这些 view
```

---

### 1.6 Seed 默认 Settings

需要初始化：

```txt
app.sidebar
app.quickCreate
app.taskDefaults
app.ui
```

#### app.sidebar 默认

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

#### app.quickCreate 默认

```json
{
  "defaultSpaceStrategy": "current_or_default",
  "whenScopeAll": "default_space",
  "defaultInboxBehavior": "inbox_when_no_project",
  "allowNoProjectShortcut": true,
  "defaultOpenAfterCreate": false
}
```

#### app.taskDefaults 默认

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

#### app.ui 默认

```json
{
  "theme": "system",
  "density": "comfortable",
  "sidebarWidth": 256,
  "taskDrawerWidth": 420
}
```

#### 验收

```txt
settings 表存在 4 条默认配置
重复启动不会覆盖用户修改后的配置
```

---

## 阶段 2：Activity 基础设施

### 2.1 阶段目标

Activity 从业务功能开始前就可用。后续所有核心操作都必须接入 Activity。

Activity 的设计原则：

```txt
主表保存当前状态
Activity 保存历史变化
```

---

### 2.2 Activity Service

#### 需要实现

```ts
type RecordActivityInput = {
  entityType: 'task' | 'project' | 'space' | 'view' | 'setting'
  entityId: string
  action: string
  actorType?: 'user' | 'system' | 'ai'
  source?: 'app' | 'shortcut' | 'command' | 'import' | 'automation'
  summary?: string | null
  metadata?: Record<string, unknown> | null
  changes?: Array<{
    field: string
    oldValue: unknown | null
    newValue: unknown | null
  }>
}
```

方法：

```ts
recordActivity(input: RecordActivityInput): Promise<void>
getEntityActivities(entityType, entityId): Promise<ActivityEventWithChanges[]>
```

#### 验收

```txt
能写入 event
能写入 changes
能查询某个 entity 的 timeline
```

---

### 2.3 Diff 工具

#### 需要实现

```ts
createChanges(oldEntity, newEntity, fields): ActivityChangeInput[]
```

#### 要求

1. JSON 字段要 stringify 后比较；
2. 不记录 `updatedAt` 的变化；
3. 不记录无变化字段；
4. 不记录每一次输入，只记录保存后的有效变化。

#### 验收

```txt
修改 title 只生成 title change
修改 status 同时生成 status / statusChangedAt 等必要 changes
未变化字段不生成 changes
```

---

### 2.4 Activity Action 枚举

#### Task Actions

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

#### Project Actions

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

#### Space Actions

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

#### Config Actions

```ts
type ConfigActivityAction =
  | 'view.created'
  | 'view.updated'
  | 'view.deleted'
  | 'view.visibility.changed'
  | 'settings.updated'
```

#### 验收

```txt
所有 action 使用枚举，不在业务代码中随手写字符串
```

---

### 2.5 Activity Timeline UI 基础

这一阶段可以先做开发调试版本，不需要最终 UI。

#### 最小能力

```txt
传入 entityType + entityId
展示事件列表
展开后展示字段变化
```

#### 后续接入位置

```txt
Task Drawer / Activity Tab
Project Detail / Activity Tab 可选
Space Management 可选
```

---

## 阶段 3：Settings 与 Sidebar 配置

### 3.1 阶段目标

让应用导航结构具备配置能力，并为后续页面接入做好骨架。

---

### 3.2 Settings Repository

#### 需要实现

```ts
getSetting(key)
setSetting(key, value)
getJsonSetting<T>(key)
setJsonSetting<T>(key, value)
ensureDefaultSettings()
```

#### 验收

```txt
可以读取 app.sidebar
可以更新 sidebar width
更新 settings 会记录 Activity
```

---

### 3.3 Sidebar Store

#### 状态

```ts
type SidebarState = {
  settings: SidebarSettings
  collapsedSections: Record<string, boolean>
}
```

#### 行为

```ts
loadSidebarSettings()
updateSidebarItemVisibility(itemKey, visible)
updateProjectSectionConfig(config)
updateSidebarWidth(width)
```

#### 验收

```txt
Sidebar 渲染来源于 settings
隐藏 Inbox 后 Sidebar 不显示 Inbox
刷新后配置仍保留
```

---

### 3.4 Sidebar 骨架 UI

默认结构：

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

────────────

Archive
Trash
```

#### 先做占位页面

在业务页面还没完成前，可先跳转到占位路由：

```txt
/inbox
/all-tasks
/views
/projects
/archive
/trash
```

#### 验收

```txt
Sidebar 能按 settings 显示 / 隐藏入口
点击入口能切换路由
Footer 固定展示 Archive / Trash
```

---

## 阶段 4：Space 模型落地

### 4.1 阶段目标

完成 Space 的 CRUD、Scope 切换、默认 Space、归档 / 删除联动基础。

---

### 4.2 Space Repository

#### 方法

```ts
createSpace(input)
updateSpace(id, patch)
listSpaces(options)
getSpace(id)
getDefaultSpace()
setDefaultSpace(id)
archiveSpaceRaw(id, data)
restoreSpaceRaw(id)
deleteSpaceRaw(id, data)
```

#### 注意

Repository 的 `archiveSpaceRaw` 只更新 Space 本身，不负责同步 Project / Task。同步逻辑在 Service。

---

### 4.3 Space Service

#### 方法

```ts
createSpace(input)
updateSpace(id, patch)
setDefaultSpace(id)
archiveSpace(id)
restoreSpace(id)
deleteSpace(id)
listVisibleSpaces()
```

#### 业务规则

1. `name` 必填；
2. `iconKey` 必填；
3. `colorKey` 必填；
4. `isDefault` 唯一；
5. 删除 Space 同步删除其下 Project / Task；
6. 归档 Space 同步归档其下 Project / Task；
7. 恢复 Space 默认只恢复 Space。

---

### 4.4 Scope Store

#### 状态

```ts
type Scope =
  | { type: 'all' }
  | { type: 'space'; spaceId: string }
```

#### 行为

```ts
setScope(scope)
getCurrentScope()
resolveSpaceIdsForScope(scope)
```

#### 规则

1. Scope = all 时，查询不限制 Space；
2. Scope = space 时，查询限制该 Space；
3. 快速创建时 Scope = all，使用默认 Space。

---

### 4.5 Space Switcher UI

#### 功能

```txt
展示全部
展示所有 visible spaces
支持切换当前 Scope
支持创建 Space
支持编辑 Space
支持归档 / 删除 Space
```

#### 验收

```txt
可以创建 Space
可以切换 Scope
Sidebar Projects 和页面查询跟随 Scope
设置默认 Space 生效
删除 / 归档 Space 联动子数据
Activity 正常记录
```

---

## 阶段 5：Project 模型落地

### 5.1 阶段目标

完成 Project CRUD、Project Overview、Projects 快捷区、项目生命周期。

---

### 5.2 Project Repository

#### 方法

```ts
createProject(input)
updateProject(id, patch)
getProject(id)
listProjectsByScope(scope, options)
listProjectsBySpace(spaceId, options)
completeProjectRaw(id)
reopenProjectRaw(id)
archiveProjectRaw(id, data)
restoreProjectRaw(id)
deleteProjectRaw(id, data)
```

---

### 5.3 Project Service

#### 方法

```ts
createProject(input)
updateProject(id, patch)
completeProject(id)
reopenProject(id)
archiveProject(id)
restoreProject(id)
deleteProject(id)
listProjectOverview(scope, viewKey)
```

#### 业务规则

1. Project 必须属于 Space；
2. Project 不支持 parentId；
3. name 必填；
4. description 可为空；
5. dueAt 可为空；
6. complete 只设置 `completedAt`；
7. archive 同步归档 Project 下 Task；
8. delete 同步删除 Project 下 Task；
9. restore Project 默认不恢复 Task；
10. 所有操作记录 Activity。

---

### 5.4 Project Overview 页面

#### 路由

```txt
/projects
```

#### Tabs

```txt
Active
Completed
Archived
All
```

#### 列表字段

```txt
Project name
Space
Description
DueAt
Task count
Active task count
CompletedAt
UpdatedAt
```

#### 操作

```txt
Create Project
Edit Project
Complete / Reopen
Archive
Delete
Open Project Detail
```

#### 验收

```txt
Project Overview 能按 Scope 展示项目
Tabs 逻辑正确
Completed Project 能在 Completed Tab 看到
Archived Project 能在 Archived Tab 看到
```

---

### 5.5 Sidebar Projects 快捷区

#### 查询规则

```txt
space in currentScope
deletedAt is null
archivedAt is null
如果 showCompleted = false，则 completedAt is null
按 sortOrder 排序
```

#### 功能

```txt
展示 Project 名称
展示可选 task count
点击进入 Project Detail
```

#### 验收

```txt
切换 Space 后 Projects 快捷区更新
Project 完成后是否显示受 showCompleted 控制
Project 删除 / 归档后不显示
```

---

### 5.6 Project Detail 页面

#### 路由

```txt
/projects/:projectId
```

#### 内容

```txt
Project Header
Project description
Project dueAt
Task list
Project actions
```

#### 备注

Task List 在阶段 6 后完整接入。此阶段可先显示空状态或占位。

---

## 阶段 6：Task 基础模型落地

### 6.1 阶段目标

完成 Task 的基础 CRUD、Task List、Task Drawer 和基础字段编辑。

---

### 6.2 Task Repository

#### 方法

```ts
createTask(input)
updateTask(id, patch)
getTask(id)
listTasks(query)
archiveTaskRaw(id, data)
restoreTaskRaw(id, data)
deleteTaskRaw(id, data)
permanentlyDeleteTask(id)
```

---

### 6.3 Task Service

#### 方法

```ts
createTask(input, context)
updateTask(id, patch)
moveTaskToProject(id, projectId)
moveTaskToSpace(id, spaceId)
archiveTask(id)
restoreTask(id)
deleteTask(id)
getTaskDetail(id)
```

#### 初始规则

1. Task 必须有 title；
2. Task 必须有 spaceId；
3. projectId 可为空；
4. status 默认 todo；
5. priority 默认 0；
6. createdAt / updatedAt 必填；
7. statusChangedAt 初始等于 createdAt；
8. 所有 create / update / delete 记录 Activity。

---

### 6.4 Task List 组件

#### 组件职责

展示一组 Task。

#### 最小字段

```txt
checkbox / status indicator
title
priority
dueAt
scheduledAt
project name
space indicator
```

#### 行为

```txt
点击打开 Task Drawer
快捷完成
右键 / more menu 操作
```

#### 验收

```txt
Task List 可复用于 Inbox / All Tasks / Project Detail / Views
```

---

### 6.5 Task Drawer

#### 打开方式

```txt
点击 Task → 右侧 Drawer 打开
不进入新层级页面
```

#### Tabs

```txt
Details
Activity
```

#### Details 内容

```txt
Title
Note
Status
Priority
Space
Project / No Project
DueAt
ScheduledAt
ReminderAt
CreatedAt / UpdatedAt
```

#### Activity 内容

```txt
该 Task 的 activity_events + activity_changes
```

#### 验收

```txt
可以在 Drawer 编辑 Task 基础字段
关闭 Drawer 后列表同步刷新
Activity Tab 能看到历史记录
```

---

### 6.6 All Tasks 页面基础

#### 路由

```txt
/all-tasks
```

#### 查询默认

```txt
space in currentScope
deletedAt is null
archivedAt is null
```

#### 初始筛选

```txt
Active
Completed
Canceled
Archived
All
```

#### 验收

```txt
All Tasks 能看到当前 Scope 下所有任务
可以打开 Task Drawer
可以创建 Task
```

---

## 阶段 7：Inbox 工作流落地

### 7.1 阶段目标

完整落地捕获、待整理、出 Inbox、No Project 的任务工作流。

---

### 7.2 Inbox Service

#### 方法

```ts
createInboxTask(input, context)
moveTaskToInbox(taskId)
leaveInboxToProject(taskId, projectId)
leaveInboxAsNoProject(taskId)
```

#### 规则

创建任务时：

```txt
有 Project → inboxAt = null
明确 No Project → inboxAt = null
无 Project 且未明确 No Project → inboxAt = now
```

---

### 7.3 Quick Create 逻辑

#### 输入最小字段

```txt
title
note optional
```

#### Space 解析

```txt
当前 Scope = space → 使用当前 Space
当前 Scope = all → 使用默认 Space
```

#### Project 解析

```txt
选择 Project → 使用该 Project，并同步使用 Project.spaceId
未选择 Project → 进入 Inbox
明确 No Project → 不进入 Inbox
```

#### 验收

```txt
在全部 Scope 快捷创建，任务进入默认 Space Inbox
在某 Space 快捷创建，任务进入该 Space Inbox
在 Project 内创建，任务不进 Inbox
```

---

### 7.4 Inbox 页面

#### 路由

```txt
/inbox
```

#### 查询

```txt
space in currentScope
inboxAt is not null
deletedAt is null
archivedAt is null
status in todo / doing / waiting
```

#### 操作

```txt
Move to Project
Mark as No Project
Complete
Cancel
Archive
Delete
Open Drawer
```

#### 验收

```txt
Inbox 中任务可以整理到 Project
Inbox 中任务可以标记 No Project
完成 / 取消 / 归档 / 删除会离开 Inbox
设置 priority / dueAt / scheduledAt 不会离开 Inbox
```

---

### 7.5 No Project 入口

#### 定义

```txt
projectId is null
inboxAt is null
```

#### 显示位置

```txt
All Tasks 筛选
Project Overview / system No Project 入口
Views 中自然出现
```

#### 验收

```txt
No Project 任务不会出现在 Inbox
No Project 任务可以在 All Tasks 中看到
No Project 任务如果 scheduledAt = today，会出现在 Today
```

---

## 阶段 8：Task 执行能力落地

### 8.1 阶段目标

完成 Task 的状态流转、优先级、时间字段、排序和批量操作。

---

### 8.2 Status 流转

#### 状态

```txt
todo
doing
waiting
done
canceled
```

#### 操作

```txt
Start: todo/waiting → doing
Wait: todo/doing → waiting
Resume: waiting → todo 或 doing
Complete: todo/doing/waiting → done
Reopen: done/canceled → todo
Cancel: todo/doing/waiting → canceled
```

#### 字段更新规则

```txt
status 改变 → statusChangedAt = now
完成 → completedAt = now, inboxAt = null
重新打开 → completedAt = null, canceledAt = null
取消 → canceledAt = now, inboxAt = null
```

#### 验收

```txt
状态流转符合规则
statusChangedAt 只在 status 改变时更新
Activity 记录 status change / completed / canceled / reopened
```

---

### 8.3 Priority

#### 操作

```txt
设置无优先级
设置低 / 中 / 高 / 紧急
清除优先级
```

#### Focus 规则

```txt
priority >= 3
status in todo / doing
未归档
未删除
```

#### 验收

```txt
Priority 修改后列表刷新
Focus 能正确查出高优先级任务
```

---

### 8.4 时间字段

#### dueAt

表示截止时间。

操作：

```txt
设置 dueAt
修改 dueAt
清除 dueAt
```

#### scheduledAt

表示计划执行时间。

操作：

```txt
设置 scheduledAt
修改 scheduledAt
清除 scheduledAt
```

#### reminderAt

表示提醒时间。

V1 先落字段和 UI，不强制做系统通知。

操作：

```txt
设置 reminderAt
修改 reminderAt
清除 reminderAt
```

#### 验收

```txt
Today 能识别 scheduledAt today / dueAt today / overdue
Upcoming 能识别 future scheduledAt / dueAt
Overdue 能识别 dueAt < today
```

---

### 8.5 Task 排序

#### 排序作用域

```txt
Inbox 内排序
Project 内排序
No Project 内排序
```

#### sortOrder 规则

```txt
默认取当前列表最大 sortOrder + 1000
拖拽后批量更新 sortOrder
```

#### 验收

```txt
同一 Project 内拖拽排序稳定
Inbox 内拖拽排序稳定
切换 View 后不破坏原容器排序
```

---

### 8.6 批量操作

#### V1 最小批量操作

```txt
批量完成
批量取消
批量归档
批量删除
批量移动 Project
批量标记 No Project
```

#### 验收

```txt
批量操作正确更新字段
每个被影响对象都有 Activity
```

---

## 阶段 9：Views 系统落地

### 9.1 阶段目标

落地 Views 聚合页、系统 Views、自定义 View 基础、Filter / Sort / GroupBy 执行器。

---

### 9.2 View Repository

#### 方法

```ts
createView(input)
updateView(id, patch)
deleteView(id)
listViews(entityType, options)
toggleViewVisible(id, visible)
reorderViews(entityType, orderedIds)
getViewByKey(key)
```

---

### 9.3 View Service

#### 方法

```ts
runTaskView(viewIdOrKey, scope)
runProjectView(viewIdOrKey, scope)
createCustomView(input)
updateCustomView(id, patch)
```

#### 规则

1. 系统 View 不允许永久删除；
2. 自定义 View 可以删除；
3. View 不绑定 Space；
4. 所有 View 跟随当前 Scope；
5. View 更新记录 Activity。

---

### 9.4 Filter 执行器

#### 支持字段

```txt
status
priority
inbox
project
due
scheduled
created
updated
completed
archived
deleted
```

#### 支持日期模式

```txt
today
tomorrow
this_week
next_week
overdue
future
past
between
none
not_none
```

#### 特殊系统 View

这些可以用 `key` 特殊处理：

```txt
today
upcoming
```

因为它们需要 OR 条件：

```txt
Today = scheduledAt today OR dueAt today OR dueAt overdue
Upcoming = scheduledAt future OR dueAt future
```

#### 验收

```txt
每个系统 View 查询结果符合预期
自定义 View 保存后能正确执行
```

---

### 9.5 Sort 执行器

#### 支持字段

```txt
sortOrder
priority
dueAt
scheduledAt
createdAt
updatedAt
completedAt
```

#### 验收

```txt
View 可以按 priority desc + dueAt asc 排序
Recently Added 默认按 createdAt desc
```

---

### 9.6 GroupBy 执行器

#### 支持

```txt
none
status
priority
project
due
scheduled
```

#### 验收

```txt
All Tasks 可以按 Project 分组
Today 可以按 Status 分组
Focus 可以按 Priority 分组
```

---

### 9.7 Views 页面

#### 路由

```txt
/views
```

#### UI

```txt
Tabs: Today / Focus / Upcoming / Recently Added / Waiting / Overdue / Custom Views
```

#### 操作

```txt
切换 Tab
创建 Custom View
编辑 View
隐藏 / 显示 View
删除 Custom View
```

#### 验收

```txt
Views 页面只显示 isVisible = true 的 Views
隐藏某 View 后 Tabs 不显示
自定义 View 能创建、编辑、删除
```

---

## 阶段 10：Archive / Trash 生命周期落地

### 10.1 阶段目标

完整实现归档、删除、恢复、永久删除，并处理父子同步规则。

---

### 10.2 Lifecycle Service

建议抽出统一服务：

```ts
archiveSpace(id)
archiveProject(id)
archiveTask(id)

deleteSpace(id)
deleteProject(id)
deleteTask(id)

restoreSpace(id)
restoreProject(id)
restoreTask(id)

permanentlyDeleteSpace(id)
permanentlyDeleteProject(id)
permanentlyDeleteTask(id)
```

---

### 10.3 删除联动

#### 删除 Space

```txt
space.deletedAt = now
space.deletedByType = self

该 Space 下 projects:
  deletedAt = now
  deletedByType = space
  deletedById = space.id

该 Space 下 tasks:
  deletedAt = now
  deletedByType = space
  deletedById = space.id
```

#### 删除 Project

```txt
project.deletedAt = now
project.deletedByType = self

该 Project 下 tasks:
  deletedAt = now
  deletedByType = project
  deletedById = project.id
```

#### 删除 Task

```txt
task.deletedAt = now
task.deletedByType = self
task.deletedById = task.id
```

#### 验收

```txt
删除 Space 后其 Project / Task 都进 Trash
删除 Project 后其 Task 都进 Trash
删除 Task 只影响自己
```

---

### 10.4 归档联动

#### 归档 Space

```txt
space.archivedAt = now

该 Space 下 projects:
  archivedAt = now
  archivedByType = space
  archivedById = space.id

该 Space 下 tasks:
  archivedAt = now
  archivedByType = space
  archivedById = space.id
```

#### 归档 Project

```txt
project.archivedAt = now
project.archivedByType = self

该 Project 下 tasks:
  archivedAt = now
  archivedByType = project
  archivedById = project.id
```

#### 归档 Task

```txt
task.archivedAt = now
task.archivedByType = self
task.archivedById = task.id
```

#### 验收

```txt
归档 Space 后其 Project / Task 都进 Archive
归档 Project 后其 Task 都进 Archive
归档 Task 只影响自己
```

---

### 10.5 恢复规则

#### 恢复 Space

```txt
只恢复 Space
不恢复 Project / Task
```

#### 恢复 Project

```txt
只恢复 Project
不恢复 Task
```

#### 恢复 Task

```txt
如果原 Space 可用 → 回原 Space
如果原 Space 不可用 → 进入默认 Space
如果原 Project 可用 → 回原 Project
如果原 Project 不可用 → projectId = null, inboxAt = now
```

#### 验收

```txt
恢复 Project 后 Project 可见，但原 Task 仍在 Trash / Archive
恢复 Task 时，原 Project 被删则进入 Inbox
恢复 Task 时，原 Space 被删则进入默认 Space Inbox
```

---

### 10.6 Archive 页面

#### 路由

```txt
/archive
```

#### 展示内容

```txt
Archived Spaces
Archived Projects
Archived Tasks
```

#### 操作

```txt
Restore
Delete
Open detail
```

#### 查询

```txt
archivedAt is not null
deletedAt is null
space in currentScope
```

#### 验收

```txt
归档内容能在 Archive 中看到
恢复后从 Archive 中消失
删除后进入 Trash
```

---

### 10.7 Trash 页面

#### 路由

```txt
/trash
```

#### 展示内容

```txt
Deleted Spaces
Deleted Projects
Deleted Tasks
```

#### 操作

```txt
Restore
Permanently Delete
```

#### 查询

```txt
deletedAt is not null
如果 Scope 不是 all，则限制 space in currentScope
```

#### 验收

```txt
删除内容能在 Trash 中看到
恢复后从 Trash 中消失
永久删除后数据库中不存在
```

---

## 阶段 11：V1 页面整合与收口

### 11.1 阶段目标

把所有数据模型、页面、Sidebar、Drawer、Activity、Settings 串成一个完整可用产品。

---

### 11.2 V1 页面清单

| 页面 | 路由 | V1 是否必须 |
|---|---|---:|
| Inbox | `/inbox` | 是 |
| All Tasks | `/all-tasks` | 是 |
| Views | `/views` | 是 |
| Project Overview | `/projects` | 是 |
| Project Detail | `/projects/:projectId` | 是 |
| Task Drawer | drawer / optional route | 是 |
| Archive | `/archive` | 是 |
| Trash | `/trash` | 是 |
| Settings | `/settings` | 是 |
| Space Management | modal / page | 是 |

---

### 11.3 Sidebar 完整整合

#### 要求

1. Space Switcher 正常切换 Scope；
2. 主入口受 `app.sidebar` 控制；
3. Projects 快捷区跟随 Scope；
4. Footer 显示 Archive / Trash；
5. 所有入口默认可见；
6. 隐藏入口后刷新仍保持。

#### 验收

```txt
切换 Space 后 Inbox / All Tasks / Views / Projects 全部跟随 Scope
隐藏 Views 后 Sidebar 不显示 Views
Archive / Trash 可进入
```

---

### 11.4 Settings 页面

#### V1 最小功能

```txt
Sidebar 主入口显示 / 隐藏
Projects section 显示 / 隐藏
Projects showCompleted
Projects showCounts
Sidebar width
默认 Space
```

#### 可暂缓

```txt
UI theme
Density
Task Drawer width
```

#### 验收

```txt
Settings 修改后立即影响 Sidebar
刷新后配置保留
settings.updated Activity 正常记录
```

---

### 11.5 空状态设计

每个页面必须有空状态。

| 页面 | 空状态文案方向 |
|---|---|
| Inbox | 暂无待整理任务 |
| All Tasks | 当前范围暂无任务 |
| Views / Today | 今天没有任务 |
| Views / Focus | 暂无高优先级任务 |
| Views / Upcoming | 暂无未来任务 |
| Project Overview | 当前 Space 暂无项目 |
| Project Detail | 这个项目暂无任务 |
| Archive | 暂无归档内容 |
| Trash | 回收站为空 |

---

### 11.6 查询一致性检查

所有页面必须统一遵守：

```txt
当前 Scope
archivedAt
deletedAt
status
inboxAt
projectId
```

#### 必查场景

```txt
Scope = all 时能看到所有 Space 数据
Scope = specific Space 时只看到该 Space 数据
Archived 默认不出现在普通页面
Deleted 默认不出现在普通页面
Inbox 任务也可以出现在 Today / Focus
No Project 任务不出现在 Inbox
```

---

### 11.7 边界测试清单

#### Space 边界

```txt
删除 Space 后 Project / Task 进入 Trash
归档 Space 后 Project / Task 进入 Archive
恢复 Space 不恢复 Project / Task
默认 Space 不能缺失
```

#### Project 边界

```txt
删除 Project 后 Task 进入 Trash
归档 Project 后 Task 进入 Archive
恢复 Project 不恢复 Task
Completed Project 可在 Project Overview 看到
Archived Project 不在 Sidebar Projects 快捷区显示
```

#### Task 边界

```txt
Inbox 任务完成后离开 Inbox
Inbox 任务设置 dueAt 不离开 Inbox
No Project 任务能在 All Tasks 看到
恢复 Task 时原 Project 不存在则进入 Inbox
状态变化更新 statusChangedAt
priority >= 3 出现在 Focus
```

#### View 边界

```txt
Today 包含 overdue
Upcoming 不包含今天
Waiting 只显示 waiting
Recently Added 按 createdAt desc
View 跟随 Scope
隐藏 View 后 Tabs 不显示
```

#### Activity 边界

```txt
创建对象有 created Activity
修改字段有 changes
完成任务有 completed Activity
删除 / 归档有 Activity
批量操作每个对象都有 Activity
```

---

## 12. 开发过程中的统一约束

### 12.1 不允许组件直接写数据库

错误方式：

```txt
React Component → SQL
```

推荐方式：

```txt
React Component → Service → Repository → SQLite
```

理由：

1. 业务规则集中；
2. Activity 容易统一写入；
3. 删除 / 归档联动不会漏；
4. 测试更容易。

---

### 12.2 所有写操作必须经过 Service

所有会改变数据的操作必须经过 Service，例如：

```txt
createTask
updateTask
completeTask
archiveProject
deleteSpace
restoreTask
```

不允许页面绕开 Service 直接调用 Repository 更新。

---

### 12.3 所有重要写操作必须记录 Activity

必须记录 Activity 的操作：

```txt
create
update
move
status change
complete
cancel
archive
restore
delete
permanently delete
sort change
settings update
view update
```

可不记录或弱记录：

```txt
临时 UI 状态
输入过程中的每个字符
Drawer 打开 / 关闭
普通筛选切换
```

---

### 12.4 Soft Delete / Soft Archive 优先

V1 默认删除和归档都不物理删除。

```txt
delete = deletedAt
archive = archivedAt
```

永久删除只在 Trash 中显式触发。

---

### 12.5 Scope 统一从 Store 读取

页面不能自己维护 Space 过滤逻辑。

统一通过：

```ts
getCurrentScope()
resolveSpaceIdsForScope(scope)
```

---

### 12.6 View 不拥有 Task

不要出现：

```txt
task.viewId
view_tasks
```

View 只是查询规则。

---

## 13. V1 最终验收标准

V1 完成时，应该满足：

### 13.1 数据模型验收

```txt
7 张核心表完整存在
默认 Space / Views / Settings 正确 seed
Activity 完整记录核心操作
没有子项目 / 子任务字段
没有 Tags / Recurrence / Attachments 等 V2 字段污染 V1
```

### 13.2 功能验收

```txt
用户可以创建 Space
用户可以创建 Project
用户可以创建 Task
用户可以快捷捕获到 Inbox
用户可以整理到 Project / No Project
用户可以设置状态、优先级、计划时间、截止时间、提醒时间
用户可以通过 Today / Focus / Upcoming 找任务
用户可以归档、删除、恢复
用户可以查看 Activity
```

### 13.3 页面验收

```txt
Sidebar 完整可用
Inbox 完整可用
All Tasks 完整可用
Views 完整可用
Project Overview 完整可用
Project Detail 完整可用
Task Drawer 完整可用
Archive 完整可用
Trash 完整可用
Settings 基础可用
```

### 13.4 体验验收

```txt
创建任务足够快
Inbox 不会变成垃圾堆
No Project 任务不会消失
切换 Space 后所有页面结果一致
完成 / 归档 / 删除不会产生孤儿数据
Activity 不吵但足够追踪核心变化
```

---

## 14. 推荐开发顺序一句话版

```txt
先搭数据库和迁移
再落全表 Schema 和默认 Seed
再做 Activity 基建
再做 Settings 和 Sidebar 骨架
再做 Space Scope
再做 Project
再做 Task
再做 Inbox
再做 Status / Priority / 时间 / 排序
再做 Views
再做 Archive / Trash
最后整合页面、测试边界、收口 V1
```

---

## 15. 后续可优化方向

这些不进入 V1 主要开发，但可以在开发中预留边界。

### 15.1 Tags

预留方式：

```txt
Task 表不要塞 tags 字段
View Filter 设计时保留扩展 tags 条件的空间
Sidebar Settings 不要假设 Projects 是唯一可展开分区
```

### 15.2 重复任务

预留方式：

```txt
Task 创建逻辑不要写死只能人工创建
Activity source 保留 automation
View Filter 不要依赖 task 一定是单次任务
```

### 15.3 附件 / 链接

预留方式：

```txt
Task note 先支持纯文本 / markdown
不要把链接解析结果直接写入 Task 主表
Drawer 结构预留 References / Attachments 区域
```

### 15.4 任务关系

预留方式：

```txt
Task 不写 duplicateOfTaskId
未来通过 task_relations 扩展
Activity action 保留 task.related / duplicate 类扩展空间
```

### 15.5 评论

预留方式：

```txt
Activity Timeline UI 设计时支持未来混合展示 comments
但 Activity 表不承载手写评论
```

---

### 16. 最终原则

StoneFlow V1 的开发要始终遵守：

> **先把扁平数据模型和完整任务流做好，再考虑高级组织能力。**

具体来说：

1. 不为了一个边缘场景加层级；
2. 不为了未来想象提前污染 Task 主表；
3. 不让 UI 组件绕过 Service；
4. 不把 Activity 后补；
5. 不把 Inbox 做成 Project；
6. 不把 View 做成容器；
7. 不把 Settings 和业务数据混在一起。

V1 成功的标志不是功能多，而是：

```txt
捕获快
整理清楚
视图有效
状态稳定
历史可追踪
后续可扩展
```
