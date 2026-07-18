# StoneFlow Entity Detail System 重构总方案

## 0. 文档信息

| 项目 | 内容 |
|---|---|
| 文档名称 | StoneFlow Entity Detail System 重构总方案 |
| 文档目的 | 统一 Task / Project 的 Drawer、独立详情页、自动保存、路由状态、Links、Activity 与后续字段扩展架构 |
| 上游文档 | StoneFlow Task 详情形态与交互设计文档、StoneFlow Task Drawer 产品与 UI 设计文档、StoneFlow Task 独立详情页设计文档、StoneFlow Task Detail 技术实现文档 |
| 适用范围 | Task Detail V1、Project Detail 后续接入、Entity Detail 共享基建、Autosave 状态机、Tauri / Rust detail 写链路 |
| 当前阶段 | 破坏式重构执行前总方案 |
| 核心策略 | Shared 放纯基础能力，features/entity-detail 放 Task / Project 详情业务共性，Task / Project 各自保留实体实现 |

---

# 1. 核心结论

## 1.1 最终推荐方案

StoneFlow 的详情系统采用：

```txt
Shared Autosave + Shared Detail UI Primitive
  + Feature Entity Detail Common
  + Task Detail Adapter
  + Project Detail Adapter
```

这不是一个万能详情平台，也不是 Task / Project 各写一套。

最终分层为：

```txt
src/shared/autosave/
src/shared/ui/detail/

src/features/entity-detail/

src/features/task/detail/
src/features/project/detail/
```

核心原则：

1. `shared` 只放不认识 Task / Project 的基础能力。
2. `features/entity-detail` 只服务 Task / Project 详情体系，可以知道 `entityType: 'task' | 'project'`。
3. `features/task/detail` 和 `features/project/detail` 各自负责实体字段、实体 API、实体业务规则。
4. Drawer 和 Page 的壳可以共享，字段级 primitive 可以共享，实体字段 section 不强行共享。
5. 自动保存状态机进入 `shared/autosave`，但 Activity 写入、Repository 更新、Tauri 命令仍在实体业务链路内完成。

## 1.2 为什么不是全放 shared

`shared` 不是“所有会复用的东西都放进去”。

如果把 Detail route、Activity、Links、Task / Project Drawer Host 全放进 `shared/detail`，`shared` 会开始认识业务实体，长期会变成第二个业务层。

因此本方案把能力分成三类：

| 类型 | 位置 | 是否认识业务实体 |
|---|---|---:|
| 自动保存状态机 | `src/shared/autosave` | 否 |
| 详情 UI primitive | `src/shared/ui/detail` | 否 |
| Task / Project 详情业务共性 | `src/features/entity-detail` | 是，只认识 `task/project` |
| Task 具体实现 | `src/features/task/detail` | 是，认识 Task |
| Project 具体实现 | `src/features/project/detail` | 是，认识 Project |

## 1.3 被覆盖的旧方案

这份总方案覆盖旧技术文档中以下建议：

1. 不采用新建 `features/tasks/` 复数目录。
2. 不把 Task Detail 的 route / store / services 全放到 Task 私有目录。
3. 不继续使用旧 `ShellDrawer` 里的 `details/activity` tab。
4. 不继续让 Task Drawer 查询或展示 Activity。
5. 不继续使用手动保存按钮作为 Drawer 主保存方式。
6. 不为了未来 Project 详情复制一套 Task Drawer / Page 架构。

---

# 2. 产品形态总原则

## 2.1 四层模型

Task 继续采用四层详情模型：

```txt
Task Row      = 快速管理
Task Preview  = 快速确认
Task Drawer   = 轻量编辑
Task Page     = 完整详情
```

Project 后续采用三层详情模型：

```txt
Project Row / Nav Item = 快速进入
Project Drawer         = 轻量编辑
Project Page           = 完整详情
```

Project 暂不需要 Preview，除非后续出现明确键盘快速确认场景。

## 2.2 Drawer 定位

Drawer 是日常轻编辑入口。

Drawer 做：

- 标题 / 名称编辑；
- 备注 / 描述编辑；
- 高频结构化字段编辑；
- 轻量 Links；
- 保存状态展示；
- 打开独立 Page；
- 常用轻操作，例如归档。

Drawer 不做：

- Activity Timeline；
- 评论；
- 长文档编辑器；
- 完整附件系统；
- 复杂历史 Diff；
- 重操作主承载。

## 2.3 Page 定位

Page 是完整详情与重操作入口。

Page 做：

- 完整主内容；
- 完整 Links / Resources；
- Activity；
- 重操作；
- 独立路由和深链；
- 刷新恢复；
- 后续 Focus Mode 或深度处理能力。

## 2.4 Row 与 Detail 的关系

现有 Row System 继续保持稳定：

```txt
Shell
  -> MainCard
    -> EntityScene
      -> Board
        -> Group
          -> RowShell
            -> Functional Field Cells
              -> Thin Feature Adapters
```

Detail 重构不推翻 Row System。

Task Row 仍由 `TaskRowAdapter` 负责将 Task 语义翻译到 `RowShell + Field Cells`。

