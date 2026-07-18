# StoneFlow 推荐依赖清单

> 基于项目现状（Tauri v2 + React 19 + TypeScript + Tailwind v4 + Zustand + TanStack Query + SeaORM/SQLite）分析得出。
> 每个依赖都标注了作用、优缺点和推荐理由。

---

## 🔴 Tier 1 — 强烈建议立即添加（高收益、零破坏性）

### 1. `zod` + `@hookform/resolvers`

**类别**: 数据校验 / 表单

**作用**: 
- 定义运行时数据校验 Schema，前端表单校验 + 后端 API 校验同一套类型定义
- 配合 `@hookform/resolvers` 可直接接入 React Hook Form（等你们以后加表单库时）

**优点**:
- TypeScript 类型可以从 Schema 自动推断 (`z.infer<typeof schema>`)，减少重复
- 生态极大，几乎所有 React 项目都在用，社区资源丰富
- 校验逻辑和 UI 解耦，纯函数可测试
- 支持复杂校验：联合类型、条件校验、transform、refine 等

**缺点**:
- 包体积偏大（~12KB gzipped），但在桌面端无感
- 校验性能不如 `valibot`（但 Valibot 生态远不如 Zod 成熟）

**为什么推荐**: 已经提到想用，且它是 2025-2026 年 TypeScript 项目的事实标准校验库。你的项目没有任何校验方案，这是一个明显的缺口。

**安装**: `bun add zod @hookform/resolvers`

---

### 2. `react-hook-form`

**类别**: 表单管理

**作用**: 高性能表单状态管理 —— 非受控模式默认不触发重渲染，只在提交时收集数据。

**优点**:
- 重渲染极少（非受控模式），性能碾压 Formik
- TypeScript 支持极好，与 Zod 无缝集成
- API 简洁，学习曲线低
- 内置表单校验、错误状态、脏检测、重置等

**缺点**:
- 复杂动态表单场景（如动态增减字段）API 略繁琐
- 与 React 19 的新表单特性有部分重叠，但 RHF 功能更全

**为什么推荐**: 你的项目大概率会有表单（设置、配置、新建流程节点等），RHF + Zod 是 2026 年的标准组合。

**安装**: `bun add react-hook-form`

---

### 3. `tracing` + `tracing-subscriber`（Rust 侧）

**类别**: 可观测性 / 日志

**作用**: 替代目前使用的 `log` crate，提供结构化的分布式追踪日志。

**优点**:
- 比 `log` 更强大：支持结构化字段（`info!(user_id = 123, "login")` → JSON 可查询）
- `#[instrument]` 宏自动追踪函数进入/退出/耗时
- `tracing-subscriber` 支持灵活的输出格式（JSON、美化、过滤）
- Tokio 官方维护，与异步生态完美集成
- 可以直接桥接 `log` 生态的 crate（如 `sea-orm` 的日志）

**缺点**:
- 比 `log` 稍重，学习曲线略高
- 需要替换现有代码中的 `log` 调用

**为什么推荐**: 你的项目已经有 `log` 了，升级到 `tracing` 只需要改少量代码，但获得的能力是质变级别的。尤其在排查 Tauri 命令链调用问题时，结构化日志能快速定位。

**安装**: 在 `Cargo.toml` workspace dependencies 添加：
```toml
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
tracing-log = "0.2"  # 桥接 log → tracing
```

---

### 4. `motion`（原 Framer Motion）

**类别**: 动画

**作用**: React 动画库，支持布局动画、手势、过渡、关键帧等。

**优点**:
- 声明式 API，动画代码写起来很自然
- 布局动画（`layout` prop）是杀手级特性 —— 元素移动时自动过渡
- 手势系统完善（拖拽、hover、tap）
- `AnimatePresence` 让元素离开动画变得简单
- 性能好，使用 FLIP 技术 + GPU 加速

**缺点**:
- 包体积较大（~35KB gzipped）
- 复杂编排场景不如 GSAP 灵活

**为什么推荐**: 桌面应用体验感很大程度上取决于动画。你们的 `tw-animate-css` 只能做简单的进入/过渡动画，Motion 可以做到元素间平滑过渡、拖拽排序、手势反馈等真正让 App 感觉"丝滑"的效果。

