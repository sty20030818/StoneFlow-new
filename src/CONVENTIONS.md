# src 代码规范（CONVENTIONS）

> 作用：约束 `src/` **怎么写**（HOW）。违反即不合格。
> 版本：v2.1 · 2026-07-18
> 权威三角：本文（HOW）· [`ARCHITECTURE.md`](./ARCHITECTURE.md)（WHERE）· `features/*/ARCHITECTURE.md`（模块契约）
>
> Docs（`Documents/.../05-模块治理/`）只做决议档案与执行进度；**改码以本三角为准**，不在 src 文档里回链执行计划。

---

## 0. 效力与破坏性纪律

### 0.1 适用范围

- 管：`src/**`（含 `app` / `layout` / `routes` / `features` / `shared` / `styles` / `test`）
- 不管：Rust crate 细节、产品文案长稿、重构进度流水账（进度只写 Docs 执行计划）

### 0.2 冲突裁决

```txt
本规范 + ARCHITECTURE 定稿
  ≥ Docs 模块讨论卡（过时路径以 src 为准）
  ≥ 个人偏好 /「先兼容一下」
```

### 0.3 开放前破坏性默认（已拍板）

产品**对外发布 / 开放用户之前**：

- 允许破坏：前端 public、import 路径、IPC command 名、Tauri Store key、本机记忆/路由恢复数据、URL 形态。
- **必须清理干净**：删旧路径、旧 key、旧命令、临时转发、双轨实现；禁止「兼容窗永久化」「@deprecated 长期躺尸」。
- PR / 改动自检：旧面是否已无引用？测试与文档是否已改到新面？

开放用户之后：破坏性策略另议（届时再改本条）。

### 0.4 原则（可执行版，非口号）

| 原则 | 落地含义 |
|------|----------|
| KISS | 能用直接写法解决就不加抽象层 |
| 高内聚 | 同一实体的 api/keys/mutations/UI 留在同一 feature |
| 低耦合 | 跨模块只经 public / intent / Host 端口 |
| 可删除 | 卸 feature ≈ 摘 routes 挂载 + 摘壳注册 + 删目录 |
| 无冗余 | 同一规则只保留一个真相源；复制第三次才抽 shared/platform |
| 无兼容债 | 开放前不留双轨；迁完即删旧 |

---

## 1. 文档注释（TSDoc）

