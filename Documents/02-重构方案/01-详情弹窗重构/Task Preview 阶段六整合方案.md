# StoneFlow Task Preview 阶段六整合方案

## 0. 文档信息

| 项目 | 内容 |
|---|---|
| 文档名称 | StoneFlow Task Preview 阶段六整合方案 |
| 对应阶段 | 《StoneFlow Entity Detail System 重构总方案》阶段 6 |
| 阶段主题 | Task Preview |
| 文档目标 | 整合总方案、Task 形态文档、技术文档与当前代码事实，产出阶段六可直接实施的完整方案与线稿 |
| 适用范围 | Task Row 键盘流、Task Preview、Task Drawer 打开链路、Preview 状态模型、只读摘要渲染 |
| 不包含 | Task Page、Activity Timeline、Preview 内编辑、Project Preview |

---

## 1. 结论先行

阶段六的本质不是“再做一个右侧详情面板”，而是补齐 Task 四层模型里缺失的第二层：

```txt
Task Row      = 快速管理
Task Preview  = 快速确认
Task Drawer   = 轻量编辑
Task Page     = 完整详情
```

最终推荐方案：

1. 新增独立的 `Task Preview` 只读层，不复用 `ShellDrawer`。
2. Preview 由任务列表的键盘焦点驱动，`Space` 打开 / 关闭，`↑ / ↓` 同步内容。
3. `Enter` 从 Preview 升级进入 Drawer，`Esc` 关闭 Preview。
4. Preview 不写 URL，不接 autosave，不查 Activity，不复用编辑字段组件。
5. Preview 默认使用当前 `TaskListItem` 作为首屏数据源；`Links` 摘要单独补一层轻量读取。

核心原因：

1. 现有 `ShellDrawer -> EntityDetailDrawerHost -> TaskDrawer` 链路已经是“轻量编辑层”，如果 Preview 也挂进去，会把“快速确认”和“轻量编辑”再次混成一层。
2. 当前 `task.peek` 键位已经存在，但实际行为仍走 `onOpenTask`，语义和实现不一致；阶段六的任务就是把这条链补完整。
3. `TaskListItem` 已经提供标题、状态、优先级、项目、日期、备注，足够支撑 Preview 的主要内容，不需要再把 Drawer 的整套编辑状态搬进去。

---

## 2. 上游文档整合结论

基于同目录文档，阶段六需要同时继承以下约束：

### 2.1 来自《StoneFlow Entity Detail System 重构总方案》

阶段六原始定义：

1. 新增 `useTaskPreviewController.ts`
2. 新增 `TaskPreview.tsx`
3. 接入 `Space`
4. 接入当前 focused task
5. 展示标题、状态、优先级、项目、日期、备注摘要、Links 摘要
6. 不复用编辑字段组件
7. 不写 URL
8. 不查询 Activity

### 2.2 来自《StoneFlow Task 详情形态与交互设计文档》

Preview 的产品定位已经定得很清楚：

1. 它是键盘流里的快速查看卡片。
2. 目的是确认“当前选中的任务是不是我要找的”。
3. 它不是编辑器，不进入 URL，不展示 Activity。
4. 它优先服务列表主导和键盘友好，而不是鼠标重交互。

### 2.3 来自《StoneFlow Task Detail 技术实现文档》

阶段六需要遵守的技术边界：

1. Preview 是临时 UI 状态，不应该污染路由。
2. Drawer 和 Page 可复用字段级组件，Preview 不强求，也不应该直接套编辑组件。
3. UI 组件不直接写数据库。
4. `features/task/detail` 承载 Task Preview 的业务实现，`features/entity-detail` 不负责 Preview 业务。

### 2.4 本次整合后的统一口径

阶段六不再使用“右侧详情面板”这类模糊说法，统一改为：

```txt
Task Preview = 列表上下文内的临时只读预览层
```

它和 Drawer 的关系是：

```txt
Preview 是 quick confirm
Drawer  是 light edit
两者互斥，不共享宿主，不共享编辑状态
```

---

## 3. 当前代码事实与实施边界

本方案不是纯文档推演，下面这些是当前仓库已经确认的事实：

### 3.1 已存在的基础

