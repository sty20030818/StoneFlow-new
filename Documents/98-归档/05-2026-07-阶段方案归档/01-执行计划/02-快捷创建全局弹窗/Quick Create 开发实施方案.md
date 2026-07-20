# StoneFlow Quick Create 开发实施方案

> 版本：v1.0  
> 状态：开发落地方案  
> 适用范围：StoneFlow 全局快捷创建弹窗（Quick Create）  
> 关联文档：
> - `StoneFlow 独立窗口技术方案.md`
> - `StoneFlow Quick Create 产品交互方案.md`
> - `stoneflow_quick_create_v6.html`

> 说明：
> - 本文档以 `stoneflow_quick_create_v6.html` 作为唯一原型参考；
> - 当前仓库实际实现必须遵守 `src-tauri/ARCHITECTURE.md`，即继续在既有 `desktop-app / helper-app / ipc-protocol` 内部分层落地；
> - 本轮 P0-P2 已按“不保留长期 quick-capture 双轨”的原则推进，旧命名仅允许作为迁移痕迹短暂存在。

---

## 0. 文档目标

这份文档不再讨论“要不要做”和“产品大方向是什么”，而是回答下面几个开发问题：

1. 当前项目里已经有什么基座；
2. 哪些基座值得保留，哪些应该直接替换；
3. Quick Create 的推荐工程边界是什么；
4. 应该如何分阶段开发；
5. 每个阶段的任务、验收标准、风险点分别是什么。

本文件默认基于当前仓库现状推进，不是假设一个全新项目。

---

## 1. 当前项目现状判断

先给结论：

```txt
当前仓库不是“没有做”，而是“已经做了 50% 的底座，但没有真正接成一个完整系统”。
```

更具体地说，当前状态是：

```txt
Helper 独立进程骨架：有
跨平台 Quick 浮窗壳：有
IPC 协议 crate：有
主业务创建能力：有
全局搜索能力：有
主 App 对 Helper 的真正生命周期接管：没有
Quick Create 前端真实交互：没有
Quick Create 专用协议模型：没有
```

### 1.1 已存在且值得保留的基座

#### A. Helper 进程基座已经存在

当前已经有独立 Helper 运行体：

```txt
src-tauri/helper-bin
src-tauri/crates/helper-app
```

它已经承担：

- 全局快捷键注册；
- Quick 浮窗生命周期；
- IPC Client；
- 打开 Task / Project 的意图转发；
- 快捷创建的前端命令宿主。

这部分不是 demo，而是可继续演进的真实基座。

#### B. macOS / Windows 窗口实现已经存在

当前仓库已经分别实现：

- macOS：`NSPanel` 语义窗口；
- Windows：`always_on_top + skip_taskbar` 浮窗；
- 均支持 `quick-create:shown` 事件通知前端重置输入态；
- 均已具备“显示 / 隐藏 / 聚焦 / 失焦自动关闭”的基本行为。

这部分不建议推倒重写。

#### C. IPC 协议 crate 已存在

当前已经有：

```txt
src-tauri/crates/ipc-protocol
```

并且已经包含：

- 请求 / 响应 DTO；
- 协议版本号；
- socket naming；
- 跨平台命名抽象；
- 结构化错误类型。

这说明架构方向已经对了，只是当时的协议模型还停留在旧 capture v1，需要升级成 Quick Create v2。

#### D. 主业务服务已经足够支撑 Quick Create P0

当前 `desktop-app` 的 Task Service 已支持：

- `space_id`
- `project / inbox / noProject` placement
- `title`
- `note`
- `status`
- `priority`
- `due_at`
- `scheduled_at`
- `reminder_at`

这意味着：

```txt
Quick Create P0 不需要先做数据库大改，也不需要先重建任务领域模型。
```

#### E. 全局搜索服务已经可复用

当前 Search Service 已支持：

- task / project 搜索；
- 分 section 返回；
- 活跃 / 已完成分组；
- 排序和匹配等级。

虽然它不是 Quick Create 专用搜索，但足够作为 P0 的底层能力来源。

#### F. 当前主窗口 Scope 同步机制已经存在

当前主前端会把当前 scope 持续同步给 Rust runtime。

这意味着 Quick Create 的默认 `Space` 并不需要从零设计来源，已经有运行时语境基础。

---

## 2. 当前实现的核心问题

