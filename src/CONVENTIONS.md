# src 代码规范

> 作用：约束 `src/` 下的命名、注释、React 组件组织和导航边界。
> 原则：少抽象、少注释噪音、直接 import、让文件名表达职责。
>
> ### 架构文档
>
> | 文档 | 用途 |
> |------|------|
> | [05-模块设计规范](../Docs/03-前端架构解析/05-模块治理/05-模块设计规范.md) | 纯化 / 检查表 |
> | [09-决议总表](../Docs/03-前端架构解析/05-模块治理/09-决议总表.md) | 目标码一览（计划文档用） |
> | [ARCHITECTURE.md](./ARCHITECTURE.md) | 现网分层 |
>
> 边界闸门：`bun run lint:boundaries`。品质：`08-Feature品质验收标准.md`。

## 1. 注释规范

注释只解释代码本身看不出的信息：

- 模块职责和边界（负责什么 / 不负责什么）；
- 业务规则与不变量；
- 外部系统契约，例如 Tauri Store key、IPC command、URL 兼容策略；
- 容易误解的分支；
- 为什么选择这种实现，而不是另一种看似合理的实现；
- 跨层端口由谁注入、为何禁止某类 import（**写清楚原因，不要写代号**）。

不要写这些注释：

- 复述代码，例如“调用函数”“设置变量”；
- 给每个函数机械补说明；
- 用注释掩盖命名不清；
- **史诗号 / 目标码 / Phase / 试点 / 过渡期** 等过程标签（如 `C3`、`T2a`、`史诗 3`）。  
  计划进度只写在 `Docs/.../10-T2重构执行计划.md`，不进源码。  
  唯一例外：真正临时兼容层，且注明 **将删除的条件**。
- 把整份执行计划贴进源码。

推荐格式：

```ts
/**
 * 模块职责。说明它负责什么，不负责什么。
 */
```

复杂分支 / 架构边界用短行注释（写清原因，不用代号）：

```ts
// 设置页裸路径允许先识别，非法 section 由 route redirect 统一处理。
// 列表 feature 不得 import layout；创建弹窗由壳经 onRequestCreate 注入。
```

## 2. 文件命名规范

文件名优先表达“职责”，不要表达“技术层级感”。

- React 组件：`PascalCase.tsx`，例如 `ShellSidebar.tsx`。
- Hook：`useXxx.ts` / `useXxx.tsx`，例如 `useRememberCurrentShellRoute.ts`。
- 纯规则、工具、状态模型：`camelCase.ts`，例如 `routeMemory.ts`、`routePaths.ts`。
- 测试：与被测文件同名，后缀 `.test.ts` / `.test.tsx`。
- 测试基础设施：统一放 `src/test/`。`setup.ts` 给 Vitest 全局环境用，复用 render/helper 也放这里。
- 不建无意义聚合出口：默认不建 `index.ts` barrel。Vercel 规则要求直接 import，避免扩大 bundle 和依赖面。
- 不建兼容层目录：例如 `routing`、`navigation-runtime` 这类如果只剩转发或命名分层，应删除。

## 3. React 组件规范

来自 Vercel composition patterns 的本地落地规则：

- 不用一串 boolean props 扩展组件模式；优先拆成明确变体组件或组合子组件。
- 复杂组件通过 children / compound components 组合，不优先用 render props。
- Provider 只暴露稳定的 state/actions/meta，不让消费方知道内部状态怎么存。
- 产品铬架在 `layout/`，业务 UI 在 `features/*`，跨业务基础 UI 在 `shared/components`。

来自 Vercel React best practices 的本地落地规则：

- 独立 async 工作用 `Promise.all`，不要串行制造 waterfall。
- 直接 import 具体文件，避免 barrel import。
- 简单表达式不要滥用 `useMemo`。
- effect 依赖用 primitive 或稳定对象；能在事件里做的逻辑不要塞进 effect。
- 非紧急导航和大 UI 更新用 `startTransition`。
- 不在组件内部定义子组件。

## 4. 导航文件边界

导航相关代码统一放在：

```txt
src/app/navigation/
```

navigation 只做路径方言 / 解析 / 记忆 / 会话历史；**不写**领域策略（如「如何打开任务」→ 对应 feature public）。  
换页经 intent/path builder，禁止业务里手拼 `/all/`、`/spaces/`。

导航与路由的当前架构事实见 `src/app/navigation/ARCHITECTURE.md`。新增 route、调整启动恢复或改最近浏览前，先对照该文档更新边界。

职责划分：

- `shellRoute.ts`：URL 解析为 StoneFlow 的 `ShellRoute` / `AppRoute`。
- `scope.ts`：从 route 推导 scope。
- `routePaths.ts`：canonical path builder。
- `intents.ts`：业务导航意图转 path。
- `routeMemory.ts`：启动恢复、最后路由、scope 上次位置的纯规则。
- `routeMemoryStore.ts`：Tauri Store 持久化 `shell.navigation.restore`。
- `useRememberCurrentShellRoute.ts`：route file 写入当前路由记忆。
- `sessionRouteHistory.ts`：当前会话最近浏览和 Header back/forward 状态。

不要再新增：

- `src/app/routing`
- `src/app/navigation-runtime`
- `tanstackCompat`
- 全局 `navigationStore`

TanStack Router 是 URL 和浏览器 history 的真相源；Query 不管导航历史，Zustand 不管当前路由，Tauri Store 只管本机启动恢复持久化。
