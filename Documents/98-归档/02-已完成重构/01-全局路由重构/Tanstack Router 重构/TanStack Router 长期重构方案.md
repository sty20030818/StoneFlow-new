# StoneFlow TanStack Router 长期重构方案

## 0. 文档定位

| 项目 | 内容 |
|---|---|
| 文档目的 | 基于 StoneFlow 当前仓库事实，给出迁移到 TanStack Router 的长期方案、备选方案与不推荐方案 |
| 适用范围 | `src/app/router.tsx`、`src/app/routing/*`、Shell 路由壳层、页面路由、搜索参数、详情页深链、后续 Drawer/Page 路由演进 |
| 当前前提 | 用户接受破坏性重构，希望方案适合长期维护，强调组件化、模块化、DRY、KISS |
| 结论级别 | 推荐作为后续执行的主方案基线 |

---

## 1. 先说结论

我建议 StoneFlow 采用：

```txt
TanStack Router file-based routing
+ route directory
+ pathless layout
+ typed router context
+ route loader + TanStack Query
+ validateSearch
+ autoCodeSplitting
+ route-private colocated files
```

对应到选择上，就是：

1. **推荐方案**：文件路由为主、目录化 route tree、彻底删除旧 `routeParser/useShellRoute` 心智模型。
2. **可接受备选**：先用 TanStack Router code-based 落地，再逐步转 file-based。
3. **不建议**：为了“更 DRY”上 Virtual Routes，或者保留旧 `routeParser/routePaths` 再包一层 TanStack Router。

原因很直接：

- StoneFlow 现在的痛点不是“路由功能不够”，而是**自定义 DSL 已经承担了过多解析、推导、记忆和导航语义**。
- 如果迁移后还保留旧 DSL 作为中间层，会形成两套路由真相源，长期一定继续膨胀。
- TanStack Router 最强的价值不是“又一个 router”，而是**把路径、参数、search、loader、预加载、pending、错误边界、类型推导合并成一个统一契约**。
- 既然你接受破坏性重构，就应该一次性把“路由即字符串拼接 + 外部 parser 修正”的旧模型清掉。

---

## 2. 结合当前仓库事实，我对现有方案 A 的判断

`Docs/tanstack-router-migration-proposal.md` 里的方案 A 方向是对的，但还不够像一个长期方案。

### 2.1 我认同的部分

- 彻底切到 TanStack Router，而不是混用。
- 继续使用 Hash History，符合当前 Tauri 桌面形态。
- 用 pathless layout 承接 `ShellLayout`。
- 用 loader / beforeLoad 替代 `TaskPageRoute`、`ProjectPageRoute` 这类页面级守卫。
- 用 `validateSearch` 替代手写 `URLSearchParams`。
- 用自动代码分割替代当前全量静态导入。

### 2.2 我不建议原样采用的部分

#### 问题 1：路由文件过于扁平

原方案把大量路由写成：

```txt
_shell.all.inbox.tsx
_shell.all.tasks.tsx
_shell.spaces.$spaceId.tasks.$taskId.tsx
```

这在路由数量很少时还能接受，但 StoneFlow 后面还有：

- 详情形态继续演进；
- drawer/page/modal 深链；
- quick-create、debug、settings、command 等边界继续长大；
- task/project/view 生命周期会越来越复杂。

**长期看更稳的做法不是更扁平，而是 route directory。**

也就是优先用：

```txt
src/routes/_shell/all/tasks/route.tsx
src/routes/_shell/all/tasks/$taskId.tsx
src/routes/_shell/spaces/$spaceId/tasks/route.tsx
src/routes/_shell/spaces/$spaceId/tasks/$taskId.tsx
```

优点是：

- 文件名不爆炸；
- 允许 route-private 文件就近 colocate；
- 后续要拆 `.lazy.tsx`、`-search.ts`、`-loader.ts`、`-guards.ts` 不会污染全局；
- 更符合 TanStack Router 官方对 route directory 的长期组织方式。

