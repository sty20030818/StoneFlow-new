# StoneFlow Task Detail 技术实现文档

## 0. 文档信息

| 项目 | 内容 |
|---|---|
| 文档名称 | StoneFlow Task Detail 技术实现文档 |
| 文档目的 | 指导 Task Row / Preview / Drawer / Page 四层详情体系的技术落地，重点约束 Task Drawer 的组件拆分、状态管理、路由同步、自动保存与 Links 实现 |
| 上游文档 | StoneFlow Task 详情形态与交互设计文档、StoneFlow Task Drawer 产品与 UI 设计文档 |
| 技术栈假设 | Tauri + React + TypeScript + shadcn/ui + Tailwind CSS + Zustand + SQLite |
| 当前阶段 | Task Drawer 重构与 Task Detail 体系落地前技术方案 |
| 设计关键词 | 模块化、单一职责、本地优先、自动保存、路由状态、可扩展、轻重分离 |

---

## 0.1 阶段 0 对齐说明

本文档保留为 Task Detail 的技术上游文档，负责描述 Task Row / Preview / Drawer / Page 的技术边界和字段级拆分思路。

实际落地以《StoneFlow Entity Detail System 重构总方案》为总控文档。本文档中的 Task-only 目录建议已被总方案替换：

1. 不新建 `src/features/tasks/`。
2. Task 具体实现放在 `src/features/task/detail/`。
3. Project 具体实现放在 `src/features/project/detail/`。
4. Task / Project 共同的详情业务协议放在 `src/features/entity-detail/`。
5. 通用自动保存状态机放在 `src/shared/autosave/`。
6. 通用详情 UI primitive 放在 `src/shared/ui/detail/`。

`src/features/tasks/` 被废弃的原因不是复数命名本身，而是它会和当前仓库已有的 `src/features/task/` 形成双事实源：Task API、Task store、Task row adapter 已经在 `features/task`，如果 Detail 再进入 `features/tasks`，后续维护会在两个 Task 模块之间来回跳转，也会让 Project Detail 无法自然复用同一套 detail 协议。因此最终方案采用实体归属 + 详情公共层的结构。

---

# 1. 技术目标

## 1.1 核心目标

Task Detail 技术实现需要支撑 StoneFlow 的四层 Task Detail 模型：

```txt
Task Row      = 快速管理
Task Preview  = 快速确认
Task Drawer   = 轻量编辑
Task Page     = 完整详情
```

技术实现需要做到：

1. Row / Preview / Drawer / Page 职责清晰；
2. Drawer 作为高频主入口，性能轻、响应快；
3. Preview 不污染 URL，只作为临时 UI 状态；
4. Drawer 与 URL query 同步，支持刷新恢复；
5. Page 使用独立路由，支持深链；
6. 编辑以本地优先为基础，自动保存；
7. Links 使用轻量 Popover 管理；
8. Activity 只记录不展示，完整展示放到 Page；
9. 组件拆分可持续，不为了复用牺牲布局清晰度。

## 1.2 非目标

V1 不解决以下问题：

- 完整 Task Page 的所有重操作；
- Drawer Pin；
- Markdown 重编辑器；
- 附件 / 本地文件系统管理；
- 完整 Undo / 回退体系；
- Activity Timeline UI；
- Focus Mode；
- Linked Resources 完整抽象。

这些能力需要预留扩展点，但不在 V1 强行实现。

---

# 2. 总体模块边界

## 2.1 模块分层

Task Detail 可拆成以下模块：

| 模块 | 职责 |
|---|---|
| Task Row | 列表行展示与快速操作 |
| Task Selection | 当前选中任务状态 |
| Task Preview | Space 快速预览 |
| Task Drawer | 轻量编辑抽屉 |
| Task Page | 独立详情页 |
| Task Links | Links 增删改查与 Popover |
| Task Autosave | 标题 / 备注等自动保存 |
| Task Route State | URL query 与路由同步 |
| Task Activity Writer | 操作记录写入 Activity |
| Task Commands | 归档、删除、复制、转换等行为封装 |

## 2.2 推荐原则

### 2.2.1 UI 组件不直接写数据库

UI 组件负责展示与触发事件，不直接操作 SQLite。

推荐：

```txt
Component
→ Hook / Action
→ Service / Command
→ Repository / DB
```

避免：

```txt
Component
→ 直接调用 DB
```

### 2.2.2 读写分离

任务读取和任务修改应该分开：

| 类型 | 示例 |
|---|---|
| Query | getTaskById、getTaskLinks、getProjects |
| Command | updateTaskTitle、archiveTask、addTaskLink |

这样可以让 UI 更清楚地表达意图。

### 2.2.3 字段级组件可复用，布局级组件不强求复用

推荐复用：

```txt
TaskTitleInput
TaskNoteEditor
TaskPropertiesSection
TaskLabelsSection
TaskProjectSection
TaskLinksSection
TaskLinkPopover
```

不强求复用：

```txt
TaskDrawerLayout
TaskPageLayout
TaskDrawerFooter
TaskPageSidebar
```

原因：Drawer 和 Page 的视觉密度、布局目标、操作密度不同。强行复用布局会导致两边都不舒服。

---

# 3. 推荐目录结构

## 3.1 总体结构

Task Detail 的最终目录结构不再采用 `features/tasks/`，而是跟随当前仓库的实体归属和 Entity Detail System 总方案：

