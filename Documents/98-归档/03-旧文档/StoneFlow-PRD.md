## StoneFlow PRD V1.2

> 单人桌面任务执行工具 · 可开发版

---

### 一、产品定义

#### 1.1 一句话定义

StoneFlow 是一款面向单人用户的桌面任务执行工具，核心目标是：

> 让用户以最短路径完成任务的记录、整理与执行。

#### 1.2 产品关键词

快 · 克制 · 键盘优先 · 桌面原生 · 本地优先 · 单人使用

#### 1.3 核心原则

| 原则 | 说明 |
|------|------|
| 快是最高原则 | 热启动 < 300ms，创建任务 < 1s，找到任务无需思考 |
| 结构清晰且稳定 | 用户始终知道自己在哪个上下文 |
| 功能克制 | 不做与任务执行无关的功能 |
| 键盘优先 | 核心操作均有快捷键覆盖 |
| 降低认知负担 | UI 服务行动，不是展示舞台 |

#### 1.4 不是什么

StoneFlow 不是团队协作平台、企业项目管理系统、文档知识库、笔记系统、日历应用、个人生活操作系统。

---

### 二、技术架构

#### 2.1 技术栈

| 层级 | 技术选型 |
|------|----------|
| 桌面壳 | Tauri 2（Rust）|
| 前端框架 | React + shadcn/ui + Tailwind CSS |
| 本地存储 | SQLite（via Tauri plugin，1.0 主存储）|
| 状态管理 | Zustand（乐观更新）|
| ID 策略 | UUID v7（时间有序）|
| 云存储 | NeonDB（Serverless Postgres，2.0 实现）|

#### 2.2 平台支持

跨平台：macOS · Windows · Linux（优先保证前两者体验）

#### 2.3 数据流

```JSON
UI → Zustand Store → SQLite → Store 更新 → UI
```

- 所有操作先更新 Store（乐观更新），再异步持久化到 SQLite
- 操作失败时回滚 Store 状态并提示用户

#### 2.4 排序策略

```sql
ORDER BY priority ASC, created_at DESC
```

P0 优先级最高，同优先级按创建时间倒序排列。

---

### 三、核心数据模型

#### 3.1 Space

```ts
Space {
  id:         UUIDv7
  name:       string
  color:      string | null
  created_at: timestamp
}
```

顶层语境容器，典型用例：Work · Personal · Study。每个 Space 下自动创建一个 Inbox Project。

#### 3.2 Project

```ts
Project {
  id:         UUIDv7
  name:       string
  space_id:   UUIDv7
  is_inbox:   boolean       // true = 该 Space 的 Inbox
  created_at: timestamp
}
```

- 每个 Space 有且仅有一个 `is_inbox = true` 的 Project
- Inbox Project 不可删除、不可重命名

#### 3.3 Task

```ts
Task {
  id:         UUIDv7
  title:      string
  status:     'todo' | 'done'
  priority:   0 | 1 | 2 | 3      // P0 最高
  project_id: UUIDv7              // 必填，默认指向当前 Space 的 Inbox
  tags:       string[]            // 1.0 低优先级，字段预留
  due_at:     timestamp | null    // 1.0 低优先级，字段预留
  note:       string
  sync_status: 'unsynced' | 'synced'  // 2.0 激活，1.0 默认 'unsynced'
  remote_id:  string | null           // 2.0 激活，1.0 默认 null
  created_at: timestamp
  updated_at: timestamp
}
```

#### 3.4 模型关系

```JSON
Space (1) → (N) Project
Project (1) → (N) Task
```

一个 Task 通过 project_id → space_id 间接隶属于一个 Space。

---

### 四、Inbox 机制

#### 4.1 定义

Inbox 是每个 Space 下的特殊 Project，是任务进入系统的默认落点，也是一个处理队列。

Inbox 不是普通 Project 的别名，它有独立的交互逻辑和处理语义。

#### 4.2 核心规则

- 快速创建任务时，默认进入**当前活跃 Space 的 Inbox**
- 创建时也可以手动选择进入其他 Project（Command 创建和主界面创建均支持）
- Inbox 中的 Task 有三种合法出路：
	1. 指派到具体 Project
	2. 标记完成
	3. 删除
- Inbox 在侧边栏始终显示，并展示当前未处理数量角标

#### 4.3 Inbox 页面设计

Inbox 页面强调**操作密度**，而非信息展示：