**安装**: `bun add motion`

---

### 5. `react-hotkeys-hook`

**类别**: 键盘快捷键

**作用**: 声明式 React 快捷键钩子。

**优点**:
- API 极简：`useHotkeys('ctrl+s', callback)`
- 支持修饰键组合、作用域（Scope，不同区域不同快捷键）、序列
- 体积小（~3KB gzipped）
- 自动处理焦点场景（input 内的快捷键自动忽略或可配置）

**缺点**:
- 复杂快捷键编排（如 Vim 风格的 key sequence）不如一些专业方案

**为什么推荐**: 桌面应用的核心交互是快捷键。你们已经有 Tauri 全局快捷键，但应用内快捷键（Ctrl+S 保存、Ctrl+Z 撤销、Ctrl+K 命令面板等）需要这个库来统一管理。

**安装**: `bun add react-hotkeys-hook`

---

## 🟡 Tier 2 — 建议添加（显著价值，按需安装）

### 6. `@tanstack/router`（替代 react-router-dom）

**类别**: 路由

**作用**: TanStack 家族的路由方案，完全类型安全的路由系统。

**优点**:
- **完全类型安全**：路由参数、search params、state 都自动推导类型，不会拼错路径名
- 搜索参数管理比 React Router 优雅得多（类型安全 + 自动序列化）
- 与 TanStack Query 深度集成（路由级数据预加载）
- 文件系统路由支持（可选）
- 路由级代码分割开箱即用

**缺点**:
- 包体积比 React Router 大
- 学习曲线比 React Router 陡
- 生态插件不如 React Router 丰富
- **迁移成本**：项目已经用了 React Router v7，切换需要改所有路由定义

**为什么推荐**: 类型安全的路由能消除大量运行时 bug。但考虑到已有 React Router v7，**建议在新功能模块试用**，不急于全局替换。

**安装**: `bun add @tanstack/react-router`

---

### 7. `zundo`

**类别**: 撤销/重做

**作用**: Zustand 的撤销/重做中间件，3 行代码搞定。

**优点**:
- 与 Zustand 无缝集成，零额外学习成本
- 自动追踪 store 变更历史
- 支持限制历史步数（防止内存泄漏）
- 支持清除历史、跳转到指定步骤
- 可选择追踪哪些 store 字段

**缺点**:
- 对大型状态对象（如画布数据）可能内存占用大，需要配合 cool-off/debounce 策略
- 不支持跨 store 的联合撤销

**为什么推荐**: 如果 StoneFlow 涉及任何编辑操作（流程节点编辑、配置修改），撤销/重做是刚需。zundo 是 Zustand 生态的最佳 undo 方案。

**安装**: `bun add zundo`

---

### 8. `@xyflow/react`

**类别**: 流程图 / 节点编辑器

**作用**: React 节点式 UI 库，适合构建工作流编辑器、流程图、可视化编排。

**优点**:
- 功能完善：节点拖拽、连线、选择、缩放、小地图
- 高度可自定义的节点和边渲染
- 内置布局算法、自动排列
- 活跃维护，文档优秀
- 被众多产品验证（n8n、扣子、百宝箱等）

**缺点**:
- 对超大画布（1000+ 节点）需要配合虚拟化优化
- 包体积不小（但按需加载无明显影响）
- 复杂自定义节点需要较深理解内部机制

**为什么推荐**: 项目名叫 StoneFlow，如果确实涉及流程/工作流编辑，这就是核心依赖。2026 年 `@xyflow/react` 是标准选择。

**安装**: `bun add @xyflow/react`

---

### 9. `@tanstack/table`（无头表格）

**类别**: 数据表格

**作用**: 无头（Headless）数据表格库，提供排序、筛选、分页、分组、列拖拽等逻辑，不控制 UI。

**优点**:
- 完全控制 UI 渲染（可以用任何组件库样式）
- 性能极好（虚拟化友好）
- TypeScript 类型推导完整
- 功能齐全：排序、筛选、分页、分组、展开行、列固定、列拖拽
- TanStack 家族一员，API 风格一致