```txt
src/
├─ shared/
│  ├─ autosave/
│  └─ ui/
│     └─ detail/
│
├─ features/
│  ├─ entity-detail/
│  ├─ task/
│  │  ├─ api/
│  │  ├─ model/
│  │  ├─ ui/
│  │  └─ detail/
│  └─ project/
│     └─ detail/
```

分层含义：

| 目录 | 职责 | 是否认识业务实体 |
|---|---|---:|
| `shared/autosave` | 通用自动保存状态机、debounce、flush、retry、reset | 否 |
| `shared/ui/detail` | Detail Drawer / Page 的纯 UI primitive | 否 |
| `features/entity-detail` | Task / Project 详情打开、关闭、路由 query、Drawer Host、Open Page 协议 | 是，只认识 `task/project` |
| `features/task/detail` | Task Drawer、Task Preview、Task Page、Task 字段、Task Links、Task autosave adapter | 是 |
| `features/project/detail` | Project Drawer、Project Page、Project 字段、Project autosave adapter | 是 |

## 3.2 为什么废弃 `features/tasks`

`features/tasks` 的问题不是命名复数，而是边界错误。

当前仓库已经存在：

```txt
src/features/task/api/
src/features/task/model/
src/features/task/ui/
src/features/task/shortcuts/
```

这些已经是 Task 的事实归属，包括：

- Task API；
- Task store；
- Task list controller；
- Task selection；
- Task row adapter；
- Task context menu；
- Task shortcuts；
- Task create content。

如果再新增：

```txt
src/features/tasks/
```

会产生两个 Task 模块：

```txt
features/task   = 现有 Task 列表 / 创建 / 快捷键 / API
features/tasks  = 新 Task Detail
```

这会带来几个长期问题：

1. Task API 和 Detail API 分裂，调用者不知道从哪个模块导入。
2. Task model 和 Task detail draft 可能形成双状态源。
3. Task Row 打开 Drawer 需要跨两个 Task feature，边界反而更乱。
4. Project Detail 无法自然复用，因为 Project 已经在 `features/project`。
5. 后续其他 AI 或开发者会误以为 `features/task` 是旧模块、`features/tasks` 是新模块，造成重复实现。

因此最终决策是：

```txt
Task 具体详情实现     -> features/task/detail
Project 具体详情实现  -> features/project/detail
Task / Project 共性   -> features/entity-detail
真正通用基础设施      -> shared/autosave + shared/ui/detail
```

## 3.3 `shared/autosave`

```txt
src/shared/autosave/
├─ autosaveMachine.ts
├─ autosaveTypes.ts
├─ useAutosaveController.ts
├─ autosaveMachine.test.ts
└─ index.ts
```

这一层只负责保存状态机，不允许出现 Task / Project 语义。

## 3.4 `shared/ui/detail`

```txt
src/shared/ui/detail/
├─ DetailDrawerShell.tsx
├─ DetailPageLayout.tsx
├─ DetailHeader.tsx
├─ DetailBody.tsx
├─ DetailFooter.tsx
├─ DetailSection.tsx
├─ DetailFieldRow.tsx
├─ DetailSaveStatus.tsx
├─ detailTokens.ts
└─ index.ts
```

这一层只负责详情 UI 壳、槽位、section、field row、保存状态展示，不允许导入 `features/*`。

## 3.5 `features/entity-detail`

```txt
src/features/entity-detail/
├─ model/
│  ├─ entityDetailTypes.ts
│  ├─ entityDetailRouteState.ts
│  ├─ entityDetailNavigation.ts
│  └─ useEntityDetailController.ts
├─ ui/
│  └─ EntityDetailDrawerHost.tsx
└─ index.ts
```

这一层可以知道：

```ts
type EntityDetailKind = 'task' | 'project'
```

但不负责 Task / Project 的具体字段和保存。

## 3.6 `features/task/detail`

```txt
src/features/task/detail/
├─ api/
│  ├─ taskDetailApi.ts
│  └─ taskLinksApi.ts
├─ model/
│  ├─ taskDetailTypes.ts
│  ├─ useTaskDetailController.ts
│  ├─ useTaskPreviewController.ts
│  └─ useTaskAutosaveAdapter.ts
├─ ui/
│  ├─ TaskDrawer.tsx
│  ├─ TaskDrawerHeader.tsx
│  ├─ TaskDrawerBody.tsx
│  ├─ TaskDrawerFooter.tsx
│  ├─ TaskPreview.tsx
│  ├─ TaskPage.tsx
│  ├─ TaskPageMain.tsx
│  ├─ TaskPageSidebar.tsx
│  ├─ TaskActivityTimeline.tsx
│  ├─ fields/
│  │  ├─ TaskTitleField.tsx
│  │  ├─ TaskNoteField.tsx
│  │  ├─ TaskPropertiesSection.tsx
│  │  ├─ TaskProjectSection.tsx
│  │  └─ TaskLinksSection.tsx
│  └─ links/
│     ├─ TaskLinkRow.tsx
│     └─ TaskLinkPopover.tsx
└─ index.ts
```

说明：

- `features/task/ui/TaskRowAdapter.tsx` 不迁入 detail；
- Row 属于列表系统；
- Detail 属于详情系统；
- Task row 打开 detail 通过 `features/entity-detail` 的统一入口完成。

## 3.7 `features/project/detail`

