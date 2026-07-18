# StoneFlow Task Drawer 产品与 UI 设计文档

## 0. 文档信息

| 项目 | 内容 |
|---|---|
| 文档名称 | StoneFlow Task Drawer 产品与 UI 设计文档 |
| 文档目的 | 明确 Task Drawer 的产品定位、信息架构、UI 线框、交互规则、组件边界与 V1 实现范围 |
| 适用范围 | Task Drawer、Task Links、属性编辑、标签选择、项目选择、自动保存状态、轻量操作菜单 |
| 上游文档 | StoneFlow Task 详情形态与交互设计文档 |
| 当前阶段 | Task Drawer 重构方案定稿 |
| 设计关键词 | 轻量、无框、固定 Header、滚动 Body、固定 Footer、自动保存、属性按钮、Popover |

---

## 0.1 阶段 0 对齐说明

本文档保留为 Task Drawer 的产品与 UI 上游文档，负责约束 Task Drawer 的轻量编辑形态、信息架构、交互规则和 V1 边界。

实际落地以《StoneFlow Entity Detail System 重构总方案》为总控文档。后续实现需要遵守以下补充决策：

1. Task Drawer 是 Entity Detail System 的第一个 Drawer 实现。
2. Project Drawer 后续采用同一套 Drawer 心智模型，但 Project 字段和业务 section 留在 `src/features/project/detail/`。
3. Drawer 壳、Header / Body / Footer、Section、Field Row、Save Status 等纯 UI primitive 放在 `src/shared/ui/detail/`。
4. 自动保存状态机放在 `src/shared/autosave/`。
5. Task Drawer 具体字段、Links、autosave adapter 放在 `src/features/task/detail/`。
6. 旧 Drawer 的 Activity tab、Drawer 内 Activity 查询、手动保存主按钮不再兼容，实施时直接删除。

---

# 1. Drawer 定位

## 1.1 核心定位

Task Drawer 是 StoneFlow 中 Task 的日常主编辑入口。

它不是完整详情页，也不是单纯表单，而是：

> 介于轻量查看和重型编辑之间的任务编辑抽屉。

它需要满足三类高频行为：

1. 快速查看当前任务的基本上下文；
2. 快速补充备注、链接、标签等信息；
3. 快速修改状态、优先级、时间、项目等属性。

## 1.2 Drawer 的边界

Drawer 应该保持轻量，不承载完整任务上下文。

### Drawer 做什么

| 能力 | 说明 |
|---|---|
| 编辑标题 | Header 中无框输入 |
| 编辑备注 | Body 中轻量无框输入 |
| 编辑属性 | 状态、优先级、时间等 Outline Button |
| 编辑标签 | Chip + Add Label |
| 编辑项目 | 单独 Project Selector |
| 管理 Links | 轻量 Link Row + Popover 新建 / 编辑 |
| 查看保存状态 | Footer 中展示 Saved / Saving / Failed |
| 查看更新时间 | Footer 中展示 Updated time |
| 归档任务 | Footer 常驻 Archive |
| 打开独立页 | Header 中 Open Page |

### Drawer 不做什么

| 不做内容 | 原因 |
|---|---|
| Activity Timeline | 会让 Drawer 变重，统一放到 Task Page |
| 评论区 | 个人 TODO 当前不需要 |
| 长文档编辑 | 任务超过轻量备注时应链接外部文档 |
| 重型 Markdown 编辑器 | V1 不需要，容易把 Drawer 做重 |
| 完整附件系统 | V1 只做 URL Links，附件后续作为 Linked Resources 扩展 |
| 复杂历史 Diff | 放到独立页面未来扩展 |
| Pin | 非刚需，后续再做 |

## 1.3 与其他 Task 形态的关系

| 形态 | 定位 | 与 Drawer 的关系 |
|---|---|---|
| Row | 快速管理 | Row 点击打开 Drawer |
| Preview | 快速确认 | Preview 不编辑，Enter 可进入 Drawer |
| Drawer | 轻量编辑 | 日常主入口 |
| Page | 完整详情 | Drawer 中 Open Page 进入 |

核心原则：

> 轻操作留在 Drawer，重内容下放 Page。

---

# 2. 总体信息架构

## 2.1 三段式结构

Task Drawer 采用三段式结构：

```txt
┌────────────────────────────────────────────────────────────┐
│ Header Fixed                                               │
├────────────────────────────────────────────────────────────┤
│ Body Scroll                                                │
├────────────────────────────────────────────────────────────┤
│ Footer Fixed                                               │
└────────────────────────────────────────────────────────────┘
```

### 区域职责

| 区域 | 是否固定 | 职责 |
|---|---:|---|
| Header | 固定 | 当前任务识别、标题编辑、打开独立页、关闭 |
| Body | 滚动 | 备注、属性、标签、项目、Links |
| Footer | 固定 | 更新时间、保存状态、更多操作、归档 |

