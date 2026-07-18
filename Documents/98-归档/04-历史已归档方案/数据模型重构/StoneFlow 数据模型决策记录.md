> 用途：记录 StoneFlow V1 阶段围绕产品结构、Sidebar、Inbox、Space / Project / Task / View / Activity / Settings 等核心模型的讨论结论、理由和备忘。
> 目标：后续继续讨论 UI、交互、开发实现、迁移、扩展功能时，避免重复争论已经定下来的基础问题。

---

## 1. 总体方向决策

### 1.1 StoneFlow 的产品定位

**决策：**

StoneFlow V1 定位为 **个人 Todo 桌面端应用**，不是团队项目管理工具，也不是 Notion 式结构化知识库。

**理由：**

1. 个人 Todo 的核心价值是快速捕获、快速整理、快速进入执行状态。
2. 如果模型过重，用户会开始"管理结构"，而不是"完成事情"。
3. Linear 的结构感、速度感和视图机制值得借鉴，但不能照搬团队协作模型。

**备忘：**

StoneFlow 更像：

```txt
Linear 的克制结构感 + Things / Todoist 的个人任务体验 + Raycast 的速度感
```

---

### 1.2 核心模型路线

**决策：**

V1 只保留三层核心结构：

```txt
Space
  └── Project
        └── Task
```

明确不做：

```txt
❌ 子 Space
❌ 子 Project
❌ 子 Task
```

**理由：**

1. 树结构看起来有秩序，但长期会带来维护成本。
2. 子项目、子任务容易演化成文件系统式管理。
3. 个人效率工具应该用 View / Filter / Scope 组织复杂性，而不是用层级嵌套。
4. 扁平模型更利于快速创建、搜索、筛选、排序和后续同步。

**备忘：**

这是一个非常关键的底层约束。后续不要轻易重新打开"要不要子项目 / 子任务"的讨论，除非出现非常强的真实场景证明扁平模型无法覆盖。

---

### 1.3 借鉴 Linear 的边界

**决策：**

StoneFlow 借鉴 Linear 的：

```txt
✅ 清晰的 Issue / Task 流
✅ Priority 机制
✅ View / Filter 思路
✅ Activity 时间线
✅ 快速导航和克制 UI
✅ Archive / Trash / Completed 等生命周期概念
```

不照搬 Linear 的：

```txt
❌ Team / Assignee
❌ Cycle
❌ Roadmap / Initiative
❌ 自定义团队工作流
❌ 复杂 Issue Relations
❌ 过重的协作字段
```

**理由：**

1. Linear 是团队工程管理工具。
2. StoneFlow 是个人 Todo，不需要团队角色、协作分配、周期规划等团队机制。
3. 借鉴的重点是"流动性"和"结构感"，不是完整复制 Linear 的产品模型。

---

## 2. Space 决策记录

### 2.1 Space 的定义

**决策：**

Space 是 StoneFlow 的 **顶级上下文 / 工作域 / 生活域**。

例如：

```txt
个人
与光
StoneFlow
学习
生活
```

**理由：**

1. Space 数量少，但语义很重。
2. Space 用来切换大的工作 / 生活上下文。
3. 对用户来说，Space 是当前关注范围，而不是普通文件夹。

---

### 2.2 与光这类长期上下文应提升为 Space

**决策：**

像"与光"这种长期存在、内部有多个项目的上下文，应该作为 Space，而不是 Project。

**理由：**

原来可能会写成：

```txt
工作 Space
  └── 与光 Project
        └── 项目 1 Project
              └── Task
```

这种结构会逼出子项目，导致层级膨胀。

改为：

```txt
与光 Space
  └── 项目 1 Project
        └── Task
```

这样刚好保持：

```txt
Space / Project / Task
```

**备忘：**

判断一个对象是否应该做成 Space，可以看它是否满足：

