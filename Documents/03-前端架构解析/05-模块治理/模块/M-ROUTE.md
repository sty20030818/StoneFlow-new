# M-ROUTE · routes（路由与逻辑场景）

> 日期：2026-07-17  
> 状态：**decided（讨论草案）** · 本阶段 **decide-only**  
> 路径：`src/routes/`（+ 生成物 `src/routeTree.gen.ts`）  
> 类：routing · 入站适配器边缘  
> 清单 ID 覆盖：`M-ROUTE-ROOT` · `M-ROUTE-SHELL` · `M-ROUTE-SCOPE-*` · `M-ROUTE-WINDOW` · `M-ROUTE-SCENES`（合并一场）  
> 上游：[`M-APP-NAV`](./M-APP-NAV.md) · 品质标准 Router 段  

---

## 1. 身份（点到为止）

| 项 | 内容 |
|----|------|
| **一句话** | **URL 入口层**：匹配路径、redirect/loader、挂 feature 页面；不拥有业务规则与壳 UI |
| **六边形** | 入站适配器最外圈：HTTP(S)/hash URL → 选用例（feature page/hooks） |
| **负责** | file route 树 · loader/redirect/error/notFound · 极薄 component 接线 · scope 上挂 remember + ShellRouteLayout |
| **不负责** | 业务 Query 编排真相（在 feature hooks）· 拼 canonical 规则（在 navigation）· 侧栏/命令实现 · 厚页面 JSX |
| **谁用它** | Router 运行时；用户经 URL/跳转进入 |
| **它用谁** | `app/navigation`（parse/remember/startup/intents）· `layout`（ShellRouteLayout）· `features/*` **public/page** · `shared` 反馈页零件 |

### 与 navigation / layout 的分工（钉死）

```txt
routes     = 这是哪个 URL、先加载什么、渲染哪个出口
navigation = path 语义、记忆、intent（不画 UI）
layout     = 壳铬架装配（侧栏顶栏…）
features   = 业务 UI + hooks + api
```

| 能力 | 归谁 |
|------|------|
| 当前 URL | Router（routes 配置其树） |
| `/` 启动恢复 redirect | **routes/index** loader + **navigation** memory API |
| 记录「上次在哪」 | **routes** scope 文件调 `useRemember…`；规则在 navigation |
| 解析 section 高亮 | layout 用 navigation.parse；**不是** route 文件里 split path |
| 列表/详情 UI | feature public |
| 详情前置 ensure + space 校正 redirect | **routes helpers + loader**（允许薄数据门闸） |

---

## 2. 现网结构（心智图）

```txt
src/routes/
├── __root.tsx                 # 根：error/notFound 壳
├── index.tsx                  # `/` 启动恢复 → redirect
├── settings.tsx               # legacy `/settings` 兼容
├── quick-create.tsx           # 独立窗
├── debug.activity.tsx         # 调试
├── -*.ts(x)                   # 非路由 colocated（`-` 前缀忽略为 path）
└── _shell/                    # pathless 工作区布局组
    ├── route.tsx              # 工作区 error/notFound + Outlet
    ├── -scoped-shell-route-layout.tsx
    ├── -detail-route-helpers.tsx
    ├── all/
    │   ├── route.tsx          # scope=all + remember + ScopedShell…
    │   ├── inbox.tsx · tasks/ · projects/ · views/ · settings/
    │   ├── archive.tsx · trash.tsx · no-project.tsx …
    └── spaces/$spaceId/
        ├── route.tsx          # scope=space + remember
        ├── …对称叶子…
        └── tasks/$taskId.tsx  # 详情（all 侧无对称叶，属产品选择）
```

**双树 `all` ∥ `spaces`：** 刻意对称薄页，**Migrate 明确不做强行合并叶子**（讨论确认：Keep，接受重复模板）。

---

## 3. 最佳实践（本模块）

### 3.1 薄页铁律

