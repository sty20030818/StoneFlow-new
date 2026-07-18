# StoneFlow 全局路由系统重构方案

> 方案 A + 方案 C 改良版：先集中路由规则，再迁移到 Space First 的长期 URL 结构。

---

## 1. 文档定位

本文档定义 StoneFlow 全局路由系统的长期重构方案，覆盖主窗口页面路由、Space 作用域、所有空间聚合页、项目与任务详情页、详情弹窗、启动恢复、搜索跳转、命令跳转、最近访问和 Quick Create 独立窗口入口。

本方案不是单纯替换 `src/app/router.tsx`，而是把当前散落在 Shell、Sidebar、Command、Search、Entity Detail、启动恢复中的路由规则收口为统一的 Routing 模块，再迁移到更长期稳定的 URL 结构。

---

## 2. 核心结论

推荐采用两阶段方案：

1. **方案 A：路由规则归口**
   - 保留当前 URL 行为一段时间；
   - 新建统一 Routing 模块；
   - 禁止各 feature 手写 path 字符串；
   - 先让所有入口都通过统一 route builder / parser。

2. **方案 C 改良版：Space First 长期 URL**
   - 不采用纯 query scope，例如 `/tasks?space=xxx`；
   - 把单独 Space 作为主工作路径；
   - 把所有空间作为 `/all/...` 次级聚合路径；
   - 保留 `/tasks/:taskId`、`/projects/:projectId` 作为兼容/快捷入口，但最终跳转到 canonical route。

最终原则：**StoneFlow 的主心智不是“页面 + 筛选器”，而是“用户正在某个 Space 里工作”。因此 Space 应该进入结构化 path，而不是只藏在 query 里。**

---

## 3. 当前问题

### 3.1 显式路由不多，但语义分散

当前主路由集中在 `src/app/router.tsx`：

- `/quick-create`
- `/`
- `/tasks/:taskId`
- `/spaces/...`
- `/space/:spaceId/...`

但真实路由语义还散在：

- `src/app/layouts/shell/config.ts`
  - `buildScopedSectionPath`
  - `buildScopedProjectPath`
  - `resolveShellSection`
- `src/app/layouts/shell/model/shellDevicePreferences.ts`
  - 启动恢复；
  - 最近 scope path；
  - rememberable allowlist。
- `src/features/global-search/model/searchNavigation.ts`
  - 搜索结果打开任务/项目时手写 path。
- `src/features/entity-detail/model/entityDetailNavigation.ts`
  - Drawer query；
  - 独立任务/项目详情路径。
- `src/app/layouts/shell/ShellLayout.tsx`
  - Quick Create / command-open / project open 里仍存在 path 拼接。

这种结构的问题不是“路径数量太多”，而是**路由规则没有 owner**。

### 3.2 `/spaces` 和 `/space/:spaceId` 容易误读

当前：

- `/spaces/...` 表示所有空间；
- `/space/:spaceId/...` 表示单独空间。

这两个前缀过于接近。长期维护时，很容易在命令、测试、搜索跳转、启动恢复里写错。

### 3.3 Project 详情入口不完整

当前已有 `openEntityPageTarget` 会生成：

- `/tasks/:taskId`
- `/projects/:projectId`

但 router 当前只注册了 `/tasks/:taskId`，没有注册 `/projects/:projectId`。这说明独立项目详情页语义已经出现，但路由表没有闭合。

### 3.4 Drawer、Preview、Page 的边界需要继续保持

当前详情系统已经形成三个不同层次：

- Task Preview：列表上下文内的轻量只读预览；
- Task Drawer：列表上下文内的右侧详情弹窗；
- Task Page：独立详情页面。

路由重构不能把这三者混成一套。尤其不应把 Preview 或 Drawer 强行改成深层嵌套路由，否则会扩大状态复杂度。

---

## 4. 路由与数据库的关系

### 4.1 路由不直接决定数据库模型

数据库实体关系主要是：

- `spaces.id`
- `projects.space_id`
- `tasks.space_id`
- `tasks.project_id`
- `views.key`
- `settings.key`

URL 改动不会改变任务、项目、空间、视图的核心数据关系，也不需要改 `tasks`、`projects`、`spaces` 主表。