| 条件 | 说明 |
|---|---|
| 长期存在 | 不是一次性事项 |
| 有多个 Project | 内部需要多个项目承载 |
| 有独立上下文 | 切进去之后能形成独立工作区 |
| 高频切换 | 用户经常需要在它和其他 Space 间切换 |

---

### 2.3 Space Icon / Color

**决策：**

Space 需要 `iconKey` 和 `colorKey`。

**理由：**

1. Space 会出现在顶部 Space Switcher 中。
2. icon / color 是 Space 的识别信息，不只是装饰。
3. 未来允许新建 Space，就应该允许自定义 icon / color。
4. 当前写死的配置可以迁移到数据库。

**备忘：**

建议存语义 key，不直接存 CSS：

```txt
iconKey = 'briefcase'
colorKey = 'blue'
```

---

### 2.4 Space 归档与删除

**决策：**

Space 支持归档和删除。

删除 Space 时：

```txt
同步删除该 Space 下所有 Project / Task
```

归档 Space 时：

```txt
同步归档该 Space 下所有 Project / Task
```

**理由：**

1. Space 是顶级容器，删除 / 归档都应该带走下面的数据，否则会出现孤儿数据。
2. 用户对删除 Space 的直觉是"这个上下文整体不要了"。
3. 通过软删除和软归档保留恢复可能。

**备忘：**

删除和归档都不是物理删除，而是写入：

```txt
deletedAt
archivedAt
```

---

### 2.5 Space 恢复

**决策：**

V1 恢复 Space 时，默认只恢复 Space 本身，不自动恢复 Project / Task。

**理由：**

1. 自动恢复所有子内容可能带回用户不想要的历史数据。
2. 只恢复父级更安全。
3. V1 可以先保守，未来再做"恢复 Space 及其内容"。

**备忘：**

为了未来支持批量恢复，Project / Task 需要记录：

```txt
archivedByType / archivedById
deletedByType / deletedById
```

---

## 3. Project 决策记录

### 3.1 Project 的定义

**决策：**

Project 是 Space 下的一层目标容器，不嵌套。

例如：

```txt
与光 / 官网重构
StoneFlow / V1 收官
个人 / 健身计划
```

**理由：**

1. Project 承担任务归属。
2. Project 不承担无限层级组织。
3. 如果 Project 能嵌套，StoneFlow 会变成文件夹系统。

---

### 3.2 不做子 Project

**决策：**

V1 不允许子项目，不保留 `parentId`。

**理由：**

1. 子项目会快速变成多层树。
2. 多层树会让 Sidebar、拖拽、排序、查询和心智全部复杂化。
3. 个人 Todo 应该用 Space 提升长期上下文，用 View / Filter 管理复杂度。

**备忘：**

后续如果再次出现"某公司 / 某客户 / 某长期方向下面有多个项目"的情况，优先考虑把它提升为 Space，而不是加子项目。

---

### 3.3 Project Description

**决策：**

Project 保留 `description`。

**理由：**

1. Project 有时需要一句上下文说明。
2. description 能帮助用户回忆项目目标。
3. 成本低，长期有用。

**备忘：**

Project description 是轻量说明，不是文档页，不要把 Project 变成 Notion 页面。

---

### 3.4 Project dueAt

**决策：**

Project 使用 `dueAt`，不使用 `targetDate`。

**理由：**

1. `dueAt` 更偏 Todo / 执行语义。
2. `targetDate` 更像目标管理 / OKR。
3. StoneFlow 是 Todo 工具，`dueAt` 更直接。

**备忘：**

Project `dueAt` 是项目级截止时间，不等于 Task `dueAt`。

---

### 3.5 Project completedAt 与 archivedAt

**决策：**

Project 同时保留 `completedAt` 和 `archivedAt`。

**理由：**

它们表达的是不同事情：

