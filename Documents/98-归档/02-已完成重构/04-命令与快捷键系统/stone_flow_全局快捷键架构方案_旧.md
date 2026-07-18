# StoneFlow 全局快捷键架构方案（已废弃）

> 阶段 14 后本文仅供历史追溯。当前命令与快捷键系统事实以 `Docs/重构方案/命令与快捷键系统/StoneFlow 命令与快捷键系统执行计划.md`、v2 使用指南、v2 技术方案、最终迁移审计和 `src/features/command/ARCHITECTURE.md` 为准。

## 0. 文档定位

这份文档用于定义 StoneFlow 当前阶段的快捷键体系方案。

它主要回答：

- StoneFlow 的快捷键应该如何分层；
- 哪些属于系统级，哪些属于应用内；
- 哪些属于第一阶段，哪些要留到第二、第三阶段；
- 在当前 `feature-first + shared` 架构里，这套能力应该如何模块化、组件化；
- 如何在保证 `KISS / DRY` 的前提下，避免快捷键逻辑散落到 `Header / Command / Row / Dropdown` 各处。

这份文档不直接定义实现代码，但会给出明确的模块边界、状态机范围和阶段计划。

---

## 1. 当前背景

根据当前仓库和既有文档，StoneFlow 现在已经有三条相关链路：

1. **系统级入口**
   - `Option+Space`
   - 由独立 `Helper` 进程注册全局快捷键
   - 目标是应用外唤起 `Quick Create`

2. **应用内搜索入口**
   - `/`
   - 已经明确与 `Command` 分离
   - 语义是“搜索已有任务 / 项目”，不是动作入口

3. **应用内动作入口**
   - `Header` 当前已有局部的 `c` 新建任务实现
   - `Cmd/Ctrl+K` 已经适合作为 `Command`
   - row 内 priority / status 已经有稳定的 `Cell + Dropdown` 基建

当前问题不是“有没有快捷键”，而是：

- 快捷键能力仍然零散分布；
- `Header`、`Search`、`Row`、`Dropdown` 还没有统一调度；
- 后续如果继续在各组件里直接加 `window.addEventListener('keydown')`，会快速进入冲突、重复、难维护状态。

因此，这一轮正确做法不是继续加散装监听，而是先把整体架构和阶段计划定下来。

---

## 2. 本轮已确认的产品决策

以下内容视为当前锁定：

### 2.1 系统级入口不改

- 保留 `Option+Space`
- 仍由 `Helper + 全局快捷键` 承接
- 当前不把它扩展成搜索、跳转或 row action

### 2.2 第一阶段的创建动作采用折中方案

- `c`：创建 task
- `v`：全屏创建 task
- `n p`：创建项目

说明：

- 这里不改成更重的 `n t / n v / n p` 全前缀体系；
- 也不把所有创建动作都强行塞进 `Command`；
- 这是在 Linear 风格和当前实现复杂度之间的折中。

### 2.3 前缀键不止 `n`，还包括 `g` 和未来的 `o`

前缀分三类：

- `n`：new / 创建类
- `g`：goto / 前往类
- `o`：open / 打开类

阶段划分：

- 第一阶段先做 `n` 和 `g`
- 第二阶段重构 `cmdk`
- 第三阶段再做 `o`

### 2.4 row 上下文快捷键先不做

以下能力先明确保留，但不放进第一阶段：

- `p`：打开 priority dropdown
- `s`：打开 status dropdown

这两类动作属于局部上下文动作，当前先延后到第三阶段。

它们未来仍然必须遵守：

- 只能在 row 局部上下文里生效；
- 不能做成全局裸键；
- 不能在输入态或无目标 row 时抢键。

### 2.5 菜单数字提示分两种规则

不是所有菜单都一律 `12345`。

规则固定为两类：

1. **没有空态 / 没有“无值”选项的菜单**
   - 一律从 `1` 开始
   - 例如：status

2. **存在空态 / 无值态的菜单**
   - 一律从 `0` 开始
   - 例如：priority（有“无优先级”）
   - 例如：project（有“无项目”）
   - 例如：时间类（有“无时间”）

说明：

- 这里显示的是**当前菜单顺序位**
- 不是数据库内部枚举值
- 但起始位由“是否存在空态”决定

