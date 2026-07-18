# M-F-COMMAND · features/command

> 日期：2026-07-17 · **落地对照更新 2026-07-19**
> 状态：**archived-decision（C3 半落地；余债见 [12 执行计划](../12-平台与Domain扩散重构执行计划.md)）**
> 路径：`src/features/command` + 装配 `layout/command-bridge` · `layout/model/useShellCommandSystem`
> **日常契约：** [`src/features/command/ARCHITECTURE.md`](../../../src/features/command/ARCHITECTURE.md)
> 类型：**platform**

---

## 0. 落地对照（2026-07-19）

| 卡上目标（C3） | 现网 | 说明 |
|----------------|------|------|
| 域 `register*Commands` 贡献 handlers | **done** | task/project/lifecycle/filter/submit |
| layout 不写 domain mutation | **大致 done** | bridge 只 chrome + compose；Host 仍厚 |
| CommandMenu 巨石拆分 | **done** | 主文件 ~196 + 分段 |
| Host 极薄（只 Context + 挂 UI） | **进行中** | Host ~200 已内拆；仍可再瘦 · 计划 C3 后复看 |
| 缩/淘汰 adapter 必填上帝表 | **未完** | `ShellCommandActions` + compose 必填 · 计划 C3 |
| ARCHITECTURE 定稿 + public/TSDoc | **done** | C0/C1 |
| Host 内拆（打开/Context/项目列表） | **done** | C2 |
| 禁 command → layout | **done** | 应保持 0 |

**改码请读：** `src/features/command/ARCHITECTURE.md` + `src/CONVENTIONS.md`。
与 src 冲突时：**以 src 为准**，并回写本节。

---

## A. 它现在是什么（事实，非目标）

### 心智（现网）

```txt
commands/* 定义命令元数据（很多 run 仍是 disabled 占位）
    +
layout/command-bridge/slices/* 实现 ShellCommandActions（~34 个方法）
    →
adapters/bindShellCommand 把 id 绑到 adapter 方法
    →
CommandRuntime + ShortcutLayer + CommandMenu
```

| 夹 | 职责 |
|----|------|
| `core` | Registry / Runtime / Context 类型 / 可见性 |
| `commands` | 产品命令定义列表 |
| `keybinding` | 默认快捷键与匹配 |
| `shortcuts` | 键盘层 / chord |
| `adapters` | `ShellCommandActions` 类型 + bind |
| `runtime` | React hooks |
| `components` | Menu / Help / Hint（**CommandMenu ~1541 行**） |

**问题本质：**
命令的「是什么」（id/标题/scope）在 command feature，**「怎么执行」大半在 layout Bridge** → 壳成为业务适配上帝，**加任务命令要改 layout**，违反纯化与可删除性。

---

## B. 边界争议