### 2.1 主 App 还没有真正进入 Core-first 生命周期

虽然文档已经定义了：

```txt
Core owns Helper
Helper depends on Core
```

但当前实际代码里，主 App 还没有完整承担：

- IPC Server 启动；
- Helper spawn；
- Helper supervisor；
- Helper crash restart；
- quit-all 协调；
- single-instance 主流程；
- tray / shortcut / helper status 的系统级运行时治理。

也就是说：

```txt
文档已经是 Core-first，但代码仍然停在“主 App + 一个半独立 Helper 壳”。
```

### 2.2 当前前端还是 Quick Capture 原型，不是 Quick Create

当前前端页面仍然是：

```txt
src/features/quick-capture/ui/QuickCapturePage.tsx
```

主要问题：

- 搜索仍是 mock；
- 创建仍是 `setTimeout` 模拟；
- 只有简单的 `idle / search / create` 模式；
- 没有真正的 `Space / Project / Status / Due / Scheduled / Reminder` 参数模型；
- 交互不符合产品稿中的 `Esc 第一下清空，第二下关闭`；
- 没有 `Enter / CmdOrCtrl+Enter / Shift+Enter` 三种创建动作分流；
- 命名仍然是 `quick-capture`，产品语义已经过时。

### 2.3 IPC 协议模型太薄，承载不了 Quick Create

当前协议更像：

```txt
create task
search workspace
open task
open project
```

而不是：

```txt
get initial state
list projects by current space
global quick search
quick create
quick create and open
```

如果继续在现有协议上小补丁式追加字段，最终会变成协议污染。

### 2.4 Helper 状态管理仍然是占位实现

当前主 App 内部的 Helper 状态快照仍然是最小占位。

这会直接导致：

- 设置页无法展示真实 Helper 状态；
- 无法区分 helper ready / disconnected / crashed / restarting；
- 后续 shortcut 冲突、tray 状态、diagnostics 面板都无从落地。

### 2.5 代码语义已经落后于产品语义

现在代码里反复出现的是：

```txt
quick-capture
command helper
capture task
```

但产品方案已经明确是：

```txt
Quick Create
创建优先
搜索辅助
轻量参数外显
```

如果不做一次明确的语义重命名，后续维护成本会越来越高。

---

## 3. 本次重构的推荐原则

### 3.1 不做“全部推倒重来”

虽然允许破坏性重构，但仍然不建议无差别重写。

原因很简单：

- 当前窗口层基座质量并不差；
- Helper 二进制分层方向是对的；
- 主业务服务已经够支撑 P0；
- 全量重写只会把有效资产一起删掉。

推荐策略：

```txt
保留正确边界上的基座
替换错误抽象和过时语义
重建 Quick Create 主链路
```

### 3.2 不保留长期双轨结构

禁止长期同时维护：

- `quick-capture`
- `quick-create`

两套完整实现。

允许短期兼容路由或过渡适配，但目标必须明确：

```txt
Quick Capture 旧实现最终删除
Quick Create 成为唯一全局快捷创建入口
```

### 3.3 前端必须改成组合式架构

这次前端不能再走“一个大组件 + 一堆 mode / index / 条件分支”的方式。

推荐采用：

- Provider 承担状态和 actions；
- 子组件只关心自身职责；
- 动作显式建模，而不是布尔参数扩散；
- Popover / Select / Result / Footer 各自独立；
- 不让顶层页面承担所有输入、焦点、创建、搜索、提交、提示、错误逻辑。

### 3.4 Helper 继续保持“快，但不聪明”

Helper 仍然只做：

- 快捷键；
- Tray；
- Quick Window；
- 前端宿主；
- IPC Client；
- 打开/关闭/聚焦/恢复窗口；
- 转发用户意图。

Helper 不做：

- 直接访问 SQLite；
- 保存长期任务状态；
- 自己决定业务默认值；
- 实现复杂业务规则。

### 3.5 本轮不新增过多 crate

当前 workspace 的 crate 粒度已经够了。

本轮推荐：

- `desktop-app` 内部新增模块；
- `helper-app` 内部新增模块；
- `ipc-protocol` 演进 DTO；
- 前端新增 `features/quick-create`；
- 不为了“更漂亮”再拆新的顶层 crate。

---

## 4. 推荐的目标架构

