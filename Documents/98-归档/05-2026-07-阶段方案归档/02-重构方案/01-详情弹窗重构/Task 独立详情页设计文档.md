# StoneFlow Task 独立详情页设计文档

## 0. 文档信息

| 项目 | 内容 |
|---|---|
| 文档名称 | StoneFlow Task 独立详情页设计文档 |
| 文档目的 | 明确 Task 独立详情页的定位、信息架构、页面布局、交互规则、Activity 展示、重操作承载与 V1/V2 实现边界 |
| 上游文档 | StoneFlow Task 详情形态与交互设计文档、StoneFlow Task Drawer 产品与 UI 设计文档、StoneFlow Task Detail 技术实现文档 |
| 当前阶段 | Task Drawer 之后的完整详情页设计方案 |
| 设计关键词 | 深度处理、完整上下文、Activity、重操作、长内容、独立路由、Drawer 兜底升级 |

---

## 0.1 阶段 0 对齐说明

本文档保留为 Task 独立详情页的产品与 UI 上游文档，负责定义 Task Page 的完整详情、Activity、重操作和深链能力。

实际落地以《StoneFlow Entity Detail System 重构总方案》为总控文档。后续实现需要遵守以下补充决策：

1. Task Page 是 Entity Detail System 的第一个 Page 实现。
2. Project Page 后续采用同一套 Page 心智模型，但 Project 主内容、Sidebar 字段和项目级重操作留在 `src/features/project/detail/`。
3. Detail Page 的纯布局 primitive 放在 `src/shared/ui/detail/`，不包含 Task / Project 业务语义。
4. Task Page 具体实现放在 `src/features/task/detail/`。
5. Task Page 路由采用 `/tasks/:taskId`，Project Page 后续采用 `/projects/:projectId`。
6. Drawer 打开 Page 前需要 flush 自动保存，并关闭 Drawer query。

---

# 1. 页面定位

## 1.1 核心定位

Task 独立详情页是 StoneFlow 中 Task 的完整详情承载页。

它不是 Task 的日常主入口，而是：

> 当一个任务超过 Drawer 的轻量编辑范围时，用来承载完整上下文、Activity、重操作、长内容和深度处理的独立工作区。

Task Page 的存在不是为了替代 Drawer，而是为了给 Drawer 减负。

Drawer 只做：

```txt
轻量查看 + 快速补充 + 属性编辑
```

Page 才做：

```txt
完整详情 + Activity + 重操作 + 长内容 + 深度处理
```

## 1.2 为什么需要独立页面

StoneFlow 的 Task 大多数是 30 字以内的短任务，但仍然会出现以下情况：

1. 任务需要更长备注；
2. 任务关联了多个文档或链接；
3. 用户需要查看完整 Activity；
4. 任务逐渐膨胀成一个小项目；
5. 任务需要转换为 Project；
6. 用户从全局搜索、历史记录、命令系统中打开某个任务；
7. 用户需要一个稳定 URL / 深链来回到这个任务；
8. 未来需要 Focus Mode 或更完整的处理界面。

因此独立页面是必要的，但不作为默认入口。

## 1.3 页面设计原则

| 原则 | 说明 |
|---|---|
| 不抢 Drawer 主入口 | 日常点击 Row 仍然打开 Drawer |
| 承接重内容 | Activity、重操作、长内容统一放 Page |
| 信息更舒展 | 比 Drawer 有更大空间和更清晰分栏 |
| 保持任务感 | 不要变成 Notion 文档页 |
| 强化上下文 | 标题、备注、Links、Activity、属性都完整可见 |
| 可深链 | 使用独立路由 `/tasks/:taskId` |
| 可扩展 | 为 Focus Mode、Linked Resources、Task History 预留空间 |

---

# 2. 与 Drawer 的关系

## 2.1 职责边界

| 内容 / 操作 | Drawer | Page |
|---|---:|---:|
| 标题 | ✅ | ✅ |
| 备注 | ✅ 轻量 | ✅ 更舒展 |
| 状态 | ✅ | ✅ |
| 优先级 | ✅ | ✅ |
| 日期 | ✅ | ✅ |
| 标签 | ✅ | ✅ |
| 项目 | ✅ | ✅ |
| Links | ✅ 轻量列表 | ✅ 完整管理 |
| Activity | ❌ | ✅ |
| 归档 | ✅ 常驻 | ✅ |
| 移入回收站 | More | ✅ |
| Duplicate | More / 可选 | ✅ |
| Convert Task to Project | More / 可选 | ✅ |
| Create Project from Task | More / 可选 | ✅ |
| 长内容编辑 | 一般 | ✅ |
| Focus Mode | ❌ | 未来 |
| Task History / Diff | ❌ | 未来 |