#### 问题 2：不要把查询数据塞进 router context

原方案示例里把 `spaces` 放进 `RouterContext`。我不建议这样做。

`router context` 更适合放：

- `queryClient`
- 稳定 service / bridge
- 持久化 route memory adapter
- 认证状态或 capability snapshot

不适合放：

- 会频繁变化、天然属于 server state 的列表数据，比如 `spaces`

`spaces` 应继续由 feature query 管理。router 只消费 query 能力，不持有 query 结果本身。否则会把 router context 变成另一层状态容器。

#### 问题 3：不要为了 DRY 上 Virtual Routes

`/all/*` 和 `/spaces/$spaceId/*` 这两棵树看起来重复，但它们的**语义并不完全相同**：

- 默认落点不同；
- 是否要求 `spaceId` 不同；
- 详情页 canonical 约束不同；
- 后续 settings、权限、默认行为也很可能不同。

这类重复更适合接受“薄文件重复”，不适合引入 virtual routes 追求极限 DRY。

这里的最佳实践不是“零重复”，而是：

**重复 URL 壳层，复用 feature 组件、query options、search schema、导航 intent。**

#### 问题 4：不要把所有导航帮助函数都继续保留为字符串 builder

当前 `routePaths.ts` 的问题不是“写得不够好”，而是它让整个系统长期依赖：

- 字符串 path builder
- 外部 parser 再次反解
- 调用方靠约定维护 params/search

迁移后如果还保留这套路径 builder 为主入口，就等于没有真正吃到 TanStack Router 的类型收益。

更好的长期模型是：

- UI 内导航优先直接用 `Link` / `navigate({ to, params, search })`
- 跨模块公共导航只保留**语义级 intent helper**
- 不再保留“全量字符串路径工厂”

比如保留：

```ts
openTaskDetail({ spaceId, taskId })
openProjectOverview({ scope, projectId })
openSettings({ scope })
```

而不是继续保留：

```ts
buildTaskDetailPath(spaceId, taskId)
buildCanonicalSectionPath(scope, section, fallbackSpaceId)
```

---

## 3. 推荐方案：Route-First File-Based Routing

这是我建议你长期采用的主方案。

### 3.1 核心原则

1. **路由树是唯一 URL 契约。**
2. **`src/routes` 只负责路由契约与装配，不承载业务实现。**
3. **业务页面、query、mutation、model 继续留在 `src/features`。**
4. **删掉旧 parser / route type / path builder 主体系，不保留双轨。**
5. **重复的是 URL 壳层，不重复业务组件和数据能力。**

### 3.2 推荐目录结构

```txt
src/
  app/
    router.tsx
    navigation/
      intents.ts

  routes/
    __root.tsx
    index.tsx
    quick-create.tsx
    debug/
      activity.tsx

    _shell/
      route.tsx
      -shell-scope.ts
      -route-memory.ts

      all/
        route.tsx
        inbox.tsx
        tasks/
          route.tsx
          $taskId.tsx
        views/
          route.tsx
          $viewId.tsx
        projects/
          route.tsx
          $projectId.tsx
        no-project.tsx
        archive.tsx
        trash.tsx
        settings.tsx

      spaces/
        $spaceId/
          route.tsx
          inbox.tsx
          tasks/
            route.tsx
            $taskId.tsx
          views/
            route.tsx
            $viewId.tsx
          projects/
            route.tsx
            $projectId.tsx
          no-project.tsx
          archive.tsx
          trash.tsx
          settings.tsx
```

### 3.3 这套结构为什么比方案 A 的 flat file 更适合长期

- `route.tsx` 目录约定更适合继续生长。
- `-` 前缀私有文件可以和 route 同目录 colocate，不进入 route tree。
- 未来拆 `.lazy.tsx` 时不会把根目录变成一堆长文件名。
- 调试时能直接按 URL 层级查目录，不需要在超长扁平文件名中搜索。