Project Row 后续仍按 `ProjectRowAdapter` 模式扩展。

---

# 3. 最终架构分层

## 3.1 总体结构

```txt
Router
  -> SpaceLayout
    -> ShellLayout
      -> ShellMain
        -> MainCard
          -> EntityScene / Detail Page
          -> EntityDetailDrawerHost

shared/autosave
shared/ui/detail

features/entity-detail
  -> route state
  -> drawer host
  -> page navigation
  -> entity detail protocol

features/task/detail
  -> Task Drawer
  -> Task Preview
  -> Task Page
  -> Task fields
  -> Task links

features/project/detail
  -> Project Drawer
  -> Project Page
  -> Project fields
```

## 3.2 Layer 1：`shared/autosave`

位置：

```txt
src/shared/autosave/
```

职责：

- 自动保存状态机；
- debounce；
- flush；
- retry；
- reset；
- dirty 判断；
- patch diff 协议；
- 保存状态类型；
- React hook 封装。

禁止：

- 不出现 `taskId`；
- 不出现 `projectId`；
- 不出现 `Activity`；
- 不出现 `Drawer`；
- 不出现 `Page`；
- 不调用 Tauri；
- 不调用业务 API；
- 不导入 `features/*`。

推荐文件：

```txt
src/shared/autosave/
├─ autosaveMachine.ts
├─ autosaveTypes.ts
├─ useAutosaveController.ts
├─ autosaveMachine.test.ts
└─ index.ts
```

## 3.3 Layer 2：`shared/ui/detail`

位置：

```txt
src/shared/ui/detail/
```

职责：

- Drawer shell；
- Page layout；
- Header / Body / Footer 槽位；
- Section；
- Field row；
- Save status indicator；
- Detail 操作按钮视觉；
- 统一密度、间距、滚动边界。

禁止：

- 不出现 `Task` / `Project` 命名；
- 不读取业务 store；
- 不发起保存；
- 不知道 Activity 类型；
- 不知道 Links 数据结构。

推荐文件：

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

## 3.4 Layer 3：`features/entity-detail`

位置：

```txt
src/features/entity-detail/
```

职责：

- Task / Project 详情共同业务协议；
- Drawer query 协议；
- Drawer / Page 互斥；
- `Open Page` 导航；
- 当前打开的 detail entity 状态；
- `EntityDetailDrawerHost` 分发到 Task / Project Drawer；
- Esc 关闭优先级；
- 从 command / search / row 打开 detail 的统一入口。

可以知道：

```ts
type EntityDetailKind = 'task' | 'project'
```

禁止：

- 不知道 Task 有哪些字段；
- 不知道 Project 有哪些字段；
- 不直接保存实体；
- 不写 Activity；
- 不操作数据库；
- 不包含 Task / Project 的具体 UI section。

推荐文件：

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

## 3.5 Layer 4：`features/task/detail`

位置：

```txt
src/features/task/detail/
```

职责：

- Task Drawer；
- Task Preview；
- Task Page；
- Task 字段编辑；
- Task Links；
- Task Activity Page 展示；
- Task detail view model；
- Task autosave adapter；
- Task Links API。

推荐文件：

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
- Row 属于列表系统，Detail 属于详情系统；
- Task row 打开 detail 通过 `features/entity-detail` 的统一入口完成。

## 3.6 Layer 5：`features/project/detail`

位置：

```txt
src/features/project/detail/
```

职责：

- Project Drawer；
- Project Page；
- Project 字段编辑；
- Project detail view model；
- Project autosave adapter；
- 后续 Project Links / Activity 展示。

推荐文件：

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

V1 不要求完整实现 Project Detail，但目录和协议要能自然接入。

---

# 4. 路由与打开协议

## 4.1 Drawer query 协议

Task Drawer：

```txt
当前列表路径 + ?task=<taskId>
```

示例：

```txt
/space/work/inbox?task=task_123
/spaces/all-tasks?task=task_123
```

Project Drawer：

```txt
当前列表路径 + ?project=<projectId>
```

示例：

```txt
/spaces/projects?project=project_123
```

同一 URL 不允许同时存在有效 `task` 和 `project`。

如果同时出现，处理规则：

1. 优先保留最后一次打开行为对应的 query；
2. 实现上通过统一 open API 写入，避免双 query；
3. 初始化读取时如果遇到双 query，优先 task，并清理 project。

## 4.2 Page 路由协议

Task Page：

```txt
/tasks/:taskId
```

Project Page：

```txt
/projects/:projectId
```

说明：

- Page 是全局深链，不依赖当前 Space 路由；
- 返回上下文通过 browser history 和 shell route history 处理；
- Page 打开时关闭 Drawer；
- Page 不使用 `?task=` / `?project=`。

## 4.3 打开行为

Task Row 点击：

```txt
TaskRowAdapter.onOpenTask
→ openEntityDrawer({ kind: 'task', id })
→ 写入当前 URL query
→ EntityDetailDrawerHost 渲染 TaskDrawer
```

Project Row 点击：

