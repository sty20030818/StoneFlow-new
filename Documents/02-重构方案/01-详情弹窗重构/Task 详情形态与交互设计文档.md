# StoneFlow Task 详情形态与交互设计文档

## 0. 文档信息

| 项目 | 内容 |
|---|---|
| 文档名称 | StoneFlow Task 详情形态与交互设计文档 |
| 文档目的 | 明确 Task 在 StoneFlow 中的展示、预览、编辑、独立详情页的整体形态与交互边界 |
| 适用范围 | Task Row、Task Preview、Task Drawer、Task Page、路由状态、快捷键交互 |
| 当前阶段 | Task Drawer 重构前的产品方向定稿 |
| 设计关键词 | 列表主导、轻量编辑、键盘友好、局部打断、独立页兜底、本地优先 |

---

## 0.1 阶段 0 对齐说明

本文档保留为 Task 详情形态的产品上游文档，负责定义 Task Row / Preview / Drawer / Page 的产品心智模型。

实际落地以《StoneFlow Entity Detail System 重构总方案》为总控文档。后续实现需要遵守以下补充决策：

1. Task 详情不是孤立系统，而是 Entity Detail System 的第一批落地对象。
2. Project 后续也采用 Drawer + 独立详情页形态，和 Task 共用详情打开协议、自动保存状态机和详情 UI primitive。
3. Task 具体实现放在 `src/features/task/detail/`。
4. Project 具体实现放在 `src/features/project/detail/`。
5. Task / Project 共同的详情业务协议放在 `src/features/entity-detail/`。
6. 不新建 `src/features/tasks/`。当前仓库已有 `src/features/task/` 作为 Task 实体归属，新建复数目录会造成 Task API、model、row、detail 双事实源。

---

# 1. 背景

StoneFlow 是一个个人任务管理桌面应用，产品气质更接近：

- Linear 的清晰、克制、高密度信息组织；
- Raycast 的快速、键盘优先、命令式操作体验；
- 个人 TODO 工具的轻量、低负担、随手记录与快速处理。

当前需要重新设计 Task 的详情展示与编辑形态，核心问题是：

> Task 的详情到底应该以 Drawer、独立页面、弹窗、预览，还是组合方式承载？

经过讨论，StoneFlow 不适合直接照搬 Linear 的「Issue 独立页优先」模式。Linear 面向团队协作与复杂 Issue 管理，任务本身通常较重，需要评论、Activity、关联关系、属性历史和多人协作上下文。StoneFlow 当前是个人 TODO，Task 通常是 30 字以内的短任务，更多上下文可以通过备注、链接或独立文档承载。

因此，StoneFlow 的 Task Detail 不应该只押注某一种形态，而应该形成一套分层系统：

```txt
Task Row      = 快速管理
Task Preview  = 快速确认
Task Drawer   = 轻量编辑
Task Page     = 完整详情与重操作
```

这套结构让轻操作保持轻，让重操作有容器，不把所有功能都塞进一个 Drawer。

---

# 2. 核心结论

## 2.1 最终产品方向

StoneFlow 的 Task 详情采用四层模型：

| 层级 | 名称 | 核心定位 | 是否主入口 |
|---|---|---|---|
| Level 1 | Task Row | 快速管理任务状态、优先级、标题 | 是 |
| Level 2 | Task Preview | 通过 Space 快速查看当前任务摘要 | 是 |
| Level 3 | Task Drawer | 轻量查看 + 快速补充 + 属性编辑 | 是 |
| Level 4 | Task Page | 完整详情、Activity、重操作、深度处理 | 辅助 |

核心判断：

> StoneFlow 的 Task 日常入口应该是 Drawer，不是独立页面；独立页面必须存在，但只作为深度处理、Activity、重操作和长内容承载的兜底能力。

## 2.2 不采用的方向

### 不采用 Modal 作为主形态

Modal 会强打断当前任务列表上下文，不适合高频任务管理。

Modal 可以用于少量确认类操作，例如：

- 删除确认；
- 批量操作确认；
- 危险操作确认；
- 某些二级配置表单。

但不作为 Task 详情主入口。

### 不采用独立页面作为默认入口