**缺点**:
- 无头意味着你需要自己写 UI，初始工作量比 AG Grid 大
- 不适合类电子表格的编辑场景（那需要 AG Grid）

**为什么推荐**: 如果项目有数据展示需求（如节点列表、运行日志、配置表格），TanStack Table 是最灵活的方案。

**安装**: `bun add @tanstack/react-table`

---

### 10. Zod 生态延伸：`zod-i18n-map` / `zod-error-utils`

**类别**: 校验体验增强

**作用**: 
- `zod-i18n-map`：自动为 Zod 校验错误提供中文提示
- `zod-error-utils`：更友好的错误格式化

**为什么推荐**: 装了 Zod 之后，给用户看 `"String must contain at least 3 characters"` 还是 `"至少需要 3 个字符"`，体验差距很大。

**安装**: `bun add zod-i18n-map`

---

## 🟢 Tier 3 — 按需添加（有益，不是刚需）

### 前端

#### 11. `@tanstack/react-virtual`

**作用**: 虚拟滚动 —— 列表有 10000 项时只渲染可见区域。
**场景**: 日志查看器、节点列表、搜索结果。
**安装**: `bun add @tanstack/react-virtual`

#### 12. `valibot`（Zod 替代方案）

**作用**: 更轻量的校验库，支持 tree-shaking，包体积 ~2KB（Zod 的 1/6）。
**优点**: 体积小，模块化好。
**缺点**: 生态不如 Zod 成熟，社区方案少。
**场景**: 如果对包体积敏感（虽然桌面应用不太需要）。

#### 13. `ts-pattern`

**作用**: TypeScript 模式匹配库，消除嵌套 if/switch。
**优点**: 穷举检查、类型窄化、代码可读性爆表。
**场景**: 复杂状态机、多分支判断。
**安装**: `bun add ts-pattern`

#### 14. `i18next` + `react-i18next`

**作用**: 国际化方案。
**优点**: 生态成熟，支持命名空间、懒加载、ICU 消息格式。
**缺点**: 配置略繁琐，需要维护翻译文件。
**场景**: 如果计划做多语言支持。

#### 15. `vite-bundle-visualizer`

**作用**: 分析打包体积，可视化哪些模块占了多大空间。
**安装**: `bun add -D vite-bundle-visualizer`
**场景**: 优化打包体积时使用。

#### 16. `@sentry/react`

**作用**: 错误追踪和性能监控。
**场景**: 如果发布后需要收集前端崩溃信息。

#### 17. `orval` / `@hey-api/openapi-ts`

**作用**: 从 OpenAPI/Swagger 文档自动生成 TypeScript 客户端代码。
**场景**: 如果你的 Rust 后端会暴露 REST API 且有 OpenAPI 文档。

#### 18. `ky`

**作用**: 基于 Fetch API 的轻量 HTTP 客户端，比 axios 更现代。
**优点**: 基于标准 Fetch，体积小，API 优雅。
**场景**: 如果需要在 JS 侧做 HTTP 请求（目前主要用 Tauri invoke，可能不需要）。

#### 19. `effect`

**作用**: TypeScript 函数式编程框架，提供强大的错误处理、依赖注入、并发控制。
**优点**: 类型安全极强，可以建模复杂的业务流程。
**缺点**: 学习曲线极陡，团队门槛高。
**场景**: 如果对函数式编程有信仰且愿意投入学习。

#### 20. `vitest-browser`

**作用**: Vitest 的浏览器模式测试，在真实浏览器环境运行测试。
**场景**: 需要测试 DOM 交互、样式计算时。

---

### Rust/Tauri 侧

#### 21. `moka`（Rust）

**作用**: 高性能并发缓存库。
**优点**: 类似 Java Caffeine，支持 TTL/TI、LRU/LFU 淘汰、同步/异步。
**场景**: 缓存数据库查询结果、API 响应、计算密集操作结果。
**安装**: `moka = { version = "0.12", features = ["sync", "future"] }`

#### 22. `reqwest`（Rust）

**作用**: Rust 最流行的 HTTP 客户端。
**优点**: 支持 HTTPS、代理、连接池、超时、重定向等。
**场景**: 如果你的 Tauri 后端需要调用外部 API。
**安装**: `reqwest = { version = "0.12", default-features = false, features = ["rustls-tls", "json"] }`