```txt
ProjectRowAdapter.onOpenProject
→ openEntityDrawer({ kind: 'project', id })
→ 写入当前 URL query
→ EntityDetailDrawerHost 渲染 ProjectDrawer
```

Drawer Open Page：

```txt
flush autosave
→ close drawer query
→ navigate('/tasks/:taskId' 或 '/projects/:projectId')
```

## 4.4 History 策略

推荐：

| 行为 | history |
|---|---|
| 第一次打开 Drawer | push |
| Drawer 打开时切换到另一条 entity | replace |
| 关闭 Drawer | replace |
| Drawer Open Page | push |
| Page 返回 | 浏览器 / shell history |

原因：

- 打开 Drawer 是用户明确进入详情；
- 切换任务是同一 detail session 内的浏览，不应污染返回栈；
- 关闭 Drawer 不应让 Back 再打开一次旧 Drawer。

---

# 5. 自动保存状态机

## 5.1 设计目标

自动保存需要成为项目内可复用的基础能力。

它必须支持：

1. 字段级编辑；
2. debounce 保存；
3. 立即保存；
4. flush；
5. retry；
6. 保存失败保留草稿；
7. 切换实体时 reset；
8. 只提交 patch；
9. 不耦合 Task / Project；
10. 不在 UI 中分散写保存状态。

## 5.2 状态定义

```ts
type AutosaveStatus =
  | 'idle'
  | 'dirty'
  | 'scheduled'
  | 'saving'
  | 'saved'
  | 'failed'
```

| 状态 | 含义 |
|---|---|
| `idle` | 草稿与 base snapshot 一致 |
| `dirty` | 草稿已变更，但尚未安排保存 |
| `scheduled` | 已安排 debounce 保存 |
| `saving` | 正在提交 patch |
| `saved` | 最近一次保存成功，短暂展示 |
| `failed` | 保存失败，草稿保留，可 retry |

## 5.3 事件定义

```ts
type AutosaveEvent =
  | { type: 'CHANGE_FIELD' }
  | { type: 'SCHEDULE_SAVE' }
  | { type: 'FLUSH_NOW' }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS' }
  | { type: 'SAVE_FAILURE'; error: string }
  | { type: 'RESET_FROM_REMOTE' }
  | { type: 'DISCARD' }
  | { type: 'RETRY' }
```

## 5.4 状态流

```txt
idle
  └─ CHANGE_FIELD
      -> dirty

dirty
  ├─ SCHEDULE_SAVE
  │   -> scheduled
  ├─ FLUSH_NOW
  │   -> saving
  └─ RESET_FROM_REMOTE
      -> idle

scheduled
  ├─ debounce timeout
  │   -> saving
  ├─ CHANGE_FIELD
  │   -> scheduled
  ├─ FLUSH_NOW
  │   -> saving
  └─ RESET_FROM_REMOTE
      -> idle

saving
  ├─ SAVE_SUCCESS
  │   -> saved -> idle
  ├─ SAVE_FAILURE
  │   -> failed
  └─ CHANGE_FIELD
      -> scheduled after current save finishes

failed
  ├─ RETRY
  │   -> saving
  ├─ CHANGE_FIELD
  │   -> scheduled
  └─ DISCARD
      -> idle
```

## 5.5 Controller API

推荐 API：

```ts
type AutosaveController<TDraft, TPatch> = {
  draft: TDraft
  status: AutosaveStatus
  error: string | null
  savedAt: number | null
  isDirty: boolean

  setField: <K extends keyof TDraft>(
    key: K,
    value: TDraft[K],
    options?: {
      saveMode?: 'debounced' | 'immediate' | 'manual'
    },
  ) => void

  setDraft: (
    updater: TDraft | ((current: TDraft) => TDraft),
    options?: {
      saveMode?: 'debounced' | 'immediate' | 'manual'
    },
  ) => void

  flushNow: () => Promise<void>
  retry: () => Promise<void>
  discard: () => void
  reset: (nextBase: TDraft) => void
}
```

业务 adapter 提供：

```ts
type AutosaveAdapter<TDraft, TPatch> = {
  getPatch: (base: TDraft, draft: TDraft) => TPatch | null
  savePatch: (patch: TPatch) => Promise<TDraft>
  normalizeDraft?: (draft: TDraft) => TDraft
}
```

## 5.6 保存模式

| 字段 / 操作 | saveMode | 说明 |
|---|---|---|
| title / name | debounced | 输入过程中不逐字保存 |
| note / description | debounced | 文本输入，避免高频写库 |
| status | immediate | 结构化选择，选择即保存 |
| priority | immediate | 结构化选择，选择即保存 |
| due / scheduled / reminder | immediate | 结构化选择，选择即保存 |
| project / space | immediate | 归属变化需要立刻落库 |
| links add / edit / remove | 不走字段 autosave | 操作型 command |
| archive / delete / restore | 不走字段 autosave | lifecycle command |

## 5.7 flush 时机

必须 flush：

- 关闭 Drawer 前；
- Drawer Open Page 前；
- 当前 Drawer 切换到另一条 entity 前；
- Page 离开前；
- 执行 Archive / Delete 等重操作前。

