# M-F-VIEW · features/view

> 日期：2026-07-17
> 状态：**decided（方案对比）** · **V2 已落地（[15](../15-View样板重构执行计划.md)）** · 2026-07-19
> 路径：`src/features/view`（原 `features/views` scene 已合并）
> 类型：**domain + thick scene（混合）→ 目标拆清**
> 关联：task T2a · selection L2 · display-options · routes `/views`

---

## A. 现网事实

### A.1 一句话

**自定义视图**：视图定义的 CRUD/排序/可见性 + **按视图跑任务列表**（`useTaskViewRunQuery`）+ **Views 页 UI**（侧栏式视图列表 + 任务板 + 编辑对话框）。

### A.2 结构

```txt
features/view/
  api/views.ts
  hooks/  keys · queries · mutations
  components/
    ViewsPage.tsx          ~386  厚页：视图管理 + 任务板 wiring
    ViewEditorDialog.*     ~429  创建/编辑定义
    ViewActionsMenu.tsx
  index.ts  public 偏薄（hooks + 三组件）
```

**无独立 model/** 夹——规则多在 form / shared types（`View`、`TaskViewFilters` 等）。

### A.3 路由

- `/views` · `/views/$viewId`（all + spaces 双树）→ 都挂 **同一** `ViewsPage`
- 无独立「只定义不执行」路由

### A.4 消费者

| 谁 | 用途 |
|----|------|
| routes | ViewsPage |
| project-overview | `useViewsQuery`（视图列表数据） |
| 内部深路径 | ViewsPage 直接 `@/features/view/hooks`（**本 feature 内**，可改为相对/hooks） |

### A.5 已做对的

- 旧 `views` scene 壳已合并进 **view** domain 命名
- public 未乱 export 整树
- 执行列表用专用 run query，不是假客户端滤全表（需保持）
- 编辑器与页分离组件

### A.6 问题

| 问题 | 说明 |
|------|------|
| **ViewsPage → layout** | EntityScene、ShellRouteContext、useDialogStore — 同 task/project |
| **厚页 = 视图管理 + 半套 task list-scene** | 筛选/选择/预览/bulk/display 全堆在 ViewsPage |
| **domain/scene 未分** | 定义 CRUD 与「跑视图的任务页」揉在一个 feature 可接受，但 **页编排过重** |
| **无 model 层** | 过滤器/排序默认值、校验可沉淀纯函数 |
| **命令/bulk** | 任务操作靠 task controller + bulk；视图自身 CRUD 在页内 — OK |
| **深 import hooks** | 组件未走 barrel 内部约定时注意边界脚本只拦跨 feature |

---

## B. 边界争议

| 候选 | 现在 | 目标倾向 |
|------|------|----------|
| 视图定义 CRUD + run query | view hooks/api | **Keep domain 核心** |
| ViewsPage 任务板 | view 内手写 | **组合 task public**（T2a 同款） |
| ViewEditorDialog | view | Keep |
| layout 依赖 | page → layout | **禁止**；端口化 |
| 是否再拆 `features/views` scene | 已合并 | **不拆回空壳**；用 page facade 减重 |
| 视图定义 vs 任务执行缓存 | 两套 query | Keep 分离 keys |

---

## C. 多方案对比

### 方案 V1 · 巩固 + 去 layout 依赖

只修倒依赖、小拆文件；页仍厚。

| 优点 | 缺点 |
|------|------|
| 快 | 任务 wiring 继续复制 |

**结论：** 最低过渡。

---

### 方案 V2 · 纯化：domain 瘦 + `useViewTaskScene` facade（**推荐**）

```txt
view/
  model/     纯：默认 filter/sort、editor 映射（从 form 抽）
  api/ hooks/  定义 + run
  components/
    ViewsPage          薄：视图轨 + 挂 scene
    ViewEditorDialog
    ViewTaskSceneView  或 hooks/useViewTaskScene
      → 内部组合 task list controller/selection/preview + run query 结果

task
  提供可嵌入的 list 能力 public（与 project 页共享模式）
```

| 优点 | 缺点 |
|------|------|
| 与 task/project 页模式一致 | 要抽 facade |
| 定义与「跑列表」仍一 feature，产品内聚 | |
| 不恢复空 views feature | |

**结论：长期最优。**

---

### 方案 V3 · 拆成 view（定义 only）+ views-scene（页）

| 优点 | 缺点 |
|------|------|
| 纸面干净 | 两包来回 public；曾合并 views 的收益倒退 |
| | scene 包易再变 composition-shell |

**结论：不优先**（除非页与定义生命周期完全独立演进）。

---

### 方案 V4 · 跑视图变成 task 的 variant

`TaskListSceneView variant="view" viewId=`，view 只提供定义 CRUD。

| 优点 | 缺点 |
|------|------|
| 列表 wiring 单源 | view 页还有 **视图列表/排序/编辑器** 强 UI |
| | task variant 再膨胀 |

**结论：** **部分吸收**——run 结果的任务板走 task 能力；**页壳与定义管理留 view**（并入 V2）。

---

### 方案 V5 · 视图定义放 shared/types 仅类型，逻辑散落

| 优点 | 缺点 |
|------|------|
| 无 | 无主模块 |

**结论：否。**

---

## D. 推荐 = **V2**（+ V4 的「任务板复用」）

### D.1 职责

| 负责 | 不负责 |
|------|--------|
| View 实体 CRUD、可见性、排序 | 主壳导航 |
| `taskViewRun` 查询与 keys | 复制 task mutation 实现 |
| Views 页：视图轨 + 编辑器 + **编排**任务板 | EntityScene 框架、layout store |
| 过滤器/排序的 **视图定义语义** | display-options 存储实现（调用其 public） |

### D.2 协作

```txt
routes /views[/id] → ViewsPage
ViewsPage
  ├─ useViewsQuery / mutations / ViewEditor
  └─ useViewTaskScene(viewId)
        ├─ useTaskViewRunQuery
        ├─ task: controller / selection / preview register
        ├─ selection register
        ├─ display-options pageKey = view 相关
        └─ 输出 board props（无 layout import）

project-overview → useViewsQuery only
navigation → openView intent（已有）
command C3 → 可选 registerViewCommands（新建视图等）
```

### D.3 public 目标

**宜：** views/run queries & mutations、keys、ViewsPage、ViewEditorDialog、ViewActionsMenu。
**可选：** `useViewTaskScene` 若 project 外还要嵌视图板。
**model：** 纯函数默认值/转换从 form 文件抽离。

### D.4 与 task / project 页模式对齐

| 页 | 列表数据来源 | 编排位置 |
|----|--------------|----------|
| inbox/all/no-project | task list query | useTaskListScene |
| project detail | task list + projectId | useProjectDetailScene（P2） |
| **view run** | **taskViewRun** | **useViewTaskScene（V2）** |

三者都 **禁止** page→layout；都 **组合** task 执行能力。

---

## E. 最佳实践

**Do**

- 定义与 run **分 query key**
- 改视图定义后失效 run 缓存（mutation 已有则保持）
- 编辑器用 zod/form；提交走 view mutations
- 打开视图用 `openView` intent

**Don't**

- ViewsPage import layout
- 在 view 内再实现 archiveTask
- 为「干净」再建空 `features/views`
- 手拼 `/views/id`

---

## F. 体量

| 文件 | ~行 | 动作 |
|------|-----|------|
| ViewEditorDialog | 429 | P0 拆 form 已部分；UI sections |
| ViewsPage | 386 | P0 抽 useViewTaskScene + 去 layout |
| ViewEditorDialog.form | 207 | 迁 model 纯函数 |
| ViewActionsMenu | 160 | OK |

---

## G. 迁移刀序

| 序 | 刀 |
|----|-----|
| 1 | ViewsPage 去 layout 依赖 |
| 2 | 抽 `useViewTaskScene` / ViewTaskSceneView |
| 3 | model 沉淀 editor 纯函数 |
| 4 | 拆 EditorDialog 体量 |
| 5 | （可选）registerViewCommands |
| 6 | 与 task 嵌入 API 对齐命名（三页一套文档） |

---

## H. 方案小结

| 方案 | 荐 |
|------|-----|
| V1 小修 | 过渡 |
| **V2 domain + view-task facade** | **✅** |
| V3 再拆 views scene 包 | 不优先 |
| V4 整页变 task variant | 部分吸收 |
| V5 取消 view 模块 | ❌ |

---

## I. 决议

| # | 决议 |
|---|------|
| 1 | **Keep 单 feature `view`**（不拆回 views 空壳） |
| 2 | 目标 **V2**：定义 domain + 任务板 facade 组合 task |
| 3 | 禁止 view → layout |
| 4 | run query 保持服务端/专用执行，不假滤全表 |
| 5 | decide-only |

### 开放问题

- [ ] 视图是否支持非 task 实体（长期）；若否，命名可保留 task-run 专用 API
- [ ] `$viewId` 缺失时落地列表第一可见视图 vs 空态（产品）

---

## J. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：混合厚页问题、V1–V5、推荐 V2 |
| 2026-07-19 | V2 落地：useViewsScene + public 收窄；见 [15](../15-View样板重构执行计划.md) |