| 字段 | 含义 | 是否影响可见性 |
|---|---|---:|
| `completedAt` | 项目目标已经完成 | 不一定隐藏 |
| `archivedAt` | 项目从日常工作区收起 | 默认隐藏 |
| `deletedAt` | 项目进入回收站 | 隐藏 |

**讨论过的场景：**

1. 完成但不归档：项目做完了，但还想留在 Projects 页面里复盘。
2. 归档但未完成：项目暂时不做了，但不代表完成。
3. 完成并归档：项目完成了，也不想再出现在日常区。

**备忘：**

Project Completion 只有在 Project Overview 页面中被明确展示才有意义。所以需要 Project Overview 的 Completed Tab。

---

### 3.6 Project Status 字段

**决策：**

Project 不加单独的 `status` 字段。

**理由：**

1. `status` 容易和 `completedAt` / `archivedAt` / `deletedAt` 冲突。
2. 状态可以计算。
3. 少一个字段就少一种脏数据可能。

**状态计算：**

```ts
if (deletedAt) return 'deleted'
if (archivedAt && completedAt) return 'completed_archived'
if (archivedAt) return 'archived'
if (completedAt) return 'completed'
return 'active'
```

---

### 3.7 Project 删除 / 归档 / 恢复

**决策：**

删除 Project：

```txt
同步删除 Project 下所有 Task
```

归档 Project：

```txt
同步归档 Project 下所有 Task
```

恢复 Project：

```txt
只恢复 Project，不自动恢复 Task
```

**理由：**

1. 删除 / 归档父级时，用户直觉上是整体处理。
2. 恢复时自动恢复子任务可能带来误恢复。
3. V1 先保守，未来可借助来源字段做批量恢复。

---

### 3.8 Project Icon / Color

**决策：**

V1 不做 Project icon / color。

**理由：**

1. Space 已经承担视觉识别。
2. Project 如果也加 icon / color，创建成本会上升。
3. Sidebar 会变花，偏离 Linear 式克制风格。

**备忘：**

未来如果 Projects 很多且需要视觉区分，可以再讨论。

---

## 4. Task 决策记录

### 4.1 Task 的定义

**决策：**

Task 是扁平执行单元，不支持子任务。

**理由：**

1. 子任务本质上可能变成另一种子项目。
2. 子任务会引入展开 / 折叠 / 层级拖拽 / 递归查询。
3. 用户明确希望 StoneFlow 不维护树结构。

**备忘：**

所有复杂性优先通过：

```txt
Space
Project
Inbox
View
Filter
Activity
```

来表达，而不是通过 Task 层级表达。

---

### 4.2 Task projectId 可为空

**决策：**

Task 必须有 `spaceId`，但 `projectId` 可以为空。

**理由：**

1. 个人 Todo 有很多零散任务不值得创建 Project。
2. 如果所有任务都必须属于 Project，会产生"杂项 / 其他 / 临时任务"等垃圾项目。
3. No Project 是合理的一等状态。

**备忘：**

`projectId = null` 不等于 Inbox。是否在 Inbox 由 `inboxAt` 判断。

---

### 4.3 Inbox 不等于 Project

**决策：**

Inbox 是 Task 的待整理状态，不是系统 Project。

使用字段：

```ts
inboxAt: string | null
```

**理由：**

1. Inbox 的语义是"还没整理"，不是"属于一个项目"。
2. 如果 Inbox 是 Project，会污染 Project 列表。
3. `projectId = null` 需要同时支持 Inbox 和 No Project 两种状态。

三种状态：

| 状态 | projectId | inboxAt |
|---|---:|---:|
| Inbox 待整理 | null | 有值 |
| No Project 已整理 | null | null |
| Project 任务 | 有值 | null |

---

### 4.4 Task Status

**决策：**

Task 固定 5 个状态：

```ts
'todo' | 'doing' | 'waiting' | 'done' | 'canceled'
```

**理由：**