可以不 flush：

- Preview 打开 / 关闭；
- Row focus 移动；
- 非当前 detail 的列表刷新。

## 5.8 保存状态展示

Drawer Footer 展示：

| status | 文案 |
|---|---|
| `idle` | 无需常驻文案，可显示更新时间 |
| `dirty` | Edited |
| `scheduled` | Saving... |
| `saving` | Saving... |
| `saved` | Saved |
| `failed` | Save failed |

Page 中保存状态可以放在 Header 或主内容底部，视觉比 Drawer 更弱。

## 5.9 与 Activity 的关系

Autosave 状态机不写 Activity。

Activity 写入必须在 Rust service / command service 内完成：

```txt
Frontend AutosaveController
→ frontend API
→ Tauri command
→ Rust service transaction
→ repository update
→ activity_service.record_activity_in_txn
```

原因：

- Activity 是持久业务事实，不是 UI 状态；
- 避免不同 UI 入口重复写 Activity；
- Task / Project / Quick Create 等入口都能共用后端写入规则。

---

# 6. Task V1 具体方案

## 6.1 Task Drawer

Task Drawer V1 必做：

- Header：Title input、Open Page、More、Close；
- Body：Note、Properties、Project、Links；
- Footer：Updated time、Save status、More、Archive；
- 自动保存；
- Links URL 增删改；
- URL query 恢复；
- Esc 关闭；
- 切换任务时 flush 当前草稿。

Task Drawer V1 必删：

- 旧 Activity tab；
- Drawer 内 Activity 查询；
- 手动保存主按钮；
- 旧巨型 `TaskDrawerContent` 内联字段实现；
- `activeTab: 'details' | 'activity'` 相关逻辑。

## 6.2 Task Preview

Task Preview V1 必做：

- Space 打开 / 关闭；
- 只读；
- 不进 URL；
- 不展示 Activity；
- 不复用编辑字段组件；
- 当前列表 focus 切换时同步内容。

Task Preview 不做：

- 编辑；
- 下拉菜单；
- Links 编辑；
- Activity；
- 独立路由。

## 6.3 Task Page

Task Page V1 必做：

- `/tasks/:taskId`；
- Title / Note；
- Links；
- Activity 基础列表；
- 右侧属性栏；
- Not Found；
- Archived / Trash 状态；
- 与 Drawer 共用字段级组件和 autosave adapter；
- 不和 Drawer 共用布局组件。

Task Page V1 可简化：

- Activity 先做基础列表，不做复杂 timeline；
- Links 先只展示 title，不展示 URL 第二行；
- Sidebar 固定宽度；
- 不做 Focus Mode。

## 6.4 Task Links

V1 只支持 URL。

不做：

- file；
- attachment；
- fetch 网页 title；
- Linked Resources 大抽象；
- 文件权限；
- 本地文件打开。

推荐数据表：

```sql
CREATE TABLE task_links (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX idx_task_links_task
ON task_links(task_id, sort_order);
```

说明：

- 不加 `type` 字段；
- 未来文件资源独立迁移到 `linked_resources` 或扩展表；
- V1 保持最小 URL Links。

---

# 7. Project 后续接入方案

## 7.1 Project Drawer

Project Drawer 后续应与 Task Drawer 同形态：

```txt
Header:
  Project name input
  Open Page
  More
  Close

Body:
  Description
  Properties
  Dates
  Space
  Links / Resources 后续

Footer:
  Updated time
  Save status
  More
  Archive / Complete
```

## 7.2 Project Page

Project Page 后续承载：

- 项目完整描述；
- 项目属性；
- 项目下 Task 列表；
- Project Activity；
- Project Links / Resources；
- 完成 / 归档 / 删除等重操作。

## 7.3 Project 字段扩展

Project 后续可能增加字段：

- status / phase；
- priority；
- dueAt；
- startAt；
- progress；
- reviewAt；
- owner-like 本地字段；
- links；
- pinned / favorite；
- project color / icon。

这些字段不应该污染 `shared/ui/detail`。

正确做法：

```txt
ProjectPropertiesSection
→ 使用 DetailSection / DetailFieldRow primitive
→ 接 Project autosave adapter
```

## 7.4 Project 与 Task 复用边界

可以复用：

- `shared/autosave`；
- `shared/ui/detail`；
- `features/entity-detail` 的 route / drawer host / navigation；
- Detail field row 视觉 primitive；
- Save status indicator；
- Page layout；
- Drawer shell；
- 后续 URL Link primitive 的视觉部分。

不强制复用：

- TaskPropertiesSection；
- ProjectPropertiesSection；
- TaskPageSidebar；
- ProjectPageSidebar；
- TaskLinks service；
- ProjectLinks service；
- Task Activity 文案；
- Project Activity 文案。

---

# 8. Tauri / Rust 后端方案

## 8.1 总原则

Tauri command 只负责：

- DTO；
- service 组装；
- AppHandle event emission；
- IPC 边界错误返回。

Rust service 负责：

