# M-F-BULK · features/bulk-action

> 日期：2026-07-17  
> 状态：**decided（方案对比 · 对齐 T2/C3/task T2a）** · **decide-only**  
> 路径：`src/features/bulk-action`  
> 类型：**platform**  
> 关联：[M-F-COMMAND](./M-F-COMMAND.md) · [M-F-TASK](./M-F-TASK.md) · layout `ShellBulkActionBoundary`

---

## A. 现网事实

### A.1 心智（已经比较「平台」）

```txt
页面/命令/行快捷键
  → 构造 BulkSelectionSnapshot
  → BulkActionProvider.run(actionId, snapshot)
  → Runtime：确认？→ 找 action 定义
  → Adapter 执行 mutation（调 task/project/lifecycle api）
  → Result → 是否清空 selection / toast
```

| 夹 | 职责 |
|----|------|
| `core` | 契约、Registry、Runtime、snapshot、result 规则 |
| `actions` | **task/project/lifecycle 动作定义**（产品动作表） |
| `adapters` | **实体 mutation 实现**（内部已 import task/project public api） |
| `runtime` | Provider / hooks |
| `components` | 确认对话框等 |
| `selection` | `useSectionSelection` 辅助 |

### A.2 装配

```txt
layout/ShellBulkActionBoundary
  → createTask/Project/LifecycleBulkAdapter + *BulkActions 数组
  → <BulkActionProvider actions context.adapter>
  → ShellLayoutContent

layout/command-bridge/bulkSlice
  → 薄：runEntityBulkActionFromCommand(entity, actionId)
  → 即调 bulk runtime（业务 id 仍来自 bulk-action 导出的 TASK_BULK_ACTION_IDS）

task/shortcuts
  → useBulkActionContext().runBulkAction + task snapshot
```

### A.3 已做对的

- **统一链路**（snapshot → runtime → adapter → result），不是页脚私货  
- core 与 UI 分离清晰  
- adapter 最终打到 **feature public api**（如 task 的 archive/delete）  
- command 侧 bulkSlice **已较薄**（只转发）  
- 有确认策略与 danger-confirm 协作  

### A.4 问题（纯化视角）

| 问题 | 说明 |
|------|------|
| **平台包内嵌三域动作+适配器** | `actions/task.*`、`adapters/task-*` 住在 bulk-action → **platform 依赖并拥有 domain 知识** |
| **ShellBulkActionBoundary 上帝组装** | layout 知道三域 adapter 怎么 new | 
| **与 command 双入口** | 全局命令走 bridge→bulk；行快捷键直接 runBulkAction——尚可，但 id/定义分散感知 |
| **selection 命名空间** | `useSectionSelection` 在 bulk 内，易与 `features/selection` 混淆 |
| **public 面宽** | 大量 snapshot builder / ids 导出——有消费者合理，需分组文档 |

**一句话：** 运行时模型是好的；**所有权反了**——「批量引擎」里塞满了 task/project 专有动作。

---

## B. 边界争议

| 候选 | 现在 | 目标倾向 |
|------|------|----------|
| task bulk actions 定义 | bulk-action/actions | **task 模块**（或 task 注册） |
| task bulk adapter | bulk-action/adapters | **task 模块** |
| BulkActionProvider | bulk-action | **留 platform** |
| snapshot 通用结构 | core | **留 platform** |
| task 专用 snapshot builder | core | 可留 core 泛型 + **task 填实体字段** 或 task 侧 builder |
| ShellBulkActionBoundary | layout | **薄 compose**：`actions={[...taskBulk, ...]}` 来自各 public，或 register |
| bulkSlice 命令 | layout | C3 后 → **task.registerCommands 内调 runBulk** 或 bulk 注册「命令桥接」 |
| useSectionSelection | bulk-action | 评估迁 **selection** 或改名避免混 |
| Confirm UI | bulk-action | Keep platform 或共用 danger-confirm |

---

## C. 多方案对比

### 方案 B1 · 巩固现网

动作与 adapter 继续放 bulk-action；layout 继续组装。

| 优点 | 缺点 |
|------|------|
| 零迁移；单包找得到所有 bulk | platform 永远知道三域；加实体要改 bulk-action + layout |
| | 与 T2「域高内聚」冲突 |

**结论：** 过渡可，**非长期目标**。

---

### 方案 B2 · 仅拆目录、所有权不变

`bulk-action/domains/task/...` 物理分区。

| 优点 | 缺点 |
|------|------|
| 好找 | **依赖方向不变** |

**结论：** 不够。

---

### 方案 B3 · 域拥有动作+适配器，bulk 只做引擎（**推荐**）

```txt
features/bulk-action  （纯化 platform）
  core/     类型、Registry、Runtime、通用 snapshot、result
  runtime/  Provider、runBulkAction
  components/  确认框（可选）
  —— 无 task.bulk-actions / task-bulk-adapter ——

features/task
  bulk/ 或 commands+bulk
    taskBulkActionDefinitions
    createTaskBulkAdapter
    createTaskBulkSelectionSnapshot  // 可保留调用 core 工厂
    registerTaskBulk(host) → 贡献 actions + adapter 片

features/project · lifecycle 同理

layout（或 app composition）
  ShellBulkHost:
    actions = [...task.getBulkActions(), ...project..., ...lifecycle...]
    adapter = { ...task.createBulkAdapter(deps), ... }
    <BulkActionProvider actions adapter>
```

进阶（与 C3 一致）：**Provider 支持动态 register**，壳只挂空引擎，feature mount 时注册（注意顺序与 SSR/桌面单页）。

