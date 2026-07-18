# T5 · Feature 模块化

> 状态：**T5 完成** · 2026-07-16  
> 原则：[`01-架构原则与术语.md`](./01-架构原则与术语.md) · 分层：[`目标架构.md`](./目标架构.md) · 壳：[`04-壳与平台拼装.md`](./04-壳与平台拼装.md)  
> 事实：[`../01-As-Is/00-模块注册表.md`](../01-As-Is/00-模块注册表.md) · platform/domain/scene 分册  
> Gap：**SCN-D1**（三列表 wiring）· 空壳/极薄 scene · QC 边界 · RING-META 等  
> **不做：** 逐文件搬家 diff（Migrate）· doctor 精读（T6）· 逐模块完整契约表（T7）

---

## 1. 目标结论（先读这段）

| 概念 | 定义（To-Be） | 可删除性理想 |
|------|----------------|--------------|
| **Domain feature** | 实体/生命周期真相：model + api + hooks + 业务 components | 卸装配 + 相关 routes；他人只依赖其 **public** |
| **Platform feature** | 被壳或多个 domain/scene **装配**的能力（命令、选择、批量…） | 卸 `layout` 注册行 + public 消费者 |
| **Scene** | **URL 级体验接线**；优先 `routes` 薄页，不必人人一个 `features/*` 目录 | 理想 Delete：只删 route（+ 可选极薄 components） |
| **Window feature** | 独立窗完整栈（QC） | 卸 route + 窗配置；**不**进 main layout |

**关键冻结：**

1. Feature 内夹名：`model` / `api` / `hooks` / `components` + **`index.public.ts`**（T1）。  
2. 三列表 wiring → **`features/task/hooks`**（list-scene facade），**不进 shared**（SCN-D1）。  
3. composition-shell（inbox/all-tasks/no-project）→ 收敛为 **routes 薄页 + task facade**；目录可删可留极薄 re-export。  
4. QC 保持独立厚 feature；共享 L0–L2，禁 main layout。  
5. DRY：**第三次**实质相同再抽；先抽 owner feature hooks，禁止「先扔 shared」。

---

## 2. 三类 + 窗：定义与判据

### 2.1 Domain

| 判据 | 是 domain 若… |
|------|----------------|
| 有持久实体或明确聚合 | Task / Project / Space / View 定义 / Lifecycle 条目 / Activity… |
| 有 IO | `api` invoke 列表/详情/变更 |
| 有缓存 | Query keys 以该域为 root |
| public | 供其它 feature / layout / routes 使用的 hooks、types、command slices |

**不负责：** 主壳 Provider 树、全局命令菜单框架（可向 command 注册 slice）。

### 2.2 Platform

| 判据 | 是 platform 若… |
|------|-----------------|
| 跨多个页面/实体复用 | 选择、批量、命令运行时、提交注册、危险确认… |
| 主要由 **layout 装配** | Provider 或 bridge 注册 |
| 尽量无「唯一实体表」 | 或仅适配器注入实体（bulk adapters） |

**不负责：** 某个 section 的完整列表业务（那是 domain + scene）。

### 2.3 Scene（页面体验）

| 判据 | 说明 |
|------|------|
| 对应一个或多个 **routes 叶子** | inbox、settings、views 页… |
| **默认不建厚 feature** | 逻辑进 domain/platform public；页在 `routes` |
| 可保留 feature 目录当… | 页 UI 很厚、或多 route 复用同一大块 components，且**无**独立实体 api |

| 厚度（沿用 As-Is 词，目标动作） | 目标 |
|----------------------------------|------|
| `empty` | **Delete** |
| `ultra-thin` | route 内联或 1 文件 re-export domain UI |
| `composition-shell` | **消灭复制**：facade + 薄页；目录可删 |
| `thick-scene` | 可留 `features/<scene>/components`；数据仍走 domain hooks |
| `mixed` | 如 settings：model/api 可留；被 nav 引用的面进 public |

### 2.4 Window（独立窗）

| 判据 | QC |
|------|-----|
| 独立路由 + 独立 React 树 | ✅ |
| 自有 session/runtime | ✅ |
| 与 main 数据 | 事件/IPC + public，不共享 layout stores |