## 2.2 总体线框

```txt
┌────────────────────────────────────────────────────────────┐
│ [ Task title input...................... ] [Open] [⋯] [×] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ [ Note input                                               │
│   Add notes, context, short description...                 │
│                                                            │
│ ]                                                          │
│                                                            │
│ Properties                                                 │
│ [ ○ Todo ▾ ] [ ▮ High ▾ ] [ Due date ▾ ]                   │
│ [ Plan date ▾ ] [ Reminder ▾ ]                             │
│                                                            │
│ Labels                                                     │
│ [ Bug ] [ UI ] [ + Add label ]                             │
│                                                            │
│ Project                                                    │
│ [ StoneFlow ▾ ]                                            │
│                                                            │
│ Links                                                      │
│ [icon] [ 技术方案文档                 ] [Open] [⋯]          │
│ [icon] [ Figma 设计稿                ] [Open] [⋯]          │
│ + Add link                                                 │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ Updated 2 min ago  [Saved]                  [⋯] [Archive] │
└────────────────────────────────────────────────────────────┘
```

## 2.3 信息优先级

| 优先级 | 内容 | 原因 |
|---|---|---|
| P0 | 标题 | 任务核心识别信息 |
| P0 | 备注 | 用户打开 Drawer 的主要目的之一 |
| P1 | 属性 | 高频编辑，但 Row 上也有部分快捷能力 |
| P1 | 标签 | 轻量组织信息 |
| P1 | 项目 | 任务归属信息，单独展示 |
| P1 | Links | 任务行动入口 |
| P2 | 更新时间 / 保存状态 | 状态反馈，不抢主视觉 |
| P2 | Archive / More | 低频操作 |

---

# 3. Layout 规则

## 3.1 固定 Header

Header 固定在 Drawer 顶部。

```txt
[ Task title input ]            [Open Page] [More] [Close]
```

作用：

- 当前任务标题始终可见；
- 用户滚动到 Body 深处时仍知道当前编辑对象；
- 随时可以打开独立页面；
- 随时可以关闭 Drawer。

## 3.2 滚动 Body

Body 是主要编辑区，允许滚动。

包含：

```txt
Note
Properties
Labels
Project
Links
```

Body 的滚动不应该影响 Header 和 Footer。

## 3.3 固定 Footer

Footer 固定在 Drawer 底部。

```txt
Updated 2 min ago [Saved]                   [...] [Archive]
```

作用：

- 提供保存状态反馈；
- 展示最后更新时间；
- 提供归档入口；
- 提供更多低频操作入口。

## 3.4 滚动遮挡处理

Header 和 Footer 固定后，需要处理 Body 内容被遮挡的问题。

建议规则：

```txt
Drawer root: height: 100%
Header: shrink-0
Body: flex-1 overflow-y-auto
Footer: shrink-0
```

Body 内部需要上下 padding，避免最后一个 Link 被 Footer 挡住。

```txt
Body padding bottom >= Footer height + 12px
```

---

# 4. Header 设计

## 4.1 Header 线框

```txt
┌────────────────────────────────────────────────────────────┐
│ [ Task title input...................... ] [Open] [⋯] [×] │
└────────────────────────────────────────────────────────────┘
```

## 4.2 Header 元素

| 元素 | 类型 | 说明 |
|---|---|---|
| Task title input | 无框输入 | 编辑任务标题 |
| Open Page | Button | 打开独立详情页 |
| More | Icon Button | 打开 Drawer 级更多菜单 |
| Close | Icon Button | 关闭 Drawer |

## 4.3 Title Input 设计

标题输入框采用无框设计。

### 视觉规则

| 项 | 建议 |
|---|---|
| 背景 | transparent |
| 边框 | none |
| 字号 | 比正文更大 |
| 字重 | medium / semibold |
| 高度 | 与 Header 统一 |
| Placeholder | Untitled task / 新任务 |
| Hover | 不需要明显边框，可轻微背景 |
| Focus | 只显示轻微 focus ring 或底部微弱线条 |

### 交互规则

| 行为 | 结果 |
|---|---|
| 打开 Drawer | 不自动聚焦标题 |
| 点击标题 | 进入编辑 |
| 输入标题 | debounce 自动保存 |
| 标题为空 | 允许短暂为空，失焦时回退或保留 placeholder 视产品规则而定 |
| Esc | 若输入态，按组件规则退出输入态或关闭 Drawer |

### 不默认聚焦的原因

Drawer 打开后不默认聚焦标题，是为了保留键盘浏览能力：

```txt
Drawer 打开
↑ / ↓ 仍然可以切换任务
Space 仍然可以触发 Preview
Esc 可以关闭 Drawer
```

如果默认聚焦输入框，上下键会被输入框吞掉，任务浏览效率会下降。

## 4.4 Open Page Button

### 定位

Open Page 是从轻量 Drawer 进入完整详情页的主入口。