#### 23. `jiff`（Rust）

**作用**: 新一代日期时间库，Chrono 的现代替代。
**优点**: 时区支持更完整、API 更合理、Jiff 比 Chrono 快 3-6 倍。
**缺点**: 相对较新（2024 年发布），生态积累不如 Chrono。
**场景**: 如果项目有时区处理需求，或者想用更现代的日期库。

#### 24. `rayon`（Rust）

**作用**: 数据并行计算库。
**优点**: 一行代码把迭代器变成并行：`.par_iter()`。
**场景**: 批量数据处理、文件解析、CPU 密集型计算。

#### 25. `parking_lot`（Rust）

**作用**: 比标准库更快的同步原语（Mutex、RwLock 等）。
**优点**: 更小、更快、无中毒（poisoning）。
**场景**: 高并发场景的性能优化。

#### 26. `config`（Rust）

**作用**: 分层配置管理库。
**优点**: 合并多个配置源（文件、环境变量、默认值），支持 JSON/TOML/YAML。
**场景**: 应用的配置管理（已有 `tauri-plugin-store` 做前端配置，这个是 Rust 侧的）。

#### 27. `rustc-hash`（Rust）

**作用**: 更快的 HashMap（使用 FxHash）。
**优点**: 比标准 HashMap 快 20-30%，适合键不是用户输入的场景。
**场景**: 任何频繁使用 HashMap 的地方。

#### 28. `opentelemetry`（Rust）

**作用**: 分布式追踪和可观测性标准。
**优点**: 可导出到 Jaeger、Prometheus 等。
**场景**: 如果将来需要监控应用性能。

#### 29. `indoc`（Rust）

**作用**: 缩进友好的字符串字面量宏。
**优点**: 写 SQL 和多行字符串时保持缩进对齐。
**场景**: 写原生 SQL 查询时体验提升明显。

#### 30. `test-case`（Rust, dev）

**作用**: 参数化测试。
**优点**: 一个宏定义多个测试用例，减少重复代码。
**场景**: 替代手写 for 循环测试。

---

## 📊 优先级总结

| 优先级 | 前端 | Rust |
|--------|------|------|
| 🔴 立即 | zod, react-hook-form, motion, react-hotkeys-hook | tracing + tracing-subscriber |
| 🟡 建议 | tanstack/router, zundo, @xyflow/react, tanstack/table | moka, reqwest |
| 🟢 按需 | valibot, ts-pattern, i18next, sentry, etc. | jiff, rayon, parking_lot, config, etc. |

---

## ⚡ 一次性安装命令（Tier 1）

```bash
# 前端
bun add zod @hookform/resolvers react-hook-form motion react-hotkeys-hook

# Rust — 在 workspace Cargo.toml 的 [workspace.dependencies] 添加：
# tracing = "0.1"
# tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
# tracing-log = "0.2"
```

---

## 💬 Q&A 补充：常见替代方案对比

### 🔥 Q1: react-hook-form vs TanStack Form — 深度对比

> 看完这部分你应该能闭眼选。

---

#### 一、先看同一个表单，两边怎么写

**场景**：一个注册表单，有邮箱 + 密码 + 确认密码，邮箱要异步查重。

**RHF 写法**：

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('邮箱格式不对'),
  password: z.string().min(6, '至少6位'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: '两次密码不一致',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

function SignupForm() {
  const { register, handleSubmit, formState: { errors }, setError } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // 邮箱查重 —— 需要自己处理异步校验
  const checkEmail = async (email: string) => {
    const exists = await api.checkEmail(email)
    if (exists) setError('email', { message: '邮箱已被注册' })
  }

  return (
    <form onSubmit={handleSubmit(data => console.log(data))}>
      <input {...register('email')} onBlur={e => checkEmail(e.target.value)} />
      {errors.email && <span>{errors.email.message}</span>}

      <input type="password" {...register('password')} />
      {errors.password && <span>{errors.password.message}</span>}

      <input type="password" {...register('confirmPassword')} />
      {errors.confirmPassword && <span>{errors.confirmPassword.message}</span>}

      <button type="submit">注册</button>
    </form>
  )
}
```

核心味道：`register('xxx')` 把 ref 注入 DOM，**表单值存在 DOM 里不是 React state 里**，只在提交或 watch 时才读到值。

---

**TanStack Form 写法**：

```tsx
import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('邮箱格式不对'),
  password: z.string().min(6, '至少6位'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: '两次密码不一致',
  path: ['confirmPassword'],
})