- 业务规则；
- 事务；
- repository 调用；
- Activity 写入；
- 校验；
- patch 语义。

Repository 负责：

- SeaORM 查询；
- create / update / delete；
- 不写 UI 规则；
- 不写 Activity 编排。

## 8.2 Task Links 后端新增模块

推荐新增：

```txt
src-tauri/crates/entity/src/task_link.rs
src-tauri/crates/desktop-app/src/infrastructure/repositories/task_link_repository.rs
src-tauri/crates/desktop-app/src/application/services/task_link_service.rs
src-tauri/crates/desktop-app/src/app/commands/task_links.rs
```

命令：

```txt
list_task_links
create_task_link
update_task_link
delete_task_link
open_task_link
```

注意：

- 所有 command 必须注册到 `generate_handler!`；
- 使用 Tauri v2 API；
- 打开 URL 如需 shell plugin，必须确认 capability；
- async command 参数使用 owned type；
- command 返回 `Result<T, AppError>`。

## 8.3 Task update Activity 规则

Task 字段更新继续由 `update_task` 统一处理。

Activity 写入规则：

| 操作 | Activity action |
|---|---|
| title 变更 | `updated`，change field `title` |
| note 变更 | `updated`，change field `note`，不记录逐字历史 |
| status 变更 | `status_changed` 或 `updated` |
| priority 变更 | `updated` |
| due / scheduled / reminder 变更 | `updated` |
| project / space 变更 | `moved` 或 `updated` |
| link add | `link_added` |
| link update | `link_updated` |
| link delete | `link_removed` |
| archive | `archived` |
| restore | `restored` |

V1 不做复杂 Activity 合并，但 note/title autosave 应避免逐字写入大量 Activity。

推荐：

- debounce 保存只产生一次 update；
- 后端按一次 command 写一次 activity；
- 后续再做短时间合并策略。

## 8.4 事件同步

Task 更新继续 emit：

```txt
stoneflow://tasks/changed
```

Task Links 更新可以：

1. 复用 `stoneflow://tasks/changed`，payload 带 taskId；
2. 或新增 `stoneflow://task-links/changed`。

V1 推荐复用 `tasks/changed`，减少前端订阅复杂度。

Project 后续保持对应：

```txt
stoneflow://projects/changed
```

---

# 9. 前端数据流

## 9.1 Drawer 读取链路

```txt
EntityDetailDrawerHost
→ TaskDrawer / ProjectDrawer
→ useTaskDetailController / useProjectDetailController
→ load detail view model
→ initialize autosave controller
→ render fields
```

## 9.2 字段保存链路

```txt
Field Component
→ controller.setField()
→ shared/autosave
→ getPatch(base, draft)
→ savePatch(patch)
→ feature API
→ Tauri command
→ Rust service
→ repository update
→ Activity write
→ changed event
→ refresh loaded slices
```

## 9.3 Links 保存链路

```txt
TaskLinkPopover submit
→ taskLinksApi.create/update/delete
→ Tauri command
→ TaskLinkService transaction
→ TaskLinkRepository
→ Activity write
→ tasks changed event
→ Task links reload
```

Links 不进入字段 autosave，因为它是操作型集合更新。

## 9.4 列表刷新策略

字段保存成功后：

- 当前 detail base snapshot 更新；
- 当前 task list 已加载时刷新 affected list；
- 当前 Drawer 不应闪 loading；
- 保存状态变为 `saved`；
- `saved` 短暂展示后回 `idle`。

失败后：

- draft 保留；
- list 不刷新；
- status 变为 `failed`；
- 用户可继续编辑或 retry。

---

# 10. UI 与 Tailwind 设计系统规则

## 10.1 视觉原则

Detail 系统保持 StoneFlow 当前风格：

- 克制；
- 高密度；
- 无框输入；
- 少卡片；
- 弱装饰；
- 清晰分区；
- 固定 Header / Footer；
- Body 独立滚动；
- Main 内 Drawer，不盖住 shell chrome。

## 10.2 Detail Drawer Shell

结构：

```txt
DetailDrawerShell
├─ DetailHeader
├─ DetailBody
└─ DetailFooter
```

布局规则：

```txt
root: h-full flex flex-col
header: shrink-0
body: flex-1 overflow-y-auto
footer: shrink-0
```

Body 底部 padding 必须大于 Footer 高度，避免最后一项被遮挡。

## 10.3 Detail Page Layout

结构：

```txt
DetailPageLayout
├─ Header
└─ Content
   ├─ Main
   └─ Sidebar
```

窄宽度规则：

- V1 使用 Sidebar 下移；
- 不做 Sidebar 再变 Drawer；
- 不做复杂 resize。

## 10.4 Component API

使用 composition，不用 boolean props 堆模式。

避免：

```tsx
<DetailLayout
  isDrawer
  isTask
  showActivity
  showFooter
  compact
/>
```

推荐：

```tsx
<DetailDrawerShell>
  <DetailHeader />
  <DetailBody />
  <DetailFooter />
</DetailDrawerShell>
```

## 10.5 Tailwind token