> **权威语法：** [TSDoc](https://tsdoc.org/)（Microsoft；TypeScript 文档注释标准）。
> JSDoc 是 JS 时代惯例，**类型写在注释里**；本仓是 TypeScript，**类型以 TS 为准**，注释只补语义与契约。
> 工程实践可参考 [Fluid Framework · TSDoc Guidelines](https://github.com/microsoft/FluidFramework/wiki/TSDoc-Guidelines)。
>
> 「规范要详细」≠「每个符号都写长文」。边界与不变量写清楚；私有实现默认靠命名。

### 1.1 中文默认

- 面向开发者的注释、`ARCHITECTURE.md` 正文：**中文**。
- 标识符（函数名、类型名、文件名）：**英文**。
- 禁止用英文注释复述英文函数名。

### 1.2 注释只写代码看不出的信息

**必须写：**

- 模块 / 公共面职责与**不负责**什么；
- 业务不变量、边界条件、容易踩的坑；
- 跨层端口：谁注入、为何禁止某类 import（写原因，不写史诗号）；
- 外部契约：IPC command、Store key、URL/search 语义、序列化版本；
- 「为什么这样实现」——当存在另一种看似合理的写法时。

**禁止写：**

- 「调用 xxx」「设置变量」类复述；
- 复述 TypeScript 已表达的类型（禁止 `@param {string} id` 这类）；
- 给每个私有小函数机械补说明；
- 用注释掩盖命名不清；
- 史诗号 / 目标码 / Phase / 进度（进度只在 Docs 执行计划）；
- 把整份规范或执行计划贴进源码。

### 1.3 标准块结构（TSDoc）

公开符号用**多行** `/** … */`（禁止 public 用单行 `/** 一句 */`）。

**默认够用（本仓优先）：** 摘要 + 空行 + 两三句约束，**不必**上 `@remarks`。

```ts
/**
 * 任务 Query key 工厂。
 *
 * 前缀：`['tasks']` 为根；`invalidateQueries({ queryKey: taskKeys.all })` 可清全部任务缓存。
 * 组件与 hooks 禁止手写散落 key，一律经本工厂。
 */
```

**仅当细节较长时**再拆 `@remarks`（摘要保持一两句，细节进 remarks，勿复述摘要）：

```ts
/**
 * 将打开目标解析为 canonical path。
 *
 * @remarks
 * 命令 / IPC 只调此函数。禁止手拼 `/all/`、`/spaces/`。
 * 失败时返回 null，由调用方决定是否回退首页。
 *
 * @param target - 打开意图（任务或项目）
 */
```

| 标签 | 何时用 |
|------|--------|
| （无标签，多段摘要） | **默认**：文件头、再导出、短契约 |
| `@remarks` | 摘要之外还有大段边界 / 禁止用法 |
| `@param` / `@returns` / `@throws` / `@example` | 语义非显然时；不写 TS 已有的类型 |
| `{@link symbol}` | 指向相关符号时 |

**不要**在注释里堆 Markdown 表格当排版。行内原因用 `//`。

### 1.4 何处写（强制层级）

| 层级 | 何时必须 | 最低内容 |
|------|----------|----------|
| **L0 入口头** | `index.ts` / `contract.ts` 等公共入口顶部 | 职责、不负责、合法消费者（长则用 `@remarks`） |
| **L1 Public** | 入口再导出的每个符号 | 多行摘要；有非显然约束再加 `@remarks` / `@param` |
| **L2 契约与纯规则** | key 工厂、open 策略、path builder、adapter 端口 | 不变量写进摘要即可；勿空挂 `@remarks` |
| **L3 复杂分支** | 非显然并发 / 清理 / 临时代码 | `//` 写原因与删除条件 |
| **L4 私有实现** | 默认不写 | 命名即文档 |

```ts
/**
 * task 域对外公共面（`@/features/task`）。
 *
 * @remarks
 * 外模块只从此文件（或 `./contract`）导入；禁止深路径。
 * 不负责：壳铬架、命令 Runtime、其它实体持久化。
 */

/**
 * 将打开目标解析为 canonical path。
 *
 * 命令 / IPC 打开意图只调此函数，禁止手拼产品 path。
 */
export function resolveCommandOpenTargetPath(/* ... */) {}
```

### 1.5 标签：采用 / 不用

**采用（按需）：** `@remarks` · `@param` · `@returns` · `@throws` · `@example` · `@see` · 行内 `{@link symbol}`

**本仓不用 / 慎用：**

| 标签 | 原因 |
|------|------|
| `@fileoverview` | 非 TSDoc；改用文件顶摘要 + `@remarks` |
| `@packageDocumentation` | 面向 npm 包入口；feature barrel 不必 |
| `{string}` 等类型注解 | TS 已有类型 |
| `@deprecated` | 开放前默认**删旧面**；极短迁移须写删除条件与日期 |
| `@experimental` / 史诗标签 | 禁用 |

### 1.6 测试文件注释

- 描述**行为与不变量**，不描述实现步骤；
- `describe` / `it` 标题用中文业务语句（与现网一致即可）。

---

## 2. 命名与文件组织

### 2.1 文件名

| 种类 | 约定 | 例 |
|------|------|----|
| React 组件 | `PascalCase.tsx` | `ShellSidebar.tsx` |
| Hook | `useXxx.ts(x)` | `useTaskListScene.ts` |
| 纯规则 / 模型 / keys | `camelCase.ts` | `taskOpenStrategy.ts`、`task.keys.ts` |
| 测试 | 与源文件同名 + `.test.ts(x)` | `task.keys.test.ts` |
| 契约 | `contract.ts` / `page.ts` | 极窄出口 |

- 文件名表达**职责**，不表达空洞层级感（避免 `utils2.ts`、`helpers-new.ts`）。
- 测试基础设施：`src/test/`。

### 2.2 符号命名

| 种类 | 约定 |
|------|------|
| 组件、类型、接口 | `PascalCase` |
| 函数、变量、字段 | `camelCase` |
| 模块级常量对象（keys、配置表） | `camelCase`（如 `taskKeys`）或场景下 `SCREAMING_SNAKE`（真常量枚举值） |
| 事件 / IPC command | `domain.action` 点分字符串（如 `task.create`） |
| CSS / 设计 token | 只使用 `styles/theme.css` 的现行语义角色，不在业务里发明第二套 |

布尔：`is` / `has` / `can` / `should` 前缀。
异步：动词原形；返回 Promise 的不必强制 `Async` 后缀（TS 已表达）。

### 2.3 Import 与 barrel

- **跨 feature**：只允许 `@/features/<name>`、`/contract`、`/page`。
- **feature 内**：优先直接 import 具体文件。
- **禁止**：为「方便」新建无意义聚合目录；禁止只剩转发的兼容层目录。
- 主 `index.ts`：**显式 export 清单**，禁止 `export *` 扫整树撑大 public。
- 新增 public 符号前：必须已有外消费者；禁止预防性导出。

边界闸门：`bun run lint:boundaries`（含于 `bun run check`）。

### 2.4 Feature 内分层

```txt
components → hooks → api → model
```

| 目录 | 职责 | 禁止 |
|------|------|------|
| `model/` | 类型、纯规则、ports | IO、React |
| `api/` | Tauri invoke / Store / listen | UI、业务编排 hook |
| `hooks/` | Query / Mutation / scene facade | 裸 invoke（走 api） |
| `components/` | 业务 UI | 直接 invoke |
| `index.ts` | public | 导出私有细节 |

可按需增加：`commands/`、`bulk/`、`create/`、`detail/` 等**内聚子树**；外模块仍只走 public。

---

## 3. React 与组合模式

依据：Vercel composition patterns + React best practices（本仓裁剪；忽略 Next/RSC 专属条）。

### 3.1 组件 API

- **禁止**用一长串 boolean props 切换互斥模式；改为显式变体组件或组合。
- 复杂 UI：优先 **compound components / children**，不优先 `renderX` props。
- Provider 对外只暴露稳定的 **state / actions / meta**；消费方不关心内部用 Zustand 还是 reducer。
- **禁止**在组件函数体内定义子组件（每次 render 新类型 → 重置状态）。

### 3.2 状态与渲染

- 能在事件处理器完成的逻辑，**不要**塞进 `useEffect`。
- effect 依赖优先 primitive / 稳定引用；对象依赖先解构或规范化。
- 非紧急更新（导航后大列表、非输入路径 UI）用 `startTransition`。
- 昂贵列表可考虑 `useDeferredValue`；**不要**给简单表达式套 `useMemo`。
- 默认不引入 `useCallback` / `useMemo`「以防万一」；本仓有 React Compiler 时更勿机械包裹。

### 3.3 性能（必守子集）

- 独立异步：`Promise.all`，禁止无依赖串行 await。
- 直接 import，避免无必要 barrel 放大图。
- 派生状态在 render 中计算，不要 `useEffect` 同步一套 state。
- 条件渲染用三元；慎用 `&&` 在 `0` / `''` 上踩坑。

### 3.4 落点

| UI 种类 | 位置 |
|---------|------|
| 产品铬架 | `layout/` |
| 业务 UI | `features/*/components` |
| 跨业务无归属 | `shared/components` |

---

## 4. TanStack Query

依据：TanStack Query v5 最佳实践 + 本仓现网（如 `taskKeys`）。

### 4.1 真相源

- **服务器 / 可回源数据** → 只进 Query。
- **禁止**用 Zustand/Context 复制一份 Query 已有的列表/详情当真相。
- UI 瞬时态（弹层开关、草稿、焦点）→ React state / 限定 Zustand / reducer。

### 4.2 Keys 工厂（强制）

每个有持久化实体的 domain feature 提供 `*.keys.ts`：

```ts
export const taskKeys = {
	all: ['tasks'] as const,
	queries: () => [...taskKeys.all, 'query'] as const,
	query: (input: RunTaskQueryInput) => [...taskKeys.queries(), input] as const,
	details: () => [...taskKeys.all, 'detail'] as const,
	detail: (taskId: string) => [...taskKeys.details(), taskId] as const,
}
```

规则：

- 层级前缀可 invalidate：`invalidateQueries({ queryKey: taskKeys.all })`。
- key 必须可序列化；参数对象保持稳定规范化（同一语义同一 key）。
- **禁止**组件内手写散落 `['tasks', id]` 字符串数组（除 keys 文件本身）。

### 4.3 `queryOptions`（强制）

- 列表/详情查询定义成 `queryOptions`（或 feature 内同等工厂），供 `useQuery` / `useSuspenseQuery` / `ensureQueryData` **共用同一份**。
- Route loader 用 `queryClient.ensureQueryData(xxxQueryOptions(...))`，**不要**另写一套 fetch。

### 4.4 Mutations

- `mutationFn` 只调 `api/`；在 `onSuccess` / `onSettled` 里按 keys **前缀失效**。
- 乐观更新：先 `cancelQueries` → 快照 → `setQueryData` → 失败回滚 → `onSettled` 再 invalidate。
- 默认：query `retry: 1`，mutation `retry: 0`（与 `app/providers` 一致）；测试里 query `retry: false`。

### 4.5 跨 feature 失效

- 工作区级：走 `features/workspace` / `shared/query` 已有入口。
- **禁止** feature A 直改 feature B 私有 cache 形状；只 invalidate 约定前缀或调对方 public。

### 4.6 禁止

- 组件 / `shared` 裸 `invoke()` 当数据层。
- 条件调用 Hook；用 `enabled` 表达依赖查询。
- 把「当前选中实体」塞进 Query 当服务器数据。

---

## 5. TanStack Router

依据：TanStack Router + 本仓单树壳。

### 5.1 职责切分

| 层 | 负责 |
|----|------|
| `src/routes/**` | file tree、match、loader/redirect、薄页挂载 |
| `app/navigation` | path 方言、intent、memory、session history、`shellRouteFromMatch` |
| `app/router.tsx` | Router 实例 |

- 业务换页：只经 `@/app/navigation` 的 intent / path builder。
- **禁止**业务代码手拼 `/all/`、`/spaces/` 或第二套 path 规则。

### 5.2 薄页

- Route 组件：取 params/search → 调 feature `page` / 场景组件；**禁止**厚业务与裸 IO。
- 体量参考：普通叶宜短；逻辑进 feature hooks 或 `-*-helpers`。

### 5.3 Loader

- Loader：门闸、`ensureQueryData`、redirect；**不是**第二数据层。
- 与 search 相关时用 `loaderDeps`，避免 stale loader。
- 详情等：loader ensure + 页内 `useSuspenseQuery` / `useQuery` 共用同一 `queryOptions`。

### 5.4 Search / params

- 需要类型安全时用 `validateSearch`（或等价校验）。
- 抽屉等 UI 契约若约定在 URL search（如 entity-detail），**禁止**再引入全局 drawer store 当真相。

### 5.5 导航记忆

- 启动恢复：`app/navigation` memory + Store；版本升级可硬切丢弃旧数据（开放前允许）。
- **禁止** Query / 随意 Zustand 保存「当前路由真相」。

现网目录见 `app/navigation/ARCHITECTURE.md`（`path.ts` · `shellLocation.ts` · `memory.ts` · `sessionHistory.ts` …）。

---

## 6. 视觉与交互（轻量 · 不替代设计系统）

依据：本仓 `styles/` + 产品克制；**不做**独立营销站式花活。

- 视觉真相：`styles/` token 与映射；业务组件用语义 token，不硬编码散落色值（除非局部装饰并注明）。
- 动效：服务于层级与反馈；尊重 `prefers-reduced-motion`；不为动而动。
- View Transition 等增强：单独专项再开，**不**在本规范强制全开。
- 铬架与业务视觉分离：壳在 `layout/`，业务外观在 feature，基础零件在 `shared/components`。

细则见 `styles/ARCHITECTURE.md`。

---

## 7. 导航（摘录 · 与 §5 一致）

导航代码只在：

```txt
src/app/navigation/
```

- 公共入口：`from '@/app/navigation'`
- 不做：`app/routing`、`navigation-runtime`、`tanstackCompat`、全局 `navigationStore` 管 URL 真相

---

## 8. 禁止清单（速查）

1. `features/**` → `@/layout/**`
2. 跨 feature 深路径（绕过 public）
3. `shared` → `features` / `layout` / 业务 `app`
4. 裸 `invoke()`（非 `api/`）
5. store 双写服务器态
6. 手拼产品 path / 第二套路由 DSL
7. 预防性撑大 `index.ts` public
8. 永久兼容层 / 只转发的目录
9. selection ∪ bulk ∪ command 合并成一个包
10. filter ∪ display-options 合并
11. 组件内定义子组件
12. 注释里写史诗号 / 目标码

---

## 9. 门禁与改文档义务

```bash
bun run check
# typecheck · lint · boundaries · format · tests · rust
```

改动触及边界、public、Query key、路由语义、IPC/Store 契约时：

1. 更新本规范或 `ARCHITECTURE.md`（若改的是分层事实）
2. 更新**被改模块**的 `ARCHITECTURE.md`（无则新建短契约）
3. 破坏性改动：确认旧面已删除、引用已清

---

## 10. 文档地图（单向权威）

```txt
改码权威（src，少互链）
  CONVENTIONS.md          HOW
  ARCHITECTURE.md         WHERE（全局）
  features/*/ARCHITECTURE 模块定稿

档案 / 进度（Docs → 可链到 src；src 不回链计划）
  Documents/.../05-模块治理/
```

| 文档 | 写什么 |
|------|--------|
| `CONVENTIONS.md` | HOW |
| `ARCHITECTURE.md` | 全局定稿架构 |
| `*/ARCHITECTURE.md` | 模块定稿契约 |
| Docs 模块治理 | WHY、决议、执行计划与债（不抢日常入口） |

> 达标后只改 src 定稿；计划里删对应债项。禁止在每个模块 ARCHITECTURE 头上挂决议卡 + 执行计划链接。

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-18 | v2.1：权威三角在 src；注释默认不用 `@remarks`；架构去 Docs 回链 |
| 2026-07-18 | v2：开放前破坏性纪律；注释分层；Query/Router/React 组合 |
| （既有） | v1：注释、命名、React、导航摘录 |