### 4.2 需要迁移的是持久化的路由字符串

当前设备本地偏好里会记录启动恢复路径：

- `shell.navigation.restore.lastScopeKey`
- `shell.navigation.restore.lastRouteByScopeKey`

这类数据由前端 `LazyStore` 管理，不是业务数据库核心实体。破坏性 URL 迁移时，需要提供旧路径到新路径的 normalize/migrate 逻辑。

### 4.3 后端 Active Scope 只关心 scope，不关心 URL

Rust 侧 `set_active_scope` 接收的是：

- `scopeType: all | space`
- `spaceId?: string`

因此 URL 重构后，只要前端仍能正确解析出 `Scope` 并同步给后端，数据库和后端运行态不会被 URL 形态直接破坏。

---

## 5. 长期目标 URL 结构

### 5.1 根路径

```txt
/                              -> 启动恢复
```

启动时优先恢复：

1. 上次访问的单独 Space route；
2. 默认 Space 的 `/spaces/:spaceId/inbox`；
3. 若无可用 Space，再进入 `/all/inbox`。

### 5.2 单独 Space 主工作区

单独 Space 是主线入口。

```txt
/spaces/:spaceId               -> redirect /spaces/:spaceId/inbox
/spaces/:spaceId/inbox         -> 收件箱
/spaces/:spaceId/tasks         -> 所有任务
/spaces/:spaceId/views         -> 视图总页
/spaces/:spaceId/views/:viewId -> 单个视图
/spaces/:spaceId/projects      -> 项目总览
/spaces/:spaceId/no-project    -> 独立事项
/spaces/:spaceId/archive       -> 归档页
/spaces/:spaceId/trash         -> 回收站
```

项目页面：

```txt
/spaces/:spaceId/projects/:projectId
```

独立项目详情页面：

```txt
/spaces/:spaceId/projects/:projectId/detail
```

独立任务详情页面：

```txt
/spaces/:spaceId/tasks/:taskId
```

### 5.3 所有空间聚合区

所有空间不是主工作区，只作为聚合入口。

```txt
/all                           -> redirect /all/tasks
/all/inbox                     -> 所有 Space 的 Inbox 聚合
/all/tasks                     -> 所有任务
/all/views                     -> 全局视图总页
/all/views/:viewId             -> 全局视图
/all/projects                  -> 所有项目
/all/no-project                -> 所有独立事项
/all/archive                   -> 全局归档
/all/trash                     -> 全局回收站
```

注意：`/all/settings` 不存在。设置是全局系统页，不属于所有空间聚合。

### 5.4 全局系统页

```txt
/settings
/debug/activity
```

设置页不绑定 Space。若未来出现 Space 级设置，应使用：

```txt
/spaces/:spaceId/settings
```

但 V1 不建议把设置页拆成两套，避免提前设计。

### 5.5 Quick Create 独立窗口

```txt
/quick-create
```

Quick Create 是 helper/accessory window 的前端入口，不进入主 Shell 路由体系，也不参与主窗口最近访问恢复。

### 5.6 顶层实体快捷入口

保留两个兼容/快捷入口：

```txt
/tasks/:taskId
/projects/:projectId
```

它们不是 canonical route。进入后应：

1. 加载实体；
2. 判断实体所属 Space；
3. 若 Space 可见，redirect 到 Space canonical route；
4. 若 Space 不可见或实体异常，进入对应的错误态/全局兜底页。

示例：

```txt
/tasks/task-a
  -> /spaces/space-work/tasks/task-a

/projects/project-a
  -> /spaces/space-work/projects/project-a/detail
```

---

## 6. Drawer 与 URL 状态

### 6.1 保留 query 作为 Drawer 状态

详情弹窗属于当前列表上下文，因此继续使用 query：

```txt
/spaces/:spaceId/inbox?task=:taskId
/spaces/:spaceId/tasks?task=:taskId
/spaces/:spaceId/views/:viewId?task=:taskId
/spaces/:spaceId/projects/:projectId?task=:taskId
/all/tasks?task=:taskId
/all/projects?project=:projectId
```

理由：