独立页面适合深度处理，但默认打开独立页面会导致用户频繁离开列表，降低任务浏览和快速编辑效率。

### 不让 Drawer 承担完整详情

Drawer 是轻量的，不应该放入 Activity、完整历史、重型链接管理、评论区、长内容处理等功能。否则 Drawer 会逐渐膨胀成「窄版独立页面」，失去轻量价值。

---

# 3. 设计原则

## 3.1 列表主导

StoneFlow 的核心使用场景是从列表中快速浏览、选择、处理任务。

因此：

- Task Row 是最高频入口；
- 单击 Row 打开 Drawer；
- 上下键切换任务时，Drawer / Preview 内容可以跟随切换；
- 打开 Drawer 不应该阻断列表滚动；
- 打开 Drawer 不应该强制进入输入态。

## 3.2 轻重分离

不同信息和操作按照重量分流：

| 内容 / 操作 | Row | Preview | Drawer | Page |
|---|---:|---:|---:|---:|
| 标题 | ✅ | ✅ | ✅ | ✅ |
| 状态 | ✅ | ✅ | ✅ | ✅ |
| 优先级 | ✅ | ✅ | ✅ | ✅ |
| 时间 | 简略 | 简略 | ✅ | ✅ |
| 备注 | ❌ | 摘要 | ✅ | ✅ |
| 标签 | 简略 / 可选 | 简略 | ✅ | ✅ |
| 项目 | 简略 | ✅ | ✅ | ✅ |
| Links | ❌ / 可选 | 摘要 | ✅ | ✅ |
| Activity | ❌ | ❌ | ❌ | ✅ |
| 评论 | ❌ | ❌ | ❌ | 暂不做 |
| 归档 | 可选 | ❌ | ✅ | ✅ |
| 删除 / 回收站 | 菜单 | ❌ | 菜单 | ✅ |
| Convert Task to Project | 菜单 / 后续 | ❌ | 菜单 / 后续 | ✅ |

## 3.3 Drawer 轻量，Page 完整

Drawer 的定位是：

> 介于轻量查看和重型编辑之间的任务编辑抽屉。

Drawer 负责：

- 修改标题；
- 补充备注；
- 修改状态、优先级、时间；
- 管理标签；
- 修改项目归属；
- 管理轻量 Links；
- 查看保存状态和更新时间；
- 执行归档或更多轻量操作。

Drawer 不负责：

- Activity Timeline；
- 评论区；
- 长文档编辑；
- 复杂附件系统；
- 完整历史记录；
- 大量重操作的主承载。

这些全部下放到独立页面。

## 3.4 键盘友好

StoneFlow 是桌面端效率工具，Task Detail 体系必须服务键盘流：

- 上下键切换列表任务；
- Space 打开 Preview；
- Enter 打开 Drawer；
- Esc 关闭 Preview / Drawer；
- 非输入态下，Drawer 打开不应夺走上下键控制权。

## 3.5 本地优先与自动保存

StoneFlow 是本地优先产品，Task 编辑不应依赖复杂的远程保存确认。

基本规则：

- 标题、备注自动保存；
- 属性变更立即保存；
- Links 操作后立即保存；
- 保存状态轻量展示；
- 切换任务时，不弹出「是否保存」确认；
- 理论上不存在严重未保存状态。

---

# 4. 四层 Task Detail 模型

## 4.1 Task Row：快速管理层

### 定位

Task Row 是任务的默认展示和最高频操作入口。

它不是详情页，也不是完整编辑器，而是一个高密度任务管理单元。

### 主要能力

| 能力 | 说明 |
|---|---|
| 展示标题 | 任务一般 30 字以内 |
| 修改状态 | Row 上直接操作 |
| 修改优先级 | Row 上直接操作 |
| 标题编辑 | 可在 Row 上完成，具体交互以现有 Row 方案为准 |
| 打开 Drawer | 单击 Row |
| 右键菜单 | 打开 Page、复制链接、更多操作 |

### 不做什么

Task Row 不承载：

- 长备注；
- Activity；
- Links 管理；
- 完整属性表单；
- 重操作面板。

### 推荐交互