## 4.1 Rust 侧目标结构

```txt
src-tauri/
├─ crates/
│  ├─ desktop-app/
│  │  ├─ app/
│  │  │  ├─ commands/
│  │  │  │  ├─ quick_create.rs
│  │  │  │  ├─ helper_runtime.rs
│  │  │  │  └─ ...
│  │  │  ├─ state.rs
│  │  │  └─ mod.rs
│  │  ├─ application/
│  │  │  ├─ services/
│  │  │  │  ├─ quick_create_service.rs
│  │  │  │  ├─ helper_runtime_service.rs
│  │  │  │  └─ ...
│  │  ├─ infrastructure/
│  │  │  ├─ ipc/
│  │  │  │  ├─ server.rs
│  │  │  │  ├─ router.rs
│  │  │  │  └─ transport.rs
│  │  │  └─ ...
│  │
│  ├─ helper-app/
│  │  ├─ commands.rs
│  │  ├─ ipc_client.rs
│  │  ├─ shortcut.rs
│  │  ├─ tray.rs
│  │  ├─ panel.rs
│  │  ├─ panel_windows.rs
│  │  └─ ...
│  │
│  └─ ipc-protocol/
│     └─ src/lib.rs
```

### 4.2 前端目标结构

```txt
src/
├─ features/
│  ├─ quick-create/
│  │  ├─ api/
│  │  │  └─ quickCreate.ts
│  │  ├─ model/
│  │  │  ├─ quickCreateStore.ts
│  │  │  ├─ quickCreateTypes.ts
│  │  │  ├─ quickCreateDate.ts
│  │  │  └─ quickCreateSelectors.ts
│  │  ├─ ui/
│  │  │  ├─ QuickCreatePage.tsx
│  │  │  ├─ QuickCreateRoot.tsx
│  │  │  ├─ QuickCreateProvider.tsx
│  │  │  ├─ QuickCreateInputRow.tsx
│  │  │  ├─ QuickCreateAdvancedRow.tsx
│  │  │  ├─ QuickCreateCreateRow.tsx
│  │  │  ├─ QuickCreateResults.tsx
│  │  │  ├─ QuickCreateFooter.tsx
│  │  │  ├─ QuickCreateProjectSelect.tsx
│  │  │  ├─ QuickCreateSpaceSelect.tsx
│  │  │  ├─ QuickCreatePrioritySelect.tsx
│  │  │  ├─ QuickCreateStatusSelect.tsx
│  │  │  └─ QuickCreateDateSelect.tsx
│  │  └─ index.ts
│  │
│  └─ quick-capture/
│     └─ 过渡期保留，最终删除
```

---

## 5. 明确保留 / 替换 / 删除边界

## 5.1 保留

以下内容建议保留并演进：

1. `src-tauri/crates/helper-app`
2. `src-tauri/helper-bin`
3. `src-tauri/crates/ipc-protocol`
4. `src-tauri/crates/helper-app/src/panel.rs`
5. `src-tauri/crates/helper-app/src/panel_windows.rs`
6. `src-tauri/crates/helper-app/src/shortcut.rs`
7. `scripts/bundle-helper.sh`
8. `desktop-app` 的 `TaskService`
9. `desktop-app` 的 `SearchService`
10. 当前主窗口 `ActiveScopeState` 思路
11. 当前项目内已有的 shadcn/tailwind v4 设计系统底座

## 5.2 替换

以下内容建议重写或重组：

1. `src/features/quick-capture/ui/QuickCapturePage.tsx`
2. `desktop-app` 当前仅占位的 helper state/runtime 设计
3. `ipc-protocol` 中旧版 `CreateTaskPayload / SearchWorkspacePayload`
4. `quick_capture` 命令命名和职责边界
5. Quick 前端与主业务 API 的对接方式

## 5.3 删除

最终建议删除：

1. 旧 Quick Capture 原型页面；
2. 仅服务旧原型的 mock 逻辑；
3. 过时命名下的临时状态机；
4. 长期无人接入的重复路径；
5. 如果确认无用，则删除旧 `quick-capture` pattern/token 包装层中的冗余实现。

注意：

```txt
删除应发生在新链路稳定可用之后，而不是第一天先无脑清空。
```

---

## 6. 推荐的 Quick Create 接口设计

## 6.1 `quick.getInitialState`

作用：