```txt
src/features/project/detail/
├─ api/
│  └─ projectDetailApi.ts
├─ model/
│  ├─ projectDetailTypes.ts
│  ├─ useProjectDetailController.ts
│  └─ useProjectAutosaveAdapter.ts
├─ ui/
│  ├─ ProjectDrawer.tsx
│  ├─ ProjectPage.tsx
│  ├─ ProjectPageMain.tsx
│  ├─ ProjectPageSidebar.tsx
│  └─ fields/
│     ├─ ProjectNameField.tsx
│     ├─ ProjectDescriptionField.tsx
│     └─ ProjectPropertiesSection.tsx
└─ index.ts
```

Project Detail 不在 Task V1 中完整落地，但目录和协议要按这个方向预留。

---

# 4. 数据类型设计

## 4.1 Task 基础类型

```ts
type TaskId = string

type TaskStatus = 'todo' | 'in_progress' | 'done' | 'canceled'

type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent'

type Task = {
  id: TaskId
  title: string
  note?: string | null
  status: TaskStatus
  priority: TaskPriority
  dueAt?: string | null
  planAt?: string | null
  reminderAt?: string | null
  projectId?: string | null
  spaceId: string
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
  deletedAt?: string | null
}
```

说明：

- `note` 是轻量备注，不是长文档主体；
- `dueAt / planAt / reminderAt` 分别对应截止、计划、提醒；
- `archivedAt / deletedAt` 用于归档与回收站状态；
- 实际状态枚举以现有数据模型为准。

## 4.2 TaskDrawerViewModel

Drawer 不一定需要完整 Task 所有字段，建议组装 ViewModel：

```ts
type TaskDrawerViewModel = {
  task: Task
  labels: TaskLabel[]
  project: Project | null
  links: TaskLink[]
  saveStatus: SaveStatus
}
```

这样 Drawer 不需要到处查询关联数据。

## 4.3 TaskLink

```ts
type TaskLinkType = 'url' | 'file'

type TaskLink = {
  id: string
  taskId: TaskId
  title: string
  url: string
  type: TaskLinkType
  createdAt: string
  updatedAt: string
}
```

V1 只使用：

```txt
type = 'url'
```

`file` 预留给后续附件 / 本地资源能力。

## 4.4 SaveStatus

```ts
type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed'
```

可选扩展：

```ts
type SaveState = {
  status: SaveStatus
  updatedAt?: string
  error?: string
  retry?: () => Promise<void>
}
```

## 4.5 UI 状态类型

```ts
type TaskUiState = {
  selectedTaskId: TaskId | null
  drawerTaskId: TaskId | null
  previewTaskId: TaskId | null
  isDrawerOpen: boolean
  isPreviewOpen: boolean
}
```

也可以简化为：

```ts
type TaskUiState = {
  selectedTaskId: TaskId | null
  drawer: {
    open: boolean
    taskId: TaskId | null
  }
  preview: {
    open: boolean
    taskId: TaskId | null
  }
}
```

推荐第二种，更容易扩展。

---

# 5. 状态管理设计

## 5.1 状态分类

Task Detail 涉及三类状态：

| 状态类型 | 示例 | 存放位置 |
|---|---|---|
| 持久数据 | Task、TaskLink、Label | SQLite / Repository |
| 页面 UI 状态 | selectedTaskId、Drawer open、Preview open | Zustand / Router |
| 临时编辑状态 | title draft、note draft、save status | Local state / hook / draft store |

## 5.2 selectedTaskId

`selectedTaskId` 是列表当前选中项。

规则：

```txt
点击 Row → selectedTaskId = task.id
↑ / ↓ → selectedTaskId 切换到上一条 / 下一条
关闭 Drawer → selectedTaskId 保留
关闭 Preview → selectedTaskId 保留
```

保留 selectedTaskId 的原因：

- Esc 关闭 Drawer 后，用户仍能 Space 预览；
- 用户可以继续用 ↑ / ↓ 浏览；
- Enter 可以重新打开 Drawer。

## 5.3 Drawer 状态

```ts
type TaskDrawerState = {
  open: boolean
  taskId: TaskId | null
}
```

规则：

```txt
open drawer → drawer.open = true, drawer.taskId = selectedTaskId
close drawer → drawer.open = false, drawer.taskId = null
switch task while drawer open → drawer.taskId = new selectedTaskId
```

Drawer 状态需要和 URL query 同步。

## 5.4 Preview 状态

```ts
type TaskPreviewState = {
  open: boolean
  taskId: TaskId | null
}
```

规则：

```txt
Space → preview.open = true, preview.taskId = selectedTaskId
Space again / Esc → preview.open = false
↑ / ↓ while preview open → preview.taskId follows selectedTaskId
```

Preview 不进入 URL。

## 5.5 Draft 状态

标题和备注可以使用本地 draft 状态：

```ts
type TaskDraftState = {
  taskId: TaskId
  title: string
  note: string
  dirtyFields: Set<'title' | 'note'>
}
```

但 V1 可以先不做全局 draft store，只在组件内通过 `useTaskAutosave` 管理。

推荐策略：

- 简单起步：组件 local state + autosave hook；
- 当 Drawer / Page 同时编辑同一 Task 时，再考虑统一 draft store。

---

# 6. 路由同步设计

## 6.1 URL 规则