1. `todo` 是默认待处理状态。
2. `doing` 支持桌面端 Focus / 当前工作状态。
3. `waiting` 比 `blocked` 更适合个人 Todo，用于等待反馈、等待条件。
4. `done` 表示完成。
5. `canceled` 表示决定不做，不等同于完成。

**备忘：**

V1 不做自定义 Status，避免变成工作流配置系统。

---

### 4.5 statusChangedAt

**决策：**

Task 保留 `statusChangedAt`。

**理由：**

1. 方便查询状态停留时间。
2. 方便做 Waiting 太久、Doing 太久等视图。
3. 不需要每次都从 Activity 中反推当前状态变化时间。

**备忘：**

`statusChangedAt` 和 Activity 不冲突。前者是当前快照字段，后者是历史流水。

---

### 4.6 Task 时间字段

**决策：**

Task 保留三个时间字段：

```txt
dueAt
scheduledAt
reminderAt
```

**理由：**

它们语义不同：

| 字段 | 含义 |
|---|---|
| `scheduledAt` | 我打算什么时候做 |
| `dueAt` | 最晚什么时候完成 |
| `reminderAt` | 什么时候提醒我 |

**备忘：**

不要混淆：

```txt
scheduledAt = 计划执行时间
dueAt = 截止时间
reminderAt = 通知时间
```

---

### 4.7 Task Priority

**决策：**

Task 使用 0-4 的优先级：

| 值 | 含义 |
|---:|---|
| 0 | 无优先级 |
| 1 | 低 |
| 2 | 中 |
| 3 | 高 |
| 4 | 紧急 |

默认：

```txt
priority = 0
```

**理由：**

1. 支撑 Focus View。
2. 借鉴 Linear 的优先级心智。
3. 0 表示无优先级，避免用户必须给每个任务打优先级。

---

### 4.8 Duplicate / canceledReason

**决策：**

V1 Task 不加：

```txt
canceledReason
duplicateOfTaskId
```

Duplicate 进入未来待办。

**理由：**

1. Duplicate 本质是任务关系或取消原因，不是执行状态。
2. V1 不做任务关系，避免模型变重。
3. 个人 Todo 中重复任务可以先通过取消或删除处理。

**备忘：**

未来若做 Duplicate，应优先放入 `task_relations` 或轻量关系模型，而不是塞进 Task 主表。

---

### 4.9 Task 不做的字段

**决策：**

V1 不做：

```txt
parentId
type
estimate
recurrenceRule
tags
attachments
links
```

**理由：**

1. `parentId` 会引入子任务。
2. `type` 会引入 epic / note / idea 等复杂语义。
3. `estimate` 会偏向项目管理。
4. 重复任务、标签、附件都需要独立设计，不能随手塞字段。

---

## 5. Inbox 决策记录

### 5.1 Inbox 的本质

**决策：**

Inbox 是捕获后的待整理状态。

**定义：**

> Inbox 不是"没有字段的任务"，而是"还没有被处理过的捕获物"。

**理由：**

1. 设置 priority / dueAt / scheduledAt 不代表任务已经被整理。
2. 整理的核心动作是明确归属：Project 或 No Project。
3. Inbox 作为状态比 Inbox 作为 Project 更灵活。

---

### 5.2 入 Inbox 规则

**决策：**

进入 Inbox 的典型场景：

| 场景 | 是否进 Inbox |
|---|---:|
| 快捷创建只填 title / note | 是 |
| 当前 Space 下创建但没选 Project | 是 |
| 当前 Scope 是「全部」时快捷创建 | 是，进入默认 Space Inbox |
| Project 页面内创建 | 否 |
| 创建时明确选择 Project | 否 |
| 创建时明确选择 No Project | 否 |
| 外部导入 / AI 生成 | 默认是 |
| 手动 Move to Inbox | 是 |

**理由：**

Inbox 承接"不想马上整理，但想先记录"的任务。

---

### 5.3 出 Inbox 规则

**决策：**

能让任务离开 Inbox 的动作：