### 行为

```txt
点击 Open Page → navigate('/tasks/:taskId')
```

### 视觉建议

- 可以使用文字按钮 `Open Page`；
- 也可以使用小图标 + tooltip；
- 当前阶段建议文字清晰优先。

## 4.5 Header More Menu

Header More 是 Drawer 级别的更多操作。

建议包含：

```txt
More
├─ Copy task link
├─ Duplicate
├─ Convert to Project
├─ Create Project from Task
├─ Move to Trash
└─ Delete permanently    // 仅 Trash 场景出现
```

说明：

- Archive 已经在 Footer 常驻，不必在 Header More 重复；
- Move to Trash 属于危险操作，放进 More；
- Delete permanently 只在 Trash 内出现；
- Convert / Create Project 可先作为未来能力预留。

## 4.6 Close Button

点击 Close 后：

```txt
关闭 Drawer
移除 URL query 中的 task 参数
保留列表 selectedTaskId
```

关闭后仍保留选中态，方便用户继续使用 Space / Enter 操作当前任务。

---

# 5. Body 设计

## 5.1 Body 总体结构

```txt
Note input

Properties
[Status] [Priority] [Due] [Plan] [Reminder]

Labels
[Bug] [UI] [+ Add label]

Project
[StoneFlow]

Links
[icon] [ 技术方案文档 ] [Open] [...]
[icon] [ Figma 设计稿 ] [Open] [...]
+ Add link
```

## 5.2 Section 间距规则

Drawer 是轻量编辑区，间距不能太松，也不能过密。

建议：

| 层级 | 间距 |
|---|---|
| Section 与 Section | 中等间距 |
| Section title 与内容 | 小间距 |
| 同组按钮 | 小间距 |
| Link row 与 Link row | 小间距 |

视觉目标：

> 看起来像一张轻量编辑卡，而不是复杂设置页。

---

# 6. Note 区域

## 6.1 线框

```txt
┌────────────────────────────────────────────────────────────┐
│ [ Note input                                               │
│   Add notes, context, short description...                 │
│                                                            │
│ ]                                                          │
└────────────────────────────────────────────────────────────┘
```

## 6.2 定位

Note 是任务的补充上下文，不是长文档。

典型用途：

- 补充一句说明；
- 记录执行要点；
- 放少量上下文；
- 写临时备忘；
- 给链接补充说明。

## 6.3 视觉规则

| 项 | 建议 |
|---|---|
| 边框 | 无框 |
| 背景 | transparent |
| Placeholder | 弱提示 |
| 最小高度 | 适中，避免太空 |
| 最大高度 | 不建议过大，Body 可滚动 |
| 字号 | 正文大小 |
| Resize | 不显示浏览器默认 resize handle |

## 6.4 交互规则

| 行为 | 结果 |
|---|---|
| 点击 Note | 聚焦输入 |
| 输入 | debounce 自动保存 |
| 粘贴普通文本 | 直接插入 |
| 粘贴 URL | V1 可作为普通文本，后续可识别为 Link |
| 空内容 | 显示 placeholder |

## 6.5 V1 边界

V1 只做普通 textarea / 轻量多行输入。

暂不做：

- Markdown Preview；
- Block Editor；
- 富文本；
- 图片粘贴；
- 文件拖拽；
- AI 总结。

---

# 7. Properties 区域

## 7.1 线框

```txt
Properties
[ ○ Todo ▾ ] [ ▮ High ▾ ] [ Due date ▾ ]
[ Plan date ▾ ] [ Reminder ▾ ]
```

## 7.2 定位

Properties 是任务的关键结构化字段。

它们应该比表单轻，但比普通文本明确。

因此统一使用：

```txt
Outline Button + Icon + Value + Dropdown
```

## 7.3 字段范围

| 字段 | 显示方式 | 说明 |
|---|---|---|
| Status | Button | 任务状态 |
| Priority | Button | 优先级 |
| Due date | Button | 截止时间 |
| Plan date | Button | 计划时间 |
| Reminder | Button | 提醒时间 |

## 7.4 布局规则

使用 flex-wrap，不固定列数。

```txt
宽度足够：
[Status] [Priority] [Due] [Plan] [Reminder]

宽度不足：
[Status] [Priority] [Due]
[Plan] [Reminder]
```

这样 Drawer 宽度变化时仍然稳定。

## 7.5 Button 状态

| 状态 | 表现 |
|---|---|
| 有值 | 正常 outline button，显示 value |
| 无值 | 弱化 outline / ghost outline，显示 placeholder |
| Hover | 轻背景 |
| Focus | 可见 focus ring |
| Active | 下拉打开 |
| Saving | Footer 显示 Saving，不建议每个按钮单独 loading |

## 7.6 Dropdown 规则

每个 Property Button 点击后打开对应下拉。

### Status Dropdown