优先使用已有 `--sf-*` token 和现有 shadcn adapter。

不新增一套 Detail 专属颜色体系，除非出现明确重复且跨 Task / Project 共用。

可以新增：

- detail section spacing token；
- detail footer height token；
- detail drawer width token。

不要新增：

- task detail blue；
- project detail green；
- 每个实体一套 drawer token。

---

# 11. 键盘与交互规则

## 11.1 全局优先级

推荐优先级：

```txt
Popover / Dropdown
→ Input / Textarea composing
→ Preview
→ Drawer
→ Row Shortcut Scope
→ Global Command Shortcuts
```

## 11.2 Esc

Esc 规则：

```txt
if popover open:
  close popover
else if input editing and component consumes Esc:
  stop editing
else if preview open:
  close preview
else if drawer open:
  flush autosave
  close drawer
else:
  pass to global shortcut
```

## 11.3 ArrowUp / ArrowDown

非输入态：

- 列表方向键继续控制 row focus；
- Drawer 打开不夺走方向键；
- row focus 切换时，Drawer 内容可跟随切换；
- 切换前需要 flush 当前 autosave。

输入态：

- 方向键归输入框；
- 不切换 row focus。

## 11.4 Space Preview

Task：

- Space 打开 / 关闭 Preview；
- Preview 只读；
- Preview 不进 URL；
- Drawer 打开时也允许 Preview 作为临时确认，但需要避免视觉重叠。

Project：

- V1 不做 Preview。

---

# 12. 开发阶段与细任务

## 12.1 阶段 0：文档定稿与旧方案对齐

目标：

统一最终执行边界，避免实现时回到旧 Task-only 方案。

任务：

1. 将本文档作为详情系统总方案。
2. 在旧四份 Task 文档顶部补充引用关系或保留为上游参考。
3. 明确旧 `features/tasks` 目录建议废弃。
4. 明确旧 Drawer Activity tab 废弃。
5. 明确 Task Links V1 只支持 URL。
6. 明确 Project Detail 只做架构预留，不抢 Task V1 范围。

验收：

- 后续实现引用本文档作为总方案；
- 没有新的方案同时要求 `features/tasks` 和 `features/task/detail` 两套目录。

## 12.2 阶段 1：Shared Autosave

目标：

落地通用自动保存状态机与测试。

任务：

1. 新增 `src/shared/autosave/autosaveTypes.ts`。
2. 新增 `autosaveMachine.ts`。
3. 新增 `useAutosaveController.ts`。
4. 支持 `debounced / immediate / manual` 保存模式。
5. 支持 `flushNow()`。
6. 支持 `retry()`。
7. 支持 `reset(nextBase)`。
8. 支持保存失败保留草稿。
9. 支持保存中继续编辑。
10. 编写状态机单测。

验收：

- `idle -> dirty -> scheduled -> saving -> saved -> idle` 流程通过；
- immediate 字段不等待 debounce；
- failed 后 retry 可恢复；
- reset 能清理旧草稿；
- 保存中继续编辑不会丢失后续改动。

## 12.3 阶段 2：Shared Detail UI Primitive

目标：

建立不认识业务实体的详情 UI 基础组件。

任务：

1. 新增 `src/shared/ui/detail/DetailDrawerShell.tsx`。
2. 新增 `DetailHeader.tsx`。
3. 新增 `DetailBody.tsx`。
4. 新增 `DetailFooter.tsx`。
5. 新增 `DetailSection.tsx`。
6. 新增 `DetailFieldRow.tsx`。
7. 新增 `DetailSaveStatus.tsx`。
8. 抽出必要 detail token。
9. 写基础渲染测试。

验收：

- Header / Body / Footer flex 布局稳定；
- Body 可滚动；
- Footer 不遮挡最后内容；
- SaveStatus 能展示 autosave 状态；
- 组件不导入任何 `features/*`。

## 12.4 阶段 3：Entity Detail Common

目标：

建立 Task / Project 共享的 detail 打开、关闭、路由与 Drawer Host。

任务：

1. 新增 `features/entity-detail/model/entityDetailTypes.ts`。
2. 新增 `entityDetailRouteState.ts`。
3. 新增 `entityDetailNavigation.ts`。
4. 新增 `useEntityDetailController.ts`。
5. 新增 `EntityDetailDrawerHost.tsx`。
6. 将 `?task=` / `?project=` query 解析集中管理。
7. 将 `openEntityDrawer` 接入 history 策略。
8. 将 `closeEntityDrawer` 接入 query 清理。
9. 将 Drawer Open Page 接入统一 navigation。
10. 保留旧 `useDrawerStore` 兼容期最短路径，随后删除 task/project detail 依赖。

验收：

- 当前列表路径可以打开 `?task=id`；
- 刷新后能恢复 Task Drawer；
- 关闭 Drawer 清理 query；
- 切换 Task 使用 replace；
- `task` 和 `project` query 不会同时有效；
- `EntityDetailDrawerHost` 可以分发 task/project。

## 12.5 阶段 4：Task Drawer 破坏式替换

目标：