---

## 4. StoneFlow 的分层边界应该怎么切

### 4.1 `src/routes` 放什么

只放这些：

- `createFileRoute` / `createRootRouteWithContext`
- pathless layout
- `beforeLoad`
- `loader`
- `loaderDeps`
- `validateSearch`
- `pendingComponent` / `errorComponent` / `notFoundComponent`
- redirect / route mask
- 极少量 route-only adapter

### 4.2 `src/features` 放什么

继续放这些：

- 页面组件
- query options
- query hooks
- mutations
- Tauri invoke API
- 纯业务 model
- 本地 UI 状态

### 4.3 `src/app/navigation` 放什么

只放**语义级导航 intent**，不要继续做字符串路径工厂。

例如：

```ts
export type TaskNavigationIntent = {
  to: '/_shell/spaces/$spaceId/tasks/$taskId'
  params: { spaceId: string; taskId: string }
}
```

这种 helper 的价值是：

- 给 command palette、快捷键、Tauri 回调一个稳定入口；
- 但不重新发明一套 router DSL。

### 4.4 旧 `src/app/routing/*` 怎么处理

#### 应删除

- `routeParser.ts`
- `routeTypes.ts`
- `useShellRoute.ts`

这三者的职责会被 TanStack Router 原生能力替代。

#### 应收缩或迁移

- `routePaths.ts`
- `routeMemory.ts`

其中：

- `routePaths.ts` 不应继续作为系统级路径真相源，应改造成极少量 navigation intent helper；
- `routeMemory.ts` 可以保留能力，但应从“通用 parser + 字符串规则引擎”改成“订阅 router 状态后的最小持久化模块”。

---

## 5. 数据加载最佳实践

StoneFlow 已经有 TanStack Query，这一点非常关键。最佳实践不是在 loader 里再发明一套缓存，而是：

```txt
route loader 负责预取和阻塞边界
TanStack Query 负责缓存、失效、复用、重取
component 继续用 useSuspenseQuery / useQuery 消费同一份 queryOptions
```

### 5.1 推荐模式

每个 feature 自己暴露 query options：

```txt
features/task/query/taskQueries.ts
features/project/query/projectQueries.ts
features/view/query/viewQueries.ts
```

route loader 里只做：

```ts
await queryClient.ensureQueryData(taskDetailQueryOptions(taskId))
```

不要做：

- loader 直接手写 fetch + 返回匿名对象
- loader 和组件各查一套不同 key
- loader 里 `prefetchQuery` 但组件再自己兜底

### 5.2 `beforeLoad` 和 `loader` 的职责边界

`beforeLoad`：

- redirect
- canonical URL 修正
- auth / capability 检查
- 极轻量上下文扩展

`loader`：

- 真实数据预取
- 基于 params/search/deps 的 query 预热
- pending / error 的边界控制

不要把“需要数据才能决定 redirect”的逻辑散成页面 effect。能在 route 层做的，优先 route 层做。

### 5.3 `loaderDeps` 的使用原则

所有影响列表数据的 search 参数都应进入 `loaderDeps`，比如：

- 排序
- 过滤
- tab
- 选中 view

这样 query key、URL 状态、预加载语义才能一致。

---

## 6. Search Params 最佳实践

StoneFlow 现在已经开始有 settings、views、filters、detail query 等 URL 状态需求。迁移后建议：

1. **所有 search params 都做校验。**
2. **校验和默认值放 route 层，不放组件 effect。**
3. **组件里只消费 `Route.useSearch()` 的结果。**

### 6.1 推荐做法

- 简单 search 用手写 `validateSearch`
- 稍复杂的 search 用 `zod`

### 6.2 不推荐做法

- 组件里自己读 `window.location`
- 手写 `new URLSearchParams`
- 先读原始 search，再在组件里修默认值