```txt
单击 Row       → 选中任务并打开 Drawer
点击状态       → 修改状态
点击优先级     → 修改优先级
右键 Row       → 打开上下文菜单
右键 Open Page → 打开独立页面
```

---

## 4.2 Task Preview：快速确认层

### 定位

Preview 是键盘流里的快速查看卡片，主要用于「确认当前选中的任务是不是我要找的」。

Preview 不是编辑器，不进入 URL，不展示 Activity。

### 打开方式

```txt
Space → 打开 / 关闭 Preview
```

### 推荐内容

```txt
┌──────────────────────────────────────────────┐
│ Task title                                   │
│                                              │
│ ○ Todo · High · StoneFlow · Due Apr 26       │
│                                              │
│ Note preview...                              │
│ 最多展示 3-5 行，不进入编辑态。              │
│                                              │
│ Links                                        │
│ - 技术方案文档                               │
│ - Figma 设计稿                               │
└──────────────────────────────────────────────┘
```

### 内容规则

| 内容 | 是否展示 | 说明 |
|---|---:|---|
| 标题 | ✅ | 主信息 |
| 状态 | ✅ | 简略展示 |
| 优先级 | ✅ | 简略展示 |
| 项目 | ✅ | 简略展示 |
| 日期 | ✅ | 简略展示 |
| 备注 | ✅ | 最多 3-5 行 |
| Links | ✅ | 最多展示前几个 |
| Activity | ❌ | 不展示 |
| 编辑控件 | ❌ | 不展示 |

### 交互规则

```txt
Space          → 打开 Preview
Space again    → 关闭 Preview
↑ / ↓          → 切换选中任务，Preview 内容同步更新
Enter          → 打开 Drawer
Esc            → 关闭 Preview
Cmd/Ctrl Enter → 打开独立页面，可选
```

### 设计边界

Preview 只做快速确认，不应该变成 Hover 编辑卡，也不应该承载下拉选择、属性修改、Links 编辑等操作。

---

## 4.3 Task Drawer：轻量编辑层

### 定位

Task Drawer 是 StoneFlow 的 Task 日常主编辑入口。

它的定位是：

> 轻量查看 + 快速补充 + 快速编辑属性。

它介于 Preview 和独立页面之间：

- 比 Preview 更可编辑；
- 比 Page 更轻；
- 不打断当前列表上下文；
- 不承载完整 Activity 和重操作。

### 基础结构

```txt
[ Task title input ]            [Open Page] [More] [Close]

Note input

Properties
[Status] [Priority] [Due] [Plan] [Reminder]

Labels
[Bug] [UI] [+ Add label]

Project
[StoneFlow]

Links
[icon] [ 技术方案文档 ]    [open] [...]
[icon] [ Figma 设计稿 ]    [open] [...]
+ Add link

Updated 2 min ago [Saved]                   [...] [Archive]
```

### 固定与滚动规则

| 区域 | 规则 | 内容 |
|---|---|---|
| Header | 固定 | Title input、Open Page、More、Close |
| Body | 滚动 | Note、Properties、Labels、Project、Links |
| Footer | 固定 | Updated time、Saved status、More、Archive |

### Drawer 中显示什么

| 内容 | 是否显示 | 说明 |
|---|---:|---|
| 标题 | ✅ | Header 中无框输入 |
| 备注 | ✅ | Body 中无框输入 |
| 状态 | ✅ | Outline Button |
| 优先级 | ✅ | Outline Button |
| 时间 | ✅ | Due / Plan / Reminder |
| 标签 | ✅ | Chip |
| 项目 | ✅ | 单独区域 |
| Links | ✅ | 轻量列表 + Popover 新建 / 编辑 |
| 更新时间 | ✅ | Footer |
| 保存状态 | ✅ | Footer |
| Activity | ❌ | 放 Page |
| 评论区 | ❌ | 不做 |
| 附件系统 | 暂缓 | 后续可作为 Links 扩展 |

### Drawer 的打开规则

```txt
单击 Row  → 打开 Drawer
Enter    → 打开 Drawer
URL query 有 task 参数 → 初始化打开 Drawer
```

### Drawer 的关闭规则

```txt
Esc          → 关闭 Drawer
Close Button → 关闭 Drawer
关闭后        → 移除 URL query 中的 task 参数
```