| 动作 | 是否出 Inbox |
|---|---:|
| 移动到 Project | 是 |
| 标记为 No Project | 是 |
| 完成任务 | 是 |
| 取消任务 | 是 |
| 归档任务 | 是 |
| 删除任务 | 是 |

不能让任务离开 Inbox 的动作：

| 动作 | 是否出 Inbox |
|---|---:|
| 设置 priority | 否 |
| 设置 dueAt | 否 |
| 设置 scheduledAt | 否 |
| 设置 reminderAt | 否 |
| 修改 note | 否 |

**理由：**

补充信息不等于完成整理。归属决策才代表整理完成。

---

### 5.4 No Project 的位置

**决策：**

No Project 不是实体表，不是真 Project。

它是系统筛选状态：

```txt
projectId is null
inboxAt is null
```

**No Project 任务出现位置：**

1. All Tasks；
2. Today / Focus / Upcoming / Recently Added 等 Views；
3. Projects 区域或 Project Overview 中的系统入口。

**理由：**

1. 个人 Todo 需要承接不属于项目的有效任务。
2. 如果没有 No Project，Inbox 会永远堆满已整理但无项目的任务。

---

## 6. Sidebar 决策记录

### 6.1 Sidebar 的核心原则

**决策：**

Sidebar 不是结构树，而是当前 Scope 下的工作入口。

**理由：**

1. Sidebar 如果展示 Space + Project 树，同时顶部又有 Space Switcher，会产生冲突。
2. 顶部 Space Switcher 应该控制全局范围。
3. Sidebar 只负责入口：Inbox / All Tasks / Views / Project Overview / Projects / Archive / Trash。

---

### 6.2 Space Switcher

**决策：**

顶部使用 Space Switcher，包含：

```txt
全部
个人
与光
StoneFlow
...
```

V1 只支持：

```txt
单选 + 全部
```

不做多选 Space。

**理由：**

1. 单选 Scope 心智清晰。
2. 多选 Space 会让快速创建默认 Space 变模糊。
3. 多选会让 Projects 区域又回到树结构。

**备忘：**

未来如果需要多选，可以做成 Saved Scope 或 Space Group，而不是基础交互。

---

### 6.3 Sidebar 最终结构

**决策：**

Sidebar 默认结构：

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

**理由：**

1. 主入口简洁。
2. Views 不在 Sidebar 展开，避免越来越长。
3. Projects 快捷区给高频项目。
4. Archive / Trash 是低频入口，放 Footer。

---

### 6.4 Views 聚合页

**决策：**

Sidebar 中只显示一个 Views 入口，点击后进入聚合页，内部用 Tabs 展示具体 Views。

默认 Views：

```txt
Today
Focus
Upcoming
Recently Added
Waiting
Overdue
```

**理由：**

1. Sidebar 保持干净。
2. Views 可扩展。
3. 自定义 View 后不会直接挤爆 Sidebar。

---

### 6.5 Project Overview 与 Projects 快捷区

**决策：**

Sidebar 同时有：

```txt
Project Overview
Projects 快捷区
```

两者含义不同：

| 入口 | 含义 |
|---|---|
| Project Overview | 项目聚合页面，可看 Active / Completed / Archived / All |
| Projects 快捷区 | 当前 Scope 下的项目快捷入口 |

**理由：**

1. Project Overview 负责管理和浏览项目集合。
2. Projects 快捷区负责高频进入具体项目。

---

### 6.6 Archive / Trash

**决策：**

Archive / Trash 放在 Sidebar Footer。

**理由：**

1. 它们是低频但必要入口。
2. Footer 不干扰高频工作流。
3. 归档和删除都需要可恢复入口。

---

### 6.7 Sidebar 可见度

**决策：**

所有 Sidebar 入口一开始默认可见，并且以后支持调整可见度。

配置放在：

```txt
settings.app.sidebar
```

**理由：**