1. `src/features/task/shortcuts/taskRowShortcutBindings.ts` 已把 `Space` 绑定到 `COMMAND_IDS.taskPeek`。
2. `src/features/task/shortcuts/TaskRowShortcutScope.tsx` 已具备键盘 hover / focused task / `↑↓` 切换能力。
3. `src/features/task/model/useTaskSelection.ts` 已暴露 `focusedTaskId`。
4. `src/features/task/model/useTaskStore.ts` 已维护列表数据与详情数据。
5. `src/features/task/detail/ui/TaskDrawer.tsx` 已经稳定承担“轻量编辑层”。
6. `src/features/entity-detail/model/useEntityDetailController.ts` 已处理 Drawer / Page 的 URL 协议。

### 3.2 当前真正缺失的部分

1. `taskPeek` 语义虽然存在，但实际仍复用 `onOpenTask`，没有独立 Preview 状态。
2. 现有右侧宿主只有 `ShellDrawer`，没有 Preview 宿主。
3. 命令上下文里有 `isPreviewOpen` / `activePanel: 'preview'` 语义，但前端真实 UI 尚未落地。
4. `TaskListItem` 能满足大部分 Preview 内容，但 `Links 摘要` 需要补轻量获取方案。

### 3.3 实施边界

阶段六只补齐 Preview 这一层，不顺手做下面这些事：

1. 不改 Drawer 的布局和字段编辑。
2. 不新增 Task Page。
3. 不引入新的 URL query。
4. 不把 Preview 做成可编辑面板。
5. 不提前做 Project Preview。

---

## 4. 产品定位与交互原则

## 4.1 定位

Task Preview 是列表上下文中的只读确认卡片，服务于“先看一眼，再决定是否进入 Drawer / Page”。

一句话定义：

> Preview 负责确认，不负责处理。

## 4.2 典型使用场景

1. 用户用 `↑ / ↓` 在任务列表中快速扫任务。
2. 遇到标题相似的任务时，按 `Space` 看备注和链接摘要。
3. 确认是目标任务后，按 `Enter` 进入 Drawer 编辑。
4. 发现不是目标任务，继续 `↑ / ↓` 切换，Preview 同步刷新。
5. 不需要处理时按 `Esc` 收起。

## 4.3 必须坚持的规则

1. Preview 必须只读。
2. Preview 必须零 URL 污染。
3. Preview 必须比 Drawer 更轻、更快、更少认知负担。
4. Preview 必须不打断列表浏览。
5. Preview 必须默认不抢输入焦点。

---

## 5. 信息架构

## 5.1 展示内容

阶段六推荐展示以下内容：

| 优先级 | 内容 | 来源 |
|---|---|---|
| P0 | 标题 | `TaskListItem.title` |
| P0 | 状态 | `TaskListItem.status` |
| P0 | 优先级 | `TaskListItem.priority` |
| P1 | 项目 / Inbox / 独立事项归属 | `projectName` / `projectId` / `inboxAt` |
| P1 | 日期摘要 | `dueAt` / `scheduledAt` / `reminderAt` |
| P1 | 备注摘要 | `note` |
| P2 | Links 摘要 | 轻量查询结果 |
| P2 | 更新时间 | `updatedAt` |

## 5.2 不展示的内容

1. Activity
2. 评论
3. 完整属性编辑器
4. 标签编辑器
5. 项目选择器
6. 自动保存状态
7. 更多菜单
8. 危险操作按钮

---

## 6. 视觉与宿主方案

## 6.1 推荐形态

Preview 推荐做成独立浮层卡片，不复用 `Sheet` / `ShellDrawer`。

推荐原因：

1. Drawer 视觉语义是“进入编辑层”，Preview 视觉语义应该是“临时查看层”。
2. Drawer 现在有固定 Header / Body / Footer、关闭策略、外部点击策略和 overlay 语义，这些都偏重。
3. Preview 如果沿用 Drawer，会导致 `Space` 的感受接近“打开详情”，而不是“瞥一眼”。

## 6.2 宿主位置建议

推荐直接挂在 `ShellMain` 内，与 `ShellDrawer` 并列，但独立渲染：