## 2.2 打开关系

```txt
Task Row 单击       → Drawer
Task Row 右键菜单   → Open in Page
Drawer Open Page   → Page
全局搜索 Enter      → 可打开 Drawer 或 Page，按场景决定
全局搜索 Cmd+Enter  → Page
命令系统 Open Task  → Page 或 Drawer，按命令语义决定
```

## 2.3 Page 不是 Drawer 放大版

Page 不能只是把 Drawer 的内容放大。

Drawer 的结构是：

```txt
Header + Body + Footer
```

Page 的结构应该是：

```txt
Page Header + Main Content + Sidebar
```

Page 要体现完整详情页的价值：

- 更清晰的主内容区；
- 更完整的 Activity；
- 更完整的 Links 管理；
- 更合理的重操作入口；
- 更适合长备注和深度处理。

---

# 3. 页面总体布局

## 3.1 推荐布局：主内容 + 右侧属性栏

Task Page 采用两栏布局：

```txt
┌──────────────────────────────────────────────────────────────────────────────┐
│ Page Header                                                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Main Content                                           Right Sidebar        │
│  ┌──────────────────────────────────────────────┐      ┌──────────────────┐ │
│  │ Title                                        │      │ Properties       │ │
│  │ Description / Notes                          │      │ Status           │ │
│  │ Links / Resources                            │      │ Priority         │ │
│  │ Activity                                     │      │ Dates            │ │
│  │                                              │      │ Labels           │ │
│  │                                              │      │ Project          │ │
│  └──────────────────────────────────────────────┘      │ Meta             │ │
│                                                        └──────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 ASCII 线框

```txt
┌──────────────────────────────────────────────────────────────────────────────┐
│ Tasks / StoneFlow / Task title                                      [⋯] [×] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────┐  ┌───────────────┐ │
│  │ [ Task title input ]                                │  │ Properties    │ │
│  │                                                     │  │               │ │
│  │ [ Description / Notes ]                             │  │ [Todo      ▾] │ │
│  │                                                     │  │ [High      ▾] │ │
│  │                                                     │  │ [Due date  ▾] │ │
│  │ Links                                               │  │ [Plan date ▾] │ │
│  │ [icon] 技术方案文档                    [Open] [⋯]    │  │ [Reminder  ▾] │ │
│  │ [icon] Figma 设计稿                     [Open] [⋯]    │  │               │ │
│  │ + Add link                                          │  │ Labels        │ │
│  │                                                     │  │ [Bug] [UI] [+]│ │
│  │ Activity                                            │  │               │ │
│  │ ┌───────────────────────────────────────────────┐   │  │ Project       │ │
│  │ │ created task · 2d ago                         │   │  │ [StoneFlow ▾] │ │
│  │ │ changed priority from Medium to High · 1d ago │   │  │               │ │
│  │ │ added link 技术方案文档 · 2h ago               │   │  │ Meta          │ │
│  │ └───────────────────────────────────────────────┘   │  │ Created       │ │
│  │                                                     │  │ Updated       │ │
│  └─────────────────────────────────────────────────────┘  └───────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 3.3 区域职责

| 区域 | 职责 |
|---|---|
| Page Header | 面包屑、任务标识、页面级操作、返回 / 关闭 |
| Main Content | 标题、备注、Links、Activity，承载任务核心内容 |
| Right Sidebar | 状态、优先级、日期、标签、项目、元信息 |

## 3.4 布局取舍

### 为什么 Main + Sidebar

这种结构最适合 Task Page：

- 主内容区足够宽，适合备注和 Activity；
- 属性栏固定在右侧，符合 Linear 类详情页的使用习惯；
- 用户可以一边看 Activity，一边修改属性；
- 比单栏页面更高效；
- 比 Drawer 更舒展，但仍然克制。

### 为什么不做三栏

不建议 Page 做三栏。

三栏会让信息密度过高，且 StoneFlow 是个人 TODO，不需要像大型协作工具那样复杂。

### 为什么不做纯文档页