---

## 3. 现有 feature 映射表（目标分类）

> 分类用于 **依赖与删除** 决策，不强制改文件夹名（已是 `features/*`）。

### 3.1 Domain

| Feature | 备注 | public 至少应有 |
|---------|------|-----------------|
| **task** | 内核；含 detail 三形态 | list-scene facade、detail hooks、queryOptions、command/bulk 相关面、types |
| **project** | 高入度 | detail/overview hooks、queryOptions、types |
| **space** | 含 active scope / pending open | visible query、CRUD hooks、scope api 面 |
| **lifecycle** | 编排委托 t/p/s | list hooks、mutations |
| **view** | 视图**定义**（≠ scene `views`） | list/run hooks |
| **activity** | timeline + debug | entity query |

### 3.2 Platform

| Feature | 壳装配 | 备注 |
|---------|--------|------|
| **command** | CommandBridge + 菜单 UI | 去根 `export *`；public 收窄 |
| **bulk-action** | BulkActionProvider + adapters | adapters 来自 domain public |
| **selection** | CommandSelectionProvider | 标杆 |
| **submit** | SubmitRegistryProvider | 标杆 |
| **filter** | PageFilterProvider | 偏任务页，仍 platform |
| **danger-confirm** | DangerConfirmProvider | 标杆 |
| **metadata-fields** | 被 task/project/QC 用 | **禁止**依赖 task 私有 ui（RING-META） |
| **display-options** | 列表页订阅 | 偏好 Store+Query |
| **global-search** | Header 入口 | 自有 query |
| **entity-detail** | 抽屉 URL search | 与 task/project 协作；非半死 drawer store |
| **workspace** | layout `useWorkspaceSync` | 仅 sync/invalidate |
| **sync** | Footer SyncStatusProvider | |
| **update** | overlays 挂载 | |
| **healthcheck** | — | **Delete** 或真接（零消费者） |

### 3.3 Scene（页）

| Feature | 厚度 | 目标 |
|---------|------|------|
| **inbox** | composition-shell | → routes 薄页 + `useTaskListScene({ variant:'inbox' })` |
| **all-tasks** | composition-shell | → 同上 `variant:'all'` |
| **no-project** | composition-shell | → 同上 `variant:'no-project'` |
| **archive** | ultra-thin | route → lifecycle UI；可内联 |
| **trash** | ultra-thin | 同上 |
| **views** | thick-scene | 可留 components；数据用 **view** domain hooks |
| **project-overview** | thick-scene | 可留 components；数据用 **project** hooks |
| **settings** | mixed | 保留 feature；section 面板 + public 给 nav |
| **task-drawer** | empty | **Delete 空目录** |

### 3.4 Window

| Feature | 目标 |
|---------|------|
| **quick-create** | Keep 厚模块；边界见 §6 |

### 3.5 不进 features 的「场景」

| 体验 | 归属 |
|------|------|
| Task / Project **详情页** | **domain** `task` / `project` components + routes |
| 主壳 chrome | **layout** |
| 启动恢复 | **app/navigation** + routes |

---

## 4. 目录模板：强制 vs 建议

### 4.1 标准域 / 平台模板

```txt
features/<name>/
  model/              # 强制出现代码时：types · rules · ports
  api/                # 有 IPC 则强制
  hooks/              # Query/Mutation/facade；应用层
  components/         # 业务 UI（原 ui/）
  index.public.ts     # 强制（有外部消费者时）；无外部消费者可延后但推荐
  ARCHITECTURE.md     # 建议：厚模块（command/task/QC）短契约
```

| 级别 | 规则（呼应 T1 O2） |
|------|---------------------|
| **强制** | 有 invoke → `api/`；有纯规则/类型 → `model/`；有外部依赖 → `index.public.ts`；components 禁止 invoke |
| **建议** | 四夹齐全；hooks 内可分子目录 `queries` / `mutations` / `scenes` |
| **禁止** | 空 `api/`/`model/` 目录占位；根 `export *`；跨 feature 深 import components |

### 4.2 极薄 scene（建议不建 feature）

