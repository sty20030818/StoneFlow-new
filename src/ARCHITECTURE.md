# StoneFlow 前端架构（src）

> 版本：v5.2 · 2026-08-07
> 作用：`src/` **定稿最优架构**（WHAT / WHERE）。日常改码以本文 + [`CONVENTIONS.md`](./CONVENTIONS.md) + 各模块 `ARCHITECTURE.md` 为准。
> 不写：债表、执行进度、变更历史（这些不属于当前架构契约）。

**冲突时：** 本文 + `CONVENTIONS` ≥ Docs 讨论卡 / 过时 As-Is。
**改模块时：** 只更新该模块 `ARCHITECTURE.md` 的定稿形态。

---

## 1. 定位

本文回答：代码落在哪一层、谁依赖谁、状态三轨、feature 地图。
不负责：逐步 diff、交互文案、Rust 细账、视觉营销稿。

---

## 2. 心智图

```txt
启动接线在 app
铬架在 layout
URL 薄页在 routes
能力在 features（model / api / hooks / components + public）
纯零件在 shared
样式在 styles
```

```txt
TanStack Router（hash + file routes）
  → routes/_shell 挂 layout 铬架
  → features/* 业务能力 / 数据接线
  → shared/* · styles/*
  → Tauri IPC 经 feature api facade
```

### 2.1 依赖方向（硬）

```txt
app      → features(public) · layout · shared · styles · routes 装配
layout   → features(public) · shared · styles · app/navigation
routes   → layout · features(public|page) · app/navigation
features → shared · styles · 其它 feature 的 public 仅
shared   → styles（及同层工具）；❌ features / layout / app 业务
styles   → 不依赖业务层
```

**禁止：** `features/**` → `@/layout/**`；跨 feature 深路径；`shared` 吸收实体规则。

闸门：`bun run lint:boundaries`。

### 2.2 状态三轨

| 轨 | 技术 | 例 |
|----|------|-----|
| URL | TanStack Router | 当前壳路由、抽屉 search、设置 section |
| Query | TanStack Query | 任务/项目列表与详情、同步配置 |
| UI | React state / 限定 Zustand / reducer | 命令板开关、草稿、Launcher session |

禁止：用 store 复制 Query 服务器数据；用 Query 存纯 UI 选中态当「服务器真相」。

---

## 3. 目录结构

```txt
src/
├── main.tsx
├── launcher.tsx             # 独立 Launcher 窗口 composition root；不挂 Router / Shell Provider
├── app/                    # 组合根：Providers、router、navigation 语义
├── layout/                 # 产品铬架：Header / Sidebar / Main / overlays / command-bridge
├── routes/                 # file routes + 薄页
├── features/               # 业务垂直切片（§5）
├── shared/                 # 无业务归属共享层
├── styles/
├── test/
├── ARCHITECTURE.md
└── CONVENTIONS.md
```

**勿再当作现状：** 顶层 `pages/`、`app/layouts`、`shared/ui`、独立 feature 壳 `inbox` / `all-tasks`、`healthcheck` / `task-drawer`。

列表类 URL → 薄页 + domain list-scene（如 `TaskListSceneView` variant `all` \| `standalone`），不再各做 feature 包。归档 / 回收站 / 视图走 lifecycle 或 view 场景，非独立 inbox 域。

**任务归属：** 仅 `project` \| `standalone`（`project_id` 空 = 独立事项）。路径 `/$scopeKey/standalone`；无 Inbox。

---

## 4. 分层职责

### 4.1 `app/` · 组合根

**负责：** Provider 树、Router 实例、`app/navigation`（path / intent / memory / session history）。
**不负责：** 侧栏视觉、实体规则、board 实现。

短契约：[`app/navigation/ARCHITECTURE.md`](./app/navigation/ARCHITECTURE.md)。

### 4.2 `layout/` · 铬架