Task Page 不是文档编辑器。

它需要保持任务管理属性：

- 状态；
- 优先级；
- 日期；
- 项目；
- 标签；
- Activity；
- 归档 / 回收站。

---

# 4. Page Header 设计

## 4.1 Header 定位

Page Header 负责提供当前页面位置、页面级操作和导航出口。

它不承载复杂编辑，避免和 Main Content 抢主视觉。

## 4.2 Header 线框

```txt
┌──────────────────────────────────────────────────────────────────────────────┐
│ Tasks / StoneFlow / Task title                                      [⋯] [×] │
└──────────────────────────────────────────────────────────────────────────────┘
```

也可以是：

```txt
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Back   Tasks / StoneFlow                                      [More] [Close]│
└──────────────────────────────────────────────────────────────────────────────┘
```

## 4.3 Header 元素

| 元素 | 说明 |
|---|---|
| Back | 返回上一个列表或上一页 |
| Breadcrumb | 当前任务所在路径 |
| More | 页面级更多操作 |
| Close | 如果 Page 作为覆盖层，则关闭；如果是路由页面，则返回 |

## 4.4 Breadcrumb 规则

推荐结构：

```txt
Tasks / Project Name / Task title
```

或者：

```txt
Space / Project / Task title
```

如果任务在 Inbox：

```txt
Tasks / Inbox / Task title
```

如果任务是独立事项：

```txt
Tasks / 独立事项 / Task title
```

## 4.5 Header More Menu

Page Header More 是完整重操作入口。

建议包含：

```txt
More
├─ Copy task link
├─ Duplicate
├─ Convert Task to Project
├─ Create Project from Task
├─ Archive / Restore
├─ Move to Trash
└─ Delete permanently    // 仅 Trash 内出现
```

## 4.6 Back / Close 行为

因为 Page 是独立路由：

```txt
/tasks/:taskId
```

Back 的优先级：

1. 如果有可返回的历史栈，返回上一页；
2. 如果没有历史栈，返回 `/tasks`；
3. 如果从某个 Project 进入，未来可返回该 Project 视图。

---

# 5. Main Content 设计

## 5.1 Main Content 结构

```txt
Task Title
Description / Notes
Links / Resources
Activity Timeline
```

推荐顺序：

1. 标题；
2. 备注；
3. Links；
4. Activity。

原因：

- 标题和备注是任务内容本体；
- Links 是执行任务需要用到的资料；
- Activity 是历史上下文，放在下方更合理。

## 5.2 Title 区域

```txt
[ Task title input ]
```

### 视觉规则

| 项 | 建议 |
|---|---|
| 输入方式 | 无框输入 |
| 字号 | 比 Drawer 更大 |
| 字重 | semibold |
| 宽度 | 占满 Main Content |
| Placeholder | Untitled task |
| 保存 | debounce 自动保存 |

### 与 Drawer 的差异

| 项 | Drawer | Page |
|---|---|---|
| 字号 | 中等偏大 | 更大 |
| 所在位置 | Header 固定区 | Main Content 顶部 |
| 视觉角色 | 当前任务锚点 | 页面主标题 |

## 5.3 Description / Notes 区域

```txt
[ Description / Notes ]
```

### 定位

Page 的 Notes 区域比 Drawer 更适合长内容，但仍然不是完整文档系统。

可以承载：

- 多段备注；
- 执行思路；
- 简短计划；
- 任务背景；
- 临时整理。

不建议 V1 做成 Notion 式 Block Editor。

### V1 建议

V1 仍使用轻量 textarea 或简易 Markdown 输入。

优先级：

```txt
可靠输入 > 自动保存 > 轻量 Markdown > 富文本体验
```

## 5.4 Links / Resources 区域

Page 中的 Links 比 Drawer 更完整。

```txt
Links
[icon] 技术方案文档                    [Open] [⋯]
[icon] Figma 设计稿                     [Open] [⋯]
[icon] GitHub PR                        [Open] [⋯]
+ Add link
```

### 与 Drawer Links 的差异

| 项 | Drawer | Page |
|---|---|---|
| 展示 | 轻量列表 | 更完整列表 |
| URL | 可不展示 | 可以显示 hostname / path |
| 操作 | Open / More | Open / Copy / Edit / Remove / Sort 可选 |
| 类型 | URL | 未来可扩展 Linked Resources |
| 空间 | 紧凑 | 更舒展 |