```txt
ShellMain
  ├─ Main content
  ├─ TaskPreviewHost
  └─ ShellDrawer
```

约束：

1. Preview 和 Drawer 互斥。
2. Drawer 打开时 Preview 自动关闭。
3. Preview 打开时不改变主列表宽度。
4. Preview 不复用 `EntityDetailDrawerHost`，避免把 Preview 也并入 URL detail 系统。

## 6.3 尺寸建议

桌面端建议：

1. 宽度：`360px - 420px`
2. 最大高度：`min(520px, calc(100vh - 80px))`
3. 圆角：与当前浮层体系一致，但比 Drawer 更轻
4. 阴影：浮层级别，不要用 Drawer 那种“面板占位感”

移动端当前不是阶段六重点，不单独设计移动预览层；移动端可直接退化为不启用 Preview，或后续按平台策略补。

---

## 7. ASCII 线稿

## 7.1 推荐桌面线稿

```txt
                    Task Preview
        ┌──────────────────────────────────────┐
        │ Task title                           │
        │                                      │
        │ ○ Todo   ↑ High   StoneFlow          │
        │ Due May 26 · Plan May 25             │
        │                                      │
        │ Note                                 │
        │ 接入详情系统阶段六，补 Preview 宿主、 │
        │ Space 键盘流和 Links 摘要能力。      │
        │ 最多显示 3-5 行，超出截断。          │
        │                                      │
        │ Links                                │
        │ • 详情弹窗重构总方案                 │
        │ • Task Drawer 设计文档               │
        │ +2 more                              │
        │                                      │
        │ Updated 2 min ago                    │
        └──────────────────────────────────────┘
```

## 7.2 与列表并存时的空间关系

```txt
┌──────────────────────────────────────────────────────────────────────────────┐
│ Main Card                                                                     │
│                                                                              │
│  Task Board                                                  Preview         │
│  ┌──────────────────────────────────────────────┐          ┌──────────────┐ │
│  │ > Task A                                     │          │ Task title   │ │
│  │   Task B                                     │          │ meta         │ │
│  │   Task C                                     │          │ note         │ │
│  │                                              │          │ links        │ │
│  │                                              │          │ updated      │ │
│  └──────────────────────────────────────────────┘          └──────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 7.3 Preview 升级到 Drawer 的关系

```txt
Space  -> 打开 Preview
↑ / ↓  -> Preview 跟随 focused task
Enter  -> 关闭 Preview，打开 Drawer
Esc    -> 关闭 Preview
```

---

## 8. 状态模型

## 8.1 为什么不能复用 URL detail state

Drawer / Page 的状态是“导航级状态”：

1. Drawer 要支持 query 恢复。
2. Page 要支持路由深链。

Preview 不是导航行为，而是临时交互态：

1. 不可刷新恢复也没关系。
2. 不应该污染历史记录。
3. 不应该让用户分享或收藏 Preview 状态。

所以 Preview 应使用本地 UI state，而不是 route state。

## 8.2 推荐状态结构

推荐在 `features/task/detail/model` 下新增独立 controller：

```ts
type TaskPreviewState = {
  open: boolean
  taskId: string | null
}
```

对应能力：

1. `openPreview(taskId)`
2. `closePreview()`
3. `togglePreview(taskId)`
4. `replacePreviewTarget(taskId)`

## 8.3 关键规则

1. `Space`
   当前有 focused task 且 Preview 关闭时，打开 focused task 的 Preview。
2. `Space again`
   如果 Preview 已打开且 focused task 与 preview task 相同，则关闭。
3. `↑ / ↓`
   Preview 打开时，仅替换 `preview.taskId`，不重新打开宿主。
4. `Enter`
   先关闭 Preview，再调用 `openDrawer({ kind: 'task', id })`。
5. `Esc`
   Preview 打开时优先关闭 Preview，不继续冒泡到其他关闭逻辑。
6. Drawer 打开
   关闭 Preview。
7. focused task 消失
   如果对应任务已被过滤掉、删除或不在当前可见列表，关闭 Preview。

---

## 9. 数据策略

## 9.1 主数据源

Preview 首屏默认基于当前列表项数据渲染：

```txt
TaskListItem
  -> title
  -> status
  -> priority
  -> projectName / inboxAt
  -> dueAt / scheduledAt / reminderAt
  -> note
  -> updatedAt
