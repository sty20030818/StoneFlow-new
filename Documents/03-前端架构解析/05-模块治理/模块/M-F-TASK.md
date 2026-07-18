# M-F-TASK · features/task

> 日期：2026-07-17 · **落地对照更新 2026-07-18**
> 状态：**archived-decision（T2a 边界已执行；实现债见执行计划）**
> 路径：`src/features/task`
> 类型：**domain（产品内核）**
> **日常契约：** [`src/features/task/ARCHITECTURE.md`](../../../src/features/task/ARCHITECTURE.md)
> **实现债刀序：** [`11-Task样板重构执行计划.md`](../11-Task样板重构执行计划.md)
> 规范：[`05-模块设计规范`](../05-模块设计规范.md) · [`src/CONVENTIONS.md`](../../../src/CONVENTIONS.md)

---

## 0. T2 后落地对照（2026-07-18）

> 本节回答「卡上的目标哪些已经变成现网」。细节与行数以执行计划 §1 为准。

| 卡上目标（T2a） | 现网 | 说明 |
|-----------------|------|------|
| 禁止 task → layout | **done** | rg 无 `from '@/layout` |
| open 策略在 task public | **done** | `taskOpenStrategy` |
| 创建内核单源 | **done** | `create/taskCreateForm`；Launcher 复用 |
| bulk 贡献在 task | **done** | `bulk/` + Boundary compose |
| `registerTaskCommands` + 行快捷键同 handlers | **done** | `runTaskRowBulkCommand` |
| list-scene 唯一 facade、不拆 feature 包 | **done** | `TaskListSceneView` / `useTaskListScene` |
| Preview 实现在 task、挂载在壳 | **done** | 装配正确 |
| EntityScene / 创建经端口、不依赖 layout 实现 | **done**（边界） | 体量/内部分层仍欠 |
| model 无 React；hooks 归位 | **未完** | `useTaskListController` 等仍在 `model/` |
| 巨石拆分（Shortcut / list-scene / Preview…） | **未完** | 见执行计划阶段 2–4 |
| Public + JSDoc 对齐 CONVENTIONS v2 | **未完** | 阶段 1 |

**本文角色：** WHY（方案对比、否决项、决议）。
**改码请读：** `ARCHITECTURE.md` + `11-Task样板重构执行计划.md`。
与 src 冲突时：**以 src 为准**，并回写本节对照表。

---

## A. 现网事实（心智）

### A.1 它是什么

**任务领域的垂直切片**：列表（inbox/all/no-project 场景）、看板、创建、详情三形态（页/抽屉/预览）、行快捷键、列表 mutation。

### A.2 内部结构

```txt
features/task/
  model/          状态/优先级/placement/selection/list controller（混有 hook）
  api/            tasks IO、links
  hooks/          keys · queries · mutations · useTaskListScene · useTaskData
  components/     Board · Row · Create · ListSceneView · ContextMenu
  detail/         详情子树（Page/Drawer/Preview + draft/autosave/preview provider）
  shortcuts/      TaskRowShortcutScope（行级命令 runtime，~970 行）
  index.ts        public（写得相对认真）
```

### A.3 已做对的

| 点 | 说明 |
|----|------|
| public 入口 | 外模块只应从 `@/features/task` 进 |
| 列表 DRY | `useTaskListScene` + `TaskListSceneView`；无独立 inbox feature |
| 详情子树 | `detail/` 内聚，再经 index 导出 |
| Query 分层 | keys / queries / mutations 分离方向对 |
| 创建内容 | `TaskCreateContent` 给壳 Overlay 挂，宿主/内容分离 |

### A.4 核心问题（边界）

| 问题 | 证据/影响 |
|------|-----------|
| **task → layout 反向依赖** | `useTaskListScene` import `layout/entity-scene` 类型、`ShellRouteContext`、`useDialogStore` → **领域依赖壳**，可删除性/测试都伤 |
| **打开策略在 layout** | `taskOpenStrategy.ts` 在 layout，应用在 task public |
| **全局命令实现在 Bridge** | complete/archive 等在 layout slices；task 内另有 **行级** CommandRegistry（shortcuts）→ **两套命令绑定** |
| **list-scene 过厚** | `useTaskListScene` ~432 行：数据+筛选+显示+选择+预览+bulk+面包屑+开创建 |
| **巨石 UI** | RowShortcut ~970 · PreviewProvider ~509 · ContextMenu ~461 · Board ~425 |
| **model 夹不纯** | `useTaskListController` 等 React hook 在 model/ |
| **public 仍偏宽** | 多 hooks/indicators；需按消费者收敛 |

---

## B. 边界争议表