### Page Link Row 线框

```txt
┌─────────────────────────────────────────────────────┐
│ [icon] 技术方案文档                         [Open] [⋯] │
│        docs.example.com/stoneflow/task-drawer       │
└─────────────────────────────────────────────────────┘
```

V1 可不展示第二行 URL，V2 可加。

## 5.5 Activity 区域

Activity 是 Page 的核心差异化内容。

```txt
Activity
┌─────────────────────────────────────────────────────┐
│ Today                                               │
│ 10:23  changed priority from Medium to High         │
│ 10:10  added link 技术方案文档                       │
│                                                     │
│ Yesterday                                           │
│ 18:42  updated description                          │
│ 18:20  created task                                 │
└─────────────────────────────────────────────────────┘
```

Activity 不在 Drawer 中展示，只在 Page 中完整展示。

---

# 6. Right Sidebar 设计

## 6.1 Sidebar 定位

Right Sidebar 承载任务的结构化属性。

它应该稳定、清晰、可快速编辑，但不应成为复杂表单。

## 6.2 Sidebar 结构

```txt
Properties
[Status]
[Priority]
[Due date]
[Plan date]
[Reminder]

Labels
[Bug] [UI] [+]

Project
[StoneFlow]

Meta
Created Apr 20
Updated 2 min ago
```

## 6.3 Properties 区域

Page Sidebar 中的属性可以比 Drawer 更纵向排列。

Drawer 中：

```txt
[Status] [Priority] [Due] [Plan] [Reminder]
```

Page Sidebar 中：

```txt
Status      [Todo ▾]
Priority    [High ▾]
Due         [Apr 26 ▾]
Plan        [Today ▾]
Reminder    [Tomorrow 9:00 ▾]
```

### 为什么 Page 用纵向属性

- Sidebar 宽度有限；
- 纵向排列更清楚；
- 方便展示字段名；
- 更像完整详情页，不像快捷编辑区。

## 6.4 Labels 区域

```txt
Labels
[Bug] [UI] [+]
```

规则与 Drawer 一致：

- chip 展示；
- 多标签折叠；
- 点击 Add 打开标签选择器。

## 6.5 Project 区域

```txt
Project
[StoneFlow ▾]
```

Page 中 Project 可以展示更多上下文：

```txt
Project
[StoneFlow ▾]
Space: Personal
```

V1 可以只显示 Project。

## 6.6 Meta 区域

```txt
Meta
Created Apr 20, 2026
Updated 2 min ago
Archived —
```

Meta 是只读信息，不抢主视觉。

## 6.7 Sidebar Sticky 规则

右侧 Sidebar 可以 sticky。

```txt
Main Content 滚动时
Right Sidebar 保持在顶部可见
```

好处：

- 用户滚动 Activity 时仍能看到属性；
- 随时可以修改状态、优先级、日期。

---

# 7. Activity Timeline 设计

## 7.1 Activity 定位

Activity 是任务的操作历史，用来回答：

- 这个任务什么时候创建？
- 状态什么时候变了？
- 优先级为什么现在是这样？
- 哪些链接被加过？
- 任务归属是否被移动过？
- 备注是否被更新过？

Activity 是 Page 的核心内容之一，不进入 Drawer。

## 7.2 Activity 展示内容

| 行为 | 展示文案示例 |
|---|---|
| 创建任务 | created task |
| 修改标题 | changed title |
| 修改备注 | updated description |
| 修改状态 | changed status from Todo to Done |
| 修改优先级 | changed priority from Medium to High |
| 修改截止日期 | changed due date to Apr 26 |
| 修改计划时间 | changed plan date to Today |
| 修改提醒 | changed reminder to Tomorrow 9:00 |
| 添加标签 | added label UI |
| 移除标签 | removed label Bug |
| 修改项目 | moved task from Inbox to StoneFlow |
| 添加 Link | added link 技术方案文档 |
| 编辑 Link | updated link Figma 设计稿 |
| 删除 Link | removed link GitHub PR |
| 归档 | archived task |
| 移入回收站 | moved task to trash |

## 7.3 Activity 分组

推荐按日期分组：

```txt
Today
- changed priority from Medium to High · 10:23
- added link 技术方案文档 · 10:10

Yesterday
- updated description · 18:42
- created task · 18:20
```