### Drawer 的任务切换规则

```txt
Drawer 打开时：
↑ / ↓ 切换列表选中任务
Drawer 内容同步切换到新选中任务
```

前提：当前焦点不在标题、备注或其他输入控件内。

如果焦点在输入控件内：

```txt
↑ / ↓ 优先作为输入控件内部行为
Esc 先退出输入态或关闭 Drawer，具体按组件交互定
```

### Drawer 不默认聚焦

打开 Drawer 后，不默认聚焦标题或备注。

原因：

- 保留键盘浏览能力；
- 避免用户打开 Drawer 后上下键被输入框吞掉；
- 只有用户主动点击标题 / 备注时才进入编辑态。

特殊场景可以另行处理：

| 场景 | 聚焦策略 |
|---|---|
| 单击 Row 打开 Drawer | 不聚焦输入框 |
| Enter 打开 Drawer | 不聚焦输入框 |
| 新建 Task 后立即打开 Drawer | 可聚焦标题或备注，视创建流而定 |
| 点击标题 | 聚焦标题 |
| 点击备注 | 聚焦备注 |

### Drawer 的 Links 规则

Drawer 内保留轻量 Links 区域，作为任务行动入口。

```txt
Links
[icon] [ 技术方案文档 ]    [open] [...]
[icon] [ Figma 设计稿 ]    [open] [...]
+ Add link
```

新建和编辑 Links 不进入独立页面，直接打开轻量 Popover。

```txt
+ Add link
↓
Popover:
- Title input
- URL input
- Cancel
- Add
```

Link row 的 More 菜单包含：

```txt
Copy link
Edit
Remove
```

详细 UI 在《Task Drawer 产品与 UI 设计文档》中展开。

---

## 4.4 Task Page：完整详情层

### 定位

Task Page 是完整详情页，用于承载所有比 Drawer 更重的内容。

它不是日常主入口，但必须存在。

### 主要用途

| 用途 | 说明 |
|---|---|
| 完整 Activity | 展示完整操作历史 |
| 长内容处理 | 更舒展地编辑较长备注 |
| 重操作 | Convert、Duplicate、Move to Trash 等 |
| Links 完整管理 | 比 Drawer 更完整的 Links / 未来 Attachments 能力 |
| 深度处理 | 任务变复杂时，提供稳定工作区 |
| 独立路由 | 可刷新、可深链、可从搜索进入 |

### 推荐布局