### 6.3 StoneFlow 里特别值得放进 URL 的状态

- task / project detail 的 tab
- list/filter/sort
- views 当前 viewId
- debug 页面筛选条件
- 后续 detail drawer/page 的 display mode

不建议塞进 URL 的状态：

- 瞬时 hover
- 宽度、折叠状态
- 纯本地动画态

---

## 7. Shell、Scope 与 Route Memory 的长期做法

### 7.1 `SpaceLayout` 的职责应该转到 `_shell/route.tsx`

当前 `SpaceLayout` 做了三类事：

- 从 URL 推导 scope/section
- 同步 shell store
- remember current route

迁移后第一类应该消失，因为 scope/params/route match 由 TanStack Router 原生提供。

保留的应该是后两类：

- shell UI store 同步
- route memory 持久化

也就是说，未来 `_shell/route.tsx` 是一个**路由壳层**，不是 parser 层。

### 7.2 route memory 建议保留，但最小化

我不建议因为接入 TanStack Router 就删除“按 scope 记住最后路径”这套产品能力。这个能力对桌面工作流是有价值的。

但它应该变成：

- 订阅 `router.state.resolvedLocation`
- 只保存允许记忆的 canonical route
- 不再依赖自定义 parser 反解全量 path

### 7.3 startup restore 怎么做

推荐保留一个 `index.tsx` 或根 redirect 路由，负责：

1. 读取 route memory
2. 解析最近 scope
3. 导向 `/all/tasks` 或 `/spaces/$spaceId/inbox` 等合法落点

这部分仍然是产品规则，但不再需要自定义 route DSL。

---

## 8. 详情页 / Drawer 的长期演进建议

StoneFlow 后续详情系统会继续长，这里 TanStack Router 有两个很值得用的能力。

### 8.1 route masking 适合后续 Drawer 深链

如果未来要做：

- Task Drawer 打开时 URL 可分享；
- 关闭 Drawer 后仍回到原列表上下文；
- 同一个详情既可 page 访问，也可 overlay 访问；

那就可以用 route masking，而不是继续手搓 `?task=xxx` / `?project=xxx` 这类 search 模式。

### 8.2 navigation blocking 适合 autosave/dirty form

你现在已经在做 detail autosave 体系。TanStack Router 自带 navigation blocking，适合替代将来 scattered 的离开确认逻辑。

建议未来统一在 detail form 层接入：

- dirty 时阻止页面切换
- flush 中阻止关闭/跳转
- 允许自定义确认 UI

这比在每个页面各写一套 `beforeunload` 或散落的 confirm 稳定得多。

---

## 9. 三套方案对比

## 9.1 方案一：File-Based + Route Directory + 全量迁移

### 方案描述

彻底采用 TanStack Router 官方主流模式：

- file-based routing
- route directory
- pathless layout
- `createRootRouteWithContext`
- `validateSearch`
- `loader + ensureQueryData`
- `autoCodeSplitting`

### 优点

- 最符合官方长期方向。
- URL、params、search、loader、pending、错误边界全收口到同一体系。
- 类型安全收益最大。
- 对新人最直观，目录就是路由树。
- 后续 route masking、blocker、lazy route、子布局都能自然扩展。
- 能真正删除旧 `routeParser/useShellRoute` 心智负担。

### 缺点

- 迁移期破坏性最大。
- `/all/*` 与 `/spaces/$spaceId/*` 的 route 壳文件会重复。
- 需要团队适应 `beforeLoad/loader/search/route context` 的边界。

### 我的判断

**这是最值得做的长期方案。**

---

## 9.2 方案二：Code-Based TanStack Router 过渡方案

### 方案描述

先用 code-based route tree 把 React Router 替掉，等主流程稳定后再转 file-based。

### 优点

- 第一阶段迁移更线性。
- 对当前 `router.tsx` 心智更接近。
- 可以先验证 loader/search/context/typed navigation 价值。

### 缺点