- Drawer 是上下文层，不应抢占主页面 path；
- 关闭 Drawer 时应回到原列表位置；
- query 能自然保留 `view`、筛选、当前页面状态；
- 不需要为每个列表上下文新增 `tasks/:taskId` 嵌套路由。

### 6.2 不把 Preview 放进 URL

Task Preview 是临时只读阅读辅助层，只跟当前 row focus/hover/keyboard target 相关，不参与 URL。

### 6.3 Drawer 与 Page 的关系

同一个任务可以有两种打开方式：

- 当前列表内打开：`?task=:taskId`
- 独立页面打开：`/spaces/:spaceId/tasks/:taskId`

二者必须共享业务 controller 和字段组件，但不共享 route state owner。

---

## 7. 旧路由迁移映射

### 7.1 Shell 路由迁移

```txt
/spaces                         -> /all/tasks
/spaces/inbox                   -> /all/inbox
/spaces/all-tasks               -> /all/tasks
/spaces/no-project              -> /all/no-project
/spaces/views                   -> /all/views
/spaces/projects                -> /all/projects
/spaces/archive                 -> /all/archive
/spaces/trash                   -> /all/trash
/spaces/settings                -> /settings
/spaces/debug/activity          -> /debug/activity

/space/:spaceId                 -> /spaces/:spaceId/inbox
/space/:spaceId/inbox           -> /spaces/:spaceId/inbox
/space/:spaceId/all-tasks       -> /spaces/:spaceId/tasks
/space/:spaceId/no-project      -> /spaces/:spaceId/no-project
/space/:spaceId/views           -> /spaces/:spaceId/views
/space/:spaceId/projects        -> /spaces/:spaceId/projects
/space/:spaceId/project/:id     -> /spaces/:spaceId/projects/:id
/space/:spaceId/archive         -> /spaces/:spaceId/archive
/space/:spaceId/trash           -> /spaces/:spaceId/trash
/space/:spaceId/settings        -> /settings
/space/:spaceId/debug/activity  -> /debug/activity
```

### 7.2 Focus 兼容

当前旧路由：

```txt
/spaces/focus
/space/:spaceId/focus
```

迁移为：

```txt
/all/views/focus
/spaces/:spaceId/views/focus
```

如果系统 view 使用数据库 ID 而不是 key，则 route builder 应提供 `viewId` 到 canonical path 的统一映射策略，不允许页面手写。

### 7.3 Query 保留策略

迁移旧路径时必须保留非冲突 query：

```txt
/space/work/views?view=today&task=task-a
  -> /spaces/work/views/today?task=task-a
```

其中：

- `task` / `project` 继续表示 Drawer；
- `view` 可以在迁移时提升为 path segment；
- 未识别 query 默认保留，避免破坏页面局部状态。

---

## 8. Routing 模块设计

新增目录：

```txt
src/app/routing/
  routeTypes.ts
  routePaths.ts
  routeParser.ts
  routeMigration.ts
  routeManifest.tsx
  routeRestore.ts
  index.ts
```

### 8.1 routeTypes.ts

定义稳定类型：

```ts
type RouteScope =
  | { type: 'space'; spaceId: string }
  | { type: 'all' }
  | { type: 'global' }

type WorkspaceSection =
  | 'inbox'
  | 'tasks'
  | 'views'
  | 'projects'
  | 'noProject'
  | 'archive'
  | 'trash'

type EntityPageTarget =
  | { kind: 'task'; taskId: string }
  | { kind: 'project'; projectId: string }
```

### 8.2 routePaths.ts

只负责生成 path：

```ts
routes.spaceInbox(spaceId)
routes.spaceTasks(spaceId)
routes.spaceView(spaceId, viewId)
routes.spaceProjects(spaceId)
routes.spaceProject(spaceId, projectId)
routes.spaceProjectDetail(spaceId, projectId)
routes.spaceTaskDetail(spaceId, taskId)

routes.allTasks()
routes.allView(viewId)

routes.settings()
routes.quickCreate()
routes.taskShortcut(taskId)
routes.projectShortcut(projectId)
```

禁止在 feature 中继续手写：

```ts
`/space/${spaceId}/project/${projectId}`
`/spaces/${section}`
`/tasks/${taskId}`
```

### 8.3 routeParser.ts

负责从当前 location 推导：