```txt
Todo
In Progress
Done
Canceled
```

具体状态枚举以数据模型为准。

### Priority Dropdown

```txt
No priority
Low
Medium
High
Urgent
```

### Date Dropdown

Due / Plan / Reminder 都使用日期选择下拉，允许快捷选项：

```txt
Today
Tomorrow
This week
Custom...
Clear
```

是否包含 `Clear` 取决于该字段是否允许为空。

## 7.7 保存规则

属性选择后立即保存。

```txt
点击属性按钮
→ 打开下拉
→ 选择选项
→ 更新本地状态
→ 写入数据库
→ 写入 Activity
→ Footer 保存状态更新
```

---

# 8. Labels 区域

## 8.1 线框

```txt
Labels
[ Bug ] [ UI ] [ + Add label ]
```

## 8.2 定位

Labels 用于轻量分类和过滤，不应抢主视觉。

## 8.3 显示规则

| 标签数量 | 展示 |
|---:|---|
| 0 | `[ + Add label ]` |
| 1-4 | 直接展示所有标签 + Add |
| >4 | 展示前几个 + `+N` + Add |

示例：

```txt
Labels
[ Bug ] [ UI ] [ Design ] [ +3 ] [ + ]
```

## 8.4 视觉规则

| 项 | 建议 |
|---|---|
| 形态 | Chip |
| 颜色 | 可用弱色点 / 左侧 dot |
| 背景 | 不建议大面积高饱和色 |
| 删除 | Chip 内可显示 x，或在菜单中删除 |
| Add | 与 chip 同高的轻量按钮 |

## 8.5 Add Label 交互

点击 Add Label 打开下拉 / Command Popover：

```txt
Search label...

Bug
UI
Design

+ Create new label
```

选择后立即保存。

## 8.6 空状态

无标签时：

```txt
Labels
[ + Add label ]
```

不需要显示说明性空文案，避免 Drawer 变重。

---

# 9. Project 区域

## 9.1 线框

```txt
Project
[ StoneFlow ▾ ]
```

无具体项目时：

```txt
Project
[ Inbox / 独立事项 ▾ ]
```

## 9.2 定位

Project 是任务归属，不应和普通属性完全混在一起。

原因：

- 项目决定任务所在上下文；
- 项目通常比标签更稳定；
- 未来任务转项目、项目归档、项目视图都依赖这个字段。

因此 Project 单独成区。

## 9.3 交互规则

点击 Project Selector 打开项目选择器。

```txt
Search project...

Inbox
独立事项
StoneFlow
Design Lab

+ Create project
```

是否允许在 Drawer 内创建项目，可按 V1 范围决定。

## 9.4 保存规则

选择项目后立即保存，并写入 Activity。

```txt
changed project from Inbox to StoneFlow
```

---

# 10. Links 区域

## 10.1 定位

Links 是任务的轻量行动入口。

Task 本体一般是 30 字以内，更多内容可能放在外部文档、设计稿、网页或其他资源里。因此 Drawer 需要有轻量 Links 区域，让用户从任务直接进入相关资料。

## 10.2 线框

```txt
Links
[icon] [ 技术方案文档                 ] [Open] [⋯]
[icon] [ Figma 设计稿                  ] [Open] [⋯]
+ Add link
```

## 10.3 Link Row 结构

```txt
┌────────────────────────────────────────────────────────────┐
│ [icon] [ Link title.......................... ] [Open] [⋯] │
└────────────────────────────────────────────────────────────┘
```

| 元素 | 说明 |
|---|---|
| icon | 根据 URL 类型或默认 link icon 展示 |
| title | Link 展示名 |
| Open | 打开链接 |
| More | Link 级操作菜单 |

## 10.4 Link Row 视觉规则

| 项 | 建议 |
|---|---|
| 高度 | 轻量行高度 |
| 背景 | 默认透明或极弱背景 |
| Hover | 行背景轻微变化 |
| Title | 单行省略 |
| URL | V1 可不显示，保持简洁 |
| Icon | 小尺寸，弱化 |
| Open | 小按钮 |
| More | icon button |

## 10.5 Link Open 行为

点击 Open：

```txt
打开外部浏览器或系统默认应用
```

Tauri 中后续由 shell/open 类能力处理。

## 10.6 Link More Menu

```txt
Link More
├─ Copy link
├─ Edit
└─ Remove
```

说明：

- Copy link：复制 URL；
- Edit：打开 Edit Link Popover；
- Remove：移除该 Link，建议不弹重确认，可通过未来回退机制处理。

---

# 11. Link Add / Edit Popover

## 11.1 设计定位

新建和编辑 Links 直接使用小 Popover，不打开大弹窗、不跳独立页面。

原因：

- Link 是轻量附属信息；
- Drawer 本身就是轻量编辑区；
- Popover 可以在当前上下文中快速完成操作。

## 11.2 Add Link Popover 线框