| 候选 | 现在 | 目标 |
|------|------|------|
| EntityScene 类型依赖 | task → layout | **layout 依赖 task 的 Board props**；或 **shared 槽位类型**；task **不** import layout |
| 开创建弹窗 | list-scene → dialog store（layout） | **端口**：`onRequestCreate` / Shell host callback / create intent port |
| taskOpenStrategy | layout | **`@/features/task` public** |
| 全局命令 handlers | layout bridge | **task.registerCommands(hostCtx)**（C3） |
| 行级快捷键 registry | task/shortcuts 自建 Runtime | **复用 command 注册**或明确「行 scope 子 registry」API，避免双栈无限复制 |
| 预览 Provider | task，但挂在 ShellProviders | Keep 实现在 task；**装配在 layout**（正确） |
| Activity 时间线模型 | task/detail | Keep 内聚；重则拆文件 |
| 列表 wiring 进 shared | 曾有风险 | **禁止**；list-scene 属 task |

---

## C. 多方案对比

### 方案 T1 · 巩固现网 + 只拆文件

边界不动；拆 Shortcut/Menu/list-scene 文件。

| 优点 | 缺点 |
|------|------|
| 风险低 | **保留 task→layout 依赖** |
| | 双命令栈、策略在壳，不达 T2 |

**结论：** 仅过渡还债，**非目标**。

---

### 方案 T2a · 纯化依赖 + 保留 list-scene 一体 facade（**推荐**）

**结构心智：**

```txt
model/     纯：status priority placement selection rules, types
api/       IO
hooks/     query/mutation + useTaskListScene（编排）+ openTask policy
components/  Board Row Create ListSceneView ContextMenu
detail/    三形态 + preview provider
commands/  或 registerTaskCommands.ts  （C3 handlers）
shortcuts/ 薄封装：消费同一 handlers / command scope API
```

**关键翻转：**

1. **去掉 task → layout import**
   - EntityScene：由 `TaskListSceneView` 接收 **render props / 已解析 board props**，或定义 `TaskBoardSlotModel` 在 **task 或 shared 无壳语义** 类型中；layout adapter 只做映射。
   - 面包屑：list-scene 返回 `breadcrumbModel`，页/layout 调 `resolveBreadcrumb`，或 navigation 只收 labels。
   - 创建：注入 `requestCreateTask(draft)` port，实现放 layout host。
2. **openTask / openDetail 策略** 迁入 task public。
3. **registerTaskCommands** 供全局 command host；行快捷键 **优先复用同一 handlers**。
4. list-scene **保留单一 facade**（高内聚入口），内部拆子 hooks。

| 优点 | 缺点 |
|------|------|
| 对齐 T2/C3/规范 | 要改 list-scene 与 EntityScene 接线 |
| 可删除性：卸 task 摘注册+薄页+Provider | 拆依赖有一阵编译阵痛 |
| 一个 list-scene 入口产品清晰 | — |

---

### 方案 T2b · 拆成 task-list + task-detail 两 feature

| 优点 | 缺点 |
|------|------|
| 详情/列表物理分离 | 共享 model/api 仍要第三包或互相 public |
| | 过度切片；内核被劈开，**不推荐** |

---

### 方案 T3 · list-scene 下沉 layout

| 优点 | 缺点 |
|------|------|
| 无 | 壳拥有列表业务，**严重违反纯化** |

**结论：否。**

---

## D. 推荐 = **T2a**

### D.1 职责（纯化后）

| 负责 | 不负责 |
|------|--------|
| 任务实体规则、IO、Query/Mutation | 壳铬架、URL 方言规则 |
| 列表场景 wiring + Board/Row UI | 实现 ShellCommandActions 巨接口 |
| 详情三形态 + Preview Provider 实现 | EntityScene 槽位框架（属 layout） |
| openTask **策略**、命令 **handlers** | 手拼 path（用 navigation path-only） |
| 创建表单内容组件 | 创建弹窗是否打开的壳 store 实现 |

### D.2 目标 public（分组 · 宜紧）

| 分组 | 示例 |
|------|------|
| 场景 | `TaskListSceneView` · `useTaskListScene` |
| 看板/行 | `TaskBoard`（及稳定 Row 若外用） |
| 创建 | `TaskCreateContent` |
| 详情 | `TaskPage` · `TaskDrawer` · `TaskPreview` · Preview Provider/controller/register |
| 数据端口 | `taskKeys` · `taskListQueryOptions` · `taskDetailQueryOptions` · 必要 mutations hooks |
| 策略/命令 | `openTask…` · `registerTaskCommands` / handlers |
| 展示小件 | 稳定的 Status/Priority 指示器（若多处用） |

**不宜：** 半成品 controller 碎片、测试专用、detail 内部 section。

### D.3 与各模块协作（目标）