### 2.6 当前按三步推进

当前阶段规划固定为三步：

1. **第一步**
   - 做全局主链路
   - 重点是 `c / v / n / g`
   - 这一步不做 `p / s`

2. **第二步**
   - 重构当前 `cmdk` 命令弹窗
   - 把 `Command` 收口成稳定主入口

3. **第三步**
   - 做 `o` 组
   - 做 `p / s`
   - 做 priority / status / project / time 等上下文菜单快捷键

---

## 3. 核心判断

## 3.1 不能把所有快捷键都做成系统级全局快捷键

原因：

1. `c / v / p / s / 0~5` 这类键天然和输入冲突；
2. 中文输入法组合态误触风险很高；
3. row / dropdown 动作本质依赖前端 UI 上下文，Rust / Tauri 不适合管理；
4. 真正需要应用外可用的，当前只有 `Option+Space`。

因此 StoneFlow 的快捷键体系必须严格分层。

## 3.2 也不能继续散装监听

如果继续让：

- `Header` 自己监听 `c`
- `Search` 自己监听 `/`
- `Command` 自己监听一套快捷键
- `Dropdown` 自己再监听 `0~5`

最终会出现：

- 同一个键被多个层级抢占；
- modal / dialog / dropdown 打开时底层页面还在响应；
- 文案显示和真实绑定不一致；
- 很难统一测试。

因此必须建立统一调度层。

## 3.3 但也不应该一上来做“用户可配置的超级快捷键平台”

这会明显过度设计。

本轮真正需要的，只是一套：

- 中央调度；
- 最小前缀状态机；
- 局部上下文挂载点；
- 一致的显示协议。

不需要：

- 用户自定义快捷键系统；
- 可视化冲突编辑器；
- 插件化热插拔快捷键平台。

---

## 4. 推荐总体架构

推荐采用：

```txt
系统级快捷键层
└── Helper / Global Shortcut
    └── Option+Space

应用内快捷键层
└── ShortcutManager
    ├── 全局动作注册表
    ├── 前缀序列状态机
    ├── 上下文目标解析器
    └── 显示文案格式化

局部上下文层
├── ShellHeader shortcut actions
├── Command shortcut actions
├── TaskRow shortcut scope
└── Dropdown digit selection
```

核心原则：

1. **系统级与应用内严格分层**
2. **全局调度与局部执行分层**
3. **显示协议与行为协议分层**
4. **阶段化实现，不一次性把三阶段全做完**

---

## 5. 模块边界

为了符合 `T1` 已经确定的 `feature-first + shared` 边界，本轮建议按下面方式拆分。

## 5.1 shared 层：纯协议与无业务工具

位置建议：

```txt
src/shared/shortcuts/
├── types.ts
├── guards.ts
├── format.ts
├── sequences.ts
└── index.ts
```

职责：

- 定义快捷键数据结构；
- 定义是否忽略输入态的通用 guard；
- 定义 `C / V / N P / G I / 0 1 2 3 4 / 1 2 3 4 5` 的显示格式；
- 定义最小前缀匹配工具。

不负责：

- 不直接打开 dialog；
- 不直接操作 row；
- 不直接读 Zustand 业务状态。

说明：

- 这一层必须保持纯；
- 它是 DRY 的来源，但不能把业务动作也抽进来。

## 5.2 app 层：统一调度与全局注册

位置建议：

```txt
src/app/shortcuts/
├── ShortcutManager.tsx
├── useShortcutManager.ts
├── shortcutRegistry.ts
├── shortcutScopes.ts
└── shortcutDisplay.ts
```

职责：

- 监听应用内键盘事件；
- 调度全局快捷键；
- 维护前缀等待态；
- 按优先级分发给局部上下文；
- 提供统一的注册入口。

不负责：

- 不持有 task/project 业务数据；
- 不定义 row 的视觉；
- 不直接渲染 dropdown。

说明：

- 这是整套方案的中枢；
- 但它本身必须保持很薄，只做调度，不做业务实现。

## 5.3 shell 层：第一阶段全局主入口

位置建议：

```txt
src/app/layouts/shell/shortcuts/
├── shellShortcutBindings.ts
└── shellShortcutActions.ts
```

第一阶段职责：