1. 用户可能希望隐藏不常用入口。
2. UI 配置不应该混进业务表。

---

## 7. View 决策记录

### 7.1 View 的定义

**决策：**

View 是保存下来的筛选、排序、分组规则。

Task 不属于 View，View 不拥有 Task。

**理由：**

1. View 是入口，不是容器。
2. 同一个 Task 可以同时出现在 Today、Focus、Inbox 等多个视图中。
3. 这种模型更灵活，也更接近 Linear 的 Views 思路。

---

### 7.2 系统 View 也落表

**决策：**

系统 View 和自定义 View 都放在 `views` 表。

**理由：**

1. 系统 View 也需要排序和可见度。
2. 统一模型更简单。
3. 用户未来可以隐藏某些系统 View。

---

### 7.3 View 不绑定 Space

**决策：**

V1 View 不绑定具体 Space。

Scope 由 Space Switcher 提供。

**理由：**

1. 避免每个 Space 有一套 View，心智复杂。
2. Today / Focus / Upcoming 这类 View 应该跟随当前 Scope。
3. 简化查询模型。

原则：

```txt
Scope 在外面，Filter 在 View 里面。
```

---

### 7.4 View Filter JSON

**决策：**

V1 使用受控 JSON 作为筛选协议，不做复杂条件树。

**理由：**

1. 能覆盖 90% 场景。
2. 避免一开始做成复杂筛选引擎。
3. 易于生成 SQL 和调试。

**备忘：**

Today / Upcoming 这类特殊日期逻辑可以通过系统 `key` 特殊处理，不必强塞进通用 JSON。

---

### 7.5 Completed 放到 All Tasks

**决策：**

Completed 不作为 Sidebar 独立入口，而是归入 All Tasks 页面内筛选。

**理由：**

1. Sidebar 更干净。
2. Completed 是状态筛选，不一定需要一级导航。
3. All Tasks 更适合承载 Active / Completed / Canceled / Archived / All 等状态过滤。

---

## 8. Activity 决策记录

### 8.1 Activity 从 V1 完整落地

**决策：**

Activity 从一开始就做，并且作为正式模型。

**理由：**

1. 未来补 Activity 会非常痛。
2. Activity 能支撑 Linear 式时间线体验。
3. Activity 对调试、恢复、审计、AI 总结都有价值。

---

### 8.2 Activity 不替代主表

**决策：**

主表保存当前状态，Activity 保存变化历史。

```txt
Task / Project / Space = 当前事实
Activity = 历史变化
```

**理由：**

1. 只靠事件计算当前状态太重。
2. 列表查询需要直接访问当前状态字段。
3. Activity 用于展示历史，不用于实时计算核心状态。

---

### 8.3 Activity 拆成两张表

**决策：**

Activity 使用：

```txt
activity_events
activity_changes
```

**理由：**

一次操作可能改多个字段。

例如完成任务会同时改：

```txt
status
statusChangedAt
completedAt
inboxAt
updatedAt
```

用 event 表示"一次操作"，用 changes 表示"字段变化"。

---

### 8.4 Activity 记录粒度

**决策：**

不记录每一次键盘输入，只记录有效保存后的变更。

**理由：**

1. 防止 Activity 太吵。
2. 避免 note / title 输入过程中产生大量无意义记录。
3. 用户关心的是有效变更，不是每个字符。

---

### 8.5 Activity 不等于 Comment

**决策：**

Activity 不承担用户手写评论功能。

**理由：**

1. Activity 是系统自动记录。
2. Comment 是用户主动表达。
3. 两者未来可以共同出现在时间线，但数据模型应分开。

**备忘：**

Comments 进入未来待办。

---

## 9. Settings 决策记录

### 9.1 Settings 的定义

**决策：**

Settings 只存用户偏好和 UI 行为配置，不存业务数据。

**理由：**