| 形态 | URL |
|---|---|
| 任务列表 | `/tasks` |
| Drawer 打开 | `/tasks?task=xxx` |
| 独立页面 | `/tasks/:taskId` |
| Preview | 不改变 URL |

## 6.2 useTaskRouteState

推荐封装：

```ts
type UseTaskRouteStateReturn = {
  taskIdFromQuery: string | null
  openDrawerInRoute: (taskId: string) => void
  closeDrawerInRoute: () => void
  openTaskPage: (taskId: string) => void
}
```

## 6.3 打开 Drawer

```txt
openDrawer(taskId)
→ update UI store
→ update query: /tasks?task=taskId
```

伪代码：

```ts
function openTaskDrawer(taskId: TaskId) {
  taskUiStore.setState({
    selectedTaskId: taskId,
    drawer: { open: true, taskId },
  })

  openDrawerInRoute(taskId)
}
```

## 6.4 关闭 Drawer

```txt
closeDrawer()
→ drawer.open = false
→ drawer.taskId = null
→ remove ?task=xxx
→ keep selectedTaskId
```

伪代码：

```ts
function closeTaskDrawer() {
  taskUiStore.setState((state) => ({
    selectedTaskId: state.selectedTaskId,
    drawer: { open: false, taskId: null },
  }))

  closeDrawerInRoute()
}
```

## 6.5 初始化恢复

页面加载时如果 URL 包含 `?task=xxx`：

```txt
读取 query task
校验 task 是否存在
存在 → selectedTaskId = xxx, drawer.open = true
不存在 → 清理 query，可提示 Task not found
```

## 6.6 History 策略

打开和切换 Drawer 是否 push history，需要谨慎。

可选方案：

### 方案 A：每次切换都 push

优点：浏览器返回可回到上一个任务。  
缺点：上下键切换任务会污染历史栈。

### 方案 B：打开 Drawer push，切换任务 replace

优点：历史栈干净。  
缺点：不能逐个返回上一个 Drawer 任务。

### 推荐：方案 B

```txt
/tasks → /tasks?task=a      push
/tasks?task=a → /tasks?task=b  replace
close drawer → /tasks          push 或 replace，根据返回体验决定
```

V1 推荐保持简单：

```txt
打开 Drawer push
切换 Drawer replace
关闭 Drawer replace
```

---

# 7. 组件设计

## 7.1 TaskDrawer

### 职责

- 接收当前 `taskId`；
- 控制 Drawer 打开 / 关闭；
- 组织 Header / Body / Footer；
- 处理 Drawer 级键盘事件；
- 不处理具体字段业务逻辑。

### Props 示例

```ts
type TaskDrawerProps = {
  open: boolean
  taskId: TaskId | null
  onClose: () => void
}
```

### 结构

```tsx
function TaskDrawer(props: TaskDrawerProps) {
  return (
    <aside>
      <TaskDrawerHeader />
      <TaskDrawerBody />
      <TaskDrawerFooter />
    </aside>
  )
}
```

## 7.2 TaskDrawerHeader

### 职责

- 展示 / 编辑标题；
- Open Page；
- Header More；
- Close。

### Props 示例

```ts
type TaskDrawerHeaderProps = {
  task: Task
  onClose: () => void
  onOpenPage: (taskId: TaskId) => void
}
```

## 7.3 TaskTitleInput

### 职责

- 展示标题；
- 管理标题输入 draft；
- 调用 autosave；
- 不关心 Drawer 打开关闭。

### Props 示例

```ts
type TaskTitleInputProps = {
  taskId: TaskId
  value: string
  onSave: (nextTitle: string) => Promise<void>
}
```

### 注意

打开 Drawer 时不自动聚焦。

## 7.4 TaskNoteEditor

### 职责

- 展示备注；
- 管理 note draft；
- debounce 保存；
- V1 使用轻量 textarea。

### Props 示例

```ts
type TaskNoteEditorProps = {
  taskId: TaskId
  value: string | null
  onSave: (nextNote: string) => Promise<void>
}
```

## 7.5 TaskPropertiesSection

### 职责

- 组合 Status / Priority / Date Buttons；
- 不直接写数据库；
- 通过 `onChange` 调用 command。

### Props 示例

```ts
type TaskPropertiesSectionProps = {
  task: Task
  onChangeStatus: (status: TaskStatus) => Promise<void>
  onChangePriority: (priority: TaskPriority) => Promise<void>
  onChangeDueAt: (value: string | null) => Promise<void>
  onChangePlanAt: (value: string | null) => Promise<void>
  onChangeReminderAt: (value: string | null) => Promise<void>
}
```

## 7.6 TaskLabelsSection

### 职责

- 展示标签 chips；
- 添加 / 删除标签；
- 打开标签选择器。

```ts
type TaskLabelsSectionProps = {
  taskId: TaskId
  labels: TaskLabel[]
  onAddLabel: (labelId: string) => Promise<void>
  onRemoveLabel: (labelId: string) => Promise<void>
}
```

## 7.7 TaskProjectSection

### 职责

- 展示当前项目；
- 打开项目选择器；
- 修改项目归属。

```ts
type TaskProjectSectionProps = {
  taskId: TaskId
  project: Project | null
  onChangeProject: (projectId: string | null) => Promise<void>
}
```

## 7.8 TaskLinksSection

### 职责

- 展示 Links；
- 新建 Link；
- 编辑 Link；
- 删除 Link；
- 打开 Link。