- 样板代码明显更多。
- 自动代码分割体验更弱。
- 长期仍然不如 file-based 自然。
- 很容易“先这样用着”，最后永久停在过渡态。

### 我的判断

**可以作为风险控制备选，但不适合作为最终形态。**

只有在你明确希望“先把路由库替掉，暂时不动目录结构”时，才值得采用。

---

## 9.3 方案三：File-Based + Virtual Routes / 保留旧 DSL 包装层

### 方案描述

表面上迁移到 TanStack Router，但为了减少重复：

- 要么大量依赖 Virtual Routes；
- 要么继续保留 `routeParser/routePaths/useShellRoute`，TanStack Router 只是底座。

### 优点

- 表面上文件更少。
- 部分旧调用点改动较小。

### 缺点

- 抽象过早，长期更难理解。
- Virtual Routes 对这个项目不是必要复杂度。
- 保留旧 DSL 会继续制造双真相源。
- 你会长期背着“TanStack Router + 自定义路由层”两套系统。

### 我的判断

**不建议。**

这类方案短期看 DRY，长期看最不 KISS。

---

## 10. 最终推荐方案的执行边界

如果后续按我推荐的方案落地，我建议删除或重写这些模块。

### 10.1 应删除

- `src/app/routing/routeParser.ts`
- `src/app/routing/routeTypes.ts`
- `src/app/routing/useShellRoute.ts`
- 基于 `react-router-dom` 的 `TaskPageRoute`
- 基于 `react-router-dom` 的 `ProjectPageRoute`

### 10.2 应重写

- `src/app/router.tsx`
- `src/app/App.tsx`
- `src/app/layouts/SpaceLayout.tsx`
- `src/app/routing/routePaths.ts`
- `src/app/routing/routeMemory.ts`

### 10.3 应保留但迁移职责

- `ShellLayout`
- Shell 相关 Zustand store
- `useWorkspaceSync`
- `rememberShellRoute` 背后的持久化产品能力

---

## 11. 我建议你直接采用的落地口径

如果你要我给一句最终建议，就是这句：

**不要把 StoneFlow 迁成“用了 TanStack Router 的旧架构”，而要迁成“以 TanStack Router 为路由契约中心的新架构”。**

对应到落地上，就是：

1. 选 **file-based + route directory**。
2. 删除旧 parser/route hook 主体系，不做兼容层常驻。
3. 路由只管契约和装配，业务仍然留在 `features`。
4. query 继续是唯一 server state 体系，loader 只做预取和边界控制。
5. route memory 保留产品能力，但实现改成最小订阅式。
6. 详情页后续优先考虑 route masking 与 navigation blocking，而不是继续扩张 query-string 手工协议。

---

## 12. 参考依据

### 仓库现状依据

- 当前路由入口在 `src/app/router.tsx`，仍是 `react-router-dom` 的 `createHashRouter`。
- 当前 URL 语义由 `src/app/routing/routeParser.ts`、`routeTypes.ts`、`routePaths.ts`、`useShellRoute.ts` 共同维护。
- 当前 `SpaceLayout` 同时承担 route 解析结果同步、scope 同步、route memory 持久化。

### 官方与最佳实践依据

- TanStack Router Quick Start：官方明确 file-based 是大多数项目的推荐方式。
- TanStack Router File-Based Routing / File Naming Conventions：支持 pathless layout、route directory、`-` 前缀私有文件。
- TanStack Router Code Splitting：`autoCodeSplitting` 只在 file-based routing 下最顺手，且推荐保留 loader 在 critical route config 中。
- TanStack Router Routing Concepts：`createRootRouteWithContext`、root route、file route 是类型安全基础。
- TanStack Router Navigation Blocking：适合 detail/autosave 场景。
- 本地 skill `tanstack-router-best-practices`：强调 router type registration、loader + `ensureQueryData`、`validateSearch`、router defaults、lazy/code split、typed root context。