1. 业务模型和 UI 偏好分离。
2. 配置变化频繁，用 key-value JSON 更灵活。
3. 避免为每个配置新增数据库字段。

---

### 9.2 Settings 使用 Key-value 表

**决策：**

Settings 表结构为：

```txt
key
value
createdAt
updatedAt
```

`value` 存 JSON。

**理由：**

1. 配置项未来会不断增加。
2. key-value 适合 UI 配置和行为偏好。
3. 减少迁移成本。

---

### 9.3 Settings 不存 View 可见度

**决策：**

View 的可见度放在 `views.isVisible`，不放 Settings。

**理由：**

1. View 本身是一个配置对象。
2. View 的可见度和排序属于 View 自身属性。
3. Sidebar 主入口可见度才属于 `app.sidebar`。

---

## 10. 删除 / 归档 / 恢复决策记录

### 10.1 删除策略

**决策：**

删除使用软删除：

```txt
deletedAt = now
```

并同步处理子对象：

| 删除对象 | 同步行为 |
|---|---|
| Space | 删除其下所有 Project / Task |
| Project | 删除其下所有 Task |
| Task | 只删除自己 |

**理由：**

1. 用户直觉上删除父级就是删除其内容。
2. 软删除提供恢复空间。
3. Trash 页面可以承接误删恢复。

---

### 10.2 归档策略

**决策：**

归档使用软归档：

```txt
archivedAt = now
```

并同步处理子对象：

| 归档对象 | 同步行为 |
|---|---|
| Space | 归档其下所有 Project / Task |
| Project | 归档其下所有 Task |
| Task | 只归档自己 |

**理由：**

1. 归档父级时，子内容也应该离开日常视图。
2. 归档不是删除，Archive 页面可以找回。

---

### 10.3 恢复策略

**决策：**

V1 恢复父级时，不自动恢复子级。

| 恢复对象 | 行为 |
|---|---|
| Space | 只恢复 Space |
| Project | 只恢复 Project |
| Task | 尝试恢复到原位置，失败则进入默认 Space 的 Inbox |

**理由：**

1. 父级恢复时自动恢复全部子内容有误恢复风险。
2. V1 先使用更安全的保守策略。
3. 未来可通过 `deletedByType` / `archivedByType` 支持批量恢复。

---

### 10.4 恢复 Task 的规则

**决策：**

恢复 Task 时：

```txt
1. 原 Space 存在且未删除 → 回原 Space
2. 原 Space 不存在或已删除 → 进入默认 Space
3. 原 Project 存在且未删除 → 回原 Project
4. 原 Project 不存在或已删除 → projectId = null，inboxAt = now
```

**理由：**

1. 能回原位置就回原位置。
2. 回不去时不能丢失任务。
3. Inbox 是最合适的兜底位置。

---

## 11. 默认初始化决策

### 11.1 默认 Space

**决策：**

默认创建 Space：

```txt
个人
```

默认配置：

```txt
iconKey = user
colorKey = blue
isDefault = true
sortOrder = 1000
```

---

### 11.2 默认 Task

**决策：**

默认 Task 配置：

```txt
status = todo
priority = 0
projectId = null
dueAt = null
scheduledAt = null
reminderAt = null
```

---

### 11.3 默认 Views

**决策：**

默认 Task Views：

```txt
Today
Focus
Upcoming
Recently Added
Waiting
Overdue
```

默认 Project Views：

```txt
Active
Completed
Archived
All
```

全部默认可见。

---

### 11.4 默认 Sidebar

**决策：**

Sidebar 所有入口一开始默认可见。

包括：

```txt
Inbox
All Tasks
Views
Project Overview
Projects section
Archive
Trash
```

---

## 12. V1 明确不做清单