```txt
┌──────────────────────────────────────────────────────────────────────────────┐
│ StoneFlow / Tasks / Task title                                      [⋯] [×] │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Main Content                                           Sidebar              │
│  ┌──────────────────────────────────────────────┐      ┌──────────────────┐ │
│  │ [ Task title input ]                         │      │ Properties       │ │
│  │                                              │      │ [Status]         │ │
│  │ [ Description / Notes ]                      │      │ [Priority]       │ │
│  │                                              │      │ [Due date]       │ │
│  │ Links                                        │      │ [Plan date]      │ │
│  │ [icon] 技术方案文档        [Open] [⋯]          │      │ [Reminder]       │ │
│  │ [icon] Figma 设计稿         [Open] [⋯]          │      │                  │ │
│  │ + Add link                                   │      │ Labels           │ │
│  │                                              │      │ [Bug] [UI] [+]   │ │
│  │ Activity                                     │      │                  │ │
│  │ created task · 2d ago                        │      │ Project          │ │
│  │ changed priority · yesterday                 │      │ [StoneFlow]      │ │
│  │ added link · 1h ago                          │      │                  │ │
│  └──────────────────────────────────────────────┘      │ Created / Updated │ │
│                                                        └──────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Page 与 Drawer 的差异

| 维度 | Drawer | Page |
|---|---|---|
| 打开目的 | 快速补充 | 深度处理 |
| 视觉密度 | 相对紧凑 | 更舒展 |
| Activity | 不展示 | 完整展示 |
| Links | 轻量管理 | 完整管理 |
| 重操作 | 少量入口 | 完整承载 |
| 路由 | Query 状态 | 独立路径 |
| 页面上下文 | 保留列表 | 独立上下文 |

### Page 承载的重操作

Page 可以承载：

- 完整 Activity；
- Archive / Restore；
- Move to Trash；
- Duplicate Task；
- Convert Task to Project；
- Create Project from Task；
- Copy task link；
- 未来 Focus Mode；
- 未来 Related Tasks；
- 未来 Attachments；
- 未来 Task History / Diff。

---

# 5. 打开与导航规则

## 5.1 鼠标交互

| 操作 | 结果 |
|---|---|
| 单击 Task Row | 打开 Drawer |
| 单击其他 Task Row | Drawer 内容切换到新任务 |
| 点击 Row 状态 | 直接改状态 |
| 点击 Row 优先级 | 直接改优先级 |
| 右键 Task Row | 打开上下文菜单 |
| 右键菜单 Open Page | 打开独立页面 |
| Drawer Header Open Page | 打开独立页面 |
| Drawer Close | 关闭 Drawer |
| Drawer Footer Archive | 归档当前任务 |

## 5.2 键盘交互

| 快捷键 | 结果 |
|---|---|
| ↑ / ↓ | 切换列表选中任务 |
| Space | 打开 / 关闭 Preview |
| Enter | 打开 Drawer |
| Esc | 关闭 Preview / Drawer |
| Cmd/Ctrl + Enter | 打开独立页面，可选 |
| Cmd/Ctrl + [ / ] | 返回 / 前进，可选 |

明确不做：

- 不使用 E 作为编辑 Drawer 快捷键；
- 不依赖 Cmd/Ctrl + S，因为自动保存；
- 不要求双击标题进入编辑，标题编辑以当前 Row / Drawer 输入规则为准。

## 5.3 Esc 关闭顺序

推荐顺序：

```txt
if Preview open:
  close Preview
else if Drawer open:
  close Drawer
else:
  normal page behavior