```txt
routes 薄页 ──► TaskListSceneView / TaskPage
layout EntityScene ──► 消费 task 给出的 board 槽数据（adapter 薄）
layout ShellProviders ──► 挂 TaskPreviewProvider
layout Overlay ──► TaskCreateContent
layout CommandHost ──► registerTaskCommands(ctx)
task handlers ──► task mutations + navigation path-only + entity-detail public
task list-scene ──► display-options / filter / selection / project / space **public**
task ──×──► layout（禁止）
```

| 场景 | 协作 |
|------|------|
| 三列表 | routes → TaskListSceneView(variant) |
| 项目内任务板 | project 页调 task Board / list hooks public |
| 完成任务（菜单/快捷键/行） | **同一 handler 族** |
| 打开任务 | task policy → intent.openTaskDetail / drawer search |
| 预览 | list register source；Provider 在壳树 |
| Badges | 复用 taskListQueryOptions 缓存 |

### D.4 list-scene 内部分层（facade 仍单一）

```txt
useTaskListScene
  ├ useTaskListData / queries
  ├ useTaskListController（mutations）
  ├ useTaskSelection
  ├ filter/display 注册（调 platform public）
  ├ preview/selection 注册
  └ 纯组装：board props + breadcrumb labels + empty copy
```

**禁止** facade 再 import layout。

### D.5 命令（对齐 C3）

| 层级 | 做法 |
|------|------|
| 全局 | `registerTaskCommands(hostCtx)` → complete/archive/delete/priority/… |
| 行级 | `TaskRowShortcutScope` 变薄：绑定同一 handlers + rowTarget context |
| 元数据 | id 可仍在 command/COMMAND_IDS；**run 在 task** |

---

## E. 最佳实践（task）

**Do**

- 四层纯化：model 无 React；api 无 JSX
- 列表一处 wiring；薄页零逻辑
- 外依赖只 public；换页只 navigation
- 打开/命令策略与 mutation 同模块
- Provider 实现在 task、挂载在 layout

**Don't**

- import `@/layout/**`
- 三列表复制粘贴
- 在 Board 里裸 invoke
- 在 layout Bridge 写任务完成
- public `export *`

---

## F. 体量债（改代码优先级）

| 文件 | ~行 | 动作 |
|------|-----|------|
| TaskRowShortcutScope | 970 | P0 拆 + 接 C3 handlers |
| TaskPreviewProvider | 509 | P0 拆 state/actions |
| TaskContextMenu | 461 | P1 拆菜单段 |
| useTaskListScene | 432 | P0 拆子 hooks + 去 layout 依赖 |
| TaskBoard | 425 | P1 |
| TaskRowAdapter | 366 | P1 |
| model 下 use* | — | 迁 hooks/ |

---

## G. 多方案小结

| 方案 | 长期 | 推荐 |
|------|------|------|
| T1 只拆文件 | 否 | 过渡 |
| **T2a 纯化+单 facade+C3** | **是** | **✅** |
| T2b 拆两 feature | 否 | ❌ |
| T3 scene 进 layout | 否 | ❌ |

---

## H. 迁移刀序（govern 时）

| 序 | 刀 |
|----|-----|
| 1 | 去掉 task→layout：端口化创建/面包屑/Scene 类型 |
| 2 | taskOpenStrategy → task public；layout 改调 public |
| 3 | 拆 useTaskListScene 子 hooks |
| 4 | registerTaskCommands 试点 + 删 bridge 对应片 |
| 5 | RowShortcut 复用 handlers 并拆文件 |
| 6 | PreviewProvider / ContextMenu / Board 拆瘦 |
| 7 | model/hooks 归位；收窄 public |

---

## I. 决议

| # | 决议 |
|---|------|
| 1 | 目标 **T2a**；内核单 feature 不劈 list/detail 包 |
| 2 | **禁止** task → layout；Scene/创建经端口或反向依赖 |
| 3 | open 策略 + 命令 handlers 在 task；对齐 command **C3** |
| 4 | list-scene 保持 **唯一列表 facade**，内拆不外拆 feature |
| 5 | Preview Provider 实现在 task、挂载在 layout |
| 6 | **边界刀已随 T2 执行**；实现债见 [11-Task样板重构执行计划](../11-Task样板重构执行计划.md) |

### 开放问题

- [x] EntityScene：现网由 entity-scene + task Board public 协作（不再阻塞）
- [x] 行级与全局：同 handlers（`runTaskRowBulkCommand`）；Registry 可分行 scope

仍开放（实现层）：

- [ ] list-scene / Shortcut / Preview 体量拆分节奏（见执行计划阶段 2–4）

---

## J. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：争议、T1/T2a/T2b/T3、协作、债、刀序 |
| 2026-07-18 | **archived-decision**：加 §0 落地对照；链 ARCHITECTURE + 11 执行计划；决议 #6 更新 |