```txt
┌────────────────────────────────────┐
│ Add link                           │
│                                    │
│ Title                              │
│ [ 技术方案文档                  ]  │
│                                    │
│ URL                                │
│ [ https://...                   ]  │
│                                    │
│                        Cancel Add  │
└────────────────────────────────────┘
```

## 11.3 Edit Link Popover 线框

```txt
┌────────────────────────────────────┐
│ Edit link                          │
│                                    │
│ Title                              │
│ [ Figma 设计稿                  ]  │
│                                    │
│ URL                                │
│ [ https://figma.com/...         ]  │
│                                    │
│                      Cancel Save   │
└────────────────────────────────────┘
```

## 11.4 字段规则

| 字段 | 是否必填 | 规则 |
|---|---:|---|
| Title | 可选 / 推荐 | 为空时可用 URL hostname 生成 |
| URL | 必填 | 必须是合法 URL，或后续支持 file path |

V1 推荐只支持 URL。

## 11.5 URL 处理规则

| 输入 | 处理 |
|---|---|
| `https://example.com` | 直接接受 |
| `http://example.com` | 直接接受 |
| `example.com` | 可自动补 `https://`，也可提示用户 |
| 空 URL | 禁止提交 |
| 非法 URL | 显示错误 |

推荐 V1：

```txt
如果缺少协议，自动补 https://
如果仍非法，显示错误
```

## 11.6 Title 生成规则

当 Title 为空时：

```txt
优先使用 URL hostname
例如：https://figma.com/file/xxx → figma.com
```

后续 V2 可考虑获取网页 title，但 V1 不需要。

## 11.7 Popover 操作规则

| 操作 | 结果 |
|---|---|
| 点击 + Add link | 打开 Add Link Popover |
| 点击 Link More / Edit | 打开 Edit Link Popover |
| 点击 Add | 校验并新增 Link |
| 点击 Save | 校验并保存 Link |
| 点击 Cancel | 关闭 Popover，不保存 |
| Esc | 关闭 Popover |
| Enter | 在字段内可提交，具体按表单规则 |

## 11.8 保存与 Activity

新增 Link：

```txt
保存 TaskLink
写入 Activity: added link
Footer 显示 Saved
```

编辑 Link：

```txt
更新 TaskLink
写入 Activity: updated link
Footer 显示 Saved
```

删除 Link：

```txt
删除 / 软删除 TaskLink
写入 Activity: removed link
Footer 显示 Saved
```

---

# 12. Footer 设计

## 12.1 Footer 线框

```txt
┌────────────────────────────────────────────────────────────┐
│ Updated 2 min ago  [Saved]                    [⋯] [Archive] │
└────────────────────────────────────────────────────────────┘
```

## 12.2 Footer 元素

| 元素 | 类型 | 说明 |
|---|---|---|
| Updated time | Text | 当前任务最后更新时间 |
| Save status | Badge / Text | Saved / Saving / Failed |
| More | Icon Button | 低频操作入口 |
| Archive | Button | 常驻归档操作 |

## 12.3 Updated Time

展示格式：

```txt
Updated just now
Updated 2 min ago
Updated yesterday
Updated Apr 26
```

具体格式可以统一由全局日期格式工具处理。

## 12.4 Save Status

可能状态：

| 状态 | 文案 | 说明 |
|---|---|---|
| idle | 不展示或 Saved | 无保存任务 |
| saving | Saving... | 正在保存 |
| saved | Saved | 已保存 |
| failed | Failed · Retry | 保存失败，可重试 |

本地优先场景下 failed 低频，但必须预留。

## 12.5 Footer More Menu

建议包含：

```txt
Footer More
├─ Move to Trash
├─ Duplicate
├─ Convert to Project
├─ Create Project from Task
└─ Copy task link
```

说明：

- Move to Trash 放 More，避免误触；
- Archive 常驻；
- Duplicate、Convert、Copy 等低频操作放 More；
- 具体是否和 Header More 合并，可在实现时决定。

## 12.6 Archive Button

Archive 是 Footer 常驻操作。

### 行为

```txt
点击 Archive
→ 归档当前任务
→ Drawer 关闭或切换到下一个任务，具体由列表规则决定
→ 写入 Activity
```

操作回退机制暂定，后续另开方案。

---

# 13. 空状态与异常状态

## 13.1 无备注

```txt
Note input 显示 placeholder：
Add notes, context, short description...
```

不额外展示空状态。

## 13.2 无标签

```txt
Labels
[ + Add label ]
```

## 13.3 无项目

根据 StoneFlow 的项目语义展示：

```txt
Project
[ Inbox ▾ ]
```

或：

```txt
Project
[ 独立事项 ▾ ]
```

具体取决于任务当前归属规则。

## 13.4 无 Links

```txt
Links
+ Add link
```

不需要额外说明文案。

## 13.5 保存失败

Footer 显示：

```txt
Failed · Retry
```

