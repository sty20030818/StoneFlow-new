# TanStack Router 执行计划

## 0. 文档定位

| 项目 | 内容 |
|---|---|
| 文档目的 | 把《TanStack Router 长期重构方案》拆成可执行阶段计划，作为后续实际落地的实施清单 |
| 适用范围 | 前端路由层、Shell 路由壳层、路由状态恢复、详情页 canonical redirect、页面导航与 URL state |
| 当前前提 | 允许破坏性重构；目标是长期方案，不保留旧路由 DSL 作为常驻兼容层 |
| 交付形式 | 分阶段执行计划 + 每阶段目标、改动面、验收标准、风险提示 |

---

## 1. 总体执行原则

这次迁移按下面 5 条原则执行：

1. **先换路由真相源，再清业务调用点。**
2. **先建立 TanStack Router 基建，再迁页面和导航。**
3. **先保产品能力，再删旧实现。**
4. **旧 DSL 只允许短暂过渡，不允许长期双轨。**
5. **每个阶段都要有可运行、可回归、可验证的中间态。**

这里最容易做错的是两件事：

- 一上来就全量替换所有页面，导致定位问题困难；
- 为了“稳一点”长期保留 `routeParser/useShellRoute/routePaths`，最后形成双真相源。

所以这份计划的核心策略是：

**阶段化切换主干，阶段末立即删掉已经被替代的旧职责。**

---

## 2. 范围边界

## 2.1 本次明确纳入范围

- `react-router-dom` -> `@tanstack/react-router`
- `createHashRouter` -> TanStack `createRouter + createHashHistory`
- `src/routes` file-based route tree
- `__root` / `_shell` / `all` / `spaces/$spaceId` 路由骨架
- `route loader` / `beforeLoad` / `validateSearch`
- `TaskPageRoute` / `ProjectPageRoute` 的 route-level 重写
- `SpaceLayout` 的职责迁移
- `routeMemory` 的最小化改造
- `useShellRoute` 调用点替换
- 导航入口从字符串 builder 迁移到 typed navigation / intent helper

## 2.2 本次不主动扩大的范围

- detail drawer 全量重构
- route masking 真正接入
- navigation blocking 真正接入
- 所有页面都强行一次性做 search params 产品化
- Shell UI 大改
- 非路由相关的数据层重构

这几项会在 TanStack Router 接入后更容易做，但不应该顺手并入本次迁移。

---

## 3. 阶段总览

## 3.1 推荐阶段划分

1. **Phase 0：基线确认与迁移脚手架**
2. **Phase 1：Router 基建切换**
3. **Phase 2：Shell 路由树落地**
4. **Phase 3：核心页面迁移与旧守卫删除**
5. **Phase 4：页面调用点去旧 DSL**
6. **Phase 5：Route Memory 最小化改造**
7. **Phase 6：收尾清理与文档同步**

## 3.2 阶段策略说明

- `Phase 1` 结束时，应完成 TanStack Router 作为唯一 router runtime。
- `Phase 3` 结束时，应删除 `TaskPageRoute`、`ProjectPageRoute` 这类旧页面守卫壳。
- `Phase 4` 结束时，应基本删除 `useShellRoute` 和大多数 `routePaths` 主调用点。
- `Phase 6` 结束时，应删除旧 parser/type/hook 主体系，只保留新的 navigation intent 与最小 route memory。

---

## 4. Phase 0：基线确认与迁移脚手架

## 4.1 目标

在不改业务行为的前提下，把迁移所需的依赖、目录、忽略项、校验约束准备好。

## 4.2 主要改动

- 安装依赖：
  - `@tanstack/react-router`
  - `@tanstack/router-plugin`
- 评估是否需要：
  - `zod`
- 调整 `vite.config.ts`，接入 router plugin
- 建立 `src/routes/` 顶层目录
- 把 generated route tree 加入 ignore：
  - `oxlint`
  - `oxfmt`
  - 如有需要也加入编辑器只读/隐藏策略

## 4.3 验收标准

- 依赖安装完成
- `vite` 能识别 route plugin
- `src/routeTree.gen.ts` 能正常生成
- 不因 generated file 导致 lint / format 失败

## 4.4 风险点

- 忽略 generated file 做晚了，后面每次校验都会被噪音污染
- route plugin 接入方式与当前 Vite 8 配置冲突

---

## 5. Phase 1：Router 基建切换

## 5.1 目标

把应用主路由运行时从 React Router 切到 TanStack Router，但暂时不追求所有页面都完成最终组织。

## 5.2 主要改动

- 新建 `src/app/router.tsx`
  - `createRouter`
  - `createHashHistory`
  - router defaults：
    - `defaultPreload: 'intent'`
    - `defaultPreloadStaleTime: 0`
    - `scrollRestoration: true`
    - `defaultStructuralSharing: true`
- 在 `router.tsx` 注册 router type
- 改造 `src/app/App.tsx`
  - 从 `react-router-dom` 的 `RouterProvider` 切到 TanStack `RouterProvider`