function SignupForm() {
  const form = useForm({
    defaultValues: { email: '', password: '', confirmPassword: '' },
    validatorAdapter: zodValidator(),
    onSubmit: ({ value }) => console.log(value),
  })

  return (
    <form onSubmit={e => { e.preventDefault(); form.handleSubmit() }}>
      {/* 每个字段必须用 form.Field 组件包裹 */}
      <form.Field
        name="email"
        validators={{
          onChange: schema.shape.email,
          // 异步校验 —— 内置 debounce
          onBlurAsync: zodValidator(),
          onBlurAsyncDebounceMs: 300,
        }}
        asyncDebounceMs={300}
        // 邮箱查重，内置异步校验
        onBlur={async ({ value }) => {
          const exists = await api.checkEmail(value)
          if (exists) return '邮箱已被注册'
        }}
      >
        {field => (
          <>
            <input
              name={field.name}
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.map(e => <span key={e}>{e}</span>)}
          </>
        )}
      </form.Field>

      <form.Field
        name="password"
        validators={{ onChange: schema.shape.password }}
      >
        {field => (
          <>
            <input
              type="password"
              name={field.name}
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
            />
            {field.state.meta.errors.map(e => <span key={e}>{e}</span>)}
          </>
        )}
      </form.Field>

      {/* confirmPassword 同理，省略... */}

      <form.Subscribe selector={s => s.canSubmit}>
        {canSubmit => <button disabled={!canSubmit} type="submit">注册</button>}
      </form.Subscribe>
    </form>
  )
}
```

核心味道：所有值是 React state（受控），每个字段被 `<form.Field>` 包裹，校验逻辑可以直接写在字段定义里。

---

#### 二、读代码的第一感受

| 感受 | RHF | TanStack Form |
|------|-----|--------------|
| 代码量 | 少，一个 `register()` 就管一个 input | 多，每个字段要用 `<form.Field>` + render props 包起来 |
| 心智模型 | 简单："表单值在 DOM 里，我不管它" | 复杂："表单值在 state 里，每次按键都在更新 state" |
| 校验位置 | 统一一个 Zod schema，和 UI 分离 | 可以在 schema 里，也可以直接写在 `<form.Field>` 上 |
| 异步校验 | 要自己写 `onBlur` + `setError` | 内置 `onBlur` 异步校验 + 自动 debounce |
| 按钮禁用 | `formState.isSubmitting` | `<form.Subscribe>` 订阅 |

简单说：RHF 像开手动挡（油门变速箱你都要知道），TanStack Form 像开自动挡（我帮你管）。

---

#### 三、核心哲学差异：值的家在哪

这是理解两库区别最关键的一点：

```
┌─────────────────────────────────────────┐
│              React Hook Form             │
│                                          │
│   input 的值 → 住在 DOM 里面（非受控）     │
│                                          │
│   register('email') 做的事：              │
│   1. 给 <input> 绑 ref                   │
│   2. 在提交时，从 DOM 读取所有值            │
│   3. 中间不会触发 React 重渲染             │
│                                          │
│   → 性能好，因为输入一个字不会重渲染整个树   │
│   → 但你不能随时读到值（除非 watch）        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│            TanStack Form                 │
│                                          │
│   input 的值 → 住在 React state 里（受控） │
│                                          │
│   <form.Field> 做的事：                    │
│   1. 用 useState 存字段值                  │
│   2. 每次 onChange 都 setState             │
│   3. 通过订阅机制精确控制，只重渲染该字段     │
│                                          │
│   → 值随时可读（field.state.value）         │
│   → 但每次按键都更新 state                 │
│   → 靠内部订阅优化来避免整体重渲染           │
└─────────────────────────────────────────┘
```

**一句话**：RHF 用 DOM 当状态仓库，TanStack Form 用 React state 当状态仓库。

---

#### 四、不同的"爽"时刻

**RHF 让你爽的场景**：

| 场景 | 为什么爽 |
|------|---------|
| 3-5 个字段的简单表单 | `register()` 一行一个 input，代码量最少 |
| 不需要实时反馈的表单 | 反正提交时才读值，中间重渲染为 0 |
| 和 UI 库配合 | 大多数 UI 库（Radix、Ant Design）都有 RHF 集成 |
| 已有 Zod schema | 扔给 `zodResolver` 就结束了 |
| 团队有人会 | 43K stars，网上搜一下全是答案 |

**TanStack Form 让你爽的场景**：

| 场景 | 为什么爽 |
|------|---------|
| 字段需要实时联动 | 一个字段改了，另一个字段的计算结果立即可读 |
| 多步骤向导表单 | `field.state.value` 随时可读，不做 watch |
| 动态增减字段 | 数组字段的增删改类型安全 |
| 复杂异步校验链 | 内置 debounce + 自动 abort 上一次请求 |
| 和 TanStack Query 联用 | 表单的异步默认值直接从 query cache 取 |

---

#### 五、不同的"痛"时刻 🔴

**RHF 让你痛苦的场景**：

```tsx
// 😤 场景1：想做"密码强度实时反馈"，RHF 必须 watch
const password = watch('password')
// watch 会导致每次按键都重渲染当前组件！
// 解决方案：用 useWatch 或者拆子组件 —— 但这都是绕路