- 注册 `c`
- 注册 `v`
- 注册 `n p`
- 注册 `g *`
- 注册 `Cmd/Ctrl+K`
- 注册 `/`

动作类型包括：

- 打开 task create
- 打开全屏 task create
- 打开 project create
- 打开 command
- 聚焦搜索
- 导航到目标页面

## 5.4 command 层：第二阶段收口

位置建议：

```txt
src/features/command/
├── model/
├── shortcuts/
└── ui/
```

职责：

- 承接第二阶段的 `cmdk` 重构；
- 让命令弹窗成为快捷键体系里稳定的一层；
- 为第三阶段 `o` 组挂载提供清晰边界。

说明：

- 第二阶段之后，`Command` 不再只是一个能打开的 dialog；
- 它需要成为全局动作分发和 discoverability 的稳定入口。

## 5.5 task / row 层：第三阶段上下文动作

位置建议：

```txt
src/features/task/shortcuts/
├── taskRowShortcutScope.tsx
├── useTaskRowShortcutTarget.ts
└── taskRowShortcutBindings.ts
```

职责：

- 维护“当前哪个 row 可接收 `p / s`”
- 维护“当前 dropdown 是否已经打开”
- 提供 `openPriorityMenu` / `openStatusMenu`

说明：

- 这层明确属于第三阶段；
- 第一阶段先不实现，只保留架构位置。

## 5.6 dropdown digit selection：共享小工具

建议位置：

```txt
src/shared/ui/shortcut-menu/
├── ShortcutMenuItemHint.tsx
└── useShortcutDigitSelect.ts
```

职责：

- 菜单项右侧渲染数字提示；
- 菜单已打开时接管 `0~5` 或 `1~5` 的数字选择；
- 根据“是否存在空态”决定起始位。

说明：

- 本轮不建议把它升级成独立 feature；
- 它是一个共享 UI 小工具，不是业务域。

---

## 6. 为什么这样拆分符合 KISS / DRY

## 6.1 KISS

本方案没有做：

- 用户自定义快捷键系统；
- 多层级快捷键树编辑器；
- 所有 feature 都可动态注入的插件平台；
- Rust / 前端双向同步的复杂注册中心。

本方案只做：

- 一个应用内统一调度器；
- `n / g` 两组最小前缀能力；
- 一套菜单数字协议；
- 一个 row 上下文目标模型（第三阶段启用）；
- 一套统一显示协议。

这已经足够覆盖当前三步计划。

## 6.2 DRY

DRY 主要体现在四处：

1. **显示格式统一**
   - 不让每个按钮自己拼快捷键文案

2. **输入态忽略规则统一**
   - 不让每个组件自己写“是不是 input / textarea / contenteditable”

3. **前缀等待态统一**
   - 不让 `n p`、`g i` 在多个地方各写一套 timeout

4. **菜单数字规则统一**
   - 不让每个 dropdown 自己决定是从 `0` 还是 `1` 开始

但 DRY 不会扩张到：

- 把所有业务动作都抽成一个巨型 manager；
- 把 row / dialog / command / dropdown 的具体行为全部抹平。

---

## 7. 快捷键分层模型

## 7.1 Layer A：系统级快捷键

当前只保留：

- `Option+Space`

职责：

- 应用外唤起 `Quick Create Helper`

边界：

- 不承接 row action
- 不承接菜单项数字选择
- 不承接主窗口搜索 / Command / goto

## 7.2 Layer B：应用级全局快捷键

第一阶段建议收口为：

- `/`：全局搜索
- `Cmd/Ctrl+K`：Command
- `c`：创建 task
- `v`：全屏创建 task
- `n p`：创建项目
- `g *`：前往类动作

触发条件：

- app 已聚焦
- 非文本输入态
- 没有更高优先级的局部弹层抢占

## 7.3 Layer C：局部上下文快捷键

第三阶段建议收口为：

- `p`：打开 priority dropdown
- `s`：打开 status dropdown

触发条件：

- 存在明确目标 row
- 当前 row 允许交互
- 当前不处于文本输入态
- 当前没有更高优先级菜单已接管键盘

## 7.4 Layer D：菜单内数字快捷键

当前建议收口为两类：

- **无空态菜单**：从 `1` 开始
- **有空态菜单**：从 `0` 开始