- Quick Window 打开后一次性获取默认上下文；
- 避免前端首次打开时多次往返。

建议返回：

```ts
type QuickInitialState = {
  currentScope: {
    kind: "all" | "space";
    spaceId: string | null;
  };
  defaultSpaceId: string;
  defaultPlacement: {
    kind: "inbox" | "noProject" | "project";
    projectId?: string;
    label: string;
  };
  spaces: SpaceSummary[];
  projectsInDefaultSpace: ProjectSummary[];
  recentTasks: TaskSummary[];
  recentProjects: ProjectSummary[];
}
```

## 6.2 `quick.listProjectsBySpace`

作用：

- 用户切换 Space 时刷新项目下拉；
- 与主窗口 sidebar 列表逻辑解耦。

建议返回：

```ts
type QuickProjectsBySpaceResponse = {
  inboxProject: ProjectSummary;
  noProjectOption: ProjectSummary;
  projects: ProjectSummary[];
}
```

## 6.3 `quick.search`

作用：

- Quick Create 的搜索辅助能力；
- 只返回 Quick Create 需要的数据，不直接暴露完整全局搜索结构。

建议请求：

```ts
type QuickSearchRequest = {
  query: string;
  limitPerType: number;
}
```

建议返回：

```ts
type QuickSearchResponse = {
  tasks: TaskSummary[];
  projects: ProjectSummary[];
}
```

## 6.4 `quick.create`

作用：

- Enter 创建并关闭；
- Shift+Enter 创建并继续创建。

建议请求：

```ts
type QuickCreateRequest = {
  title: string;
  priority: "none" | "P0" | "P1" | "P2" | "P3";
  status: "todo" | "doing" | "done";
  spaceId: string;
  placement:
    | { kind: "inbox" }
    | { kind: "noProject" }
    | { kind: "project"; projectId: string };
  dueAt?: string | null;
  scheduledAt?: string | null;
  reminderAt?: string | null;
  source: "quick-create";
}
```

## 6.5 `quick.createAndOpen`

作用：

- `Cmd/Ctrl + Enter`
- 减少“先创建，再打开”的跨进程往返和中间失败态。

建议返回：

```ts
type QuickCreateAndOpenResponse = {
  taskId: string;
}
```

---

## 7. 前端推荐组件方案

## 7.1 顶层状态模型

Quick Create 不建议使用大量布尔值描述模式。

推荐把状态拆成：

```ts
type QuickCreateSubmitAction =
  | "submitClose"
  | "submitOpen"
  | "submitContinue";

type QuickCreateFocusTarget =
  | { kind: "create" }
  | { kind: "result"; index: number };

type QuickCreatePanelState = {
  title: string;
  expanded: boolean;
  priority: "none" | "P0" | "P1" | "P2" | "P3";
  status: "todo" | "doing" | "done";
  spaceId: string;
  placement: "inbox" | "noProject" | { kind: "project"; projectId: string };
  dueAt: string | null;
  scheduledAt: string | null;
  reminderAt: string | null;
  focus: QuickCreateFocusTarget;
  sessionCreateCount: number;
}
```

### 7.2 推荐的组件职责

#### `QuickCreateProvider`

负责：

- 初始数据拉取；
- store 注入；
- submit actions；
- 搜索请求编排；
- 弹层开关控制；
- footer 提示状态。

#### `QuickCreateInputRow`

负责：

- 标题输入；
- 第一行高频字段；
- `! # $` 等快捷入口；
- 输入聚焦。

#### `QuickCreateAdvancedRow`

负责：

- 状态；
- 截止时间；
- 计划时间；
- 提醒时间；
- Space。

#### `QuickCreateCreateRow`

负责：

- 创建预览；
- 当前参数摘要；
- 焦点态；
- 主 CTA 呈现。

#### `QuickCreateResults`

负责：

- 最近项；
- 搜索结果；
- 结果聚焦；
- 打开已有 task/project。

#### `QuickCreateFooter`

负责：

- 根据当前状态切换快捷键提示；
- 显示 `Esc 清空/关闭`、`Shift+Enter 连续创建` 等动态提示。

---

## 8. 开发阶段规划

下面按“先打通主链路，再做体验”的顺序拆。

---

## P0：重构准备与语义收口

### 目标

统一命名、明确保留边界、清理后续开发障碍。