// 😤 场景2：动态表单字段（如"添加成员"按钮动态增加一行）
const { fields, append, remove } = useFieldArray({ control, name: 'members' })
// API 能工作，但类型推导经常断，动态校验也麻烦

// 😤 场景3：想在不同组件里分别控制一个大表单的不同字段
// 需要 useFormContext + 小心拆分，不然 watch 会拖垮性能
```

**TanStack Form 让你痛苦的场景**：

```tsx
// 😤 场景1：就两个字段的登录表单，也要写这么多模板
<form.Field name="username">
  {field => (
    <input value={field.state.value} onChange={e => field.handleChange(e.target.value)} />
  )}
</form.Field>
// 每个字段都要 render props 包一层，代码量是 RHF 的 3 倍

// 😤 场景2：跟不熟悉的 UI 库配合 —— 没有现成的集成
// RHF 的 Controller 组件几乎所有 UI 库都有适配，TanStack Form 还没有

// 😤 场景3：v1 版本，API 可能还会变，踩坑的博客几乎没有
// 搜问题基本只能看 GitHub issues 和 Discord
```

---

#### 六、StoneFlow 到底用哪个？

先看 StoneFlow 可能遇到的表单类型：

| 表单类型 | 复杂度 | 举例 |
|---------|--------|------|
| 创建项目/空间 | ⭐ 简单 | 名字 + 描述 + 图标，3 个字段 |
| 设置面板 | ⭐⭐ 中等 | 各种开关和输入框，每个独立无联动 |
| 节点属性编辑 | ⭐⭐ 中等 | 节点名、参数、备注，可能有 JSON 编辑 |
| 流程模板配置 | ⭐⭐⭐ 复杂 | 动态表单、条件显示、字段联动 |

StoneFlow 的表单以**简单/中等为主**，复杂动态表单不多。

在这个前提下：

```
                   简单表单     中等表单     复杂表单     动态字段
RHF                ⭐⭐⭐       ⭐⭐⭐        ⭐⭐         ⭐
TanStack Form      ⭐          ⭐⭐         ⭐⭐⭐       ⭐⭐⭐