| 候选 | 现在 | 争议 | 目标倾向 |
|------|------|------|----------|
| **ShellCommandActions 巨接口** | adapters + layout 实现 | 中心化方便 vs 上帝对象 | **拆掉/缩小**；按域注册 handler |
| **command-bridge slices** | layout | 算壳还是业务？ | **迁出**：domain/platform 自带 handler |
| **commands/*.ts 里 disabled 占位** | command | 定义与实现分离过远 | 定义可集中或随域；**run 与域同处** |
| **bindShellCommand 大 switch** | adapters | 每加命令改 switch | 注册表 `id → handler` |
| **useShellCommandSystem** | layout ~492 行 | 宿主胶水过重 | **极薄宿主**：只组 Context + 挂 UI |
| **CommandMenu 巨石** | command/components | UI 体量 | **拆文件**；逻辑进 model |
| **导航类命令** | navigateTo in actions | 该走 navigation | handler 内只调 **intent/path** |
| **提交/筛选/预览命令** | bridge slices | 跨 platform | **submit/filter/task 各自注册** |
| **keybinding 默认表** | command | 可否域声明快捷键 | 可保留中心默认表 + 域覆盖（后） |
| **public 面过宽** | index 导出大量 keybinding 细节 | 膨胀 | **收窄**：runtime/UI/注册 API 优先 |

### 该进 command 的

- 注册表、运行时、快捷键匹配、命令菜单/帮助 UI、CommandContext **形状**
- **注册协议**（如何 registerHandlers）
- 与壳无关的纯命令查询（可见性排序）

### 不该进 command 的

- 具体「完成任务 / 归档」的业务 mutation（→ task 等）
- 拼 URL 规则（→ navigation）
- 侧栏 DOM（→ layout chrome）

---

## C. 多方案对比

### 方案 C1 · 巩固现网 Bridge

保持 `ShellCommandActions` 全量 + layout slices compose + bind switch。

| 优点 | 缺点 |
|------|------|
| 零迁移；已跑通 | layout 永不瘦；加命令双处改 |
| 类型一处收齐 | 与 T2/纯化冲突 |
| | Command 可删除性差 |

**结论：** 过渡可暂存，**不作长期目标**。

---

### 方案 C2 · 按域拆多个 Adapter 接口（半吊子）

`TaskCommandActions` / `NavCommandActions` / … 仍由 layout 实现，只是拆类型。

| 优点 | 缺点 |
|------|------|
| 比巨接口清晰一点 | **实现仍在 layout** |
| 迁移成本中 | 未解决高内聚 |

**结论：** 最多作 C3 的迁移台阶，不是终点。

---

### 方案 C3 · Feature 注册 Handler（**推荐 · 对齐 T2**）

```txt
command feature:
  - 定义 Command 元数据（id, title, scope, when）
  - CommandRegistry + Runtime
  - registerCommandHandlers(partial) / createAppCommandRegistry(handlers)
  - Menu / Shortcut UI 只依赖 Runtime

domain/platform features (task, project, submit, filter, …):
  - export registerXxxCommands(ctx) 或 handlers 表
  - 内部调自己的 hooks/api/public

layout (壳宿主):
  - 提供 CommandHostContext: scope, route, selection, dialog openers…
  - 启动时 compose: baseRegistry + task.register(ctx) + …
  - 挂载 Menu / ShortcutLayer
  - **无** bulkSlice/taskMetaSlice 业务文件
```

| 优点 | 缺点 |
|------|------|
| 真正高内聚：任务命令改 task | 迁移面大（~34 actions + bind switch） |
| 卸 feature = 不 register | 要设计稳定 `CommandHostContext` |
| layout 可删业务知识 | 注册时机（mount 顺序）要纪律 |
| 与六边形一致：command=平台总线 | 初期类型从「一个大接口」变「组合」 |

**成本：** 高；可 **task + navigation 试点** 再铺开。
**结论：长期唯一推荐。**

---

### 方案 C4 · 完全动态字符串插件（过激）

无静态 COMMAND_IDS，全运行时字符串插件。

| 优点 | 缺点 |
|------|------|
| 极活 | 丢失类型与可检索性 |
| | 快捷键/帮助难静态分析 |

**结论：** 否。保留 **已知 id 常量 + 注册 handler**。

---

## D. 推荐方案（最优）= **C3**

### D.1 目标模块边界

| 层 | command feature | 其他 feature | layout |
|----|-----------------|--------------|--------|
| 元数据与 id | ✅ `COMMAND_IDS` + 定义 | 可贡献定义或共用 ids | ❌ |
| run/handler | 仅壳级（开菜单/帮助） | ✅ 本域命令 | ❌ 业务 |
| Runtime/Registry | ✅ | 注册进 registry | 创建 host 时 compose |
| Keybinding | ✅ 默认表 | 可选声明 | ❌ |
| Menu UI | ✅（拆瘦） | ❌ | 只挂载 |
| 换页 | handler 调 navigation | 同左 | 提供 goBack 等 host 能力 |

### D.2 目标协作流

```txt
[layout CommandHost]
  ctx = { scope, shellRoute, selection, openCreateTask, … }  // 只读+宿主能力
  registry = createRegistry([
    ...shellChromeCommands,      // 开菜单、帮助、toggleSidebar → host
    ...taskCommandModule(ctx),   // task public
    ...projectCommandModule(ctx),
    ...submitCommandModule(ctx),
    ...navCommandModule(ctx),    // 内部只 intent
  ])
  → useCommandRuntime(registry)
  → <CommandShortcutLayer /> <CommandMenu />

[用户快捷键/菜单]
  → runtime.run(id)
  → handler（在 task 等模块闭包内）
  → mutation / intent.navigate
```

### D.3 与 navigation / routes / layout

| 模块 | 协作 |
|------|------|
| **navigation** | 任何换页命令 **只** path-only intent；open 策略在 task |
| **routes** | 不执行命令；URL 变后 context 更新，命令 when() 重算 |
| **layout** | Host + 挂载；**不**实现 completeTask |
| **selection/submit/filter/bulk/preview** | 各自注册或被 task 编排调用 public |
| **entity-detail** | 打开抽屉走其 public / URL search |

### D.4 public 收窄（目标）

**宜导出：** Runtime hooks、ShortcutLayer、CommandMenu/Help、Registry 工厂、注册类型、`COMMAND_IDS`、Context 类型。
**慎导出 / 内收：** 全部 keybinding 底层工具、adapter 巨接口（随 C3 删除）。
**禁止：** 外模块深路径 core/commands。

---

## E. 最佳实践（command 专用）

**Do**

- 命令 = 元数据 + when + handler；handler 与领域同模块
- Context 只读快照；副作用在 handler
- 换页走 navigation；写数据走 feature mutation
- Menu 纯展示 Runtime 可见列表
- 单测：core 纯函数；handler 单测在 domain；Menu 测展示

**Don't**

- layout 增加业务 slice 方法
- bind 大 switch 无限变长
- Menu 内直接 invoke
- 用 Query 存「当前命令」
- 为省事在 command feature 写 task 完成逻辑

---

## F. 体量与拆分（现网债 · 改代码时）

| 文件 | ~行 | 动作 |
|------|-----|------|
| CommandMenu.tsx | **1541** | P0 拆：list / groups / pickers / keyboard nav |
| shell-command-adapter.ts | 424 | 随 C3 **删除 bind 上帝** 或缩成壳级 5 个动作 |
| useShellCommandSystem | 492 | 缩成 Host；逻辑回 feature |
| command-bridge/slices/* | 多文件 | **删除业务片**；nav/create 等变 register |
| default-keybindings | 357 | 可按域拆文件，非必须 |
| task.commands 等 disabled | — | 与 handler 合并到 task 模块 |

---

## G. 迁移刀序（先谈后写 · 到 govern 时用）

| 序 | 刀 | 说明 |
|----|-----|------|
| 1 | 定义 `CommandHostContext` + `registerHandlers` API | 只加能力，不删 Bridge |
| 2 | **task** 试点：complete/archive/… 注册 | layout 对应 slice 变薄转发或删除 |
| 3 | nav / create / submit / filter 片外迁 | |
| 4 | 删除 `ShellCommandActions` 巨接口与 compose 校验表 | |
| 5 | 拆 CommandMenu 巨石 | 可与 2–4 并行 |
| 6 | 收窄 public export | |

每刀：`bun run check` + 命令板/快捷键冒烟。

---

## H. 多方案小结表

| 方案 | 长期？ | 与 T2 | 推荐 |
|------|--------|-------|------|
| C1 Bridge 巩固 | 否 | 冲突 | 过渡 only |
| C2 多 Adapter 仍 layout 实现 | 弱 | 半吊子 | 可选台阶 |
| **C3 Feature 注册** | **是** | **对齐** | **✅ 最优** |
| C4 全动态无类型 | 否 | 过激 | ❌ |

---

## I. 决议

| # | 决议 |
|---|------|
| 1 | 长期目标 **C3 注册式**；C1 不作为终点 |
| 2 | command = **平台总线 + UI**；业务 handler 在各 feature |
| 3 | layout = **CommandHost** 极薄；删除业务 bridge 为实现终点 |
| 4 | 换页命令只碰 navigation path-only |
| 5 | CommandMenu **已拆**（主文件薄壳 + 分段；余量见执行计划 C4） |
| 6 | public 随 C3 **收窄**（C1 已按外消费者收口） |
| 7 | 边界决议归档；实现债刀序见 [12-平台与Domain扩散重构执行计划](../12-平台与Domain扩散重构执行计划.md) |

### 开放问题

- [x] CommandMenu 巨石：已拆（对照 §0）
- [ ] HostContext 最小字段集（是否含 dialog openers / 仅 callback ports）· C2
- [ ] 缩 adapter 必填表 · C3
- [x] 行级快捷键与全局 command：可继续独立 scope，handlers 与命令板同源（task 样板已证）

**建议默认：** 元数据可暂留 `features/command/commands`；**handler 必须与域同处**。

---

## J. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：边界争议、C1–C4、推荐 C3、协作、拆分与迁移刀序 |
| 2026-07-19 | archived-decision：§0 落地对照；链 ARCHITECTURE + 12 计划；C0/C1 启动 |