用户点击 Retry 后重新保存当前失败字段或最近一次失败操作。

## 13.6 Task 不存在

如果 URL query 中的 taskId 不存在：

```txt
Drawer 不打开
清理 query
可显示 Toast：Task not found
```

## 13.7 Task 已归档 / 已删除

如果当前任务已经归档或在回收站：

- Drawer 可根据当前页面上下文决定是否显示；
- Archive 按钮可能变为 Restore；
- Move to Trash / Delete permanently 按状态切换。

具体规则在 Archive / Trash 文档中定义。

---

# 14. 自动保存规则

## 14.1 保存策略

| 内容 | 保存方式 |
|---|---|
| 标题 | debounce 自动保存 |
| 备注 | debounce 自动保存 |
| 属性 | 选择后立即保存 |
| 标签 | 操作后立即保存 |
| 项目 | 选择后立即保存 |
| Links | Add / Save / Remove 后立即保存 |
| Archive | 点击后立即执行 |

## 14.2 Debounce 建议

| 字段 | 建议 |
|---|---|
| 标题 | 500ms |
| 备注 | 800ms - 1200ms |

说明：

- 标题较短，保存可以更快；
- 备注输入较连续，保存可以稍慢；
- 本地优先下保存成本低，但仍需要避免过度写入。

## 14.3 切换任务时的保存处理

当 Drawer 打开且用户切换任务：

```txt
flush 当前 debounce 保存
切换 selectedTaskId
Drawer 内容更新
URL query 更新
```

如果保存失败：

```txt
不阻断切换
Footer / Toast 显示失败状态
后续可重试
```

## 14.4 Activity 记录

Drawer 不展示 Activity，但操作仍写入 Activity。

| 操作 | Activity |
|---|---|
| 标题修改 | changed title，可选 |
| 备注修改 | updated description，不记录输入过程 |
| 状态修改 | changed status |
| 优先级修改 | changed priority |
| 时间修改 | changed due / plan / reminder |
| 标签修改 | added / removed label |
| 项目修改 | changed project |
| Link 新增 | added link |
| Link 编辑 | updated link |
| Link 删除 | removed link |
| 归档 | archived task |
| 移入回收站 | moved task to trash |

---

# 15. 交互事件流

## 15.1 单击 Row 打开 Drawer

```txt
click task row
→ set selectedTaskId
→ open drawer
→ update URL: /tasks?task=xxx
→ do not focus input
```

## 15.2 点击其他 Row 切换 Drawer 内容

```txt
click another task row
→ flush current autosave
→ set selectedTaskId(newId)
→ drawer content switches
→ update URL query
```

## 15.3 Enter 打开 Drawer

```txt
selectedTaskId exists
→ press Enter
→ open drawer
→ update URL query
```

## 15.4 Esc 关闭 Drawer

```txt
if popover open:
  close popover
else if drawer open:
  close drawer
  remove task query
else:
  normal behavior
```

说明：

Popover 优先级高于 Drawer。

## 15.5 Open Page

```txt
click Open Page
→ navigate /tasks/:taskId
```

## 15.6 Add Link

```txt
click + Add link
→ open Add Link Popover
→ input title / url
→ click Add
→ validate
→ create TaskLink
→ close Popover
→ update Links list
→ save status: Saved
```

## 15.7 Edit Link

```txt
click Link More
→ Edit
→ open Edit Link Popover
→ modify title / url
→ click Save
→ validate
→ update TaskLink
→ close Popover
→ update Links list
```

## 15.8 Remove Link

```txt
click Link More
→ Remove
→ remove TaskLink
→ update Links list
→ write Activity
```

是否需要二次确认暂缓。V1 可不确认，依赖未来回退机制。

---

# 16. 视觉风格规则

## 16.1 总体气质

Drawer 的视觉应该是：

- 轻；
- 干净；
- 少边框；
- 少强装饰；
- 信息层级清楚；
- 与 StoneFlow 主界面保持一致。

## 16.2 无框输入原则

标题和备注都采用无框输入。

原因：

- 弱化表单感；
- 更像自然编辑；
- 符合轻量 Drawer 定位。

但无框不等于无反馈。

需要保留：

- hover 提示；
- focus ring / focus background；
- placeholder；
- 保存状态。

## 16.3 Outline Button 原则

Properties 使用 outline button。

目标：

- 比普通文本更可点击；
- 比表单控件更轻；
- 和 shadcn button / dropdown 体系保持一致。

## 16.4 Section Title 规则

Section Title 保持弱化，不抢标题主视觉。

例如：

```txt
Properties
Labels
Project
Links
```

建议使用小字号、弱颜色、medium 字重。

## 16.5 危险操作弱化

危险操作不要常驻暴露。

| 操作 | 位置 |
|---|---|
| Archive | Footer 常驻 |
| Move to Trash | More Menu |
| Delete permanently | 仅 Trash 场景出现 |

