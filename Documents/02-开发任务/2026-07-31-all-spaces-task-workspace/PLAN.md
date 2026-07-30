# 所有空间任务执行台落地 - Plan

## 方案概述

在**不改变领域归属模型**的前提下，把前端 All scope 从「半成品路由能力」收成产品契约中的**任务执行台**。

核心做法：

1. **查询**：继续用既有 `scope: { type: 'all' }` → Rust `space_id = None` 的列表/View 路径。
2. **「所有任务」语义**：All 与单 Space **共用同一 list 规则**（当前实现为 `viewKey: 'all'` + `placement: all` 等既有约定）；只换 scope，不换数据集名字。
3. **呈现**：复用 `useTaskListScene` / `useTaskCollectionScene` + 状态 Board；默认 `groupBy=status`；组内排序保证优先级可扫。
4. **归属可见**：仅在 All scope 的任务列表里，**每行固定显示 Space 名**（有 Project 则同时可扫 Project）；不为此先做全局 display 属性系统改造。
5. **写入**：创建走既有 Dialog；All 下 Space 选择器始终可见；提交校验 `spaceId`。
6. **导航收敛**：All 下不展开项目树、不把项目总览/独立事项当正式主入口；**不做 URL 强制重定向**（桌面端正常路径到不了手输深链）。

本方案遵循：KISS、前端组合优先（场景 hook 接线，不复制 Board）、Tauri IPC 仍只经 feature `api/`、React 列表状态继续以 Query 为服务端数据缓存、不在 Zustand 复制 Task 实体。

## 备选方案与取舍

| 决策点 | 采用 | 放弃 | 理由 |
|---|---|---|---|
| All 的产品形态 | Task 并集执行台 | 完整镜像单 Space / 只读巡检台 | 用户目标是跨 Space 调状态与优先级 |
| 「所有任务」数据语义 | 与单 Space **同一语义** | All 单独 `viewKey=active` 仅未完成 | 导航文案是「所有任务」；两处含义必须一致；量级 &lt;50 可扫 |
| 默认布局 | 状态 Board + 组内优先级可扫 | 优先级分组首页 / 日期轴 / 「需要关注」默认页 | 与现网 Board 同构；due 填写率低 |
| 组内排序 | 确认 `groupBy=status` 下优先级可扫（必要时 All 或共用默认 `orderBy=priority`） | 另造 All 专用 sort 引擎 | 避免分叉 |
| Space 行级展示 | **仅 All 列表页固定画出 Space 名**（用行上已有 `spaceName` 字段） | 先做全局 `space` display property + 偏好迁移 | V1 只要 All 能扫归属；全局列系统超范围 |
| 创建 | 允许创建 + Space 选择器始终可见 | All 禁止创建 / 静默默认 Space | 已确认；静默落点与「集合非归属」冲突 |
| 项目/独立事项 | 导航层隐藏或降级；侧栏项目树 All 下不展开 | 删除路由 / 强制 redirect 到 `/all/tasks` | 桌面端用户几乎到不了手输 URL；redirect 收益低、多测维护成本 |
| 后端 | 复用现有 list/view scope | 新 table / 虚拟 Space 实体 | 领域禁止 All 作为归属 |
| 文案 | 统一「所有空间」 | 「全部 Space」「全部 Spaces」混用 | 降低噪音 |

## 关键实现锚点（当前代码事实）

| 点 | 现状 | 目标变化 |
|---|---|---|
| `src/app/navigation/path.ts` | `ALL_SCOPE_KEY='all'`；默认 All section=`tasks` | 保持 |
| `src/layout/config.ts` / `ShellLayoutContent.tsx` | 存在「所有空间」与「全部 Spaces」混用 | 统一「所有空间」 |
| `src/layout/ShellSidebar.tsx` | All 下项目列表已空态；主导航仍含项目总览 | 保持空态；All 下隐藏或降级「项目总览」；不把独立事项当 All 主入口 |
| `src/features/task/hooks/useTaskListScene.ts` | `viewKey: 'all'` | **保持**与单 Space 同语义；不改为 `active` |
| `src/features/display-options/.../task-display-defaults.ts` | `task:all` 已 `groupBy: 'status'`，含 priority/project | 仅在组内优先级不够扫时做最小默认 order 调整 |
| Task 行组件 / scene | 未必稳定露出 `spaceName` | All scope 下列行固定显示 Space 名 |
| `TaskCreateContent` + `CreateDialogShell` | 已有 Space 字段 | All 下选择器始终可见可改；无 spaceId 不可提交（补测试） |
| `/all/projects`、`/all/standalone` 路由 | 仍可挂载 | **保留路由，不做 redirect**；仅导航不导向 |