### 任务

1. 新建本实施文档并作为后续执行依据。
2. 明确 `quick-capture` 到 `quick-create` 的迁移边界。
3. 盘点现有 helper / ipc / quick 页面 / task / search 的实际依赖。
4. 明确切换策略：
   - 路由直接切到 `#/quick-create`
   - IPC 直接切到 v2，不长期维护 v1/v2 双轨
5. 为后续改造确认统一术语：
   - Quick Create
   - Helper Runtime
   - Quick Window
   - Create Row
   - Search Results

### 交付物

1. 本文档
2. 重构命名清单
3. 删除/保留边界清单

### 验收

```txt
团队对“保留什么、换什么、删什么”没有歧义。
```

---

## P1：主 App Runtime 基础重构

### 目标

让主 App 真正承担 Core-first 生命周期。

### 任务

1. 在 `desktop-app` 新增 helper runtime 模块。
2. 引入主 App single-instance。
3. 在主 App 启动链中增加：
   - 数据就绪后启动 IPC Server
   - IPC Server ready 后启动 Helper
4. 实现 Helper Supervisor：
   - spawn helper
   - 记录 pid / 状态
   - intentional exit 标记
   - crash restart backoff
5. 重写 `CommandHelperState`：
   - `not_started`
   - `starting`
   - `ready`
   - `disconnected`
   - `crashed`
   - `restarting`
6. 增加主 App quit-all 流程：
   - 通知 helper prepare shutdown
   - helper 退出
   - core 退出

### 交付物

1. 主 App 可真实拉起 Helper
2. 主 App 可感知 Helper 状态
3. 主 App 可统一接管退出流程

### 验收

```txt
启动主 App 后 Helper 自动启动
手动杀掉 Helper 后主 App 能重启它
关闭主窗口不会退出 Helper
真正 Quit 时 Core 和 Helper 都能干净退出
```

### 风险

1. Windows 路径定位 helper binary 时容易踩打包路径差异。
2. macOS 打包后 helper 启动路径和 dev 模式不同。
3. 要避免误把 intentional exit 当成 crash restart。

---

## P2：IPC v2 协议重构

### 目标

把协议从 Quick Capture v1 升到 Quick Create 可用版本。

### 任务

1. 升级 `ipc-protocol` 中的 request/response DTO。
2. 定义：
   - `quick.getInitialState`
   - `quick.listProjectsBySpace`
   - `quick.search`
   - `quick.create`
   - `quick.createAndOpen`
3. 保持协议 crate 纯 DTO，不混入业务逻辑。
4. 为 v2 协议增加 roundtrip 测试。
5. 在主 App 增加 IPC router，把 v2 请求映射到 service。
6. 在 helper-app 更新 IPC client 调用封装。

### 交付物

1. Quick Create 专用协议
2. 主 App / Helper 双端对齐的客户端与服务端调用

### 验收

```txt
Helper 能通过 IPC 获取初始状态、拉项目、搜结果、创建任务、创建并打开
协议类型不再混有旧 Quick Capture 语义
```

### 风险

1. 旧前端/旧命令如果仍引用 v1 DTO，会产生编译期或运行时断层。
2. 若短期兼容 v1/v2 双协议，必须控制时间窗口，不能长期共存。

---

## P3：Quick Create Rust 业务服务接入

### 目标

在 `desktop-app` 建立 Quick Create 专用应用服务，而不是把逻辑散在 command 里。

### 任务

1. 新增 `quick_create_service.rs`。
2. 封装以下能力：
   - `get_initial_state`
   - `list_projects_by_space`
   - `search`
   - `create`
   - `create_and_open`
3. 复用现有 `TaskService.create_task`。
4. 复用现有 `SearchService.search_entities`，但做 Quick Create 视图裁剪：
   - 只取 task 3 条
   - 只取 project 3 条
   - 默认忽略 completed 组
5. 把 `current scope -> default space -> default project(inbox)` 逻辑收口到 service。
6. 创建并打开详情时，统一定义：
   - 恢复主窗口
   - 导航到正确空间 / 项目
   - 打开对应 task drawer

### 交付物

1. Quick Create 专用 service
2. 主 App Tauri commands / IPC handlers 对应落地

### 验收

```txt
主 App 内部已经可以不依赖前端，独立完成 Quick Create 所需的全部业务编排
```