- scope；
- active section；
- route entity；
- 是否 Shell route；
- 是否 Quick Create route；
- 是否 rememberable。

ShellLayout、Sidebar、Command Context、Workspace Sync 都从 parser 获取结构化结果，不再各自 `pathname.includes(...)`。

### 8.4 routeMigration.ts

负责旧路径迁移：

```ts
normalizeLegacyRoute(path: string): string
```

使用场景：

- `RootRestoreRedirect`；
- `rememberShellRoute` 写入前；
- 最近访问 history；
- 旧 URL 直接进入时的 redirect loader。

### 8.5 routeRestore.ts

负责启动恢复和最近访问：

- 保存 canonical path；
- 读取 legacy path 时先 migrate；
- 校验 Space / Project 是否仍存在；
- 不保存 `/quick-create`；
- 不保存临时 Drawer query，除非明确决定支持“启动恢复时重开详情弹窗”。

默认建议：**启动恢复不恢复 Drawer query**。原因是 Drawer 是上下文层，跨启动恢复容易打开过期详情，也会增加失败态处理。

### 8.6 routeManifest.tsx

集中定义 `createHashRouter` 的 route manifest：

- 主 Shell route；
- Quick Create route；
- shortcut entity routes；
- legacy redirect routes；
- error fallback。

---

## 9. React 结构原则

### 9.1 Provider 拥有状态来源

按照组合式组件原则，URL 解析、scope 推导和 route meta 应由一个 route provider 或 Shell route hook 提供，页面不应重复读取 location 并自行解析。

建议结构：

```txt
RoutingProvider
  ShellRouteProvider
    ShellLayout
      Page
```

页面只消费：

```ts
const route = useShellRoute()
```

而不是每个页面都自己：

```ts
const { pathname } = useLocation()
const { spaceId } = useParams()
```

### 9.2 拆分高频订阅，减少重渲染

路由上下文不要把所有信息塞进一个大对象让整棵树订阅。应至少拆分：

- `scope`
- `section`
- `entity`
- `drawerTarget`
- `navigationActions`

高频变动的 query state 不应导致 Sidebar、Header、Footer 全量重渲染。

### 9.3 避免 boolean props 膨胀

不要给页面组件加：

```ts
isAll
isSpace
isDetail
isDrawer
isProject
```

应使用明确 variant 或组合入口：

```tsx
<TaskPageRoute mode="space" />
<TaskPageRoute mode="shortcut" />
```

或者更好：

```tsx
<TaskDetailPage routeContext={routeContext} />
```

---

## 10. 分阶段实施计划

### 阶段 1：现状归口，不改 URL

目标：完成方案 A。

任务：

- 新建 `src/app/routing`；
- 抽出当前路由常量和 route builder；
- 替换 `config.ts` 中的 path builder；
- 替换 `global-search/searchNavigation.ts`；
- 替换 `entity-detail/entityDetailNavigation.ts`；
- 替换 ShellLayout 中手写 path；
- 为 route builder / parser / migration 加单
元测试。

验收：

- 旧 URL 全部可用；
- `bun run typecheck` 通过；
- route builder/parser 单测覆盖主要路径。

### 阶段 2：引入新 canonical route，保留旧 route redirect

目标：让新 URL 可用，但旧入口不中断。

任务：

- 调整 router manifest；
- 增加 `/spaces/:spaceId/...` 新路径；
- 增加 `/all/...` 新路径；
- 增加 `/projects/:projectId` shortcut；
- 保留旧 `/space/:spaceId/...` 和 `/spaces/...` redirect；
- 启动恢复读取旧 path 时迁移到新 path。

验收：

- 新旧 URL 都能打开正确页面；
- 旧路径进入后 replace 到 canonical route；
- 最近访问保存 canonical path。

### 阶段 3：页面与 Shell 使用结构化 route context

目标：减少页面自行解析 URL。

任务：

- 引入 `useShellRoute`；
- `SpaceLayout` 改为消费 parser 输出；
- `ShellSidebar`、`ShellHeader`、`ShellFooter` 只消费结构化 route；
- 页面侧 `useScopeRoute` 迁移到新的 routing hook；
- 保持 Workspace Sync 和 Active Scope 同步行为不变。

验收：

