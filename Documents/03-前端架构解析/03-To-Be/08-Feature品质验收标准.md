# Feature 品质验收标准（Phase E 门禁）

> 状态：**v1 冻结草案** · 2026-07-16  
> 目的：回答「一个 feature 怎样才算达标」——不只目录对、boundaries 绿，还要**高内聚、低耦合、可组合、可维护**。  
> 前置：Phase D 骨架（public / boundaries / 四夹分层）  
> 对齐外参（精简落地，非全文复述）：  
> · Vercel Composition Patterns  
> · Vercel React Best Practices  
> · TanStack Query Best Practices  
> · TanStack Router Best Practices  
> 冲突时：本文件 + `src/ARCHITECTURE.md` + T0 原则优先；外参 skill 作细则参考。

---

## 0. 一句话

```txt
外：别人只看见 public，装上就能用、卸下不伤人。
内：model 纯 · api 只 IO · hooks 出 facade · components 只渲染可组合零件。
态：URL / Query / UI 瞬态三轨不双写。
质：无上帝文件、无 boolean 丛林、effect 稳、mutation 后缓存可预期。
```

**Phase D 交付的是闸门；本标准交付的是房间装修验收。**

---

## 1. 分级与用法

| 级 | 含义 | 何时必须过 |
|----|------|------------|
| **P0 · 门禁** | 不达标 = 标杆未完成 / 禁止标「品质 done」 | 每个标杆 feature 收尾 |
| **P1 · 应有** | 合理例外须在 feature 内 ARCHITECTURE 写明 | 标杆优先；推广时默认 |
| **P2 · 加分** | 热路径 / 厚 UI 再上 | 不挡「基本达标」 |

### 怎么用