### 风险

1. 现有 `search_entities` 是全局搜索，不是 Quick Create 定制搜索，要注意裁剪层次。
2. `create_and_open` 的“打开详情”动作可能需要补足主窗口事件桥。

---

## P4：Quick Create 前端重建

### 目标

彻底替换旧 `QuickCapturePage` 语义，按产品方案实现新的 Quick Create 前端。

### 任务

1. 新建 `features/quick-create`。
2. 新建 `QuickCreatePage` 与 `QuickCreateRoot`。
3. 建立 Provider / Store：
   - 标题输入
   - 参数选择
   - 搜索状态
   - 焦点状态
   - 连续创建计数
4. 实现第一行：
   - 优先级
   - 标题输入
   - 项目选择
   - 更多参数按钮
5. 实现第二行：
   - 状态
   - 截止时间
   - 计划时间
   - 提醒时间
   - Space
6. 实现创建预览行。
7. 实现结果区：
   - 空输入 recent tasks/projects
   - 有输入 search tasks/projects
8. 实现 Footer 动态提示。
9. 接入真实 IPC/Invoke API。

### 交付物

1. 完整 Quick Create 页面
2. 新的前端数据与交互模型

### 验收

```txt
打开 Quick Window 后能真实输入、选参、搜索、创建、连续创建、创建并打开详情
```

### 风险

1. 焦点管理容易混乱，尤其是 input / result / popover 三层切换。
2. 不能让创建行和搜索结果争抢默认 Enter 语义。

---

## P5：交互细节与主窗口桥接

### 目标

把 Quick Create 做到“日常可用”。

### 任务

1. 实现 `Esc` 优先级：
   - 关弹层
   - 清空输入
   - 关闭窗口
2. 实现 `Enter / CmdOrCtrl+Enter / Shift+Enter` 三种动作分流。
3. 实现 Space 变化后项目重置为 Inbox。
4. 实现 project 失效 fallback。
5. 实现创建成功反馈：
   - 已创建并关闭
   - 已创建并打开详情
   - 已创建 N 条，继续输入下一条
6. 接好主窗口事件桥：
   - 打开指定 task drawer
   - 打开指定 project 页面
7. 评估并接入现有 `commandOpen` 事件桥，若不合适则删除并替换为更清晰方案。

### 交付物

1. 可日常使用的 Quick Create
2. 与主窗口协作正常的“创建并打开”

### 验收

```txt
用户从全局快捷键唤起后，可以不打开主窗口完成大部分快速创建；
需要深编辑时，也可以稳定切回主窗口详情页。
```

---

## P6：清理旧实现与补测试

### 目标

移除旧 Quick Capture 负担，完成重构收口。

### 任务

1. 删除旧 `QuickCapturePage`。
2. 清理过时 route / pattern / helper 命令命名。
3. 删除仅服务旧 capture 语义的类型与 mock。
4. 补前端测试：
   - 创建行默认聚焦
   - Enter 创建
   - Shift+Enter 连续创建
   - Esc 清空/关闭
   - Space 切换后项目重置
5. 补 Rust 测试：
   - helper runtime state
   - quick create service
   - IPC v2 roundtrip
6. 更新架构文档与开发文档。

### 交付物

1. 旧链路下线
2. Quick Create 成为唯一实现
3. 回归测试覆盖

### 验收

```txt
代码库里不再长期维护 Quick Capture / Quick Create 双轨结构
```

---

## 9. 建议的任务清单拆分

为了方便实际开发，下面给一版更细的任务粒度。

## 9.1 Rust Runtime 任务

1. 增加 main app single-instance。
2. 增加 helper process locator。
3. 增加 helper spawn。
4. 增加 helper exit observer。
5. 增加 helper restart policy。
6. 增加 helper runtime state snapshot。
7. 增加 settings/debug 读取 helper 状态接口。
8. 增加 quit-all 生命周期协调。

## 9.2 IPC 任务

1. 定义 Quick v2 DTO。
2. 增加 v2 请求路由。
3. 增加 helper client 封装。
4. 增加协议 roundtrip tests。
5. 如需过渡，提供 v1 到 v2 兼容适配层。

## 9.3 Quick Create Service 任务