触发条件：

- 菜单已打开
- 菜单声明支持数字选择
- 当前焦点仍在菜单所属上下文内

---

## 8. 前缀序列状态机

第一阶段至少需要的前缀序列是：

- `n p`
- `g *`

因此不建议一开始做通用无限深序列树，但也不能只写死一条。

推荐最小状态机：

```txt
Idle
  -> press n
PendingPrefix(n)
  -> press p within timeout
Execute(createProject)
  -> timeout / Esc / unrelated key
Idle

Idle
  -> press g
PendingPrefix(g)
  -> press [route key] within timeout
Execute(navigate)
  -> timeout / Esc / unrelated key
Idle
```

规则：

1. `n` 和 `g` 本身都不是动作，只进入等待态。
2. 等待时间建议 `700ms ~ 900ms`。
3. 等待期间：
   - `Esc` 取消
   - 非法键取消
   - 命中合法第二键才执行
4. 第一阶段只支持“前缀 + 第二键”。
5. `o` 组保留到第三阶段，不提前做实现。

---

## 9. 菜单数字协议

## 9.1 起始位规则

不是所有菜单都一律从 `1` 开始。

规则如下：

### A. 无空态菜单

适用：

- status
- 其他只有有效值、没有“无 / 未设置 / 清空”的菜单

显示：

- `1 2 3 4 5`

### B. 有空态菜单

适用：

- priority（有“无优先级”）
- project（有“无项目”）
- due / reminder / scheduled（有“无时间”）
- 其他存在“空值 / 清空 / 不归属”选项的菜单

显示：

- `0 1 2 3 4`
- 如有 6 项则为 `0 1 2 3 4 5`

判断标准不是业务实体类型，而是：

> 当前菜单里是否存在显式的“无 / 未设置 / 无归属 / 清空”选项。

## 9.2 右侧数字显示

数字提示只显示在菜单项右侧。

例如：

### status

- `待执行        1`
- `进行中        2`
- `等待中        3`
- `已完成        4`
- `已取消        5`

### priority

- `无优先级      0`
- `低            1`
- `中            2`
- `高            3`
- `紧急          4`

说明：

- 这里的数字是**当前菜单顺序位**
- 不是数据库内部值
- 但起始位跟“是否存在空态”绑定

## 9.3 数字选择行为

菜单已打开时：

- 无空态菜单：按 `1~5` 直接选择对应项
- 有空态菜单：按 `0~4` 或 `0~5` 直接选择对应项

如果菜单项不足：

- 超出范围的数字忽略

如果菜单顺序变化：

- 右侧数字和选择逻辑一起按显示顺序变化

---

## 10. row 上下文模型

这一部分属于第三阶段，不纳入第一阶段实现。

但为了后续不返工，先明确边界。

`p / s` 的难点不在菜单，而在：

> 当前到底哪一行应该响应

第三阶段推荐优先级：

1. **hover row**
2. **keyboard-focused row**
3. **active row**
4. **单选 selected row**
5. **无目标，不响应**

说明：

- `hover` 优先级最高，因为这是用户最明确的当前操作意图；
- `selected` 只在“单选且没有 hover / focus / active 目标”时兜底；
- 多选状态下不响应 `p / s`，避免语义不清。

本轮明确不支持：

- 多选后批量 `p / s`
- 同时对多行打开多个 dropdown

---

## 11. 显示协议

本轮只保留三类显示：

## 11.1 主操作按钮上的内联提示

例如：

- `新建任务   C`
- `全屏新建   V`
- `新建项目   N P`
- `前往 Inbox   G I`

适用：

- Header 主入口
- Command 内主要动作项

## 11.2 菜单项右侧数字提示

例如：

- `待执行        1`
- `进行中        2`

或：

- `无优先级      0`
- `低            1`

适用：

- priority dropdown
- status dropdown
- project dropdown
- 时间类 dropdown

## 11.3 不额外增加工具栏

当前明确不做：

- 全局快捷键帮助工具栏
- dropdown 底部快捷键栏
- row 底部说明条

原因：

- 用户已经明确不要；
- 这轮重点是动作流畅和结构正确，不是教育式 UI。

---

## 12. 组件与状态职责

## 12.1 `ShellHeader`