```JSON
[Inbox Header]
You have 8 tasks to process

[ ] Fix login bug          → assign project    P2
[ ] Update README          → assign project    P1
[ ] Buy server             → assign project    P3
```

**任务行特化：**
- 默认不显示 note
- 突出「指派 Project」操作按钮
- 优先级可快速修改

**键盘流操作（Inbox 专属）：**

| 快捷键 | 动作 |
|--------|------|
| `↓ / ↑` | 选择任务 |
| `1 ~ 4` | 设置优先级 P0 ~ P3 |
| `→` | 打开 Project 指派弹窗 |
| `Enter` | 标记完成 |
| `Backspace` | 删除任务 |

**批处理：**
- `Shift + 点击` 多选
- 批量指派 Project
- 批量设置优先级

---

### 五、主界面结构

#### 5.1 整体布局

```JSON
┌─────────────────┬──────────────────────────┬──────────────┐
│ Sidebar         │ Task List                │ Drawer       │
│                 │                          │（点击弹出）  │
│ [Work][Personal]│ [P0] Fix login bug       │              │
│                 │ [P1] Write RFC           │ Task Detail  │
│ Inbox      (8)  │ [P2] Update tests        │              │
│ StoneFlow       │ [P3] Refactor auth       │ title        │
│ API Refactor    │ ─────────────────        │ priority     │
│ Side Blog       │ ▶ 已完成 · 3             │ project      │
│                 │                          │ note         │
│ ─────────────   │                          │ due / tags   │
│ All Tasks       │                          │              │
└─────────────────┴──────────────────────────┴──────────────┘
```

#### 5.2 Sidebar 结构

**顶部 Space Tab：**
- Tab 组件切换 Space
- 切换 Space 后，下方 Project 列表随之更新
- 支持新建 Space，但是在设置里

**Project 列表：**
- Inbox 置顶，始终显示，带未处理数量角标
- 普通 Project 按名称排列
- 点击 Project → 右侧 Task List 只展示该 Project 的任务

**底部固定：**
- All Tasks 视图入口（跨所有 Space 聚合查看）

#### 5.3 Task List

**单行结构：**

```JSON
[ ]  P1  Fix login bug            #backend   2025-07-01
```

从左到右信息优先级：

1. Checkbox（状态）
2. 优先级标识（颜色 badge）
3. 标题（主体）
4. Tags（弱化，低优先级）
5. Due date（弱提示，低优先级）

**行为：**

| 操作 | 动作 |
|------|------|
| 单击 title | 行内编辑标题，Enter 确认，Esc 取消 |
| 单击 checkbox | 标记完成，任务淡出并移入「已完成」区域 |
| 单击行（非 title 区域）| 打开右侧 Drawer |
| `Enter`（选中状态）| 打开 Drawer |
| hover | 显示快捷操作按钮 |

**已完成区域：**
- 位于列表底部，独立区域
- 默认折叠，显示数量
- 点击展开查看历史完成任务

**视觉规则：**
- 高密度排版，参考 Linear 风格
- 行高紧凑，信息层级清晰
- hover 状态显示操作

---

### 六、Drawer（任务详情面板）

#### 6.1 定位

Drawer 是任务详情的编辑面板，**不常驻**，点击任务行（非 title 区）或按 Enter 后从右侧滑出。

#### 6.2 打开方式

- 单击任务行（非 title 区域）
- 选中任务后按 `Enter`
- 关闭：点击空白区域 / `Esc`

#### 6.3 内容结构

```JSON
Title（可编辑）

── 基础属性 ──
Priority     [P1 ▾]
Project      [StoneFlow ▾]
Status       [Todo ▾]

── 扩展属性（1.0 低优先级）──
Due Date     [Pick date]
Tags         [+ Add tag]

── 备注 ──
Note         （多行文本，即改即生效）
```

#### 6.4 设计原则

- 轻量（不是独立页面）
- 所有修改即改即生效，无需「保存」按钮
- 不打断主列表的操作上下文
- Drawer 关闭后焦点回到列表中原任务行

---

### 七、Command 系统

#### 7.1 定位

Command 是**操作面板**，不只是搜索框。它是所有高频动作的统一快速入口。

#### 7.2 唤起方式

- **全局系统热键**（任意应用下可用）：`⌘K` / `Ctrl K`
- **应用内快捷键**：同上，应用获焦时也有效
- 唤起后显示独立悬浮窗，操作完成后消失，焦点回到用户此前的应用

#### 7.3 核心能力