1. 实现 `get_initial_state`。
2. 实现 `list_projects_by_space`。
3. 实现 `search` 裁剪层。
4. 实现 `create`。
5. 实现 `create_and_open`。
6. 实现主窗口恢复与详情打开桥接。

## 9.4 前端 UI 任务

1. 新建 `quick-create` feature 目录。
2. 新建 provider/store。
3. 新建 input row。
4. 新建 advanced row。
5. 新建 create row。
6. 新建 results。
7. 新建 footer。
8. 接入 API。
9. 焦点流转。
10. 创建反馈与错误反馈。

## 9.5 清理任务

1. 删除旧 mock search。
2. 删除旧 fake create/open `setTimeout` 逻辑。
3. 清理旧命名。
4. 清理 dead code / dead event bridge。

---

## 10. 验收清单

## 10.1 功能验收

1. 快捷键能唤起窗口。
2. 输入框打开即聚焦。
3. 默认 Space 正确。
4. 默认 Project 为 Inbox。
5. 项目列表只展示当前 Space 项目。
6. 切换 Space 后 Project 重置为 Inbox。
7. 有输入时默认创建行聚焦。
8. Enter 创建并关闭。
9. Cmd/Ctrl+Enter 创建并打开详情。
10. Shift+Enter 创建并继续创建。
11. Esc 第一下清空，第二下关闭。
12. 搜索失败不影响创建。
13. Core 未连接时有明确错误提示。

## 10.2 架构验收

1. Helper 不直接访问数据库。
2. 主 App 负责 Helper 生命周期。
3. Quick Create 业务逻辑不散落在 UI 内。
4. 协议 crate 仍保持纯 DTO。
5. Quick Capture 旧实现最终下线。

## 10.3 体验验收

1. 打开速度稳定。
2. 输入不卡顿。
3. 结果切换不跳焦。
4. 创建反馈清楚。
5. 连续创建顺滑。

---

## 11. 风险与取舍

## 11.1 不建议本轮顺手扩成“万能命令中心”

这是最容易跑偏的点。

当前产品边界已经明确：

```txt
Quick Create 是创建优先，不是 Raycast 式总入口。
```

所以本轮不要顺手加：

- 设置搜索；
- 命令 registry；
- AI 入口；
- Sticky 管理；
- 插件入口。

否则开发周期和复杂度都会失控。

## 11.2 不建议本轮先做大规模数据库升级

当前任务模型已经足够支撑 P0。

除非你明确要求：

- 幂等创建；
- 撤销创建；
- source 审计字段落库；
- session 级别追踪；

否则本轮没必要先做 schema 改造。

## 11.3 “创建并打开详情”是联调重点风险

这一块不是难在创建，而是难在：

- 恢复主窗口；
- 定位正确 scope；
- 打开正确 task drawer；
- 避免主窗口还没 ready 时事件丢失。

建议把它单独作为 P5 联调重点，而不是在 P3 就假设一切顺利。

---

## 12. 最终推荐执行顺序

如果按性价比排序，推荐真实开发顺序如下：

1. P1 主 App runtime 接管 Helper  
   原因：这是整个链路的根。

2. P2 IPC v2 协议升级  
   原因：不先定协议，前后端都会来回返工。

3. P3 Quick Create service 落地  
   原因：先把后端真实能力补齐。

4. P4 前端 Quick Create 重建  
   原因：此时前端可以直接接真接口，不用再写假逻辑。

5. P5 主窗口桥接和交互细节  
   原因：这是体验完善阶段。

6. P6 删除旧实现与补测试  
   原因：最后再收尾，避免过早删掉还能参考的旧代码。

---

## 13. 本方案的最终判断

本次 Quick Create 最佳实践方案不是：

```txt
全部删掉，从零重写
```

而是：

```txt
保留窗口与 Helper 基座
重建 Core 对 Helper 的真正接管
升级 IPC 到 Quick Create 专用模型
替换旧 Quick Capture 前端为组合式 Quick Create
最后删除旧实现
```

这条路线的优点是：

1. 利用现有资产，不做无意义重写；
2. 架构边界更清晰；
3. 前端不会继续恶化成单组件状态机；
4. 主业务逻辑仍然集中在 `desktop-app`；
5. 后续无论继续做 Sticky、Tray、Command Center，都有清楚的演进基础。

最终目标不是“多一个浮窗页面”，而是建立：

```txt
可长期维护的全局快捷创建基础设施
```