- 新建：
  - `src/routes/__root.tsx`
  - `src/routes/index.tsx`
- 在 `__root.tsx` 定义 typed router context

## 5.3 router context 约束

这里只放稳定依赖：

- `queryClient`
- 可能需要的 service / capability provider

这里不要放：

- `spaces`
- `projects`
- 任何 query 返回数据

## 5.4 验收标准

- 应用能用 TanStack Router 正常启动
- 根路径 `/` 仍可进入工作区恢复逻辑
- `Link`、`navigate`、`useParams` 已具备类型推导
- `react-router-dom` 的 runtime provider 已不再是主入口

## 5.5 风险点

- 如果 root redirect 没处理好，启动即白屏或落到错误路径
- 如果 router type registration 漏掉，后续整个类型收益都会打折

---

## 6. Phase 2：Shell 路由树落地

## 6.1 目标

先把 URL 主体结构迁到新的 route tree，让 `/all/*` 和 `/spaces/$spaceId/*` 有稳定的 TanStack 路由骨架。

## 6.2 主要改动

- 建立 route directory：

```txt
src/routes/
  _shell/
    route.tsx
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

- `src/routes/_shell/route.tsx` 承接旧 `SpaceLayout` 的壳层职责：
  - scope 推导改成 params/route match 原生读取
  - 同步 shell store
  - 调用 `useWorkspaceSync`
  - route memory 写入入口先挂这里

- `all/route.tsx` 与 `spaces/$spaceId/route.tsx`
  - 负责 index redirect
  - 负责 scope 级别的 layout 分界

## 6.3 这阶段先不做什么

- 不急着把每个页面的 search/product 语义都做完
- 不急着清所有旧 helper
- 不急着做 route masking

## 6.4 验收标准

- 以下主路径都能进入正确页面壳层：
  - `/`
  - `/all`
  - `/all/tasks`
  - `/spaces/:spaceId`
  - `/spaces/:spaceId/inbox`
  - `/spaces/:spaceId/tasks/:taskId`
- `ShellLayout` 仍正常工作
- scope 与 active section 同步正常

## 6.5 风险点

- `_shell` 和子层级的 `Outlet` 关系如果没理顺，容易出现“URL 变了但页面不变”
- `all` 与 `spaces/$spaceId` index redirect 语义不同，容易被误统一

---

## 7. Phase 3：核心页面迁移与旧守卫删除

## 7.1 目标

把最关键的 detail / canonical redirect / 受 scope 影响的页面迁到 route-native 模式，并删除旧页面守卫壳。

## 7.2 优先迁移对象

第一优先级：

- tasks list
- task detail
- projects list
- project detail
- settings

第二优先级：

- inbox
- views
- archive
- trash
- no-project
- debug activity
- quick-create

## 7.3 主要改动

- 用 route `loader + beforeLoad` 重写：
  - `TaskPageRoute`
  - `ProjectPageRoute`

- canonical redirect 迁移到 route 层：
  - 如果 `taskId/projectId` 对应的真实 `spaceId` 与 URL 不一致，直接 route redirect
  - 不再在页面组件里 `useEffect + Navigate`

- 列表与详情预取统一改成：
  - `queryOptions`
  - `queryClient.ensureQueryData(...)`

- 页面组件内部只消费：
  - `Route.useParams()`
  - `Route.useSearch()`
  - `useSuspenseQuery(...)`

## 7.4 删除目标

这阶段结束时应删除：

- `src/features/task/detail/ui/TaskPageRoute.tsx`
- `src/features/project/ui/ProjectPageRoute.tsx`

## 7.5 验收标准

- 详情页 canonical redirect 生效
- 不存在页面 mount 后再异步修正 URL 的旧守卫逻辑
- 详情页刷新可恢复
- 无权限/不可见资源能稳定回退到预期页面

## 7.6 风险点

- 详情页 canonical redirect 逻辑是这次迁移最敏感的一段，做错会直接产生错误跳转
- query key 和 route loader 若没有复用同一套 queryOptions，会造成重复请求和状态分裂

---

## 8. Phase 4：页面调用点去旧 DSL

## 8.1 目标

批量清理 feature 页面对 `useShellRoute` 和字符串路径 builder 的依赖，切换到 TanStack Router 原生调用方式。

## 8.2 主要改动

重点替换以下模式：

- `useShellRoute()` -> `Route.useParams()` / `Route.useSearch()` / 局部 route helper
- `buildCanonicalSectionPath(...)` -> `navigate({ to, params })` 或 `<Link to=... />`
- `buildCanonicalProjectPath(...)` -> typed params navigation
- `buildCanonicalViewPath(...)` -> typed params navigation
- `buildScopedSettingsPath(...)` -> typed params navigation

## 8.3 推荐替换策略

按模块分批：

1. Shell 自己的导航控件
2. 列表页面
3. 详情页面
4. breadcrumb / history / command adapters

不要横向随机改调用点，否则回归成本太高。

## 8.4 需要新建的最小抽象

可以增加：

- `src/app/navigation/intents.ts`

只放语义级 intent helper，比如：

- `openTaskDetail`
- `openProjectDetail`
- `openSection`
- `openSettings`

不要重建一个 `routePaths v2`。

## 8.5 验收标准

- 主要业务页面不再依赖 `useShellRoute`
- 大多数导航不再依赖字符串路径工厂
- typed navigation 覆盖主干交互链路

## 8.6 风险点

- 如果 breadcrumb / history / sidebar 三块没有一起看，很容易出现部分链路还在走旧 path helper
- command adapter 这种非页面入口最容易被漏掉

---

## 9. Phase 5：Route Memory 最小化改造

## 9.1 目标

保留“按 scope 记住最后路径”的产品能力，但把实现从 parser 驱动改成 router state 驱动。

## 9.2 主要改动

- 重写 `routeMemory.ts` 的职责边界
- 从“解析任意 path 并推导 shell route”改为：
  - 识别当前 route 是否属于可记忆工作路径
  - 提取当前 scope key
  - 记录 canonical path

- `shellDevicePreferences.ts`
  - 保留 LazyStore 持久化
  - 改成调用新的最小 route memory API

- `src/routes/_shell/-route-memory.ts`
  - 封装对 router state 的订阅逻辑

## 9.3 这阶段应删除

- `parseShellRoute()` 在 route memory 中的核心依赖

如果还能删干净，则继续删除：

- `routeParser.ts`
- `routeTypes.ts`

## 9.4 验收标准

- 启动恢复路径仍可用
- scope 切换后能记住上次页面
- detail/search 参数保存规则仍符合产品预期
- route memory 不再依赖旧 parser 作为主引擎

## 9.5 风险点

- 这是最容易“为了兼容先留着”的阶段，但这里必须下决心切断旧 parser
- 如果 detail/search 的 canonical 规则没定义清楚，route memory 很容易存进脏路径

---

## 10. Phase 6：收尾清理与文档同步

## 10.1 目标

删掉过渡残留，确保最终架构真正收口，而不是表面迁移完成。

## 10.2 必做清理

- 删除 `react-router-dom` 路由运行时依赖
- 删除旧 `src/app/routing` 中已经失效的模块
- 清理无用测试与 mock
- 更新 import 路径
- 补齐新路由相关测试
- 同步主架构文档

## 10.3 最终应该删除的旧模块

- `src/app/routing/routeParser.ts`
- `src/app/routing/routeTypes.ts`
- `src/app/routing/useShellRoute.ts`
- 旧版 `TaskPageRoute`
- 旧版 `ProjectPageRoute`

视落地结果决定是否删除或改名：

- `src/app/routing/routePaths.ts`
- `src/app/routing/index.ts`

## 10.4 最终验收标准

- TanStack Router 是唯一前端路由体系
- 不存在“TanStack Router + 旧路由 DSL”双轨常驻
- 主要业务链路全量可跑通
- 类型推导覆盖主导航、params、search、loader data
- 旧路径字符串工厂只保留少量 intent 级 helper，且不再是系统真相源

---

## 11. 每阶段建议执行顺序

如果让我实际落地，我会按这个顺序开工：

1. `Phase 0`
2. `Phase 1`
3. `Phase 2`
4. `Phase 3` 先迁 `task/project/settings`
5. `Phase 4` 先清 `ShellLayout/sidebar/breadcrumb`
6. `Phase 5`
7. `Phase 6`

这个顺序的好处是：

- 先确保主干路由体系成立；
- 再把最难的 canonical detail 链路攻掉；
- 最后再清旧 DSL 残留；
- 不会陷入“代码一半是新 router，一半靠旧 parser 兜底”的长期脏状态。

---

## 12. 每阶段验证建议

因为你不希望我主动起长期 dev server，这次迁移建议默认用这些校验：

- `bun typecheck`
- `bun lint`
- `bun format:check`
- `bun test:run`

需要补的人工回归重点：

- 启动恢复路径
- `/all` 与 `/spaces/:spaceId` 的默认落点
- task/project detail 刷新与 canonical redirect
- settings 在不同 scope 下的进入与返回
- sidebar / breadcrumb / back-forward history 行为

---

## 13. 我对执行风险的最终判断

这次迁移最大的风险不是“TanStack Router 难”，而是**StoneFlow 现在已有很多业务逻辑隐含地绑在旧 route DSL 上**。

具体就是：

- `SpaceLayout`
- `shellDevicePreferences`
- `TaskPageRoute`
- `ProjectPageRoute`
- `ShellLayout`
- `breadcrumbResolver`
- sidebar / history / command adapter

所以真正正确的执行方式不是“先把路由跑起来再说”，而是：

**把这些旧 DSL 依赖点按阶段拆解，然后在每个阶段末明确删旧。**

只要按这个顺序做，这次重构是可控的；如果想一次性全推完，或者为了省事长期保兼容层，后面维护成本会更高。