## 数据流

### 进入所有空间

```text
侧栏 Space 切换器 → navigate remembered path for scopeKey=all
  → 默认 /all/tasks
  → ShellRouteLayout setActiveScope({ type: 'all' })
  → TaskListSceneView variant=all
  → list_tasks({ scope: all, viewKey: all, placement: all })  // 与单 Space 同语义
  → Board groupBy=status，行固定展示 Space（及 Project 若有）
```

### 改状态 / 优先级

```text
TaskRow / 批量命令
  → 既有 task update / bulk_update IPC
  → Query invalidate（既有路径）
  → 列表刷新
```

不引入第二套 mutation 或本地 Task 实体缓存。

### 创建

```text
All 下打开创建
  → CreateDialogShell + TaskCreateContent
  → Space 选择器可见；可预填默认 Space / 上次创建 Space
  → submit 校验 spaceId 非空
  → create_task({ spaceId, placement... })
```

### 非主路径 URL（不处理强制跳转）

```text
/all/projects、/all/standalone
  → 路由可仍存在
  → 产品不通过侧栏/主导航导向
  → 本任务不做 beforeLoad redirect
```

## 导航与信息架构（V1）

```text
所有空间
├── 所有任务（默认，语义 = 单 Space「所有任务」× 全 Space）
├── 视图（系统 + 自定义，scope=all）
├── 归档 / 回收站（可保留聚合）
└── 不宣传：项目总览、独立事项、创建项目
    （侧栏项目树：空态/不展开；主导航项目总览：隐藏或降级）
```

单 Space 行为保持不变（含 `standalone` 默认落地、项目树）。

## Space 名如何显示（白话）

列表接口返回的任务已带 `spaceName`。实现时在 **All 的任务列表场景**里，给每一行固定渲染该名称（次要文字密度即可）。  
不要先做「显示选项里新增可开关的 space 列」——那是更大改造，V1 不需要。

## UI / 体验约束

- **组合**：路由薄页 → scene hook → `PageFrame` + `TaskBoard`；禁止在 `routes/` 堆业务。
- **扫读**：Space 名用次要文本色/既有 meta 密度，不新增大卡片。
- **创建**：All 下 Space 选择器须可辨、可改，不能看起来像锁死且不可改。
- **性能**：量级 &lt;50 不引入虚拟列表；Space 名直接用 DTO 字段。
- **React**：列表数据只经 Query；不把 Task 拷进 Zustand。

## 测试策略

| 层级 | 内容 |
|---|---|
| 单元/组件 | 文案「所有空间」；All 创建须选 Space；list 请求 `scope=all` 且 viewKey 与单 Space 任务页一致 |
| 场景 | All 任务行渲染含 `spaceName`；状态/优先级变更与批量仍可用 |
| 回归 | 单 Space standalone/projects/所有任务 不受损；系统 View `scope=all` 可 run |
| 手动 | 多 Space：进 All → 扫归属 → 改优先级/状态 → 创建到指定 Space → 回单 Space 核对 |

## 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| 用户个人 display 偏好覆盖系统默认分组 | 默认不是状态 Board | 系统默认保持 status；不强制清用户偏好 |
| 仅改导航隐藏，「项目总览」设置项在 All 下仍存在 | 轻微困惑 | 运行时按 scope 过滤可见主导航即可 |
| Space 只写在 subtitle 不够显眼 | AC-3 弱通过 | 测试断言可见文本含 spaceName；手动扫一眼密度 |
| 保留 `/all/projects` 路由被误当正式能力 | 文档/后续开发误解 | SPEC/PLAN/模块文档写明非 All 正式能力 |

## 完成后需要同步的长期文档

| 文档 | 同步内容 |
|---|---|
| `Documents/00-产品/P2-产品蓝图.md` | 「所有空间」命名与能力：执行台、所有任务同语义、不管项目树、创建必选 Space |
| `Documents/01-架构/A3-界面系统.md` | All 下侧栏/主导航差异 |
| `Documents/01-架构/A1-领域模型.md` | 可选补一句：All 仅为查询 scope |
| `src/features/space/ARCHITECTURE.md` | 产品语义指针（若需） |
| `src/features/task/` 模块文档（若有 ARCHITECTURE） | All 行展示 Space、与单 Space 同 list 语义 |
| `Documents/_INDEX.md` | 活跃任务状态 |

不强制新开 ADR。