```

这样做的好处：

1. 打开足够快。
2. 不依赖 `loadDetail(taskId)`。
3. 不和 Drawer 的详情加载链混在一起。

## 9.2 Links 摘要策略

这里需要做一个明确取舍。

### 推荐方案

阶段六只为 Preview 补“Links 摘要读取”，不引入完整详情加载。

建议：

1. Preview 打开后，异步调用 `listTaskLinks({ taskId })`。
2. 仅展示前 `2-3` 条链接标题。
3. 加一个 `+N more` 汇总。
4. 请求失败时静默降级为不展示 Links，不把整个 Preview 打成错误态。

### 为什么不直接复用 `getTaskDetail`

因为 `TaskDetail` 当前并不包含 links，最终仍然要单独查 links。

### 为什么不直接复用 `useTaskLinksController`

因为那个 controller 面向可编辑列表与 Popover 交互，Preview 只需要只读摘要；直接复用会把编辑状态、刷新逻辑和 overlay 语义带进来，复杂度不对。

### 因此阶段六应新增

```txt
useTaskPreviewController.ts
  -> 负责聚合
     - focused task
     - preview open/close
     - list item snapshot
     - links summary query
```

---

## 10. 推荐目录与组件拆分

```txt
src/features/task/detail/
├─ model/
│  ├─ useTaskPreviewController.ts
│  └─ useTaskPreviewController.test.tsx
├─ ui/
│  ├─ TaskPreview.tsx
│  ├─ TaskPreviewCard.tsx
│  ├─ TaskPreviewMeta.tsx
│  ├─ TaskPreviewNote.tsx
│  └─ TaskPreviewLinksSummary.tsx
└─ index.ts
```

### 组件职责建议

1. `TaskPreview.tsx`
   Preview 宿主入口，处理 loading / empty / success。
2. `TaskPreviewCard.tsx`
   纯布局容器。
3. `TaskPreviewMeta.tsx`
   状态、优先级、归属、日期摘要。
4. `TaskPreviewNote.tsx`
   备注摘要截断展示。
5. `TaskPreviewLinksSummary.tsx`
   Links 摘要与 `+N more`。

说明：

1. 可以复用颜色 token、状态文案、优先级 icon 等基础显示元素。
2. 不复用 `TaskTitleField`、`TaskNoteField`、`TaskPropertiesSection` 这类编辑组件。

---

## 11. 交互链路设计

## 11.1 Row 层动作调整

当前 `TaskRowShortcutScope` 里：

1. `peek`
2. `openDetail`

都还走 `onOpenTask(targetTask.id)`。

阶段六需要拆开：

1. `peek` -> `onPeekTask(taskId)`
2. `openDetail` -> `onOpenTask(taskId)`

也就是 `TaskBoard` / `TaskBoardAdapter` / scene actions 都需要补一条 `onPeekTask` 链，而不是继续让 `Space` 误开 Drawer。

## 11.2 推荐行为优先级

```txt
if Preview open and key === Escape:
  close Preview
  stop

if key === Space and focused task exists:
  toggle Preview by focused task
  stop

if Preview open and key === Enter:
  close Preview
  open Drawer for preview task
  stop

if Preview open and key === ArrowUp / ArrowDown:
  move focus
  sync preview target
  stop