---

# 17. 可访问性与键盘规则

## 17.1 Focus 顺序

推荐 Tab 顺序：

```txt
Title input
Open Page
More
Close
Note
Status
Priority
Due
Plan
Reminder
Labels
Project
Links
Footer More
Archive
```

## 17.2 键盘规则

| 按键 | 行为 |
|---|---|
| Tab | 在 Drawer 可聚焦元素间移动 |
| Shift + Tab | 反向移动 |
| Enter | 激活按钮 / 提交 Popover |
| Esc | 关闭 Popover / Drawer |
| ↑ / ↓ | 非输入态下由列表处理；输入态下由输入控件处理 |
| Space | 非输入态下可触发 Preview；按钮聚焦时按原生按钮行为 |

## 17.3 Tooltip

Icon-only 按钮需要 Tooltip：

| 按钮 | Tooltip |
|---|---|
| More | More actions |
| Close | Close drawer |
| Link More | Link actions |

Open Page 如果使用图标，也需要 Tooltip。

---

# 18. V1 实现边界

## 18.1 V1 必做

| 模块 | 内容 |
|---|---|
| Drawer Shell | 三段式布局 |
| Header | Title input、Open Page、More、Close |
| Body | Note、Properties、Labels、Project、Links |
| Footer | Updated time、Saved status、More、Archive |
| Properties | Status、Priority、Due、Plan、Reminder |
| Links | Link Row、Open、More、Add Link |
| Link Popover | Add / Edit |
| 自动保存 | 标题、备注 debounce；其他立即保存 |
| URL 同步 | `/tasks?task=xxx` |
| 键盘 | Enter 打开，Esc 关闭，非输入态上下键切换 |

## 18.2 V1 暂缓

| 暂缓项 | 原因 |
|---|---|
| Activity 展示 | 放独立页面 |
| Pin | 非刚需 |
| Markdown 重编辑器 | 容易过重 |
| 附件系统 | 技术复杂度较高 |
| Link 网页标题自动抓取 | 非刚需 |
| 删除二次确认 / Undo | 回退方案另开 |
| Focus Mode | 独立页面后续能力 |
| Convert Task to Project 完整流程 | 先保留入口或暂缓 |

---

# 19. 与独立页面的边界

Drawer 与 Page 的边界必须清楚，避免 Drawer 逐渐膨胀。

| 内容 | Drawer | Page |
|---|---:|---:|
| 标题 | ✅ | ✅ |
| 备注 | ✅ | ✅ |
| 属性 | ✅ | ✅ |
| 标签 | ✅ | ✅ |
| 项目 | ✅ | ✅ |
| Links | ✅ 轻量 | ✅ 完整 |
| Activity | ❌ | ✅ |
| 重操作 | 少量入口 | ✅ |
| 长内容 | 一般 | ✅ |
| 历史 / Diff | ❌ | 未来 |
| Focus Mode | ❌ | 未来 |

核心原则：

> 只要一个功能让 Drawer 明显变重，就应该进入 Page。

---

# 20. 组件拆分建议

## 20.1 Drawer 组件树

```txt
TaskDrawer
├─ TaskDrawerHeader
│  ├─ TaskTitleInput
│  ├─ OpenTaskPageButton
│  ├─ TaskMoreMenu
│  └─ CloseDrawerButton
│
├─ TaskDrawerBody
│  ├─ TaskNoteEditor
│  ├─ TaskPropertiesSection
│  │  ├─ TaskStatusButton
│  │  ├─ TaskPriorityButton
│  │  ├─ TaskDueDateButton
│  │  ├─ TaskPlanDateButton
│  │  └─ TaskReminderButton
│  │
│  ├─ TaskLabelsSection
│  │  ├─ TaskLabelChip
│  │  └─ AddLabelButton
│  │
│  ├─ TaskProjectSection
│  │  └─ TaskProjectSelector
│  │
│  └─ TaskLinksSection
│     ├─ TaskLinkRow
│     ├─ TaskLinkMoreMenu
│     ├─ AddTaskLinkButton
│     └─ TaskLinkPopover
│
└─ TaskDrawerFooter
   ├─ TaskUpdatedAt
   ├─ TaskSaveStatus
   ├─ TaskFooterMoreMenu
   └─ ArchiveTaskButton
```

## 20.2 组件职责

| 组件 | 职责 | 不做什么 |
|---|---|---|
| TaskDrawer | 控制布局与打开状态 | 不处理字段细节 |
| TaskDrawerHeader | 标题与 Header 操作 | 不处理 Body 内容 |
| TaskDrawerBody | 滚动容器 | 不处理 Footer 状态 |
| TaskDrawerFooter | 保存状态与底部操作 | 不放 Activity |
| TaskTitleInput | 标题编辑 | 不处理路由 |
| TaskNoteEditor | 备注编辑 | 不做 Markdown 重编辑器 |
| TaskPropertiesSection | 属性按钮集合 | 不处理标签 / Links |
| TaskLabelsSection | 标签展示与选择 | 不处理项目 |
| TaskProjectSection | 项目选择 | 不处理标签 |
| TaskLinksSection | Links 列表与新增 | 不处理附件系统 |
| TaskLinkPopover | Link 新建 / 编辑 | 不跳转页面 |