```

说明：

- Preview 优先级高于 Drawer；
- 关闭 Drawer 后保留列表选中态；
- 关闭 Drawer 后移除 URL query 中的 task 参数。

## 5.4 Drawer 与列表联动

当 Drawer 打开时：

```txt
点击 Row / ↑ ↓ 切换选中任务
→ selectedTaskId 更新
→ Drawer 内容同步切换
→ URL query 同步更新
```

这可以让用户像浏览邮件一样快速扫过任务并补充信息。

---

# 6. URL 与路由规则

## 6.1 推荐 URL 设计

| 形态 | URL | 是否进入浏览历史 |
|---|---|---:|
| 普通任务列表 | `/tasks` | ✅ |
| 打开 Drawer | `/tasks?task=xxx` | ✅ / 可控 |
| 独立页面 | `/tasks/:taskId` | ✅ |
| Preview | 不改变 URL | ❌ |

## 6.2 Drawer Query 规则

打开 Drawer：

```txt
/tasks → /tasks?task=xxx
```

切换任务：

```txt
/tasks?task=aaa → /tasks?task=bbb
```

关闭 Drawer：

```txt
/tasks?task=xxx → /tasks
```

## 6.3 独立页面规则

独立页面使用稳定路径：

```txt
/tasks/:taskId
```

它适用于：

- 从 Drawer 的 Open Page 打开；
- 从 Row 右键菜单打开；
- 从全局搜索打开；
- 从未来深链打开；
- 从 Activity / History / 外部引用打开。

## 6.4 Preview 不进入 URL

Preview 是临时 UI 状态，不应该污染 URL。

原因：

- Preview 是短暂确认行为；
- 不需要刷新恢复；
- 不需要分享；
- 不需要进入历史栈。

---

# 7. 自动保存与 Activity 记录

## 7.1 自动保存规则

| 操作类型 | 保存策略 |
|---|---|
| 标题输入 | debounce 自动保存 |
| 备注输入 | debounce 自动保存 |
| 状态变更 | 立即保存 |
| 优先级变更 | 立即保存 |
| 时间变更 | 立即保存 |
| 标签变更 | 立即保存 |
| 项目变更 | 立即保存 |
| Links 新增 / 编辑 / 删除 | 操作后立即保存 |
| 归档 | 立即执行，回退机制暂定 |
| 移入回收站 | 立即执行，回退机制暂定 |

## 7.2 保存状态展示

Drawer Footer 展示轻量保存状态：

```txt
Updated 2 min ago [Saved]                   [...] [Archive]
```

可能状态：

| 状态 | 文案 |
|---|---|
| 保存中 | Saving... |
| 已保存 | Saved |
| 保存失败 | Failed · Retry |

## 7.3 本地优先下的切换策略

因为 StoneFlow 是本地优先，理论上不会出现严重未保存状态。

切换任务时：

```txt
不弹确认
不阻断切换
当前 debounce 内容尽量 flush
Drawer 直接展示新任务
```

## 7.4 Activity 记录规则

虽然 Drawer 不展示 Activity，但任务操作仍然应该写入 Activity。

| 行为 | 是否记录 | 说明 |
|---|---:|---|
| 创建任务 | ✅ | created task |
| 修改状态 | ✅ | changed status |
| 修改优先级 | ✅ | changed priority |
| 修改项目 | ✅ | moved to project |
| 修改时间 | ✅ | changed due / plan / reminder |
| 添加标签 | ✅ | added label |
| 移除标签 | ✅ | removed label |
| 添加 Link | ✅ | added link |
| 编辑 Link | ✅ | updated link |
| 删除 Link | ✅ | removed link |
| 修改标题 | 可记录 | changed title |
| 修改备注 | 可记录 | updated description，不存输入过程 |
| 普通输入过程 | ❌ | 不逐字记录 |

Activity 的完整展示位置：

```txt
Task Page only
```

---

# 8. 操作回退策略

操作后的回退机制先暂定，后续可以独立设计。

当前文档只约束两点：

1. 归档、移入回收站等操作要预留回退能力；
2. 具体是 Toast Undo、Command History、全局 Undo，还是 Activity-based restore，后续另开方案决定。

暂不在本轮 Task Detail 形态文档中展开。

---

# 9. 设置项与未来模式

## 9.1 Task Detail Mode

未来可以在设置中提供 Task Detail 相关模式，用于控制不同入口行为。

建议预留三种模式概念：

| 模式 | 定位 | 可能入口 |
|---|---|---|
| Inspect Mode | 只读查看 | Preview |
| Edit Mode | 轻量编辑 | Drawer |
| Focus Mode | 专注处理 | Page |

这不是 V1 必须实现的功能，但应该作为产品概念保留。

## 9.2 可能的设置项

未来可以考虑：

| 设置项 | 说明 |
|---|---|
| 默认点击 Task 行为 | 打开 Drawer / 只选中 / 打开 Page |
| Space 行为 | Preview / 无操作 |
| Drawer 默认是否自动聚焦 | 默认不聚焦，用户可改 |
| 默认 Task Detail 入口 | Drawer / Page |
| 是否启用 Focus Mode | 后续 |

当前默认策略：

```txt
单击 Row → Drawer
Space → Preview
Open Page → Page
```

---

# 10. 未来拓展方向

## 10.1 Linked Resources

Links 未来可以升级为 Linked Resources。

不仅支持 URL，还可以支持：

| 类型 | 示例 |
|---|---|
| URL | 文档、网页、Figma |
| File | 本地文件 |
| Project | 关联项目 |
| Task | 关联任务 |
| Note | StoneCache 笔记 |
| Command | 打开外部工具或内部命令 |

当前 V1 只做 URL Link。

## 10.2 Convert Task to Project

有些 Task 会从一个 30 字以内的任务膨胀成一个小项目，因此需要保留：

```txt
Convert Task to Project
Create Project from Task
```

推荐入口：

- Drawer More；
- Page More；
- Row 右键菜单；
- Command 系统。

## 10.3 独立页面 Focus Mode

未来 Task Page 可以提供 Focus Mode：

- 隐藏侧边栏；
- 放大标题与备注；
- 保留核心属性；
- 展示相关 Links；
- 支持一段时间内专注处理当前任务。

Focus Mode 不进入 Drawer。

## 10.4 Activity Timeline 增强

未来独立页面的 Activity 可以增强为：

- 按天分组；
- 支持筛选字段变化；
- 支持只看 Links 变化；
- 支持恢复某些字段历史；
- 支持和全局 Undo / History 结合。

---

# 11. V1 / V2 / V3 边界

## 11.1 V1：完成主路径

V1 目标：让 Task 的日常查看、编辑、预览路径跑通。

### V1 必做

- Task Row 单击打开 Drawer；
- Drawer 基础结构；
- Drawer Header：Title input、Open Page、More、Close；
- Drawer Body：Note、Properties、Labels、Project、Links；
- Drawer Footer：Updated time、Saved status、More、Archive；
- Links 新建 / 编辑 Popover；
- Space Preview；
- URL query 同步 Drawer；
- `/tasks/:taskId` 独立页面基础入口；
- 自动保存状态；
- 操作写入 Activity，但 Drawer 不展示 Activity。

### V1 不做

- Drawer Pin；
- Drawer Activity；
- 评论区；
- 复杂附件系统；
- Markdown 重编辑器；
- 完整 Focus Mode；
- 完整 Task History / Diff；
- 复杂 Undo 机制。

## 11.2 V2：完善独立页面

V2 可以做：

- Task Page 完整布局；
- Activity Timeline 完整展示；
- Page 重操作；
- Convert Task to Project；
- Create Project from Task；
- Links 完整管理；
- 更完整的路由返回体验。

## 11.3 V3：体验增强

V3 可以做：

- Focus Mode；
- Linked Resources；
- 附件；
- Related Tasks；
- Activity 筛选；
- 可配置 Task Detail Mode；
- 更完整的全局 Undo / History。

---

# 12. 决策记录

## 12.1 已确定

| 决策 | 结论 |
|---|---|
| Task 默认详情入口 | Drawer |
| 独立页面 | 需要，但不是主入口 |
| Preview | 通过 Space 触发，给键盘使用 |
| Modal | 不作为主形态 |
| Drawer 定位 | 轻量查看 + 快速补充 + 属性编辑 |
| Drawer 是否放 Activity | 不放 |
| Activity 放哪里 | 独立页面 |
| 评论区 | 不做 |
| Links | Drawer 保留轻量入口 |
| Links 新建 / 编辑 | Popover |
| Drawer Header | `[ Task title input ] [Open Page] [More] [Close]` |
| Drawer Footer | `Updated 2 min ago [Saved] [...] [Archive]` |
| Drawer 打开后是否自动聚焦 | 不自动聚焦 |
| Drawer 打开时能否滚动列表 | 可以 |
| Drawer 打开时点击其他任务 | 直接切换 Drawer 内容 |
| Drawer 打开时 ↑ / ↓ | 非输入态下切换列表选中项 |
| Esc | 关闭 Preview / Drawer |
| URL 同步 | Drawer 使用 query，Page 使用独立路径 |
| Pin | 滞后，不作为刚需 |
| Cmd/Ctrl + S | 不需要，自动保存 |
| E 快捷键 | 不需要 |

## 12.2 待后续讨论

| 问题 | 状态 |
|---|---|
| 操作后的回退机制 | 暂定，另开方案 |
| Drawer 与 Page 是否强复用组件 | 技术文档再定 |
| 独立页面具体 UI 细节 | 第二阶段细化 |
| Focus Mode | 未来能力 |
| Linked Resources | 未来能力 |
| 附件系统 | 暂缓 |

---

# 13. 总结

StoneFlow 的 Task Detail 不采用单一详情形态，而采用四层模型：

```txt
Row      → 快速管理
Preview  → 快速确认
Drawer   → 轻量编辑
Page     → 完整详情
```

最终原则是：

> 日常任务处理不离开列表，轻量编辑使用 Drawer，快速查看使用 Space Preview，所有重内容和完整上下文下放到独立页面。

这套设计能同时满足：

- 个人 TODO 的轻量感；
- 桌面端效率工具的键盘流；
- Linear 式的清晰信息架构；
- 未来复杂任务、Activity、Linked Resources、Focus Mode 的拓展空间。

下一份文档应继续细化：

```txt
Task Drawer 产品与 UI 设计文档
```

该文档需要专门约束 Drawer 的线框、区域布局、滚动规则、Links Popover、Footer 操作、空状态与 V1 实现边界。