| 优点 | 缺点 |
|------|------|
| 真正高内聚：改任务批量只动 task | 迁文件 + Boundary 改组装 |
| 卸 task = 不贡献 bulk 模块 | adapter 合并策略要清晰（扁平 merge 已有） |
| bulk-action 可测、可复用、可删除 | |
| 与 command C3：handler 内 `runBulkAction(TASK_IDS.x, snapshot)` 同域 | |

**结论：长期最优。**

---

### 方案 B4 · 取消独立 bulk feature，逻辑回各页

| 优点 | 缺点 |
|------|------|
| 少一个包 | 确认/结果/清空 selection **再次复制**；历史倒车 |

**结论：否。**

---

### 方案 B5 · bulk 只保留 core，runtime 并入 selection

| 优点 | 缺点 |
|------|------|
| 少 platform | selection 与「执行批量」职责不同，易胖 |

**结论：不优先；selection 保持「选中态」，bulk 保持「执行管道」。**

---

## D. 推荐 = **B3**

### D.1 纯化后职责

| 模块 | 负责 |
|------|------|
| **bulk-action** | 通用契约、Registry/Runtime、Provider、确认编排、result 语义、（可选）通用 UI |
| **task/project/lifecycle** | 本域 bulk **定义 + adapter + snapshot 特化 + 与命令/行快捷键共用的执行入口** |
| **layout** | **只组装** Provider（或注册点）；不写 complete/archive 业务 |
| **command** | 不实现 bulk；C3 handler 调域或 `runBulkAction` |
| **selection** | 多选/命令选中上下文；**不**执行 mutation |
| **danger-confirm** | 通用确认；bulk runtime 已用则保持 |

### D.2 协作流（目标）

```txt
[用户多选]
  selection / 页面 selection
       │
       ▼
[触发：Bulk bar / 命令 / 行快捷键]
  snapshot = task.createBulkSnapshot(...)
  runBulkAction(id, snapshot)   // bulk runtime
       │
       ▼
  task 注册的 action.run → task adapter → task api
       │
       ▼
  result → 清 selection / toast / invalidate（经 adapter 或 shared invalidation）
```

**命令 C3：**

```txt
registerTaskCommands:
  completeSelected → 从 command context 建 snapshot → runBulkAction(completeId)
```

**不再需要** layout `bulkSlice` 里写死三域 id 映射（或缩成通用 `runBulkFromCommand(ctx)` 若仍要一层）。

### D.3 与 task T2a / command C3 对齐

| 决议 | 关系 |
|------|------|
| task 不依赖 layout | Boundary 只挂 Provider，task 不 import Boundary |
| 行快捷键与全局命令同一执行路径 | 都 `runBulkAction` + 同 action id |
| open 策略在 task | bulk 不负责导航 |

### D.4 public（bulk-action 目标收窄）

**宜：** Provider、hooks、core 类型、Registry/Runtime、通用 snapshot/result 工厂、confirm 组件。  
**迁出后不宜再导出：** `taskBulkActions`、`createTaskBulkAdapter`、TASK 专用 id（改由 task public 导出 `TASK_BULK_ACTION_IDS` 或挂在 task）。

过渡期可 **re-export 兼容** 一窗，再删。

---

## E. 最佳实践

**Do**

- 批量 = snapshot + actionId + 单一 runtime  
- 确认策略在 action 定义 / runtime，不进 Board  
- adapter 只 IO + 刷新；规则在 domain model  
- 清空 selection 跟 result 策略走（已有 helper）  

**Don't**

- 页面私写「批量删」绕过 runtime  
- 在 layout 写实体 mutation  
- bulk-action 新增第四域文件而不走「域模块贡献」  
- 与 selection feature 职责搅成一锅  

---

## F. 体量

整体健康（单文件多 &lt; 260）。债主要在 **所有权**，不是 1500 行巨石。  
`task.bulk-actions.ts` ~254、adapter ~158：迁到 task 后随 task 治理。

---

## G. 迁移刀序（govern 时）

| 序 | 刀 |
|----|-----|
| 1 | 明确 bulk **引擎 API** 稳定（Provider/run/types） |
| 2 | 将 `actions/task*` + `adapters/task*` → `features/task/bulk/`（public 导出） |
| 3 | project / lifecycle 同理 |
| 4 | `ShellBulkActionBoundary` 改为 compose 各 public |
| 5 | bulk-action 删除域文件；index 收窄 |
| 6 | command C3：去掉专用 bulkSlice 业务表，handler 走 runBulk |
| 7 | 评估 `useSectionSelection` 归属 |

---

## H. 方案小结

| 方案 | 长期 | 推荐 |
|------|------|------|
| B1 巩固 | 否 | 过渡 |
| B2 只改目录 | 否 | ❌ |
| **B3 域贡献+引擎** | **是** | **✅** |
| B4 取消 bulk 包 | 否 | ❌ |
| B5 并入 selection | 否 | ❌ |

---

## I. 决议

| # | 决议 |
|---|------|
| 1 | 长期 **B3**；bulk-action = **纯批量引擎** |
| 2 | task/project/lifecycle **拥有**各自 bulk 定义与 adapter |
| 3 | layout **只组装** Provider |
| 4 | 与 command C3、task T2a 共用 **runBulkAction** 执行路径 |
| 5 | 保留独立 bulk feature（否 B4） |
| 6 | decide-only；刀序 §G |

### 开放问题

- [ ] Provider 静态 `actions={[]}` compose vs 运行时 register（推荐先 **静态 compose**，简单；与 C3 注册可第二步统一风格）  
- [ ] `TASK_BULK_ACTION_IDS` 命名空间保留在 bulk core 还是迁 task（推荐 **迁 task**，core 只保留类型）  
- [ ] Bulk bar UI 若存在于 shared/patterns，是否继续与 feature 分离（保持）  

---

## J. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：现网链路、B1–B5、推荐 B3、协作与刀序 |