| 可以 | 不可以 |
|------|--------|
| `createFileRoute` + 挂一个 feature 出口 | 在 route 文件写完整业务页 |
| loader：`ensureQueryData` + redirect 门闸 | loader 里大段业务规则 / 多步编排上帝函数 |
| errorComponent / pending 用反馈页 | 复制第二套 shell / command |
| 从 feature **public** import | `@/features/x/hooks/foo` 深路径 |
| 调 navigation intent/path/memory | 手拼 `/spaces/`+id 散落 |

**标杆薄页（现网已达标）：**

```tsx
// inbox.tsx 量级
export const Route = createFileRoute('/_shell/all/inbox')({ component: InboxRoute })
function InboxRoute() {
  return <TaskListSceneView variant='inbox' />
}
```

**建议体量：** 普通叶子 **&lt; ~40 行**；带 loader 的详情叶 **&lt; ~80 行**；逻辑进 `-*-helpers` 或 feature hooks。

### 3.2 Loader 与 Query

- 用 **feature 的 `queryOptions` / public API** + `ensureQueryData`（与 TanStack 实践一致）。  
- loader 只做：**门闸、校正 URL、保证进页前关键数据在 cache**。  
- 页面展示态、列表 wiring 仍在 feature hooks（如 `useTaskListScene`）。  
- 全局 Query 默认（桌面 staleTime 等）在 **app/providers**，route 不各自发明一套。

### 3.3 Search / Params

- 需要 search 的路由（设置 section、debug、entity drawer 等）**校验**后用。  
- 实体抽屉「打开谁」优先 **URL search 契约**（entity-detail），不在 route 里养 drawer store。

### 3.4 错误与 404

- `_shell/route` 与 `__root` 提供统一反馈（`RouterFeedbackPage`）。  
- 详情 loader 失败 → 专用 errorComponent + helper 文案/动作 path（走 intents）。

### 3.5 独立窗

- `/quick-create`：**只挂** QC page，不进主壳 `_shell`。  
- 不与 main layout 共享壳 store。

---

## 4. 逻辑场景表（产品页 → 挂谁）

| 逻辑场景 | URL 示意 | 薄页 | 能力归属 |
|----------|----------|------|----------|
| 启动恢复 | `/` | `index.tsx` | navigation memory + space 列表 ensure |
| 收件箱 | `…/inbox` | all + spaces | **task** `TaskListSceneView` inbox |
| 全部任务 | `…/tasks` | all + spaces | **task** variant all |
| 无项目 | `…/no-project` | all + spaces | **task** variant no-project |
| 任务详情 | `…/tasks/:taskId` | **主要 spaces** | **task** `TaskPage` + detail helpers |
| 项目列表 | `…/projects` | all + spaces | **project-overview** |
| 项目详情 | `…/projects/:id` | all + spaces | **project** + helpers |
| 视图 | `…/views` · `…/:viewId` | all + spaces | **view** |
| 归档/回收站 | `…/archive` · `trash` | all + spaces | **lifecycle** |
| 设置 | `…/settings` · `…/$section` | all + spaces | **settings** page/contract |
| 快速创建 | `/quick-create` | 独立 | **quick-create** |
| Activity 调试 | `/debug/activity` | 独立 | **activity** |
| legacy 设置 | `/settings` | redirect | settings + navigation |

---

## 5. 关键路径（接 navigation 卡）

### 5.1 冷启动 `/`

```txt
Router 匹配 index
  → loader: ensure 可见 spaces
  → resolveStartupPath（navigation Store/规则）
  → throw redirect({ to })
  → 进入 /all/... 或 /spaces/...
  → scope route: remember + ScopedShellRouteLayout
       → parseShellRoute → layout.ShellRouteLayout
       → Outlet 叶子 feature
```

### 5.2 侧栏进 inbox（route 侧）

```txt
URL 已变为 …/inbox（navigation intent 已在 layout 做完）
  → 叶子 route component 只 return <TaskListSceneView />
  → 无第二套解析
```

### 5.3 打开任务详情（spaces）