| 模块 | 决策 | 理由 |
|---|---|---|
| 子项目 | 不做 | 避免树结构 |
| 子任务 | 不做 | 避免变相子项目 |
| Tags | 不做 | 需要独立设计，后续再做 |
| task_tags | 不做 | 随 Tags 后续设计 |
| 重复任务 | 不做 | 规则复杂，后续独立设计 |
| 附件 / 链接 | 不做 | 后续独立设计 |
| task_relations | 不做 | Duplicate / Related / Blocked 后续再做 |
| Duplicate 字段 | 不做 | 不塞进 Task 主表 |
| canceledReason | 不做 | V1 不记录取消原因 |
| Comments | 不做 | Activity 不等于评论 |
| Space 多选 | 不做 | V1 单选 + 全部 |
| 自定义 Status | 不做 | V1 固定状态，避免工作流配置化 |
| Project icon/color | 不做 | 避免 UI 过度装饰 |
| Task estimate | 不做 | 避免重项目管理 |
| 多提醒 | 不做 | V1 只有 reminderAt |

---

## 13. 未来待办清单

### 13.1 Tags

未来要独立设计：

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

---

### 13.2 重复任务

未来要独立设计：

```txt
每日 / 每周 / 每月
完成后生成下一次
跳过一次
修改本次 / 修改全部
```

不能简单加一个 `recurrenceRule` 了事。

---

### 13.3 附件 / 链接

未来要独立设计：

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

---

### 13.4 任务关系

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

---

### 13.5 Comments

未来如果需要手动评论，单独设计：

```txt
comments
```

Activity 和 Comment 可以在 UI 时间线中合并展示，但数据库模型应分开。

---

## 14. 已定核心表

V1 核心表：

```txt
spaces
projects
tasks
views
settings
activity_events
activity_changes
```

表的职责：

| 表 | 职责 |
|---|---|
| `spaces` | 顶级上下文 |
| `projects` | Space 下的一层目标容器 |
| `tasks` | 扁平执行单元 |
| `views` | 保存筛选 / 排序 / 分组规则 |
| `settings` | UI 和行为配置 |
| `activity_events` | 一次操作 |
| `activity_changes` | 操作中的字段变化 |

---

## 15. 核心设计原则备忘

### 15.1 不用树解决复杂性

> 层级是看起来有秩序，但 View 才是真正适合个人效率工具的组织方式。

### 15.2 Inbox 是捕获池，不是项目

> Inbox 表示"还没整理"，不是"没有字段"。

### 15.3 Space 是 Scope，不是普通分类

> Space 决定当前工作范围，Sidebar 入口全部跟随当前 Scope。

### 15.4 Project 是一层目标容器

> Project 只负责归属、完成、归档、删除，不负责多层结构。

### 15.5 Task 是扁平执行单元

> Task 只表达要做什么，不承载子任务树。

### 15.6 View 是入口，不是容器

> View 不拥有 Task，只通过筛选查询 Task。

### 15.7 Activity 是历史，不是状态源

> 当前状态存主表，历史变化存 Activity。

### 15.8 Settings 只存偏好

> UI 可见度、默认行为、布局宽度放 Settings；业务对象不要放 Settings。

---

## 16. 后续讨论时的默认前提

后续讨论 UI、交互、PRD、技术实现时，默认遵守：

1. 不重新引入子项目。
2. 不重新引入子任务。
3. Space 是顶部 Scope。
4. Sidebar 是入口集合，不是文件树。
5. Inbox 是待整理状态。
6. No Project 是已整理但无项目。
7. Project 可以完成，也可以归档。
8. Completed 不做 Sidebar 一级入口，放入 All Tasks / Project Overview 内部筛选。
9. Activity 从 V1 开始做。
10. Tags、重复任务、附件、任务关系后置。

---

## 17. 一句话总结

StoneFlow V1 的核心决策是：

> **不做复杂树，不做团队协作，不做配置地狱；用 Space 控制上下文，用 Project 承载目标，用 Task 表达执行，用 Inbox 捕获未整理事项，用 View 组织工作入口，用 Activity 记录变化历史。**