```txt
routes/_shell/all/inbox/index.tsx   # 薄页直接 public facade
# 不必 features/inbox/
```

若需共多用 UI 块且无 api：`features/inbox/components` **仅 components**，无空夹。

### 4.3 与 As-Is 夹名迁移（名）

| As-Is | To-Be |
|-------|--------|
| `ui/` | `components/` |
| `query/` | `hooks/`（可保留子路径） |
| `core/` | 拆入 model 或 hooks |
| `runtime/` | platform/window 可保留；或归 hooks + layout 装配 |
| 无 public | 补 `index.public.ts` |

试点 **task** 先落地模板；其它 feature 按史诗复制。

---

## 5. 列表 Scene wiring（SCN-D1）

### 5.1 问题

`inbox` / `all-tasks` / `no-project` 各 200+ 行同构：filter、display-options、selection、bulk、EntityScene、board… **改一处改三处**。

### 5.2 目标落点（冻结）

```txt
features/task/
  hooks/
    useTaskListScene.ts     # facade：state / actions / meta
    … keys/queries/mutations
  components/
    TaskBoard.tsx
    …
  index.public.ts           # export useTaskListScene, TaskBoard, …

routes/…/inbox/index.tsx    # 薄：variant + EntityScene 填槽
routes/…/tasks/index.tsx
routes/…/no-project/index.tsx
```

**禁止：** `shared` 出现 list-scene；`layout` 写列表 Query。

### 5.3 Facade 契约（形状级 · 实现可演进）

```ts
// 示意
type TaskListSceneVariant = 'inbox' | 'all' | 'no-project' // + 未来可扩展

function useTaskListScene(input: {
  variant: TaskListSceneVariant
  scope: Scope  // 从 route/shell 注入
}): {
  state: { … }      // 列表数据、loading、filter 快照…
  actions: { … }    // 刷新、选择、bulk 触发入口…
  meta: { … }       // pageKey、空态文案键、board 模式…
  boardProps: …     // 可直接铺给 TaskBoard
}
```

对齐 Composition：消费者只认 **state/actions/meta**（+ 便利 boardProps），不拼 15 个底层 hooks。

### 5.4 页侧模板

```tsx
function InboxRoute() {
  const scope = useShellScope() // 或 route context
  const scene = useTaskListScene({ variant: 'inbox', scope })
  return (
    <EntityScene
      toolbar={…}
      board={<TaskBoard {...scene.boardProps} />}
    />
  )
}
```

### 5.5 迁移后 composition-shell 目录

| 选项 | 何时 |
|------|------|
| **A 删除** `features/inbox` 等 | 薄页零私有 UI（推荐试点后） |
| **B 留 re-export** | 外部仍错误深 import 旧路径时的过渡 |
| **C 留 components** | 仅该 variant 独有 UI 碎片 |

默认目标 **A**；Migrate 可先 B 再 A。

### 5.6 archive / trash

不进 task list-scene；走 **lifecycle** public 列表组件 + 极薄 route（已 ultra-thin，Keep 或内联）。

---

## 6. Quick Create（Window）边界

### 6.1 保持

| 项 | 结论 |
|----|------|
| 独立 feature 树 | Keep（api/runtime/domain/ui… 可逐步对齐四夹命名） |
| 独立 route | `/quick-create` |
| 独立 QueryClient / 状态 | 本窗 |
| 自有 ARCHITECTURE | Keep 短契约 |

### 6.2 加强（To-Be）

| 允许依赖 | 禁止 |
|----------|------|
| `features/task` **public**（rules、create mutation 面、types） | `layout/**`、ShellProviders、Shell  stores |
| `features/project|space` public（若创建需要） | 深 import task/components 私有 |
| `shared/components|lib` | 假设 main 的 selection/bulk context 存在 |
| 事件/IPC 通知 main 刷新 | 直接碰 main QueryClient 实例 |

### 6.3 与主窗数据（T3 回顾）

```txt
QC create → IPC/事件 → main workspace sync → invalidate
```

### 6.4 内部分层建议（渐进）

现有 `domain/runtime/layout/shell/ui` 已清晰；对齐全局词汇时：