- Sidebar active section 正确；
- Header 历史记录正确；
- 切 Space、切页面、返回/前进稳定；
- Command navigation 与 Search navigation 正确。

### 阶段 4：详情页面与 Drawer 收口

目标：完成 Page / Drawer / Preview 三层边界。

任务：

- Drawer query 使用统一 helper；
- Task Page 使用 canonical `/spaces/:spaceId/tasks/:taskId`；
- Project Detail Page 使用 canonical `/spaces/:spaceId/projects/:projectId/detail`；
- `/tasks/:taskId` 与 `/projects/:projectId` 只做 shortcut resolve；
- Preview 不进入 URL。

验收：

- 列表内打开 Drawer 后关闭能回到原列表；
- 独立详情页刷新后能恢复；
- 从搜索/命令打开任务能进入正确 Space；
- Drawer 与 Preview 互斥规则不回退。

### 阶段 5：删除旧路由兼容层

目标：只在确认没有旧 path 依赖后执行。

任务：

- 移除旧 route manifest；
- 移除旧 path allowlist；
- 移除旧 parser 分支；
- 清理测试中的旧路径。

注意：该阶段不急。桌面应用中本地 store 可能长期保留旧 path，兼容层可以保留较长时间。

---

## 11. 风险与取舍

### 11.1 为什么不是纯方案 C

纯方案 C 会把 scope 放进 query：

```txt
/tasks?space=space-a
/projects?space=space-a
```

它的问题是：

- Space 从结构上下文变成筛选参数；
- Shell active scope、Workspace Sync、Quick Create 当前上下文都更难统一；
- 页面刷新和启动恢复时需要更多 query 校验；
- `space=all` 与真实 space id 混在同一个参数里，长期容易出错。

因此只吸收方案 C 的优点：产品域清晰、全局页面独立、设置页全局化。最终 URL 仍保持 Space First。

### 11.2 为什么保留 `/all`

所有空间不是常用主路径，但它仍是必要聚合能力。使用 `/all` 比旧 `/spaces` 更明确：

- `/all/tasks` 一眼知道是聚合；
- `/spaces/:spaceId/tasks` 一眼知道是单个 Space；
- 不再有 `/spaces` 和 `/space` 的视觉混淆。

### 11.3 为什么 Drawer 不做嵌套路由

如果把 Drawer 做成：

```txt
/spaces/:spaceId/inbox/tasks/:taskId
```

会导致每个列表上下文都要新增一组嵌套路由，Preview / Drawer / Page 的边界也会变模糊。当前 query 模型更符合 Drawer 的上下文层定位。

---

## 12. 验证清单

### 路由生成

- Space inbox；
- Space tasks；
- Space views；
- Space project；
- Space project detail；
- Space task detail；
- all tasks；
- settings；
- quick-create；
- task shortcut；
- project shortcut。

### 路由解析

- 解析 scope；
- 解析 active section；
- 解析 projectId；
- 解析 taskId；
- 解析 viewId；
- 解析 Drawer query；
- 判断 rememberable；
- 判断 Quick Create route。

### 旧路由迁移

- `/spaces/all-tasks` -> `/all/tasks`
- `/space/:spaceId/all-tasks` -> `/spaces/:spaceId/tasks`
- `/space/:spaceId/project/:projectId` -> `/spaces/:spaceId/projects/:projectId`
- `/spaces/settings` -> `/settings`
- 保留 `?task=`、`?project=`、未识别 query。

### 运行时链路

- 根路径启动恢复；
- Sidebar 点击；
- Header 历史；
- Command navigation；
- Global Search open task/project；
- Quick Create open target；
- Task Drawer open/close；
- Task Page refresh；
- Project Detail refresh；
- Archive/Trash 页面；
- Settings 页面。

---

## 13. 推荐落地顺序

最稳顺序：

1. 先做 Routing 模块和测试；
2. 再替换所有 path builder 调用点；
3. 再加新 canonical routes；
4. 再加旧路径 redirect/migration；
5. 再迁移启动恢复和最近访问；
6. 最后重构详情页和项目详情页。

不要一开始就直接改 `router.tsx` 并全仓替换 path 字符串。路由是横切层，先建立单一 owner，再迁移调用方，风险最低。