## 7.4 Activity 视觉结构

```txt
Activity

Today
│
├─ changed priority from Medium to High
│  10:23
│
├─ added link 技术方案文档
│  10:10
│
Yesterday
│
└─ created task
   18:20
```

可以用轻量 timeline，也可以用简单列表。

V1 建议使用简单列表，避免视觉复杂。

## 7.5 Activity 不做什么

V1 不做：

- 评论；
- Activity 回复；
- 历史 Diff 展开；
- 字段级恢复；
- 复杂筛选；
- 多人协作头像。

这是个人 TODO，Activity 是历史记录，不是协作讨论区。

## 7.6 Activity 合并规则

为了避免 Activity 太碎，后续可以做合并。

建议规则：

```txt
同一 task、同一字段、短时间内连续修改
→ 合并为一条 Activity
```

例如备注：

```txt
updated description
```

不要记录每一次输入。

---

# 8. 重操作设计

## 8.1 Page 承载的重操作

Page 是重操作的主要承载位置。

包括：

```txt
Copy task link
Duplicate
Convert Task to Project
Create Project from Task
Archive / Restore
Move to Trash
Delete permanently
```

## 8.2 操作入口

推荐入口：

```txt
Page Header More
Right Sidebar bottom actions，可选
Command system
```

V1 推荐只放 Page Header More。

## 8.3 More Menu 线框

```txt
More
├─ Copy task link
├─ Duplicate
├─ Convert Task to Project
├─ Create Project from Task
├─ Archive
├─ Move to Trash
└─ Delete permanently
```

## 8.4 危险操作规则

| 操作 | 规则 |
|---|---|
| Archive | 可直接执行 |
| Move to Trash | 建议弱确认或依赖回退机制 |
| Delete permanently | 必须确认，仅 Trash 场景出现 |

操作后的回退策略暂按独立方案处理，本页只预留入口。

## 8.5 Convert Task to Project

这是 Page 很适合承载的操作。

### 使用场景

当一个 Task 从简单事项变成复杂工作时：

```txt
重构 Task Drawer
```

可能需要升级为：

```txt
Project: Task Detail 重构
```

### 初步行为

```txt
Convert Task to Project
→ 创建新 Project
→ 当前 Task 可归档 / 保留 / 转为 Project 描述，具体规则后续定
```

V1 可只保留入口或暂缓完整实现。

---

# 9. Links / Linked Resources 设计

## 9.1 V1：Links

V1 只支持 URL Links。

字段：

```txt
title
url
type = url
```

## 9.2 Page Links 操作

| 操作 | 说明 |
|---|---|
| Add | 打开 Add Link Popover |
| Open | 打开链接 |
| Copy | 复制 URL |
| Edit | 编辑标题和 URL |
| Remove | 删除 Link |

## 9.3 Page 是否仍使用 Popover

Page 可以继续使用和 Drawer 一样的 Link Popover。

原因：

- Link 新建 / 编辑仍然是轻量动作；
- 不需要大弹窗；
- 保持 Drawer 和 Page 一致。

## 9.4 V2：Linked Resources

未来可升级为 Linked Resources：

| 类型 | 示例 |
|---|---|
| URL | 文档、网页、Figma |
| File | 本地文件 |
| Project | 关联项目 |
| Task | 关联任务 |
| Note | StoneCache 笔记 |
| Command | 打开某个外部工具 |

Page 是 Linked Resources 的主要展示与管理入口。

Drawer 只保留轻量摘要。

---

# 10. 路由与导航规则

## 10.1 路由

Task Page 使用独立路由：

```txt
/tasks/:taskId
```

## 10.2 从 Drawer 打开 Page

```txt
Drawer Header Open Page
→ navigate('/tasks/:taskId')
```

打开前建议 flush 当前 Drawer 的 debounce 保存。

```txt
flush autosave
→ navigate page
```

## 10.3 从 Page 返回

返回逻辑：

```txt
如果有 history：返回上一页
如果没有 history：返回 /tasks
```

后续可以增强：

```txt
如果从 project 页面打开：返回 /projects/:projectId
如果从 view 打开：返回原 view
```

## 10.4 Page 与 Drawer 的互斥

进入 Page 后，Drawer 应关闭。

```txt
/tasks?task=xxx
→ Open Page
→ /tasks/xxx
→ Drawer closed
```

不要在独立 Page 内再打开同一个任务的 Drawer。

