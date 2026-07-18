# M-F-PROJECT · features/project

> 日期：2026-07-17 · **落地对照更新 2026-07-19**
> 状态：**archived-decision（P2 · P0–P2 done；余 VOLUME/CLOSE 见 [13](../13-Project样板重构执行计划.md)）**
> 路径：`src/features/project`（关联 scene：`features/project-overview`）
> **日常契约：** [`src/features/project/ARCHITECTURE.md`](../../../src/features/project/ARCHITECTURE.md)
> 类型：**domain**

---

## 0. 落地对照（2026-07-19）

| 卡上目标（P2） | 现网 | 说明 |
|----------------|------|------|
| 禁 project → layout | **done** | 0 引用 |
| bulk 在 `project/bulk` | **done** | B3 已迁 |
| `registerProjectCommands` | **done** | C3 已挂 |
| 详情任务板只组合 task public | **done** | `useProjectDetailScene` 组合 task public |
| ProjectPage 去巨石 / facade | **done** | Page ~95；facade ~324 |
| ARCHITECTURE 定稿 + public/TSDoc | **done** | DOC + NORM |
| project-overview Keep 薄 scene | **done** | 独立 feature |

**改码请读：** `src/features/project/ARCHITECTURE.md` + `src/CONVENTIONS.md`。
与 src 冲突时：**以 src 为准**，并回写本节。

---

## A. 它现在是什么（事实，非目标）

### A.1 职责

**项目实体域**：详情、侧栏/options 列表、CRUD mutations、项目看板/行、创建表单内容、详情页（含**页内任务板**编排）。

### A.2 结构（相对健康）

```txt
features/project/
  model/types.ts
  api/projects.ts
  hooks/  keys · queries · mutations · useProjectData
  components/
    ProjectPage · ProjectBoard · ProjectTaskBoard
    ProjectRowAdapter · ProjectCreateContent · ContextMenu
  index.ts  public（分组清楚）
```

体量整体可控（最大 `ProjectPage` ~376）。**没有** task 那种 900+ 行巨石，但 **ProjectPage 有 task 同款倒依赖**。

### A.3 消费者（高入度 · 内核）

| 消费者 | 用途 |
|--------|------|
| routes | `ProjectPage`、detail loader `projectDetailQueryOptions` |
| layout chrome | sidebar/options、create overlay、badges query |
| task | `useProjectOptions`、详情 placement |
| project-overview | overview 数据 hooks + `ProjectRowAdapter` |
| bulk-action | project adapter/actions（B3 后应回 project） |
| lifecycle | restore/delete api |
| filter / metadata | `ProjectOption` 类型 |
| navigation | `getProjectDetail`（memory/breadcrumb 校验——**灰区**） |

### A.4 关联：`project-overview`

- **独立 scene feature**：总览页 UI
- 数据走 **project public hooks**（方向对）
- routes `/projects` 挂 overview，`/projects/$id` 挂 project

### A.5 问题清单

| 问题 | 说明 |
|------|------|
| **ProjectPage → layout** | `EntityScene`、`ShellRouteContext`、`useDialogStore` — 与 task 相同倒依赖 |
| **详情页=半个 task list-scene** | 页内任务筛选/选择/预览/bulk 编排堆在 ProjectPage |
| **无 registerProjectCommands** | 归档/完成等靠 bridge bulk 片（B3/C3 后应收口） |
| **create 与 task 对称性** | 有 ProjectCreateContent；可与「创建内核」思路对称，但项目字段更简单 |
| **navigation 直接 getProjectDetail** | 记忆校验调 domain api：可接受薄 IO，或改为 project public `ensureProjectExists` |
| **overview 分 feature** | 可保留 scene 边界，或并回 project/components（见方案） |

---

## B. 边界争议

| 候选 | 现在 | 目标倾向 |
|------|------|----------|
| ProjectPage 任务板 wiring | project 内手写 | 抽 **project 内 facade** 或复用 task list 能力（**不**把 project 页搬进 task） |
| EntityScene 依赖 | page → layout | 同 task：**BoardViewModel 出 project/task，layout 只适配** |
| project-overview | 独立 feature | **可 Keep scene** 或并入 project（见 P 方案） |
| bulk project.* | bulk-action 包内 | **B3：迁入 project** |
| 侧栏项目树 UI | layout Sidebar | 数据 project public；UI 留壳 |
| 创建项目 | ProjectCreateContent | 留 project；壳 Overlay 挂载 |

---

## C. 多方案对比

### 方案 P1 · 巩固 + 小清理

去掉倒依赖、拆 ProjectPage；overview 与 bulk 位置不动。

| 优点 | 缺点 |
|------|------|
| 成本低 | bulk/命令所有权仍歪；overview 边界未审 |

**结论：** 过渡。

---

### 方案 P2 · 纯化 domain 标杆（**推荐**）

对齐 **task T2a** 的同构：

```txt
project/
  model/ api/ hooks/ components/
  bulk/          # B3：actions + adapter（从 bulk-action 迁入）
  registerProjectCommands  # C3
  详情页用 useProjectDetailScene 或等价 facade
    → 组合 task public（list data/selection）+ project detail
    → 不 import layout

project-overview/  # Keep 薄 scene
  只页 UI + project public hooks
```

| 优点 | 缺点 |
|------|------|
| 与 task/bulk/command 决议一致 | ProjectPage 要重构接线 |
| 可删除性清晰 | |
| overview 仍可独立删页 | |