```ts
type TaskLinksSectionProps = {
  taskId: TaskId
  links: TaskLink[]
  onAddLink: (input: TaskLinkInput) => Promise<void>
  onUpdateLink: (linkId: string, input: TaskLinkInput) => Promise<void>
  onRemoveLink: (linkId: string) => Promise<void>
  onOpenLink: (link: TaskLink) => Promise<void>
}
```

## 7.9 TaskLinkPopover

### 职责

- Add / Edit 共用；
- 管理 title / url 表单；
- 校验 URL；
- 提交成功后关闭。

```ts
type TaskLinkPopoverMode = 'add' | 'edit'

type TaskLinkPopoverProps = {
  mode: TaskLinkPopoverMode
  initialValue?: TaskLink
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (input: TaskLinkInput) => Promise<void>
}
```

---

# 8. 自动保存设计

## 8.1 useTaskAutosave

自动保存建议封装为通用 hook。

```ts
type UseTaskAutosaveOptions<T> = {
  value: T
  delay: number
  enabled?: boolean
  onSave: (value: T) => Promise<void>
}

type UseTaskAutosaveReturn = {
  draft: T
  setDraft: (value: T) => void
  status: SaveStatus
  flush: () => Promise<void>
  reset: (value: T) => void
}
```

## 8.2 行为规则

```txt
初始 value → draft
用户输入 → setDraft
delay 后 → onSave(draft)
保存中 → status = saving
成功 → status = saved
失败 → status = failed
切换 task → flush 或 reset
```

## 8.3 标题保存

```txt
Delay: 500ms
空标题: 允许短暂为空，最终按产品规则处理
Activity: 可选记录 changed title
```

## 8.4 备注保存

```txt
Delay: 800ms - 1200ms
Activity: 只记录 updated description，不记录逐字变化
```

## 8.5 属性保存

属性不走 debounce：

```txt
选择后立即更新本地 UI
调用 command 保存
Footer status 显示 Saving / Saved
写入 Activity
```

## 8.6 flush 时机

以下场景需要 flush：

| 场景 | 是否 flush |
|---|---:|
| 切换 Drawer 任务 | ✅ |
| 关闭 Drawer | ✅ / 可选 |
| 打开 Page | ✅ |
| 应用退出 | ✅ |
| 输入过程中失焦 | ✅ / 可选 |

本地优先下 flush 成本低，建议尽量做。

---

# 9. Task Command 设计

## 9.1 command service

```ts
type TaskCommandService = {
  updateTitle(taskId: TaskId, title: string): Promise<void>
  updateNote(taskId: TaskId, note: string): Promise<void>
  updateStatus(taskId: TaskId, status: TaskStatus): Promise<void>
  updatePriority(taskId: TaskId, priority: TaskPriority): Promise<void>
  updateDueAt(taskId: TaskId, dueAt: string | null): Promise<void>
  updatePlanAt(taskId: TaskId, planAt: string | null): Promise<void>
  updateReminderAt(taskId: TaskId, reminderAt: string | null): Promise<void>
  changeProject(taskId: TaskId, projectId: string | null): Promise<void>
  archiveTask(taskId: TaskId): Promise<void>
  moveTaskToTrash(taskId: TaskId): Promise<void>
  duplicateTask(taskId: TaskId): Promise<TaskId>
}
```

## 9.2 command 内部职责

每个 command 应该负责：

1. 校验输入；
2. 写入 Task 数据；
3. 更新 `updatedAt`；
4. 写入 Activity；
5. 返回必要结果。

示例：

```txt
updatePriority
→ validate priority
→ update task.priority
→ update task.updatedAt
→ create activity: changed priority
```

## 9.3 避免 UI 重复写 Activity

Activity 写入应该由 command 层统一处理，避免每个组件手写。

避免：

```txt
TaskPriorityButton
→ update task
→ write activity
```

推荐：

```txt
TaskPriorityButton
→ taskCommand.updatePriority
→ command 内部写 activity
```

---

# 10. Task Links 实现

## 10.1 TaskLinkInput

```ts
type TaskLinkInput = {
  title?: string
  url: string
}
```

## 10.2 task-link.service

```ts
type TaskLinkService = {
  addLink(taskId: TaskId, input: TaskLinkInput): Promise<TaskLink>
  updateLink(linkId: string, input: TaskLinkInput): Promise<TaskLink>
  removeLink(linkId: string): Promise<void>
  openLink(link: TaskLink): Promise<void>
  copyLink(link: TaskLink): Promise<void>
}
```

## 10.3 URL 规范化