1. 开标杆：复制 [§9 验收表](#9-单-feature-验收表模板) → 填 feature 名。  
2. 改造中：按 P0 → P1 勾。  
3. 收尾：`bun run check` 绿 + doctor 该 feature 路径不恶化 + 表勾完。  
4. **禁止**用「全仓搬家」代替本表勾选。

### 不测什么

- 视觉像素级还原、产品文案  
- 后端 Rust crate 边界  
- 强行把分数打到 80+（doctor 只做回归仪）

---

## 2. P0 · 模块边界与内聚（骨架 + 门禁）

> 对应：T0 P1–P8 · β-acl · 可删除性

### 2.1 身份清晰

| # | 标准 | 验收 |
|---|------|------|
| B1 | 一句话职责能写清（「负责什么 / 不负责什么」） | feature 顶注释或 `ARCHITECTURE.md` 有 |
| B2 | 类型正确：domain / platform / scene / window 之一（见 T5） | 分类写明；scene 默认不厚建 feature |
| B3 | 可删除性：理想只卸 routes 薄页 + layout 装配 | 不依赖他人私有路径 |

### 2.2 Public 契约

| # | 标准 | 验收 |
|---|------|------|
| B4 | 外模块 **只** `@/features/<name>`（及约定 `contract` / `page`） | `check-feature-boundaries` 绿 |
| B5 | `index.ts` **显式 export 清单**；禁止 `export *` 扫子树 | 读 index 可见列表 |
| B6 | 新增 public 符号须已有真实外消费者；禁止预防性撑大 | PR 说明「谁 import」 |
| B7 | public 按**用例分组**注释（列表 / 详情 / 壳装配 / 类型） | 像 task 标杆结构 |
| B8 | 内部子树（如 `detail/`）**不是**第二 public | 外层不写 `…/detail/…` |

### 2.3 内部分层（四夹 + 依赖单向）

| # | 标准 | 验收 |
|---|------|------|
| B9 | 夹职责：`model` 纯 · `api` 仅 IO · `hooks` 编排 · `components` UI | 抽查 3 个文件无越界 |
| B10 | 依赖：`components → hooks → api → model`；可 → `shared` | 无 model→components、api→React 组件 |
| B11 | **components / routes 禁止** 直接 `invoke` / 裸 `@tauri-apps` | rg 抽查 |
| B12 | 跨 feature 只 import 对方 public | boundaries 绿 |

### 2.4 状态三轨（真相源唯一）

| # | 标准 | 验收 |
|---|------|------|
| B13 | 持久实体 / 可回源数据 → **TanStack Query** | 无 Zustand 复制服务端列表当真相 |
| B14 | URL 位置 / 打开谁 → **Router path + validated search** | 抽屉/详情不另起全局 drawer store 真相 |
| B15 | 纯 UI 瞬态 → local state / 明确 Provider / 少量 scoped Zustand | 不塞进 Query |
| B16 | 禁止同一事实双写无主从（如 badges 双通道） | 设计说明或代码单路径 |

---

## 3. P0 · 组合与组件 API（Composition）

> 对应：vercel-composition-patterns  
> `architecture-avoid-boolean-props` · `architecture-compound-components`  
> `state-context-interface` · `state-decouple-implementation` · `state-lift-state`  
> `patterns-explicit-variants` · `patterns-children-over-render-props`

| # | 标准 | 验收 |
|---|------|------|
| C1 | **禁止**用一串 boolean props 扩行为（`isX && isY && !isZ`） | 公开组件 props 审阅；超 2 个互斥模式改 variant/拆件 |
| C2 | 复杂 UI 用 **compound / children** 组合，优先于 `renderX` 丛林 | 顶层 API 可讲清槽位 |
| C3 | 需要共享态时：**先 lift 到 Provider**，子件读 context，不层层钻 prop | 兄弟节点能协作 |
| C4 | Provider 对外只暴露 **`state` / `actions` / `meta`**（或等价命名） | 消费者不知内部 store 实现 |
| C5 | Provider **是唯一知道**状态怎么存的地方；UI 不绑死具体 hook 实现细节 | 可换实现不改纯展示子树 |
| C6 | 互斥模式用 **显式 variant 组件/文件**（`TaskListInbox` / `…` 或 `variant:` 联合类型），不用模糊 boolean 矩阵 | 类型上穷尽 |
| C7 | 壳/layout 只 **装配** feature public，不复制第二套业务状态机 | 无页面私有 command/bulk 全局态 |

**反例（不达标）：**  
`Composer({ isThread, isDM, isEditing, isForwarding })` 一锅炖。

**正例方向：**  
`TaskListSceneView` + `variant`；compound `MainCard.Header`；`useTaskListScene` 返回 facade 字段分组。

---

## 4. P0 · React 实现卫生（Best Practices · 桌面子集）

> 对应：vercel-react-best-practices（取与 SPA/桌面相关的硬项）  
> 重：`rerender-*` · `bundle-barrel-imports` · effect/事件边界  
> 轻：Next/RSC 专属条目默认 N/A

| # | 标准 | 验收 |
|---|------|------|
| R1 | **直接 import 实现文件**（feature 内部）；跨 feature 走 public 单点，不层层 re-export 迷宫 | 内部无无意义 barrel 链 |
| R2 | effect 依赖用 **primitive / 稳定引用**；对象/handler 须 `useMemo`/`useCallback` 或 ref | 无「每 render 新 source」导致的连环 effect（doctor `fresh-deps` 本 feature 不增） |
| R3 | 交互逻辑优先放 **事件处理器**，不塞进「跟 props 同步」的 effect | 读 effect 列表能讲清「同步外部系统」 |
| R4 | 派生数据在 **render 中算**，不 `useEffect` + `setState` 镜像 | 无 mirror state |
| R5 | 不在组件函数体内定义子组件 | 结构扫描 |
| R6 | 默认 props 对象/数组 **提到模块作用域** 或稳定 memo | 避免子树无意义 rerender |
| R7 | 独立异步用 `Promise.all`（或等价并行），不无故串行 waterfall | api/hooks 抽查 |
| R8 | 非紧急导航/大更新用 `startTransition`（适用处） | 列表筛选/切页体感 |

### 体量门禁（P0 软硬结合）

| # | 标准 | 验收 |
|---|------|------|
| R9 | **单组件文件**业务实现（非 test）建议 **≤ 300 行**；**硬顶 400 行**须拆或写例外理由 | `wc -l`；>400 必须有拆分计划 |
| R10 | 单 hook facade 建议 **≤ 250 行**；过厚拆 `useXxxData` / `useXxxActions` | 同上 |
| R11 | 测试文件可长，但应对 **public / 行为**，不锁私有路径实现细节 | mock `@/features/x` 而非深路径 |

---

## 5. P0 · TanStack Query（数据面）

> 对应：tanstack-query-best-practices  
> 重：`qk-*` · `mut-invalidate-queries` · `cache-invalidation` · `perf-select-transform`

| # | 标准 | 验收 |
|---|------|------|
| Q1 | Query key **数组**、可序列化；含全部依赖变量 | 改 filter/id 会换 key |
| Q2 | Key **分层**：`[domain, scope?, id?, filters?]`；复杂域用 **key factory** | 同 feature 内一处定义 |
| Q3 | `queryOptions` / 稳定 options 对象在 hooks 层；组件不手拼 key | 组件无魔法字符串 key |
| Q4 | `api/` 只负责 invoke+映射；**hooks** 才 `useQuery`/`useMutation` | 分层抽查 |
| Q5 | Mutation 成功后 **定向 invalidate**（或结构化更新）；禁止无脑 `invalidateQueries()` 全清 | 读 mutation `onSuccess` |
| Q6 | 跨 feature 失效走 **`shared/query` 或本域 factory 导出的 keys**，不穿透私有 hooks | import 路径 |
| Q7 | 桌面默认尊重全局：`staleTime`/`gcTime`/`refetchOnWindowFocus: false`；域特殊须注释 | 无莫名全量 refetch |
| Q8 | 列表/详情用 `select` 做投影，避免整树无意义 rerender（热路径 P0，其它 P1） | 大列表有 select 或拆 query |
| Q9 | 乐观更新可选；若做则 **onMutate 快照 + 错误回滚** | 有 rollback 才标乐观 |
| Q10 | loading 用 `isPending`/`isFetching` 语义正确；错误有用户可感知路径 | 不静默吞错 |

**StoneFlow 特判：**  
本地 SQLite + Tauri，网络重试宜保守（已有全局 retry）；**不要**按 Web SaaS 默认猛 refetch。

---

## 6. P0 · TanStack Router（路由薄页）

> 对应：tanstack-router-best-practices  
> 重：薄页 · search 校验 · navigation 语义 · 与 Query 分工

| # | 标准 | 验收 |
|---|------|------|
| T1 | `routes/**` **薄**：只匹配、redirect、挂 feature `page`/scene；无厚业务 JSX 树 | 单 route 文件宜 < ~80 行业务 |
| T2 | 导航语义走 **`app/navigation`**（path builder / intent / shell route）；禁止组件手拼脆弱 path 字符串散落 | 新链接触发 intents/routePaths |
| T3 | search / params **校验**（zod 或等价）；非法值 redirect/默认 | 无裸 `search.foo as any` |
| T4 | URL 是「打开谁/哪一页」的真相；feature 读 search，不反向写第二套全局导航 store 当真相 | 与 B14 一致 |
| T5 | 需要预取时：loader/`ensureQueryData` + 本 feature `queryOptions`；不在 route 里 invoke | loader 只接线 |
| T6 | 程序化导航用 Router API；可点导航优先 `Link` | 可访问性/预加载友好 |
| T7 | 与壳的配合：remember 写在 **scope route**，不在 layout 乱写 Store | 见 layout 短契约 |

**本阶段不强求：** 全仓 `.lazy.tsx` 拆包、intent preload 全开（→ P2）。

---

## 7. P1 · 应有（标杆优先）

| # | 标准 | 来源 |
|---|------|------|
| P1-1 | feature 内 `ARCHITECTURE.md` 半页：职责、public 摘要、Provider 树、已知例外 | 文档 |
| P1-2 | 命令/批量等平台能力：本域只提供 **slice/adapter**，不复制 runtime | command/bulk 模型 |
| P1-3 | 列表场景：唯一 facade（如 `useTaskListScene`），禁止三页复制 wiring | M-3 巩固 |
| P1-4 | `notifyOnChangeProps` / 拆 query：仅热路径大订阅 | Query perf |
| P1-5 | 意图预取（hover 打开详情）：有数据处再上 | Query + Router |
| P1-6 | React 19：新代码不引入 `forwardRef`；用 ref 作 prop | composition react19 |
| P1-7 | 无障碍：图标按钮有名；焦点陷阱在对话框内 | 产品底线 |
| P1-8 | doctor：本 feature 热点文件 issue 数 **不高于** 改造前 | 回归 |

---

## 8. P2 · 加分（不挡达标）

| # | 标准 |
|---|------|
| P2-1 | route lazy / 大面板 dynamic import |
| P2-2 | infinite query 规范分页（若出现） |
| P2-3 | `js-combine-iterations` 等微优化热路径 |
| P2-4 | Story / 交互测覆盖主 facade |
| P2-5 | public 导出做「消费者表」注释 |

---

## 9. 单 Feature 验收表模板

复制到 PR 或 `features/<name>/ARCHITECTURE.md`：

```markdown
## Feature 品质验收 · <name>
日期：
类型：domain | platform | scene | window
改造前 doctor 路径 issue 约：
改造后：

### P0 边界
- [ ] B1–B3 身份 / 可删
- [ ] B4–B8 public
- [ ] B9–B12 分层与 invoke
- [ ] B13–B16 状态三轨

### P0 组合
- [ ] C1–C7

### P0 React
- [ ] R1–R8
- [ ] R9–R11 体量

### P0 Query（若有数据）
- [ ] Q1–Q10（N/A 项划掉）

### P0 Router（若有页）
- [ ] T1–T7（N/A 项划掉）

### P1
- [ ] 列出已做 / 明确延期项

### 验证
- [ ] bun run check
- [ ] 相关冒烟（手测清单：）
- [ ] boundaries 绿
- [ ] 无新增深路径依赖

### 已知例外（须写理由 + 回退条件）
-
```

---

## 10. 反模式速查（一票否决倾向）

| 反模式 | 为何否 |
|--------|--------|
| 跨 feature 深路径 import | 毁掉可删除性 |
| `export *` 扫 components | public 不可审 |
| 组件内 `invoke` | 无 ACL、难测 |
| Zustand 镜像 Query 列表 | 双真相 |
| boolean props 开新模式 | 组合爆炸 |
| 1500 行上帝组件「以后再拆」无计划 | 永久技术债 |
| route 文件写完整业务页 | 路由层变第二 feature |
| mutation 成功不失效缓存 | 脏 UI |
| 为抽象把单用逻辑塞进 `shared` | 假共享、真耦合 |

---

## 11. 与外参 skill 的映射（备查）

| 本标准块 | 主要 skill 条目（名称级） |
|----------|---------------------------|
| §3 组合 | avoid-boolean-props · compound-components · context state/actions/meta · explicit-variants · children-over-render-props · lift-state · decouple-implementation |
| §4 React | barrel-imports · rerender-dependencies · move-effect-to-event · derived-state-no-effect · no-inline-components · parallel async · transitions |
| §5 Query | qk-array/hierarchical/factory/serializable · mut-invalidate · cache-invalidation · select-transform · optimistic+rollback |
| §6 Router | file routes 薄页 · search-validation · load-ensure-query-data · nav Link/navigate · 与 navigation 语义层分工 |
| §2 边界 | 项目 T0/T5/β-acl（skill 外，本地更高优先级） |

完整细则仍读各 skill 的 `rules/*`；**验收以本文件勾选为准**，避免 100+ 条全量教条。

---

## 12. 推行顺序（建议，非本文件范围）

1. **冻结本标准 v1**（本文）  
2. **标杆 #1**：`command` *或* `task`（二选一做透）  
3. 用验收表打勾 → 修到 P0 全绿  
4. 第二标杆 → platform 批（selection/submit/filter）→ 其它 domain  
5. 每完成一个，更新路线图；doctor 附录追加该 feature 对比可选  

**不做：** 用本标准发动第二次全仓目录狂欢。

---

## 13. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-16 | v1：P0/P1/P2 + 验收表；对齐四 skill + StoneFlow 边界 |
