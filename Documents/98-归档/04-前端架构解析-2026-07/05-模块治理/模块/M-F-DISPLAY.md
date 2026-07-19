# M-F-DISPLAY · features/display-options

> 日期：2026-07-17  
> 状态：**decided（方案对比 · 与 filter 成对）** · **decide-only**  
> 路径：`src/features/display-options`  
> 类型：**platform（列表展示偏好）**；现强绑定 **task 列表**  
> 切分：与 filter **永不合并**（[07](../07-Feature切分与边界总览.md) · [M-F-FILTER](./M-F-FILTER.md)）  
> 关联：task list-scene · project/view 页 · EntityScene boardPatch  

---

## A. 现网事实

### A.1 一句话

**任务列表「怎么呈现」**：按 `pageKey` 存偏好（分组/排序/完成序/可见属性/布局）+ 把选项 **apply** 到 `TaskListItem[]` 得到排序、sections、boardPatch。

### A.2 结构（相对完整）

```txt
display-options/
  core/       pageKey、defaults、normalize、capabilities、options 类型
  api/        偏好读写（Store/后端）
  model/      useTaskDisplayOptions + query/mutation
  adapters/task/  compare · groups · apply → sections / boardPatch
  components/ DisplayOptionsButton / Panel / Popover
  index.ts
```

约 29 文件；面板 ~393 行。

### A.3 管道位置（与 filter）

```txt
tasks (query)
  → filter（哪些留下）          ← features/filter + task controller
  → display apply（排序/分组/列） ← display-options
  → board / selection 顺序
```

**顺序必须在 list-scene 写死并文档化**（推荐：**先 filter 再 display**）。

### A.4 消费者

| 谁 | 用途 |
|----|------|
| task list-scene / TaskListSceneView | options + apply + Button |
| ProjectPage / ViewsPage | 同上 |
| TaskBoard / TaskRowAdapter | `TaskDisplayPropertyKey` 可见列 |
| layout entity-scene types | 曾被 adapter **反向 import 类型**（灰区） |

### A.5 已做对的

- 与 filter **职责可分**（条件 vs 展示）  
- **pageKey** 分页偏好（inbox/all/view:…）正确  
- core 纯函数 + adapter apply 可测  
- 持久化走独立 api/query，不是随手 localStorage 散落  
- 切分总览：**Keep**，不并 filter  

### A.6 问题

| 问题 | 说明 |
|------|------|
| **几乎全是 task 专用** | 名是 display-options，实则 task-display；project 列表若有展示选项未对称 |
| **adapter → layout 类型** | `TaskDisplayBoardPatch` Pick `EntitySceneTaskBoardConfig` → **platform 依赖 layout**（倒依赖） |
| **adapter → task 标签** | `formatTaskStatusLabel` 等 — 可用 public，OK |
| **Panel 偏厚** | UI 债，非切分错 |
| **无「注册总线」** | 与 filter/selection 不同：各页直接 `useTaskDisplayOptions(pageKey)`——合理（状态在 Query 不在壳） |

---

## B. 边界争议

| 候选 | 现在 | 目标 |
|------|------|------|
| 偏好存储 + hooks + UI | display-options | **Keep platform** |
| task apply/compare/groups | adapters/task | **可留**（task 展示适配器）或声明为 task-display 子域 |
| boardPatch 类型 | 绑 EntityScene | **改定义在 display 或 shared，layout 适配**；禁 → layout |
| 并 filter | — | **否** |
| 并 task | — | **否**（多页、持久化、按钮 UI 跨宿主） |
| project 行展示选项 | 无对称包 | 需要时 **另 adapter**，不塞进 task apply |

---

## C. 多方案对比

### 方案 D1 · 巩固 + 去 layout 类型依赖

修 boardPatch 类型；结构不动。

| 优点 | 缺点 |
|------|------|
| 快 | 命名仍像通用、实则仅 task |

**结论：** 最低过渡。

---

### 方案 D2 · Keep 包 + 明确「Task Display」子域 + 断 layout 依赖（**推荐**）

```txt
display-options/
  core/ model/ api/ components/   # 偏好基础设施可复用
  adapters/task/                  # 明确仅任务列表 apply
  # 禁止 import layout
  boardPatch 用自有类型 → TaskBoard / EntityScene adapter 映射

list-scene:
  filtered = filter(...)
  presented = applyTaskDisplayOptionsToTasks(filtered, options)
```

| 优点 | 缺点 |
|------|------|
| 切分与 filter 正交保持 | 命名可考虑副标题「task list display」 |
| 多页（inbox/project/view）共享 | |
| 去倒依赖 | 要改 types |