```ts
function normalizeUrl(input: string): string {
  const trimmed = input.trim()

  if (!trimmed) {
    throw new Error('URL is required')
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  return `https://${trimmed}`
}
```

## 10.4 URL 校验

```ts
function validateUrl(input: string): boolean {
  try {
    const url = new URL(input)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
```

## 10.5 Title 生成

```ts
function getDefaultLinkTitle(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}
```

规则：

```txt
用户输入 title → 使用用户 title
用户不输入 title → 使用 hostname
```

## 10.6 Add Link 流程

```txt
click + Add link
→ open popover
→ input URL / title
→ normalize URL
→ validate URL
→ create TaskLink
→ write Activity added link
→ close popover
→ refresh links
```

## 10.7 Edit Link 流程

```txt
click Link More → Edit
→ open popover with initial value
→ modify
→ normalize URL
→ validate URL
→ update TaskLink
→ write Activity updated link
→ close popover
→ refresh links
```

## 10.8 Remove Link 流程

```txt
click Link More → Remove
→ remove TaskLink
→ write Activity removed link
→ refresh links
```

V1 可直接删除；如果数据模型已有软删除规则，则使用软删除。

## 10.9 Open Link

Tauri 环境中使用系统默认方式打开链接。

实现应封装在 service 中，不让 UI 直接依赖 Tauri API。

```ts
async function openLink(link: TaskLink) {
  // shell open / opener plugin / platform service
}
```

---

# 11. Activity 写入设计

## 11.1 Drawer 不展示 Activity

Drawer 不渲染 Activity，但所有重要操作都应写入 Activity。

完整 Activity 在 Task Page 展示。

## 11.2 Activity 类型建议

```ts
type TaskActivityType =
  | 'task_created'
  | 'title_changed'
  | 'description_updated'
  | 'status_changed'
  | 'priority_changed'
  | 'due_changed'
  | 'plan_changed'
  | 'reminder_changed'
  | 'label_added'
  | 'label_removed'
  | 'project_changed'
  | 'link_added'
  | 'link_updated'
  | 'link_removed'
  | 'task_archived'
  | 'task_moved_to_trash'
```

## 11.3 Activity payload

```ts
type TaskActivity = {
  id: string
  taskId: TaskId
  type: TaskActivityType
  payload?: Record<string, unknown>
  createdAt: string
}
```

示例：

```ts
{
  type: 'priority_changed',
  payload: {
    from: 'medium',
    to: 'high',
  },
}
```

## 11.4 备注更新 Activity

备注不逐字记录。

推荐：

```txt
用户连续编辑备注
→ debounce 保存
→ 最终只写一条 description_updated
```

后续可以做合并策略，避免短时间内产生过多 Activity。

## 11.5 Activity 合并策略

V1 可以简单处理；V2 可以加入合并窗口。

例如：

```txt
同一 task、同一字段、5 分钟内重复更新
→ 合并为一条 Activity
```

V1 暂不强制。

---

# 12. 键盘与事件管理

## 12.1 全局键盘优先级

建议按以下优先级处理键盘事件：

```txt
Popover > Input/Textarea > Preview > Drawer > List
```

说明：

- Popover 打开时，Esc 先关闭 Popover；
- 输入框聚焦时，方向键由输入框处理；
- Preview 打开时，Esc 先关闭 Preview；
- Drawer 打开时，Esc 关闭 Drawer；
- 普通状态下，方向键控制列表选择。

## 12.2 Esc 规则

```txt
if link popover open:
  close link popover
else if any dropdown open:
  close dropdown
else if preview open:
  close preview
else if drawer open:
  close drawer
else:
  no-op or page default
```

## 12.3 ArrowUp / ArrowDown

```txt
if focus inside input or textarea:
  keep native behavior
else:
  move selectedTaskId
  if drawer open: drawer.taskId = selectedTaskId
  if preview open: preview.taskId = selectedTaskId
```

## 12.4 Space

```txt
if focus inside input/textarea/button:
  keep native behavior
else:
  toggle preview for selectedTaskId
```

## 12.5 Enter

```txt
if focus inside input/textarea:
  keep native behavior
else if selectedTaskId exists:
  open drawer
```

## 12.6 Open Page

```txt
Cmd/Ctrl + Enter 可选
Header Open Page 必做
Row right click Open Page 必做
```

---

# 13. Preview 技术设计

## 13.1 Preview 状态

Preview 不进入 URL。

```ts
type TaskPreviewState = {
  open: boolean
  taskId: TaskId | null
}
```

## 13.2 Preview 数据

Preview 只需要轻量数据：

```ts
type TaskPreviewViewModel = {
  id: TaskId
  title: string
  notePreview?: string
  status: TaskStatus
  priority: TaskPriority
  projectName?: string
  dueAt?: string | null
  links: Pick<TaskLink, 'id' | 'title' | 'url'>[]
}
```

## 13.3 Preview 内容限制

- Note 最多展示 3-5 行；
- Links 最多展示前 2-3 个；
- 不展示 Activity；
- 不展示编辑控件；
- 不写 URL。

## 13.4 Preview 与 Drawer 同时存在

建议规则：

```txt
打开 Drawer 时，关闭 Preview
打开 Preview 时，不一定关闭 Drawer，可按体验决定
```

V1 推荐简单：

```txt
Space 打开 Preview 时，如果 Drawer 打开，Preview 可以覆盖在列表上，或先关闭 Drawer。
```

更推荐：

```txt
Drawer 打开时 Space 不打开 Preview
```

但最终可按 UI 实现体验微调。

---

# 14. Task Page 技术预留

## 14.1 路由

```txt
/tasks/:taskId
```

## 14.2 Page ViewModel

```ts
type TaskPageViewModel = {
  task: Task
  labels: TaskLabel[]
  project: Project | null
  links: TaskLink[]
  activities: TaskActivity[]
}
```

## 14.3 Page 与 Drawer 的复用

可复用：

```txt
TaskTitleInput
TaskNoteEditor
TaskPropertiesSection
TaskLabelsSection
TaskProjectSection
TaskLinksSection
TaskLinkPopover
```

Page 专属：

```txt
TaskPageLayout
TaskPageMain
TaskPageSidebar
TaskActivityTimeline
TaskPageActionBar
```

## 14.4 Activity 读取

Activity 读取只在 Page 中触发，Drawer 不查询 Activity，避免额外开销。

---

# 15. 性能与体验

## 15.1 Drawer 切换性能

Drawer 高频切换任务，需要注意：

- 查询尽量轻；
- 不在 Drawer 查询 Activity；
- Links 数量通常不大，可以随 Task 一起读取；
- 标签 / 项目可用缓存；
- 切换时避免复杂动画阻塞。

## 15.2 本地优先性能

SQLite 本地读写速度快，但仍要避免：

- 备注逐字写入；
- Activity 逐字写入；
- 每次 render 都查询数据库；
- UI 组件直接发起多次重复请求。

## 15.3 乐观更新

属性、标签、项目、Links 操作可以乐观更新：

```txt
用户操作
→ 先更新 UI
→ 后写数据库
→ 成功显示 Saved
→ 失败回滚或显示 Failed
```

本地优先下失败概率低，乐观更新体验更好。

## 15.4 错误处理

保存失败时：

- Footer 显示 `Failed · Retry`；
- 不阻断用户切换任务；
- 错误可记录日志；
- Retry 调用最近失败的保存动作。

---

# 16. shadcn/ui 组件建议

## 16.1 可用组件

| 场景 | shadcn/ui 组件 |
|---|---|
| Drawer 容器 | Sheet / 自定义 aside |
| Button | Button |
| Dropdown | DropdownMenu |
| Popover | Popover |
| Command 选择 | Command |
| Label | Label |
| Separator | Separator |
| Badge / Chip | Badge 或自定义 chip |
| Textarea | Textarea 轻改造 |
| Input | Input 轻改造 |
| Tooltip | Tooltip |

## 16.2 Sheet 还是自定义 aside

### 方案 A：使用 shadcn Sheet

优点：

- 快速；
- 基础可访问性较好；
- 动画和焦点管理已有。

缺点：

- 默认偏 Modal Drawer；
- 可能会锁定背景滚动；
- 可能不适合「列表仍可操作」的需求。

### 方案 B：自定义 aside

优点：

- 完全符合 StoneFlow 的非阻塞侧栏体验；
- 列表可以继续滚动和选择；
- 更容易和 MainCard 布局融合。

缺点：

- 需要自己处理可访问性和动画；
- 初期实现稍多。

### 推荐

StoneFlow 的 Task Drawer 更像非阻塞侧边编辑栏，不是 Modal Sheet。

因此推荐：

```txt
自定义 aside / panel 优先
shadcn 组件用于内部按钮、popover、dropdown
```

## 16.3 无框 Input 处理

可以基于 shadcn Input / Textarea 做变体，也可以直接使用原生 input / textarea 加统一 class。

建议封装：

```txt
BareInput
BareTextarea
```

避免在各处重复写无框样式。

---

# 17. 测试清单

## 17.1 路由测试

- `/tasks` 正常显示列表；
- `/tasks?task=xxx` 打开 Drawer；
- taskId 不存在时清理 query；
- 关闭 Drawer 后 query 移除；
- 打开 Page 跳转 `/tasks/:taskId`。

## 17.2 Drawer 测试

- 单击 Row 打开 Drawer；
- 点击其他 Row 切换内容；
- Header 标题编辑自动保存；
- Note 编辑自动保存；
- Footer 保存状态正确；
- Esc 关闭 Drawer；
- Close 按钮关闭 Drawer；
- Open Page 正常跳转。

## 17.3 Properties 测试

- 修改状态；
- 修改优先级；
- 修改 Due；
- 修改 Plan；
- 修改 Reminder；
- 保存后 updatedAt 更新；
- Activity 写入。

## 17.4 Links 测试

- 新增 Link；
- URL 缺协议自动补全；
- 非法 URL 报错；
- 编辑 Link；
- 删除 Link；
- Open Link；
- Copy Link；
- Activity 写入。

## 17.5 键盘测试

- ↑ / ↓ 切换选中任务；
- Drawer 打开时 ↑ / ↓ 切换 Drawer 内容；
- 输入框聚焦时 ↑ / ↓ 不切换任务；
- Space 打开 Preview；
- Enter 打开 Drawer；
- Popover 打开时 Esc 先关 Popover；
- Drawer 打开时 Esc 关闭 Drawer。

## 17.6 自动保存测试

- 标题 debounce；
- 备注 debounce；
- 切换任务时 flush；
- 保存失败显示 Failed；
- Retry 可执行；
- 不产生过多 Activity。

---

# 18. 开发阶段拆分

## 18.1 M1：Task Route State + UI Store

目标：先打通选择、Drawer 打开、URL 同步。

任务：

1. 建立 `task-ui.store.ts`；
2. 实现 `selectedTaskId`；
3. 实现 `drawer.open / drawer.taskId`；
4. 实现 `useTaskRouteState`；
5. 单击 Row 打开 Drawer；
6. 关闭 Drawer 清 query；
7. query 初始化恢复 Drawer。

验收：

```txt
/tasks?task=xxx 可以直接打开对应 Drawer
点击其他任务 Drawer 内容切换
Esc / Close 可以关闭 Drawer
```

## 18.2 M2：Drawer Shell + Header / Footer

任务：

1. 实现自定义 Drawer aside；
2. 实现固定 Header / 滚动 Body / 固定 Footer；
3. 实现 `TaskTitleInput`；
4. 实现 Open Page；
5. 实现 Header More；
6. 实现 Updated time；
7. 实现 SaveStatus；
8. 实现 Archive Button。

验收：

```txt
Drawer 基础结构完整
Header / Footer 固定
标题可以编辑并保存
```

## 18.3 M3：Body 基础字段

任务：

1. 实现 `TaskNoteEditor`；
2. 实现 `TaskPropertiesSection`；
3. 实现 Status / Priority / Date Buttons；
4. 实现 Labels Section；
5. 实现 Project Section；
6. 接入自动保存和 command。

验收：

```txt
备注、属性、标签、项目可以在 Drawer 中编辑
保存状态正确
Activity 写入正确
```

## 18.4 M4：Links

任务：

1. 建立 TaskLink 数据结构和 repository；
2. 实现 `task-link.service.ts`；
3. 实现 `TaskLinksSection`；
4. 实现 `TaskLinkRow`；
5. 实现 `TaskLinkPopover`；
6. 实现 Add / Edit / Remove / Open / Copy；
7. 写入 Activity。

验收：

```txt
Links 可以新增、编辑、删除、打开、复制
Add / Edit 使用 Popover
```

## 18.5 M5：Preview

任务：

1. 实现 `TaskPreview`；
2. 实现 Space 快捷键；
3. 实现 Preview ViewModel；
4. 实现 ↑ / ↓ 同步 Preview 内容；
5. 确认 Preview 不写 URL。

验收：

```txt
Space 可以快速预览当前选中任务
Preview 只读、不展示 Activity、不污染 URL
```

## 18.6 M6：Page Entry

任务：

1. 建立 `/tasks/:taskId` 路由；
2. 实现基础 `TaskPage`；
3. 从 Drawer Open Page 跳转；
4. 从 Row 右键菜单跳转；
5. Page 先展示基础信息，Activity 完整版可后续扩展。

验收：

```txt
独立页面可打开、可刷新、可深链
```

## 18.7 M7：Polish 与边界处理

任务：

1. 空状态；
2. taskId 不存在；
3. 保存失败；
4. Popover Esc 优先级；
5. 输入态键盘冲突；
6. 小宽度适配；
7. 视觉细节。

---

# 19. 暂缓项与扩展点

## 19.1 暂缓项

| 功能 | 暂缓原因 |
|---|---|
| Drawer Pin | 非刚需，容易影响布局复杂度 |
| Markdown Editor | 会让 Drawer 变重 |
| Attachments | 涉及文件权限和迁移问题 |
| Activity Timeline UI | 放独立页面后续实现 |
| Undo / 回退体系 | 用户已有其他方案，后续独立讨论 |
| Focus Mode | Page 稳定后再做 |
| Related Tasks | 后续资源关联能力 |
| Link 自动抓网页标题 | 非刚需，可能引入异步复杂度 |

## 19.2 扩展点

| 扩展方向 | 当前预留 |
|---|---|
| Linked Resources | TaskLink.type 预留 file |
| Focus Mode | Task Page 路由预留 |
| Activity Timeline | Activity repository / service |
| Convert Task to Project | Command 菜单预留 |
| 全局 Undo | command 层集中处理 |
| 多窗口 / 全局命令 | route + command 可复用 |

---

# 20. 实现约束

## 20.1 不要把 Drawer 写成巨型组件

避免：

```txt
TaskDrawer.tsx 里写完所有标题、备注、属性、标签、项目、Links 逻辑
```

推荐：

```txt
TaskDrawer.tsx 只组织布局
具体字段拆到 detail components
业务逻辑通过 hooks / services 注入
```

## 20.2 不要让 UI 到处写 Activity

Activity 应该由 command / service 层统一写入。

## 20.3 不要让 Preview 复用编辑组件

Preview 是只读快速查看，不应该引入编辑组件导致复杂度上升。

## 20.4 不要让 Drawer 查询 Activity

Drawer 不展示 Activity，也不应该查询 Activity。

## 20.5 不要过度抽象

当前只需要支撑 Task Detail，不要提前抽象出过大的 Universal Detail Engine。

推荐的复用是字段级复用，而不是一开始就做复杂配置化详情系统。

---

# 21. 总结

Task Detail 技术实现的核心是：

```txt
UI 状态清晰
路由状态可恢复
编辑本地优先
保存自动完成
操作统一走 command
Activity 统一记录
Drawer 保持轻量
Page 承接重内容
```

最终落地结构：

```txt
Task Row
→ selectedTaskId
→ Drawer / Preview / Page

Drawer
→ Header / Body / Footer
→ detail field components
→ autosave / command / activity

Preview
→ readonly view model
→ no URL

Page
→ independent route
→ full detail + activity
```

V1 最重要的是跑通：

1. Row 打开 Drawer；
2. Drawer 与 URL query 同步；
3. Header / Body / Footer 三段式布局；
4. 标题、备注、属性、标签、项目自动保存；
5. Links 使用 Popover 增删改；
6. Space Preview；
7. Page 基础入口。

这套实现可以保持 StoneFlow 当前阶段的 KISS，同时为后续 Activity、Focus Mode、Linked Resources 和全局命令系统保留足够扩展空间。