## 10.5 Page 刷新

Page 必须支持刷新恢复。

```txt
刷新 /tasks/:taskId
→ 根据 taskId 查询任务
→ 存在：展示 Page
→ 不存在：展示 Not Found 或返回 /tasks
```

---

# 11. 键盘交互

## 11.1 Page 基础快捷键

| 快捷键 | 行为 |
|---|---|
| Esc | 返回上一页 / 关闭 Page，具体按页面容器决定 |
| Cmd/Ctrl + [ | 返回 |
| Cmd/Ctrl + ] | 前进 |
| Tab | 在可聚焦元素间移动 |
| Cmd/Ctrl + Enter | 可进入 Focus Mode，未来 |

## 11.2 输入态规则

如果焦点在 title / note / popover input 内：

- Esc 优先处理输入态或 popover；
- Enter 按输入框规则；
- 不触发全局任务快捷键。

## 11.3 Page 不需要 Space Preview

在 Task Page 内，Space Preview 没有必要。

Preview 是列表场景的快速确认工具。

Page 已经是完整详情，不再需要预览当前任务。

---

# 12. 保存与数据流

## 12.1 保存规则

Page 与 Drawer 使用相同的保存原则：

| 内容 | 保存方式 |
|---|---|
| 标题 | debounce 自动保存 |
| 备注 | debounce 自动保存 |
| 属性 | 立即保存 |
| 标签 | 立即保存 |
| 项目 | 立即保存 |
| Links | 操作后立即保存 |
| 重操作 | 立即执行 |

## 12.2 保存状态展示

Page 需要展示保存状态，但可以比 Drawer 更弱。

位置建议：

- Header 右侧；
- Sidebar Meta 区域；
- 标题下方弱提示。

推荐：

```txt
Updated 2 min ago · Saved
```

放在 Sidebar Meta 中即可。

## 12.3 Activity 写入

Page 上所有操作也走 command/service，统一写 Activity。

不要让 Page UI 组件直接写 Activity。

```txt
Component
→ command
→ repository update
→ activity service write
```

## 12.4 Page 查询数据

Page 需要查询：

```txt
Task
Project
Labels
Links
Activity
```

与 Drawer 不同的是：

```txt
Drawer 不查 Activity
Page 必须查 Activity
```

---

# 13. 状态与异常处理

## 13.1 Task 不存在

如果 taskId 不存在：

```txt
Task not found
[Back to Tasks]
```

或自动返回 `/tasks` 并提示。

推荐 V1 使用 Not Found 状态，避免突然跳走。

## 13.2 Task 已归档

如果任务已归档：

- Page 仍可打开；
- Header / Sidebar 显示 Archived 状态；
- Archive 操作变为 Restore。

```txt
Archived task
[Restore]
```

## 13.3 Task 在回收站

如果任务在 Trash：

- Page 仍可打开；
- 显示 Trash 状态；
- 操作变为 Restore / Delete permanently。

```txt
This task is in Trash
[Restore] [Delete permanently]
```

## 13.4 保存失败

保存失败显示：

```txt
Failed to save · Retry
```

位置可在 Sidebar Meta 或 Header 弱提示。

## 13.5 Activity 为空

理论上任务至少有 created task。

如果没有 Activity：

```txt
Activity
No activity yet
```

---

# 14. Responsive / 宽度适配

StoneFlow 是桌面端应用，优先面向较宽窗口。

## 14.1 正常宽度

```txt
Main Content + Right Sidebar
```

## 14.2 中等宽度

Sidebar 可保持，但缩小宽度。

```txt
Main Content flexible
Sidebar fixed 280px 左右
```

## 14.3 较窄宽度

如果窗口过窄，可以：

### 方案 A：Sidebar 下移

```txt
Title
Notes
Properties
Links
Activity
```

优点：实现简单。  
缺点：属性不再固定。

### 方案 B：Sidebar 变成右侧 Drawer

优点：保持主内容宽度。  
缺点：复杂，不适合 V1。

### 推荐

V1 使用方案 A：窄宽度时 Sidebar 下移。

---

# 15. 视觉风格

## 15.1 整体气质

Task Page 应该比 Drawer 更舒展，但仍保持 StoneFlow 的克制感。

关键词：

- 清晰；
- 低噪音；
- 轻边框；
- 信息层级明确；
- 不做花哨卡片；
- 不做重装饰。