## 20.3 是否复用 Page 组件

当前阶段不强制 Drawer 与 Page 完全复用。

建议原则：

- 字段级组件可以复用；
- 布局级组件可以分开；
- 不要为了复用牺牲 Drawer 的轻量布局；
- 等 Page 设计稳定后，再抽公共 detail 组件。

可复用组件：

```txt
TaskTitleInput
TaskNoteEditor
TaskPropertiesSection
TaskLabelsSection
TaskProjectSection
TaskLinksSection
TaskLinkRow
TaskLinkPopover
```

不必强复用组件：

```txt
TaskDrawerLayout
TaskPageLayout
TaskDrawerFooter
TaskPageSidebar
```

---

# 21. 数据字段建议

## 21.1 Drawer 需要的 Task 字段

```ts
type TaskDrawerTask = {
  id: string
  title: string
  note?: string
  status: string
  priority: string | null
  dueAt?: string | null
  planAt?: string | null
  reminderAt?: string | null
  projectId?: string | null
  labelIds: string[]
  updatedAt: string
  archivedAt?: string | null
  deletedAt?: string | null
}
```

## 21.2 TaskLink 字段

```ts
type TaskLink = {
  id: string
  taskId: string
  title: string
  url: string
  type: 'url' | 'file'
  createdAt: string
  updatedAt: string
}
```

V1 只使用：

```txt
type = 'url'
```

`file` 作为未来附件 / 本地资源能力预留。

---

# 22. 开发顺序建议

## 22.1 M1：Drawer Shell

目标：先跑通 Drawer 打开、关闭、三段式布局。

任务：

1. 创建 `TaskDrawer`；
2. 接入 `selectedTaskId`；
3. 接入 URL query；
4. 实现 Header / Body / Footer 布局；
5. 实现 Esc 关闭；
6. 实现点击其他 Row 切换内容。

## 22.2 M2：Header / Footer

任务：

1. Title input；
2. Open Page；
3. Header More；
4. Close；
5. Updated time；
6. Save status；
7. Footer More；
8. Archive。

## 22.3 M3：Body 基础编辑

任务：

1. Note editor；
2. Properties buttons；
3. Labels section；
4. Project selector；
5. 自动保存接入。

## 22.4 M4：Links

任务：

1. TaskLinksSection；
2. TaskLinkRow；
3. Open link；
4. Link More Menu；
5. Add Link Popover；
6. Edit Link Popover；
7. Link 保存与 Activity。

## 22.5 M5：细节 polish

任务：

1. 空状态；
2. 保存失败状态；
3. focus / hover；
4. 键盘体验；
5. 小屏 / 窄宽度适配；
6. 与 Preview / Page 入口联动。

---

# 23. 决策记录

| 决策 | 结论 |
|---|---|
| Drawer 定位 | 轻量查看 + 快速补充 + 属性编辑 |
| Drawer 是否是完整详情页 | 不是 |
| Header | `[ Task title input ] [Open Page] [More] [Close]` |
| Footer | `Updated 2 min ago [Saved] [...] [Archive]` |
| Body 内容 | Note、Properties、Labels、Project、Links |
| Activity | 不放 Drawer，放 Page |
| Links 新建 / 编辑 | Popover |
| Links 是否做附件 | V1 不做，未来扩展 |
| 是否默认聚焦 | 不默认聚焦 |
| 是否支持 Pin | 暂缓 |
| 是否支持 Markdown | V1 不做重型 Markdown |
| 是否支持 Cmd/Ctrl + S | 不需要，自动保存 |
| 是否支持 E 快捷键 | 不需要 |
| Archive | Footer 常驻 |
| Move to Trash | More Menu |

---

# 24. 总结

Task Drawer 是 StoneFlow Task 日常编辑的主入口，但它必须保持轻量。

最终结构为：

```txt
Fixed Header:
[ Task title input ] [Open Page] [More] [Close]

Scrollable Body:
Note
Properties
Labels
Project
Links

Fixed Footer:
Updated time [Saved] [...] [Archive]
```

它的核心价值是：

- 不离开列表上下文；
- 快速补充任务信息；
- 快速修改结构化属性；
- 通过 Links 连接外部资料；
- 通过 Open Page 把重内容交给独立页面。

这份文档约束了 Drawer 不膨胀、不抢 Page 的职责，也为后续技术实现文档提供明确组件拆分与开发边界。

下一份文档建议继续编写：

```txt
StoneFlow Task Detail 技术实现文档
```