第一阶段应负责：

- 显示主入口按钮上的快捷键文案；
- 挂载 shell 级动作绑定；
- 不再继续成为散装键盘监听器。

它不应负责：

- 管理全局前缀状态机；
- 管理菜单数字逻辑；
- 管理 row 目标解析。

## 12.2 `ShortcutManager`

应负责：

- 应用内统一键盘事件入口；
- 统一 guard；
- 统一前缀等待态；
- 统一路由到 feature action。

它不应直接感知：

- 具体 row DOM 排布；
- dropdown 视觉；
- task/project 业务细节。

## 12.3 `Command`

第二阶段应负责：

- 成为稳定的动作主入口；
- 承接全局动作分类；
- 展示统一快捷键文案；
- 为第三阶段 `o` 组预留稳定挂载点。

## 12.4 `PriorityCell / StatusCell`

第三阶段应继续保持：

- 视觉和交互容器；
- 受控 open 状态；
- 受控当前值；
- 菜单项渲染。

它们不应承担：

- 全局键盘监听；
- 目标 row 解析；
- 前缀状态机。

## 12.5 `TaskRowAdapter`

第三阶段应负责：

- 暴露当前 row 的交互目标信息；
- 在 hover / focus / active / selected 变化时更新 row shortcut scope；
- 把 `PriorityCell / StatusCell` 接成受控 open。

它不应负责：

- 第一阶段的 `c / v / n / g`
- `Command` 的全局动作注册

---

## 13. 实现顺序建议

如果按当前新规划进入实现，建议按这个顺序推进：

### P0：基础协议层

1. 建立 `shared/shortcuts` 类型与格式化工具
2. 建立 `app/shortcuts` 管理器
3. 把 `Header` 当前散装 `c` 监听迁入统一调度

### P1：第一阶段全局主链路

1. 接入 `c`
2. 接入 `v`
3. 接入 `n p`
4. 接入 `g`
5. 给 task create dialog 增加全屏态

### P2：第二阶段 Command 收口

1. 重构当前 `cmdk` 命令弹窗
2. 把 Command 的分组、动作语义、快捷键显示收口
3. 为第三阶段 `o` 组预留挂载点

### P3：第三阶段 row 上下文层

1. 建立 task row shortcut scope
2. 接入 `p / s`
3. 改造 `PriorityCell / StatusCell` 为受控 open

### P4：第三阶段菜单数字层

1. 菜单项右侧数字提示接入共享协议
2. 按“有空态从 `0` 开始，无空态从 `1` 开始”的规则渲染
3. 菜单打开时支持对应数字选择

这个顺序的好处是：

- 先统一调度，再接具体动作；
- 先把第一阶段的主链路做稳，再收口 `Command`；
- 最后再做 row 局部复杂度，避免一开始把上下文问题和全局问题搅在一起。

---

## 14. 当前明确不做的事

为了避免范围膨胀，当前明确不做：

1. 用户自定义快捷键
2. 快捷键设置页
3. 快捷键冲突可视化管理器
4. 批量 row 的 `p / s`
5. 第一阶段之外的 `o` 组动作实现
6. 把所有菜单都接入 `1~9`
7. Helper 侧新增更多系统级全局键

---

## 15. 最终推荐结论

StoneFlow 当前阶段最合理的快捷键架构是：

1. **系统级只保留 `Option+Space`**
2. **应用内建立统一 `ShortcutManager`**
3. **第一阶段先做 `c / v / n / g`**
4. **第二阶段重构 `cmdk` 命令弹窗**
5. **第三阶段再做 `o` 组和 `p / s`**
6. **菜单数字按“无空态从 `1` 开始，有空态从 `0` 开始”**
7. **不增加额外工具栏**

这套方案的核心价值不在于“键多”，而在于：

- 边界清楚；
- 分阶段推进；
- 不和输入冲突；
- 模块职责清晰；
- 后续可扩展但当前不过度设计；
- 符合现有 `feature-first + RowShell + Quick Create 独立 feature + Helper 分层` 的仓库方向。

如果这份文档被采纳，后续应继续补：

- `X1` 的 ADR 记录
- 实现附近的 `ARCHITECTURE.md`
- 第一阶段的快捷键总表
- 第二、第三阶段的验收清单