## 15.2 页面背景

Page 应该嵌入 StoneFlow 的 Main Card 体系中，不要另起一个视觉风格。

推荐：

```txt
Shell 保持不变
Main Card 内展示 Task Page
```

## 15.3 Main Content

- 标题无框；
- Notes 无框或弱边框；
- Links 使用轻量列表；
- Activity 使用简单 timeline / list；
- Section title 弱化。

## 15.4 Sidebar

- 右侧属性栏可以使用轻微分隔线；
- 不使用厚重卡片；
- 属性项用 label + button；
- Meta 文案弱化。

## 15.5 Activity

Activity 视觉要轻。

不建议：

- 大头像；
- 彩色块；
- 类社交评论区；
- 复杂气泡。

推荐：

- 小图标；
- 时间；
- 简短文案；
- 按日期分组；
- 弱分割线。

---

# 16. 组件拆分建议

## 16.1 Page 组件树

```txt
TaskPage
├─ TaskPageHeader
│  ├─ TaskPageBreadcrumb
│  ├─ TaskPageMoreMenu
│  └─ TaskPageCloseButton
│
├─ TaskPageLayout
│  ├─ TaskPageMain
│  │  ├─ TaskTitleInput
│  │  ├─ TaskNoteEditor
│  │  ├─ TaskPageLinksSection
│  │  │  ├─ TaskLinkRow
│  │  │  ├─ TaskLinkPopover
│  │  │  └─ TaskLinkMoreMenu
│  │  └─ TaskActivityTimeline
│  │
│  └─ TaskPageSidebar
│     ├─ TaskPagePropertiesSection
│     ├─ TaskLabelsSection
│     ├─ TaskProjectSection
│     └─ TaskMetaSection
```

## 16.2 可复用组件

可以与 Drawer 复用：

```txt
TaskTitleInput
TaskNoteEditor
TaskLabelsSection
TaskProjectSection
TaskLinkRow
TaskLinkPopover
TaskLinkMoreMenu
```

可复用但可能需要 layout variant：

```txt
TaskPropertiesSection
TaskLinksSection
```

Page 专属：

```txt
TaskPageHeader
TaskPageLayout
TaskPageMain
TaskPageSidebar
TaskActivityTimeline
TaskMetaSection
TaskPageMoreMenu
```

## 16.3 variant 策略

字段组件可支持 variant：

```ts
type TaskDetailVariant = 'drawer' | 'page'
```

但不要过度配置化。

推荐：

- 纯字段组件复用；
- 布局组件分开；
- Page 和 Drawer 在 section 层可以有不同排列。

---

# 17. 技术实现边界

## 17.1 V1 必做

| 模块 | 内容 |
|---|---|
| 路由 | `/tasks/:taskId` |
| Page Header | Breadcrumb、More、Back / Close |
| Main Content | Title、Notes、Links、Activity 基础展示 |
| Sidebar | Properties、Labels、Project、Meta |
| Links | 复用 Add / Edit Popover |
| Activity | 基础列表展示 |
| 操作 | Copy link、Archive、Move to Trash 基础入口 |
| 保存 | 与 Drawer 一致的自动保存 |
| 异常 | Not Found、Archived、Trash 状态 |

## 17.2 V1 可简化

| 项 | 简化方式 |
|---|---|
| Activity | 简单列表，不做复杂 timeline |
| Links | 不显示 URL 第二行，只显示 title |
| Sidebar | 固定宽度，不做复杂 resize |
| Focus Mode | 不做 |
| Convert Task to Project | 可以只保留入口或暂缓 |
| Delete permanently | 只在 Trash 中处理 |

## 17.3 V2 再做

| 功能 | 说明 |
|---|---|
| 完整 Activity Timeline | 按日期分组、图标、筛选 |
| Focus Mode | 专注处理当前 Task |
| Linked Resources | URL / File / Task / Project / Note |
| Convert Task to Project 完整流程 | 任务升级项目 |
| Activity 合并 / 筛选 | 降低噪音 |
| Task History / Diff | 字段历史对比 |
| Sidebar sticky / responsive polish | 更完整响应式 |

---

# 18. 开发顺序建议

## 18.1 M1：Page 路由与基础骨架

目标：可以打开独立页面。

任务：