```txt
navigate → /spaces/$spaceId/tasks/$taskId
  → loader: ensureVisibleSpaces
  → ensureTaskDetailRouteData（queryOptions + space 一致性）
  → 不一致则 redirect 到任务真实 space
  → component: <TaskPage scope taskId />
  → errorComponent: 统一错误态 + 回退 path
```

**要点：** route helper = **进页门闸**；不是 task 领域核心（规则仍在 task model/hooks）。

---

## 6. 体量与拆分

### 6.1 现状（健康度）

| 文件 | ~行 | 评价 |
|------|-----|------|
| 多数叶子 | 8–25 | **优** 薄页 |
| `index.tsx` 启动 | ~33 | 优 |
| scope `all/route` · `spaces/.../route` | ~16–18 | 优 |
| `-scoped-shell-route-layout` | ~29 | 优 |
| `_shell/route.tsx` | ~53 | 可接受 |
| 详情叶子 task/project | ~36–37 | 可接受 |
| **`-detail-route-helpers.tsx`** | **~183** | 可接受；逻辑集中门闸 |
| `-activity-debug-route.tsx` | ~110 | 调试可接受 |
| 全树合计 | ~47 文件 / ~1100 行 | 结构大、单文件不肥 |

**结论：** routes **没有** navigation 那种 400+ 巨石；治理重点是 **守住薄页**，不是大拆。

### 6.2 可选拆分（park · 非必须）

仅当 `-detail-route-helpers.tsx` 继续涨过 ~250～300：

| 建议 | 内容 |
|------|------|
| `-detail-route-task.ts` | ensureTask* · task 错误工厂 |
| `-detail-route-project.ts` | ensureProject* · project 错误 |
| `-detail-route-helpers.tsx` | 共享：ensureVisibleSpaces · ErrorStateView · 类型 |

activity debug 可保持 colocated `-activity-debug-*`，勿塞进 `_shell`。

### 6.3 明确不做

- 合并 `all/**` 与 `spaces/**` 为单叶动态 scope（成本高、收益低，To-Be 已否）。  
- 把 TaskListScene / 设置大页搬回路由文件。  
- 在 routes 恢复 `app/routing` 兼容层。

---

## 7. 反模式速查

| 反模式 | 为何否 |
|--------|--------|
| route 内 200 行业务 JSX | 第二 feature |
| loader 直接 `invoke` 绕过 feature api/hooks | 破 ACL |
| 深路径 `@/features/task/hooks/...` | 破 public |
| 手拼 path 不经 navigation | 与 intent 双轨 |
| 用 Zustand 存 currentSection 当真相 | 与 URL 双写 |
| 每个叶子复制 remember + Shell 装配 | 应留在 scope `route.tsx` + ScopedShell |

---

## 8. 治理决议

| 项 | 决议 |
|----|------|
| 边界 | §1 钉死；薄页 + 门闸 loader |
| 双树 all/spaces | **Keep 对称**；接受模板重复 |
| 详情 helper | 留在 `routes/_shell/-detail-*`；门闸用 feature queryOptions |
| 启动恢复 | 留在 `routes/index` + navigation memory |
| QC / debug | 独立于 `_shell` |
| 大文件 | 无强制拆；helper 涨了再按 §6.2 |
| 改代码 | **先谈后写**；本卡 decide-only |
| 与 NAV 关系 | 跳转生成归 NAV；匹配与挂载归 ROUTE |

### 开放问题（park）

- [ ] all 侧是否永远不提供 task detail 叶（产品决策；现状 spaces only）  
- [ ] 设置 search/section 校验是否全部收到 zod 级（可随 settings 模块深谈）  

---

## 9. 讨论用检查清单（达标定义）

- [x] 职责与 navigation/layout/feature 可划清  
- [x] 逻辑场景表完整  
- [x] 薄页标杆明确  
- [x] loader 门闸边界明确  
- [x] 双树策略明确  
- [x] 拆分仅可选、无伪需求大搬家  

---

## 10. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：身份、实践、场景表、路径、体量与可选拆分 |