| 功能 | 交互 |
|------|------|
| 快速创建 Task | 输入 title，Enter 创建；默认归入当前 Space 的 Inbox，可 Tab 选择 Project |
| 搜索 Task | 输入关键词，实时过滤，Enter 跳转 |
| 跳转 Project | 输入 Project 名，Enter 切换 |
| 切换 Space | 输入 Space 名，Enter 切换 |

#### 7.4 创建 Task 默认值

| 字段 | 默认值 |
|------|--------|
| Project | 当前 Space 的 Inbox |
| Priority | P2 |
| Status | todo |

#### 7.5 设计要求

- 键盘优先，输入即响应
- 结果列表最多显示 8 条
- 支持模糊匹配

---

### 八、快捷键（1.0 最小集）

| 快捷键 | 动作 |
|--------|------|
| `⌘K` / `Ctrl K` | 唤起 Command（全局）|
| `⌘N` / `Ctrl N` | 在当前 Project 下快速创建 Task |
| `⌘↩` / `Ctrl ↩` | 标记选中任务完成 |

Inbox 页面内额外快捷键见第四章。

---

### 九、交互细节

#### 9.1 完成任务

- 勾选 → 任务淡出动画（150ms）→ 移入「已完成」折叠区
- 自动聚焦下一条任务

#### 9.2 创建任务

- 新 Task 插入列表顶部
- 轻微出现动画（100ms）
- 立即聚焦标题输入

#### 9.3 移动任务

- 拖拽行重新排序（同 Project 内）
- 通过 Drawer 或 Command 修改 Project 归属

#### 9.4 错误与反馈

- 每次创建、修改、完成、删除均有即时视觉反馈
- SQLite 持久化失败时：回滚 Store + Toast 提示

---

### 十、功能边界

#### 10.1 1.0 包含

- Space / Project / Task 三层数据结构
- Inbox 机制（每个 Space 一个）
- Task CRUD（标题、状态、优先级、备注、Project）
- 全局 Command 悬浮窗
- 按 Project 查看任务
- All Tasks 全局视图
- 已完成区域（默认折叠）
- 基础快捷键（3 个核心快捷键 + Inbox 键盘流）
- 本地 SQLite 存储
- 拖拽排序

#### 10.2 1.0 预留字段（不做 UI，仅建表）

- `tags`：标签
- `due_at`：截止时间
- `sync_status` / `remote_id`：云同步

#### 10.3 1.0 不做

- 子任务
- 团队协作 / 评论 / 指派 / 权限
- 云同步（2.0 核心卖点）
- 账号系统（随云同步一起上）
- 统计分析 / 完成回顾
- 番茄钟
- 笔记 / 文档 / 日记模块
- AI 功能

---

### 十一、云同步（2.0 规划）

#### 11.1 技术方案

- 云端存储：NeonDB（Serverless Postgres）
- 冲突解决：最后写入胜出（LWW）+ `updated_at` 时间戳
- 账号系统随云同步一起上线

#### 11.2 1.0 迁移准备

Task 表中已预留 `sync_status` 和 `remote_id` 字段，2.0 直接激活，无需改表结构。

---

### 十二、非功能需求

| 项目 | 要求 |
|------|------|
| 启动速度 | 热启动 < 300ms |
| 操作响应 | 所有 UI 操作 < 100ms 视觉反馈 |
| 数据可靠 | SQLite 写入失败必须有回滚机制 |
| 窗口适配 | Inspector 在窗口宽度 < 900px 时自动切为 Drawer 覆盖模式 |
| 全局热键 | Windows 上 Ctrl K 需验证不被系统拦截，提供用户自定义热键入口 |

---

### 十三、成功标准（1.0）

用户在日常使用中能稳定完成以下事情：

- 想到一件事时，1 秒内记下来
- 打开应用时，3 秒内找到当前要做的事
- Inbox 有积压时，能快速批量处理
- 完成一件事时，能迅速收口并继续下一条

---

### 十四、未来版本方向（非 1.0）

- 云同步 + 账号系统（2.0 核心）
- 多设备支持
- AI 自动分类 / 优先级建议
- 更丰富的任务视图（看板、日历、时间线）
- 番茄钟集成
- 完善快捷键体系
- 子任务支持

> 所有扩展必须坚守「快」与「克制」两个核心原则，不以功能堆叠为目标。

---

*StoneFlow PRD v1.2 · 合并自 PRD v1.0（原始需求文档）+ PRD v1.1（可开发版）+ 产品讨论记录*