**结论：最优。**

---

### 方案 D3 · 整包并进 task

| 优点 | 缺点 |
|------|------|
| apply 与 task 同包 | ProjectPage/ViewsPage/按钮依赖 task 仅因显示；持久化 api 胀 task |
| | 与「平台偏好」心智冲突 |

**结论：否。**

---

### 方案 D4 · 并进 filter

| 优点 | 缺点 |
|------|------|
| 少包 | 条件/展示/持久化模型搅乱（已否） |

**结论：否。**

---

### 方案 D5 · 拆成 display-options-core + task-display feature

| 优点 | 缺点 |
|------|------|
| 名字极准 | 过拆；现仅 task 适配器，C6 第三次再抽 |

**结论：不优先**；D2 内 `adapters/task` 足够。

---

## D. 推荐 = **D2**

### D.1 职责

| 负责 | 不负责 |
|------|--------|
| 每 pageKey 的展示偏好读写 | 筛掉哪些任务（filter） |
| normalize/defaults/capabilities | 实体 mutation |
| apply：排序、分组 sections、可见属性 | EntityScene 框架实现 |
| DisplayOptions 按钮/面板 UI | 导航、壳装配 |

### D.2 协作

```txt
useTaskListScene / ProjectPage / ViewsPage
  pageKey = inbox | all | project:… | view:…
  options = useTaskDisplayOptions(pageKey)
  items = filterController.filteredTasks
  { sections, orderedItems, visibleProperties, boardPatch }
      = applyTaskDisplayOptionsToTasks(items, options, ctx)
  → TaskBoard / EntityScene（layout 只映射 boardPatch 形状）

DisplayOptionsButton → 改 preferences → invalidate query
```

### D.3 与 filter（成对）

| 规则 | |
|------|--|
| 模块 | **两个 Keep** |
| 顺序 | **先 filter 后 display**（scene 固定） |
| 命令 | 筛选多走 filter context；显示多在页按钮 |
| 持久化 | display 有；filter 页内态为主（除非产品要求记住筛选） |

### D.4 断 layout 依赖（必做项）

```txt
现在：display-options/adapters → layout/entity-scene types
目标：display 定义 DisplayBoardPatch（自有字段）
      layout TaskBoardAdapter / EntityScene 做字段映射
```

### D.5 public 目标

**宜：** pageKey 工具、useTaskDisplayOptions、apply + createContext、DisplayOptionsButton、PropertyKey 类型。  
**慎：** 导出过多 compare 内部函数（测试可用深路径或 test-utils）。

---

## E. 最佳实践

**Do**

- pageKey 稳定、可序列化  
- apply 纯函数、可单测  
- 与 filter 管道顺序写进 list-scene 注释  
- 偏好变更走 mutation + query  

**Don't**

- import layout  
- 在 display 里做 status===done 过滤冒充 filter  
- 把 display state 塞进 filter controller  
- 无 pageKey 全局一份选项打所有列表  

---

## F. 体量

| 文件 | ~行 | 动作 |
|------|-----|------|
| DisplayOptionsPanel | 393 | P1 拆 sections |
| task-display-capabilities / normalize / compare / groups | 200+ | 保持纯；可按文件已分 |
| useTaskDisplayOptions | 128 | OK |

---

## G. 迁移刀序

| 序 | 刀 |
|----|-----|
| 1 | 去掉 adapter → layout 类型依赖 |
| 2 | list-scene 文档化 filter→display 顺序（与 F2 一起） |
| 3 | Panel 拆 UI |
| 4 | （若出现 project 展示偏好）再加 adapters/project，勿塞 task apply |

---

## H. 方案小结

| 方案 | 荐 |
|------|-----|
| D1 小修 | 过渡 |
| **D2 Keep + task 适配器 + 断 layout** | **✅** |
| D3 并 task | ❌ |
| D4 并 filter | ❌ |
| D5 再拆 feature | 不优先 |

---

## I. 决议

| # | 决议 |
|---|------|
| 1 | **Keep** display-options；**不与 filter 合并** |
| 2 | 目标 **D2**；明确 task 列表展示平台 |
| 3 | **禁止** → layout；boardPatch 自有类型 |
| 4 | 管道：**filter → display apply → board** |
| 5 | decide-only |

### 开放问题

- [ ] pageKey 与路由/viewId 的生成是否只允许 `createTaskDisplayViewPageKey` 等工厂（推荐是）  
- [ ] 布局模式 layout list/board 是否与 EntityScene boardKind 双源（需单一真相）  

---

## J. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：与 filter 分界、D1–D5、layout 倒依赖、推荐 D2 |