用新架构替换旧 Task Drawer。

任务：

1. 新增 `features/task/detail/model/useTaskDetailController.ts`。
2. 新增 `useTaskAutosaveAdapter.ts`。
3. 新增 `TaskDrawer.tsx`。
4. 新增 `TaskDrawerHeader.tsx`。
5. 新增 `TaskDrawerBody.tsx`。
6. 新增 `TaskDrawerFooter.tsx`。
7. 新增 `TaskTitleField.tsx`。
8. 新增 `TaskNoteField.tsx`。
9. 新增 `TaskPropertiesSection.tsx`。
10. 新增 `TaskProjectSection.tsx`。
11. 接入 `shared/autosave`。
12. 删除旧 Drawer 的 Activity tab。
13. 删除 Drawer 内 `getEntityActivities` 查询。
14. 删除手动保存主按钮。
15. 将 `TaskRowAdapter.onOpenTask` 改走 `openEntityDrawer`。

验收：

- Row 点击打开新 Task Drawer；
- Drawer 不显示 Activity；
- Drawer 不查询 Activity；
- 标题 / 备注 debounce 保存；
- 状态 / 优先级 / 日期 / 项目立即保存；
- Footer 展示保存状态；
- 关闭前 flush；
- 切换任务前 flush；
- 类型检查通过。

## 12.6 阶段 5：Task Links URL 全链路

目标：

落地 Task Links V1，仅 URL。

Rust / Tauri 任务：

1. 新增 migration：`task_links`。
2. 新增 SeaORM entity：`task_link.rs`。
3. 新增 `TaskLinkRepository`。
4. 新增 `TaskLinkService`。
5. 新增 Tauri commands。
6. 注册 commands。
7. 写 repository / service 测试。
8. Links add / update / delete 写 Activity。

前端任务：

1. 新增 `taskLinksApi.ts`。
2. 新增 `TaskLinksSection.tsx`。
3. 新增 `TaskLinkRow.tsx`。
4. 新增 `TaskLinkPopover.tsx`。
5. 支持 Add / Edit / Remove。
6. 支持 Open URL。
7. Links 操作后刷新当前 links。
8. Drawer 和 Page 共享视觉组件，不共享布局。

验收：

- URL Link 可新增；
- URL Link 可编辑；
- URL Link 可删除；
- URL Link 可打开；
- Links 操作写入 Activity；
- Drawer Links 不触发字段 autosave；
- V1 没有 file / attachment 字段。

## 12.7 阶段 6：Task Preview

目标：

落地只读快速确认层。

任务：

1. 新增 `useTaskPreviewController.ts`。
2. 新增 `TaskPreview.tsx`。
3. 接入 Space 快捷键。
4. 接入当前 focused task。
5. 展示标题、状态、优先级、项目、日期、备注摘要、Links 摘要。
6. 不复用编辑字段组件。
7. 不写 URL。
8. 不查询 Activity。

验收：

- Space 可打开 / 关闭；
- ↑ / ↓ 切换任务时 Preview 同步；
- Enter 可进入 Drawer；
- Esc 可关闭 Preview；
- Preview 不污染 URL；
- Preview 不展示 Activity。

## 12.8 阶段 7：Task Page

目标：

落地 Task 独立详情页 V1。

任务：

1. 新增 `/tasks/:taskId` route。
2. 新增 `TaskPage.tsx`。
3. 新增 `TaskPageMain.tsx`。
4. 新增 `TaskPageSidebar.tsx`。
5. 新增 `TaskActivityTimeline.tsx`。
6. 复用 Task 字段级组件。
7. 接入 autosave。
8. 接入 Task Links。
9. 查询 Activity。
10. Drawer Open Page 前 flush 并关闭 Drawer。
11. 实现 Not Found / Archived / Trash 状态。

验收：

- `/tasks/:taskId` 可刷新恢复；
- Drawer Open Page 正常跳转；
- Page 显示 Activity；
- Page 可保存标题 / 备注 / 属性；
- Page 不依赖 Drawer query；
- Page 和 Drawer 互斥。

## 12.9 阶段 8：Project Detail 架构接入

目标：

让 Project 能按同一 detail system 接入，先做最小骨架。

任务：

1. 新增 `features/project/detail` 目录。
2. 新增 `ProjectDrawer.tsx` 骨架。
3. 新增 `ProjectPage.tsx` 骨架。
4. 新增 `useProjectDetailController.ts`。
5. 新增 `useProjectAutosaveAdapter.ts`。
6. 将 Project row / sidebar 打开行为接入 `openEntityDrawer({ kind: 'project' })`。
7. 暂不做完整 Project Links。
8. 暂不做复杂 Project Activity。

验收：

- Project 可以通过 `?project=id` 打开 Drawer；
- Project Drawer 使用同一 `DetailDrawerShell`；
- Project 字段保存可走同一 autosave 状态机；
- Project 未完成字段不污染 Task 实现。

## 12.10 阶段 9：旧代码清理

目标：

删除旧入口和双状态源。

任务：