**负责：** Shell 布局与铬架、壳级 Provider 嵌套、Command Host 装配、Overlays、`ShellBulkActionBoundary`（只 compose 各域 bulk public）。
**不负责：** 实体 Query 真相、domain 命令 handlers、页面实体 Board 实现。

短契约：[`layout/ARCHITECTURE.md`](./layout/ARCHITECTURE.md)。

### 4.3 `routes/` · 薄页

**负责：** 匹配、loader/redirect、挂载 feature page/scene。
**不负责：** 厚业务、裸 `invoke()`。

正式工作路径：`/:scopeKey/...`（`all` 与 `spaces/:id` 语义）；另有 debug 路径。

### 4.4 `features/` · 能力切片

内部分层见 CONVENTIONS §2.4。跨模块只经 `. | contract | page`。

### 4.5 `shared/` · 共享

base UI、board/row、query 跨域失效工具、types、lib、events、form…
禁止实体业务规则、feature 专属 API。

`shared/components/page-frame` 是工作区页面的纯视觉骨架，只提供 Header、Toolbar、Body 与 BulkBar 的组合顺序。它不持有实体数据、Board 分发或业务操作。

`shared/lib/keyboardShortcut` 与 `shared/components/ShortcutTokens` 只负责跨平台键帽投影和展示；Command / Launcher 各自拥有绑定、匹配与动作语义。

任务集合页面由 task 域的 `useTaskCollectionScene` 统一任务 Board、展示、选择、预览与批量操作接线；全部任务、独立事项、视图与项目详情只提供数据源和页面专属动作。项目总览与生命周期页面复用 `PageFrame`，各自在所属 Feature 内维护实体 Board 和业务编排。

### 4.6 `styles/`

Token、shadcn 映射、Tailwind 入口。见 [`styles/ARCHITECTURE.md`](./styles/ARCHITECTURE.md)。

---

## 5. Feature 地图

| Feature | 类 | 一句话 | 契约 |
|---------|-----|--------|------|
| task | domain | 任务实体：列表场景、详情、创建内核、打开策略、bulk/命令 | [task](./features/task/ARCHITECTURE.md) |
| project | domain | 项目实体；页内嵌任务列表走 task public | [project](./features/project/ARCHITECTURE.md) |
| space | domain | 空间实体与视觉 | [space](./features/space/ARCHITECTURE.md) |
| view | domain+scene | 视图定义 + 跑任务列表 | [view](./features/view/ARCHITECTURE.md) |
| lifecycle | domain 编排 | 归档 / 回收站跨实体编排 | [lifecycle](./features/lifecycle/ARCHITECTURE.md) |
| activity | domain 薄 | 活动时间线查询 | [activity](./features/activity/ARCHITECTURE.md) |
| command | platform | 命令元数据、Runtime、菜单、快捷键；handlers 在各域 register | [command](./features/command/ARCHITECTURE.md) |
| bulk-action | platform | 批量引擎；动作/adapter 在各域 | [bulk-action](./features/bulk-action/ARCHITECTURE.md) |
| selection | platform | 多选与 CommandSelection 总线 | [selection](./features/selection/ARCHITECTURE.md) |
| filter | platform | 页筛选总线 | [filter](./features/filter/ARCHITECTURE.md) |
| display-options | platform | 展示偏好（≠ 筛选） | [display-options](./features/display-options/ARCHITECTURE.md) |
| metadata-fields | platform | 跨实体字段 chrome；域组装选项 | [metadata-fields](./features/metadata-fields/ARCHITECTURE.md) |
| submit | platform | 壳级提交目标注册 | [submit](./features/submit/ARCHITECTURE.md) |
| danger-confirm | platform | 危险确认 UI 协议 | [danger-confirm](./features/danger-confirm/ARCHITECTURE.md) |
| entity-detail | platform | 抽屉打开 = URL search 契约 | [entity-detail](./features/entity-detail/ARCHITECTURE.md) |
| global-search | platform | 主窗搜索 | [global-search](./features/global-search/ARCHITECTURE.md) |
| workspace | platform | 听事件 → invalidate | [workspace](./features/workspace/ARCHITECTURE.md) |
| sync | platform | 云同步 | [sync](./features/sync/ARCHITECTURE.md) |
| update | platform | 后端更新会话快照的 UI 投影与动作 | [update](./features/update/ARCHITECTURE.md) |
| changelog | content | 发布历史的读取、解析与展示 | [changelog](./features/changelog/README.md) |
| settings | scene | 设置三入口 | [settings](./features/settings/ARCHITECTURE.md) |
| project-overview | scene | 项目概览薄页 | [project-overview](./features/project-overview/ARCHITECTURE.md) |
| shell-dialogs | platform | 壳级对话框 / 命令菜单 UI 态 | [shell-dialogs](./features/shell-dialogs/ARCHITECTURE.md) |
| launcher | window | 独立窗：搜 + 建；创建内核复用 task | [launcher](./features/launcher/ARCHITECTURE.md) |