RHF 胜在：简单场景代码少、生态好、踩坑成本低
TanStack Form 胜在：复杂场景类型安全、字段联动便捷
```

---

#### 七、我的推荐

**现阶段选 RHF**，理由很实际：

1. StoneFlow 的表单大多是设置、配置、属性编辑 —— 字段少，不联动，RHF 代码量少一半
2. RHF 有 43K stars 的社区，你遇到任何问题都能搜到答案
3. 以后如果某个功能确实需要 TanStack Form 的复杂表单能力（如动态字段、复杂的异步校验链），**两个库可以并存** —— 简单表单用 RHF，那个复杂表单用 TanStack Form，它们不冲突

**什么时候值得换 TanStack Form**：

- 出现了大量动态字段场景（如"添加 N 个步骤，每个步骤有不同配置"）
- 表单之间需要复杂的实时联动（改了 A 自动计算 B、C、D）
- 或者你只是单纯想统一 TanStack 全家桶（Router + Query + Form），并且愿意接受多写一些模板代码

> 💡 **一个关键区别记忆法**：
> - RHF = "提交时才读值，中间不管" → 写起来快，简单表单的天花板
> - TanStack Form = "每次按键都是 state" → 值随时可用，复杂表单的天花板
> 
> 你的表单以 3-5 个字段为主 → RHF。你的表单有动态生成、字段联动 → TanStack Form。

---

### Q2: i18n 能不能用 Paraglide？和 i18next 比怎么样？

**能用，而且很推荐。**

| 维度 | Paraglide JS | i18next + react-i18next |
|------|-------------|------------------------|
| **架构** | 编译器（编译时生成函数） | 运行时（加载 JSON） |
| **类型安全** | ✅ 天生（翻译 key 就是 TS 函数名） | ⚠️ 需要手动配置类型补丁 |
| **Tree-shaking** | ✅ 只打包用到的消息 | ❌ 整个 JSON 打包 |
| **包体积** | ~2KB（翻译变函数后极轻） | ~40KB+（运行时 + JSON） |
| **使用方式** | 直接 `import { m } from '@/paraglide/messages'` | 必须 `useTranslation()` hook |
| **非组件中使用** | ✅ 直接 import，无限制 | ❌ 必须在 hook 内，否则要 hack |
| **IDE 自动补全** | ✅ 函数名 + 参数全补全 | ⚠️ 仅 key 补全，需要额外配置 |
| **SSR 支持** | ✅ 内置，无 locale 泄漏 | ⚠️ 需要中间件防 locale 泄漏 |
| **本地化路由** | ✅ 内置 | ❌ 不支持 |
| **多租户** | ✅ 内置 | ❌ 不支持 |
| **懒加载语言包** | 🧪 实验性（20+ 语言时可能需要） | ✅ HTTP backend |
| **生态成熟度** | 较新，文档分散在多站 | 极成熟，社区庞大 |
| **生成文件** | 会生成 `src/paraglide/` + `project.inlang/` 目录 | 只需 JSON 文件 |

**结论**:

- **选 Paraglide**：新项目、用 TanStack 生态、对类型安全和包体积敏感、非组件中也要用翻译。
- **选 i18next**：已有大量翻译文件、需要懒加载数十种语言、团队对 i18next 高度熟悉。

对 StoneFlow 来说，Paraglide 是更好的选择 —— 它是 TanStack Router 官方推荐的 i18n 方案，而且桌面应用的包体积优化也会受益。

---

### Q3: react-hotkeys-hook 和 zundo 有什么区别？

**这两个是完全不同的东西，各司其职，不互斥。**

| | react-hotkeys-hook | zundo |
|------|-------------------|-------|
| **作用** | 键盘快捷键管理 | 撤销/重做（Undo/Redo） |
| **解决的问题** | 监听键盘事件、定义快捷键组合、作用域隔离 | 追踪状态变更历史、提供撤销/重做能力 |
| **典型用法** | `useHotkeys('ctrl+s', save)` | `const store = create(zundo(storeCreator))` |
| **目标用户** | 所有需要快捷键的地方 | 编辑类功能（节点编辑器、配置修改等） |
| **依赖关系** | 独立，无框架依赖 | 依赖 Zustand |
| **可以一起用吗** | ✅ 完全可以，且互补 | ✅ 完全可以，且互补 |

**形象理解**:
- `react-hotkeys-hook` = 你按下 Ctrl+Z 时**触发**撤销
- `zundo` = Ctrl+Z 触发后**真正执行**撤销，回滚状态

所以它们不是二选一，需要两个都装 —— hotkeys 负责"听到"快捷键，zundo 负责"执行"撤销重做。

---

*生成时间: 2026-06-16 | 基于 StoneFlow 项目 `package.json` + `Cargo.toml` 分析*