1. 添加 `/tasks/:taskId` 路由；
2. 从 Drawer Open Page 跳转；
3. 从 Row 右键菜单跳转；
4. 实现 TaskPage 基础骨架；
5. 处理 task not found。

验收：

```txt
可以通过 /tasks/:taskId 打开任务详情页
刷新后仍然可用
```

## 18.2 M2：Main Content

任务：

1. 接入 TaskTitleInput；
2. 接入 TaskNoteEditor；
3. 接入 TaskPageLinksSection；
4. 复用 Link Popover；
5. 自动保存。

验收：

```txt
标题、备注、Links 可以在 Page 中正常查看和编辑
```

## 18.3 M3：Sidebar

任务：

1. 实现 TaskPageSidebar；
2. 实现 Properties 纵向布局；
3. 接入 Labels；
4. 接入 Project；
5. 接入 Meta。

验收：

```txt
Page 右侧可以查看并修改任务属性
```

## 18.4 M4：Activity

任务：

1. 查询 Task Activity；
2. 实现基础 Activity 列表；
3. 支持按时间倒序；
4. 支持基础空状态；
5. 确保 Drawer 操作写入的 Activity 能在 Page 看到。

验收：

```txt
Page 可以展示当前任务完整 Activity
```

## 18.5 M5：重操作与状态

任务：

1. Page More Menu；
2. Copy task link；
3. Duplicate；
4. Archive / Restore；
5. Move to Trash；
6. Trash 中 Delete permanently；
7. Archived / Trash 状态展示。

验收：

```txt
Page 可以承载完整任务操作入口
```

## 18.6 M6：Polish

任务：

1. Breadcrumb 细化；
2. 保存状态展示；
3. Loading / Error；
4. responsive；
5. Activity 视觉优化；
6. Links 视觉优化；
7. 键盘返回体验。

---

# 19. 暂缓项

| 暂缓项 | 原因 |
|---|---|
| 评论区 | 个人 TODO 当前不需要 |
| 复杂 Markdown / Block Editor | 容易把 Task Page 做成文档系统 |
| 完整附件系统 | 涉及文件权限、迁移、路径失效 |
| Focus Mode | 需要 Page 基础稳定后再做 |
| Related Tasks | 依赖任务关联模型 |
| Activity Diff | 依赖更完整历史记录 |
| Activity 筛选 | V1 Activity 数量不大 |
| 多人协作信息 | 当前不是团队协作工具 |

---

# 20. 决策记录

| 决策 | 结论 |
|---|---|
| Page 是否需要 | 需要 |
| Page 是否是默认入口 | 不是 |
| 默认点击 Row | 打开 Drawer |
| Page 打开入口 | Drawer Open Page、Row 右键、搜索 / 命令 |
| Page 路由 | `/tasks/:taskId` |
| Page 布局 | Main Content + Right Sidebar |
| Activity 展示位置 | 只在 Page |
| Drawer 是否展示 Activity | 不展示 |
| Page 是否做评论 | 不做 |
| Links 是否复用 Popover | 复用 |
| Page 是否做重操作 | 是 |
| Page 是否做 Focus Mode | 未来 |
| Page 是否强复用 Drawer 布局 | 不强复用 |
| Sidebar 是否 sticky | 推荐，可 V2 polish |

---

# 21. 总结

Task 独立详情页是 StoneFlow Task Detail 体系中的完整详情层。

它与 Drawer 的关系是：

```txt
Drawer 负责日常轻量编辑
Page 负责完整详情和深度处理
```

最终页面结构为：

```txt
Page Header
Main Content: Title / Notes / Links / Activity
Right Sidebar: Properties / Labels / Project / Meta
```

Page 的核心价值是：

- 承载 Activity；
- 承载重操作；
- 支持长内容；
- 支持独立路由和刷新；
- 为 Focus Mode、Linked Resources、Task History 等未来能力预留空间。

V1 不需要把 Page 做得很重，但必须打通基础结构：

1. 可以通过 `/tasks/:taskId` 打开；
2. 可以从 Drawer / Row 进入；
3. 可以展示标题、备注、Links、属性、Activity；
4. 可以执行基础重操作；
5. 可以和 Drawer 共用字段编辑与自动保存机制。

这样 StoneFlow 的 Task Detail 四层模型就完整闭环：

```txt
Row      → 快速管理
Preview  → 快速确认
Drawer   → 轻量编辑
Page     → 完整详情
```