| QC 现用 | 全局对应 |
|---------|----------|
| domain hooks | hooks + model |
| api | api |
| ui | components |
| shell/layout | **窗内** chrome（仍在 QC feature，不是 `src/layout`） |

**不要**为对齐而把 QC 塞进 `src/layout`。

---

## 7. DRY 判据（KISS）

### 7.1 何时抽

| 次数 / 信号 | 动作 |
|-------------|------|
| 1–2 处相似 | **复制可接受**；注释指向「勿过早抽象」 |
| **3 处**实质相同编排 | 抽到 **owner domain** 的 `hooks` facade |
| 跨 domain 无主 | 抽 **platform** feature；仍 public |
| 纯 UI 无业务 | `shared/components` |
| 「也许会用」 | **不抽** |

### 7.2 抽到哪里（决策树）

```txt
只服务 task 列表？     → features/task/hooks
只服务 project 概览？ → features/project/hooks
多实体同一交互？     → platform（bulk/selection/metadata…）
零业务视觉？         → shared/components
壳装配？             → layout 注册，实现仍在 feature
```

### 7.3 禁止的 DRY

- 为消文件数合并 **无关** feature  
- 把 list-scene 放进 shared「图方便」  
- 巨型 `utils.ts` 垃圾桶  
- 过早 monorepo package  

### 7.4 与可删除性

抽取后：**删除一个 variant** 不应要求改其它 domain 私有文件；只改 facade 分支或 route。

---

## 8. 依赖与 public 纪律（feature 间）

```txt
scene 薄页 / layout  →  domain|platform public
platform            →  domain public（adapters）· 其它 platform public（谨慎）
domain A            →  domain B public（如 lifecycle→task）
metadata-fields     →  仅 types/rules 级；❌ task/components
command             →  接口在 command；实现 slice 在各 domain public
```

**删除检查（每个有 public 的 feature 建议具备，T7 填全）：**

```txt
[ ] 谁 import 我的 public？
[ ] layout 哪几行注册？
[ ] 哪些 routes？
[ ] command/bulk 是否注册 slice/adapter？
```

---

## 9. 试点范围（β · 与 T1 一致）

**In**

1. `features/task` 四夹 + public + **`useTaskListScene`**  
2. 三条列表 route 改薄页  
3. 删除或掏空 inbox/all-tasks/no-project 复制体  
4. （并行可做）command public 收窄 + bridge 注册示意  

**Out**

- 一次改完全部 scene 命名  
- QC 大重构（仅守边界）  
- 全量 `ui→components` 改名 PR（可随 touch 改）  

**完成标准**

1. 三列表无三份 200 行复制编排  
2. 外模块不深 import `task/components`  
3. routes 不 import `task/api`  
4. `bun run check` 绿  

---

## 10. Gap 映射

| ID | 目标 |
|----|------|
| **SCN-D1** | task hooks list-scene |
| SCN 空壳 task-drawer | Delete |
| 空 api/model 目录 | Delete |
| healthcheck | Delete 或接线 |
| RING-META | metadata 只 public 类型/规则 |
| command 根 barrel | public 收窄 |
| composition-shell Delete 5 | 结构上可删目录 |

---

## 11. 带入后波（≤3）

| # | 问题 | 波次 |
|---|------|------|
| T5→T6 | list-scene 重渲染 / doctor 相关气味 | T6 |
| T5→T7 | 每个 feature 的 public 清单与删除表正文 | T7 |
| T5→Migrate | `ui`→`components` 改名是否独立 PR | Migrate |

---

## 12. T5 完成标准核对

| 波次要求 | 状态 |
|----------|------|
| platform/domain/scene 定义与映射 | ✅ §2–§3 |
| 目录模板强制/建议 | ✅ §4 |
| 列表 wiring 目标模块 | ✅ §5 |
| QC 边界 | ✅ §6 |
| DRY 判据 | ✅ §7 |
| 无搬家逐步 diff | ✅ |

---

## 13. 下一入口

→ **T6 · React 实践与检测**：`06-React实践与检测.md`  
（Vercel/TanStack 检查表 + react-doctor 基线精读与映射）

---

## 14. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-16 | T5 定稿 |