**切分裁决（冻结）：** 不大合并 selection/bulk/command/filter/display；不拆 task 为多 feature 包名；不取消 navigation 包。

### 5.1 更新与 Changelog 边界

- `update` 以后端会话快照为唯一权威；Zustand 只投影该快照并保留局部交互态，不另建更新事实。
- `update` 和 `layout` 只能经 `@/features/changelog` 公共入口消费 Changelog，禁止深路径导入。
- `changelog` 独立拥有读取、解析和展示，不得反向依赖 `update`，也不决定更新是否可下载或安装。

---

## 6. 装配三角（定稿）

| 模块 | 一句话 |
|------|--------|
| navigation | path 方言 + memory + history；**无**领域 open 策略 |
| routes | 单工作区树 + scope；薄页；match 为运行时真相 |
| layout | 铬架 + Host；**无** domain 命令实现表 |

命令：feature `registerXxxCommands(host)`；layout 只装配 Host。
Bulk：引擎在 `bulk-action`；`task|project|lifecycle` 贡献 actions/adapter。

---

## 7. 数据与 IO

```txt
features/{f}/api     → invoke / Store / listen
features/{f}/hooks   → keys · queryOptions · mutations
features/{f}/model   → 纯规则
shared/query         → 跨 feature 失效等
```

QueryClient 默认（`app/providers`）：`staleTime 30s` · `gcTime 10min` · `refetchOnWindowFocus: false` · query `retry: 1` · mutation `retry: 0`。

细则：CONVENTIONS §4–§5。

---

## 8. 窗与壳

- **主窗：** `layout` 铬架 + `_shell` 路由树。
- **Launcher：** 独立窗 + `launcher.html`；session/domain 在 `features/launcher`；固定壳几何见该模块契约。
- **Overlays：** 主窗创建等挂在 layout overlays，内容组件来自 feature public。

---

## 9. Hard-Cut 原则

与 CONVENTIONS §0.3 一致：

- 可以硬切 API / IPC / Store / URL / 记忆数据；
- 每次必须删净旧面，不留双轨；
- 模块契约与本文在破坏后同步更新。

---

## 10. 架构不变式（回退即退化）

1. store 当服务器状态真相
2. 页面 / shared 裸 `invoke()`
3. `shared` 塞实体业务
4. 第二套路由 DSL 与 file route / memory 分叉
5. 命令 / 批量实现塞回单页或 layout 上帝表
6. 跨 feature 绕过 public
7. feature → layout
8. 只转发目录

---

## 11. 模块契约模板

新建 `ARCHITECTURE.md` 时用：

```md
# {name} · 一句话

> 最后更新：YYYY-MM-DD

## 职责 / 不负责
## 目录
## Public 最小集
## 禁止依赖
## 装配点（谁 import）
## 状态落点（URL | Query | UI）
```

---

## 12. 验证

```bash
bun run check
```

---