```

## 11.3 鼠标行为建议

阶段六不建议把 hover 自动打开 Preview。

原因：

1. 会污染列表浏览。
2. 与键盘确认层定位冲突。
3. 很容易把 Preview 做成 tooltip 式噪音。

鼠标场景下的最小规则：

1. 点击 Row 仍然打开 Drawer。
2. Preview 打开后，鼠标点击外部空白区域可关闭。
3. 点击 Preview 内链接摘要时，是否直接打开链接不是阶段六重点，建议先不做点击交互，避免只读层变成操作层。

---

## 12. 与命令系统的关系

## 12.1 `task.peek`

阶段六应让 `COMMAND_IDS.taskPeek` 真正对应 Preview，而不是继续复用打开详情。

## 12.2 `layout.togglePreview`

这里需要统一语义，避免后面继续混乱。

推荐结论：

1. `task.peek` 是“对当前 task row 的局部预览行为”。
2. `layout.togglePreview` 是“全局切换当前任务预览层”的兼容命令入口。
3. 两者最终都可以落到同一个 Preview controller，但命名语义上不要把 Task Preview 再叫成“右侧详情面板”。

建议同时修正文案：

```txt
layoutTogglePreview.title
从：切换任务详情
改为：切换任务预览
```

```txt
layoutTogglePreview.description
从：展开或收起右侧任务详情面板
改为：展开或收起当前任务预览
```

这不是额外重构，而是避免阶段六做完以后命令文案继续误导。

---

## 13. 实施步骤

## 13.1 P1：补齐 Preview 状态与动作链

1. 新增 `useTaskPreviewController.ts`
2. 在任务列表动作链中新增 `onPeekTask`
3. 让 `Space -> taskPeek -> onPeekTask`
4. 保持 `Enter -> onOpenTask`

验收：

1. `Space` 不再打开 Drawer
2. `Enter` 仍然打开 Drawer

## 13.2 P2：渲染 Preview 宿主与卡片

1. 在 `ShellMain` 内增加 Preview 宿主
2. 保证 Preview / Drawer 互斥
3. 渲染标题、meta、备注摘要、更新时间

验收：

1. Preview 打开不改 URL
2. Preview 不挤压主列表布局

## 13.3 P3：补 Links 摘要

1. 在 Preview controller 内异步读取 `listTaskLinks`
2. 展示前 2-3 条摘要
3. 失败时静默降级

验收：

1. Preview 可显示 links 摘要
2. Links 请求失败不影响 Preview 主体

## 13.4 P4：补键盘与关闭语义

1. `Esc` 优先关闭 Preview
2. `↑ / ↓` 切换时 Preview 同步
3. `Enter` 从 Preview 进入 Drawer
4. Drawer 打开时关闭 Preview

验收：

1. 键盘链路完整
2. Preview / Drawer 无双开

## 13.5 P5：补测试

至少新增：

1. `useTaskPreviewController.test.tsx`
2. `TaskPreview.test.tsx`
3. `TaskRowShortcutScope` 新增 `taskPeek` 行为断言
4. `layoutTogglePreview` / `taskPeek` 的命令行为测试

---

## 14. 验收标准

阶段六完成后，至少满足：

1. `Space` 可打开 / 关闭 Preview。
2. `↑ / ↓` 切换任务时 Preview 同步。
3. `Enter` 可从 Preview 进入 Drawer。
4. `Esc` 可关闭 Preview。
5. Preview 不写 URL。
6. Preview 不展示 Activity。
7. Preview 不可编辑。
8. Preview 与 Drawer 互斥。
9. Preview 主体默认不依赖 `loadDetail(taskId)`。
10. Preview 可展示 Links 摘要，且失败时不拖垮整体。

---

## 15. 风险与取舍

## 15.1 最大风险

如果继续复用现有 Drawer 宿主，阶段六会很快退化成：

```txt
Space -> 打开一个更窄的详情
```

这会直接破坏 Preview 的产品边界。

## 15.2 次级风险

`Links 摘要` 如果直接复用现有可编辑 controller，会把阶段六复杂度拉高。

所以这里必须接受一个务实取舍：

1. 阶段六只做摘要读取。
2. 不做 Preview 内 links 操作。

## 15.3 暂不处理的点

1. Cmd/Ctrl + Enter 打开 Page
2. Preview 内快捷打开链接
3. Project Preview
4. 移动端 Preview 策略

这些都可以在阶段六完成后再独立评估，不应该混进本阶段。

---

## 16. 推荐最终实施口径

阶段六请按下面这句口径推进：

> 用独立只读浮层补齐 Task Preview，让 `Space / ↑↓ / Enter / Esc` 形成完整键盘确认链；Preview 只读、不进 URL、不复用 Drawer 宿主，首屏基于 `TaskListItem`，Links 只做轻量摘要。

这就是本阶段最小、正确、长期可维护的方案边界。