**结论：长期最优。**

---

### 方案 P3 · 合并 overview 进 project

`features/project/components/ProjectOverviewPage`，删 project-overview 包。

| 优点 | 缺点 |
|------|------|
| 少一个 feature | scene 与 domain 又混；总览可删性变「动 domain」 |
| | 与「scene 默认薄 feature 或仅 routes」略冲 |

**结论：** **次选**。若 overview 永远极薄且无独立演进，可并；**默认 Keep 独立**。

---

### 方案 P4 · 详情页下沉 routes 厚写

| 优点 | 缺点 |
|------|------|
| 无 | 路由变胖，否 |

---

### 方案 P5 · 项目内任务板整块交给 task feature 页面

project 只提供「项目头」；task 提供 `TaskListSceneView variant=project`。

| 优点 | 缺点 |
|------|------|
| 列表 wiring 单源（与三列表） | 项目页产品语义强（完成项目、项目菜单）仍要 project 编排 |
| | variant 爆炸风险 |

**结论：** **部分吸收**——task 提供 **可嵌入的 list facade/hooks**；**页面壳与项目动作仍在 project**（P2 内做），不必整页迁 task。

---

## D. 推荐 = **P2**（+ overview Keep + 任务板组合 task public）

### D.1 职责

| 负责 | 不负责 |
|------|--------|
| 项目实体 CRUD、options、sidebar/overview 数据 | 主壳侧栏 DOM |
| ProjectBoard / Row / CreateContent / ProjectPage | EntityScene 框架 |
| 页内任务板 **编排**（调 task public） | 复制 task 完成/归档规则（走 task/bulk） |
| project bulk + command handlers（目标） | layout Bridge 业务片 |

### D.2 协作

```txt
routes → ProjectPage | project-overview.ProjectOverviewPage
layout chrome → useProjectSidebar/Options（public）
layout overlay → ProjectCreateContent
layout EntityScene adapter → ProjectBoard（薄适配）
task → useProjectOptions only
project detail scene → task list hooks/board public + project mutations
bulk B3 → project 贡献 adapter
command C3 → registerProjectCommands
lifecycle → project restore/delete public
navigation → 尽量 project public ensure，少直接深业务
project ──×──► layout
```

### D.3 public 分组（目标）

| 分组 | 内容 |
|------|------|
| 数据 | keys、queryOptions、options/sidebar/overview/detail hooks、list api |
| 变更 | create/update/complete/reopen/archive/restore/delete mutations |
| UI | Page、Board、RowAdapter、CreateContent |
| 批量/命令 | bulk 模块 + register*（迁入后） |
| 类型 | Detail、Option、FormInput… |

### D.4 与 task 的协作细则

| 场景 | 做法 |
|------|------|
| 项目页任务列表 | `useTaskListData` / controller / selection **public** + 项目 filter（projectId） |
| 预览/多选/bulk | 与 task 三列表 **同一套** preview/bulk 路径 |
| 显示选项 | display-options `task:project` 类 pageKey（若已有则保持） |
| 创建任务（项目上下文） | host 打开 create + draft.projectId；内容 TaskCreate* 内核 |

---

## E. 最佳实践

**Do**

- 四层纯化；外只 public
- 详情页 facade 内聚项目动作 + 嵌入 task 能力
- 创建内容给壳挂，规则在 project
- overview 薄 scene

**Don't**

- ProjectPage import layout
- 在 project 内再实现一套 task mutation
- overview 里直接 invoke project 私有 api
- navigation 散落无封装的详情校验逻辑过多

---

## F. 体量

| 文件 | ~行 | 动作 |
|------|-----|------|
| ProjectPage | 376 | P0：去 layout 依赖 + 抽 facade（可压到 &lt;250） |
| ProjectBoard | 295 | 临界，可按块拆 |
| 其余 | 较健康 | — |

---

## G. 迁移刀序

| 序 | 刀 |
|----|-----|
| 1 | ProjectPage 去 layout 依赖（同 task 端口化） |
| 2 | 抽 `useProjectDetailScene`（或等价）整理任务板 wiring |
| 3 | bulk project.* → project（B3） |
| 4 | registerProjectCommands（C3） |
| 5 | 收窄 public；navigation 校验走 ensure public |
| 6 | overview：保持独立；仅保证只依赖 project public |

---

## H. 方案小结

| 方案 | 荐 |
|------|-----|
| P1 小清理 | 过渡 |
| **P2 纯化 + 对齐 task/bulk/command** | **✅** |
| P3 合并 overview | 次选 / 默认不 |
| P4 厚 routes | ❌ |
| P5 整页任务交给 task | 部分吸收进 P2，不整页搬 |

---

## I. 决议

| # | 决议 |
|---|------|
| 1 | 目标 **P2**；domain 标杆与 task 同构 |
| 2 | **project-overview Keep** 薄 scene |
| 3 | 禁止 project → layout；任务板 **组合 task public** |
| 4 | bulk/命令 所有权回 project（B3/C3） |
| 5 | decide-only → **执行见 [13](../13-Project样板重构执行计划.md)** |

### 开放问题

- [ ] 项目页是否要 `TaskListSceneView variant='project'` 正式化（推荐：**专用 facade 名** 避免 variant 无限涨）
- [ ] ProjectCreate 是否与 QC 共用「项目创建内核」（项目字段少，P2 后可做，优先级低于任务创建内核）

---

## J. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：消费者、overview、P1–P5、推荐 P2 |