1. 删除旧 `features/task-drawer/ui/TaskDrawerContent.tsx` 或改为新实现导出。
2. 删除 `ShellDrawer` 中 task/project 详情的旧 tab 逻辑。
3. 删除旧 task detail 手动保存相关测试。
4. 删除不再使用的 `task-drawer` pattern token。
5. 收敛 `useDrawerStore`：如果仅剩非 detail drawer，则改名或拆分。
6. 搜索 `activeTab === 'activity'`，确保没有残留。
7. 搜索 `getEntityActivities`，确保 Drawer 不再调用。

验收：

- 无旧 Activity tab；
- 无 Task Drawer 手动保存主按钮；
- 无 Drawer Activity 查询；
- 无 task detail 双状态源；
- typecheck 通过；
- 相关测试通过。

---

# 13. 测试策略

## 13.1 前端单测

必须覆盖：

- autosave 状态机；
- useAutosaveController；
- entity detail route state；
- Drawer query 打开 / 关闭；
- Task Drawer 自动保存；
- Task Links UI；
- Task Preview keyboard；
- Task Page 基础渲染；
- Project Drawer 骨架。

## 13.2 Rust 测试

必须覆盖：

- task_links migration；
- task_link_repository；
- task_link_service；
- create / update / delete link；
- link activity write；
- update_task activity write；
- invalid URL validation；
- deleted task 下不可新增 link。

## 13.3 集成验收

手工验收：

1. 从 Inbox 打开 Task Drawer。
2. 编辑标题，等待自动保存。
3. 编辑备注，关闭 Drawer 前 flush。
4. 切换任务，前一个任务不丢内容。
5. 修改状态 / 优先级立即保存。
6. 新增 URL Link。
7. 打开 Page，Activity 可见。
8. 返回列表，Drawer 状态合理。
9. 刷新带 `?task=` 的 URL，Drawer 可恢复。
10. Project Drawer 骨架不影响 Task Drawer。

---

# 14. 风险与取舍

## 14.1 风险：shared 被业务污染

控制方式：

- `shared/autosave` 不出现实体语义；
- `shared/ui/detail` 不出现实体语义；
- Task / Project 共性放 `features/entity-detail`。

## 14.2 风险：自动保存产生过多 Activity

控制方式：

- 文本字段 debounce；
- Activity 在后端按 command 写入；
- V1 不逐字保存；
- 后续可增加 Activity 合并。

## 14.3 风险：Drawer 和 Page 过度复用

控制方式：

- 字段级组件复用；
- 布局级组件分开；
- Drawer / Page 使用同一 primitive，但不使用同一个大组件。

## 14.4 风险：Project 需求未定导致过早抽象

控制方式：

- Project 只接 detail system 骨架；
- Project 字段留在 `features/project/detail`；
- 不做字段 registry；
- 不做 schema form renderer。

## 14.5 风险：双状态源

控制方式：

- Detail 打开状态以 URL query 为源；
- `features/entity-detail` 提供唯一 open / close API；
- 旧 `useDrawerStore` 只保留短期迁移用途；
- 清理旧 ShellDrawer task detail 状态。

---

# 15. 最终决策记录

| 决策 | 结论 |
|---|---|
| Task 默认详情入口 | Drawer |
| Task Page 路由 | `/tasks/:taskId` |
| Project Page 路由 | `/projects/:projectId` |
| Drawer URL | 当前列表路径 `?task=` / `?project=` |
| Drawer 是否展示 Activity | 不展示 |
| Drawer 是否查询 Activity | 不查询 |
| Task Links V1 | 只支持 URL |
| Links 是否加 type 字段 | V1 不加 |
| 自动保存状态机位置 | `src/shared/autosave` |
| Detail UI primitive 位置 | `src/shared/ui/detail` |
| Task / Project 详情共性位置 | `src/features/entity-detail` |
| Task 实现位置 | `src/features/task/detail` |
| Project 实现位置 | `src/features/project/detail` |
| 是否做万能 Detail 平台 | 不做 |
| 是否做字段 registry | 不做 |
| 是否兼容旧 Drawer Activity tab | 不兼容，直接删除 |
| 是否保留手动保存主按钮 | 不保留，改自动保存 |

---

# 16. 总结

StoneFlow 的详情系统最终要解决的不是“Task Drawer 怎么写”，而是：

```txt
Task / Project 如何共享一套长期稳定的详情心智模型，
同时不把 shared 变成业务垃圾桶，
也不让 Task / Project 各自复制一套 Drawer + Page + Save 体系。
```

本方案的长期结构是：

```txt
shared/autosave      = 通用保存状态机
shared/ui/detail     = 纯 UI primitive
features/entity-detail = Task / Project 详情业务协议
features/task/detail = Task 详情实现
features/project/detail = Project 详情实现
```

第一轮应该先完整落 Task，并为 Project 留出真实可接入的架构位置。

执行顺序上，必须先做 autosave 和 route/detail common，再破坏式替换 Task Drawer。否则新 Drawer 会继续绑在旧 `useDrawerStore` 和旧手动保存链路上，后续 Page / Project 接入还会再次返工。
