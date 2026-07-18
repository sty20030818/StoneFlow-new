# 平台与 Domain 扩散重构执行计划（task 样板之后）

> 状态：**可执行** · 首刀 **command** · 2026-07-19
> 前置：[11-Task样板重构](./11-Task样板重构执行计划.md)（**0–5 done**）· 决议：[09-决议总表](./09-决议总表.md) · 写法：[CONVENTIONS v2.1](../../../src/CONVENTIONS.md)
> **原则：** 大→小但**不同构不硬排**；串行波次；每阶段末相关门禁；开放前可破坏须清干净；源码禁史诗号。
> **文档：** `src/**/ARCHITECTURE` = 定稿最优（无债表）；**债/进度只写本文或子计划**；src 不回链执行计划。

---

## 0. 总目标

1. 把 task 样板的纪律（Query / hooks / public / TSDoc / 禁 layout）**扩散**到同构 domain。
2. 先收干净 **command 总线（C3 余债）**，再抄 domain，避免每域重复踩壳 Bridge。
3. 窗/场景（launcher、settings）另波，不和 domain 样板混刀。

### 非目标

- 不重开 feature 切分（不并 selection∪bulk∪command 等）
- 不在本计划内做视觉 / View Transition
- 不要求一次 `bun run check` 全仓 rust 才算阶段过（阶段内：`tsc` + `lint:boundaries` + 相关 vitest；波次收口再拉全量）

### 统一五步（每个 feature 抄 task）

| 步 | ID | 内容 |
|----|-----|------|
| 0 | DOC | `ARCHITECTURE` 定稿；卡落地对照 |
| 1 | NORM | Query（若有）/ TSDoc / public |
| 2 | LAYER | hooks 归位 / Host 变薄 / 引擎纯化 |
| 3 | VOLUME | 巨石内拆（有再拆） |
| 4 | CLOSE | 对照勾选 + 可复制备忘 |

---

## 1. 波次总表（大→小 · 按收益）

| 波次 | 模块 | ~行 | 类 | 状态 | 说明 |
|------|------|-----|-----|------|------|
| **0** | task | 13k | domain | **done** | [11](./11-Task样板重构执行计划.md) |
| **1** | **command** | 7.3k | platform | **C0–C3 done · 余 C4–C5** | VOLUME/CLOSE |
| 1b | bulk-action | 1.7k | platform | pending | 轻扫 B3；无债则勾掉 |
| **2** | project | 2.8k | domain | pending | 抄 task 检查表（P2） |
| 2 | lifecycle | 2.5k | domain | pending | Y2 |
| 2 | view | 1.8k | domain | pending | V2 |
| 2 | space | 0.8k | domain | pending | S2 |
| 2 | activity | 0.5k | domain | pending | A1 观察/薄收 |
| **3** | launcher | 4.4k | window | pending | 窗边界；创建已复用 task |
| 3 | settings | 3.5k | scene | pending | 三入口 + sync/update |
| 3 | project-overview | 0.6k | scene | pending | 薄对齐 |
| **4** | display-options · metadata-fields · selection · global-search · … | 中→小 | platform | pending | 按债短刀 |
| 4 | submit · danger-confirm · filter · workspace | 小 | platform | pending | 多标杆 → **只验收** |

> **为何不先 launcher：** 行数大但与 task 检查表重叠少；command 清完对全仓注册收益更大。

---

## 2. 波次 1 · command（C3 余债 · 首刀）

### 2.1 决议与现状

| 项 | 内容 |
|----|------|
| 决议 | **C3** 注册式 · [M-F-COMMAND](./模块/M-F-COMMAND.md) |
| 已有 | 各域 `register*Commands`（task/project/lifecycle/filter/submit）；CommandMenu 已拆至主文件 ~196 |
| 仍债 | `bindShellCommand` switch 仍在（方案 B 未做）；VOLUME 边角；CLOSE |

### 2.2 目标

1. **layout 只做 Host 装配**：chrome register + compose 各域 register；**零 domain mutation**。
2. command feature = 元数据 / Runtime / keybinding / Menu UI / Host **端口类型** / bind 协议。
3. `ARCHITECTURE` = 定稿最优；注释对齐 CONVENTIONS。
4. 尽量缩小或淘汰「每加命令改 adapter 必填表」的摩擦（见阶段 H3）。

### 2.3 非目标

- 不把导航/创建业务写进 `features/command`
- 不合并 selection / bulk / command
- 不重做 Shortcut 全局 chord 语义（行为不变）
- 不顺手开 project 大刀（留给波次 2）

### 2.4 现网基线（2026-07-19）

| 项 | 状态 |
|----|------|
| 域 `register*Commands` | **已有**（task/project/lifecycle/filter/submit） |
| 壳 `registerShellChromeCommands` | **在 layout/command-bridge** |
| `composeShellCommandActions` | **只校 chrome**（`SHELL_CHROME_ACTION_KEYS`） |
| `bindShellCommand` / 形状 | chrome / domain 拆分；域可缺 → disabled · **C3 A done** |
| `useShellCommandSystem` | **~200**（已拆 open/context/projects/bulk） |
| CommandMenu 主文件 | **~196**（巨石已拆） |
| `command → layout` | **0** |
| ARCHITECTURE 定稿 / public TSDoc | **C0–C1 done** |
| Host 内拆 | **C2 done** |
| Adapter 缩必填 | **C3 A done** |

### 2.5 阶段总表（command）

| 阶段 | ID | 内容 | 破坏性 | 状态 |
|------|-----|------|--------|------|
| 0 | DOC | ARCHITECTURE 定稿；M-F-COMMAND 落地对照 | 无 | **done**（2026-07-19） |
| 1 | NORM | public / TSDoc；入口头注释 | 低 | **done**（2026-07-19） |
| 2 | HOST | 瘦 `useShellCommandSystem`；bridge 只 chrome+compose | 中 | **done**（2026-07-19） |
| 3 | ADAPTER | 缩 `ShellCommandActions` / bind 摩擦（或登记表进化） | 中高 | **done**（方案 A · 2026-07-19） |
| 4 | VOLUME | 菜单/keybinding 边角（按余力） | 低 | pending |
| 5 | CLOSE | 对照勾选；bulk 轻扫；波次 2 入口备忘 | 无 | pending |

推荐串行：**0 → 1 → 2 → 3 → 4 → 5**。H3 若风险大，可拆成「先删必填上帝校验、保留形状」与「再收窄类型」两刀。

---

### 阶段 C0 · DOC

| 字段 | 内容 |
|------|------|
| 目标 | command `ARCHITECTURE` = 定稿最优；卡对照可勾 |
| 状态 | **done**（2026-07-19） |

- [x] `src/features/command/ARCHITECTURE.md`：心智 / 目录 / public / 与 layout·domain 协作；**无债表、无阶段号**
- [x] `M-F-COMMAND`：落地对照；archived-decision；链执行计划
- [x] 本文基线与卡一致

---

### 阶段 C1 · NORM

| 字段 | 内容 |
|------|------|
| 目标 | public + TSDoc 成为平台样板 |
| 破坏性 | 低（可撤无外消费者导出） |
| 状态 | **done**（2026-07-19） |

- [x] `index.ts`：多行摘要 + `@remarks`；去掉 `@fileoverview`
- [x] 审计导出：撤无外消费者类型（keybinding 底层、Menu 内部分组、`ShellCommandAdapter` / 再导出 `ShellNavigationTarget` 等）
- [x] `bunx tsc` 绿

---

### 阶段 C2 · HOST

| 字段 | 内容 |
|------|------|
| 目标 | Host 可扫完；layout 无业务 handler 膨胀点 |
| 破坏性 | 中（路径/钩子可搬，行为不变） |
| 状态 | **done**（2026-07-19） |

### 落地

| 项 | 结果 |
|----|------|
| Host 编排 | `useShellCommandSystem` ~200；只接线 |
| 子模块 | `useShellCommandOpenRouting` · `useShellCommandHostContext` · `useShellCommandProjects` · `runShellCommandBulkAction` · 既有 taskMeta |
| bridge | 仍只 chrome + compose；README 澄清 |
| 边界 | command → layout 0；相关测 149 绿 |

**验收：** tsc · boundaries · command+layout vitest 绿（人工冒烟未跑）。

---

### 阶段 C3 · ADAPTER

| 字段 | 内容 |
|------|------|
| 目标 | 降低「加命令改三处类型表」；对齐 C3 终态 |
| 破坏性 | 中高 |
| 状态 | **done**（方案 A · 2026-07-19） |

**落地（方案 A · 缩必填表）：**

| 项 | 结果 |
|----|------|
| 类型分层 | `ShellChromeCommandActions` / `ShellDomainCommandActions` / `ShellCommandAdapter` |
| compose | 只校 `SHELL_CHROME_ACTION_KEYS`（14 项 chrome） |
| bind | 域 handler 缺失 → `createDisabledCommand` |
| 加域命令 | 元数据 + register + bind；**不必**改 compose 必填表 |
| 方案 B | **未做**（Runtime 直接吃含 run 的 Command[]）；余债记 CLOSE |

**验收：** adapter 单测含「缺域 handler 禁用」；tsc / boundaries / command vitest 绿。

---

### 阶段 C4 · VOLUME（余力）

| 字段 | 内容 |
|------|------|
| 目标 | 边角可控；不挡 CLOSE |
| 状态 | pending |

| 优先级 | 项 | 动作 |
|--------|-----|------|
| P0 | 若仍有 &gt;400 行单文件 | 内拆 |
| P1 | `default-keybindings` | 可按域拆文件（非必须） |
| P2 | Menu 边角组件 | 有痛再拆 |

---

### 阶段 C5 · CLOSE（command + 波次 1 收口）

| 字段 | 内容 |
|------|------|
| 目标 | command 可当平台样板；波次 2 可开工 |
| 状态 | pending |

- [ ] 回写 M-F-COMMAND 对照；ARCHITECTURE 与代码一致
- [ ] **bulk-action 轻扫**：对照 B3；引擎纯 / 域 adapter 已回家 → 勾掉或另开 3 行债
- [ ] 写下节「复制到 project 的检查表增补」（相对 task 附录多 Host/register）
- [ ] `tsc` · `lint:boundaries` · `vitest run src/features/command`（+ 必要 layout/command 测）

---

## 3. 波次 2+ 入口（计划级，未开刀）

每个 domain 开刀时：**新建或追加短计划**（可仿 11），本表只锁顺序。

| 序 | 模块 | 决议 | 相对 task 检查表加项 |
|----|------|------|----------------------|
| 1 | project | P2 | 详情内任务板只调 task public；bulk/命令 register 已在则验 |
| 2 | lifecycle | Y2 | 编排 facade；禁吞进 task |
| 3 | view | V2 | view-task facade |
| 4 | space | S2 | pending intent 纯化 |
| 5 | activity | A1 | 单源 query；可极薄 |

波次 3（launcher / settings）在波次 2 至少 **project 收口** 后再排期。

---

## 4. 门禁与冒烟

### 命令相关（每阶段）

```bash
bunx tsc --noEmit -p tsconfig.json
bun run lint:boundaries
bunx vitest run src/features/command
```

### 人工冒烟（C2/C3/C5）

- 命令板开合、搜索、选择芯片
- 任务行快捷键与命令板 complete/archive/delete 一致
- 壳：新建任务/项目、帮助、导航类命令
- 全局 chord 不被行命令误吞

---

## 5. 风险

| 风险 | 缓解 |
|------|------|
| 缩 adapter 漏绑命令 | compose 校验先缩 chrome 最小集；单测 + 冒烟表 |
| Host 端口膨胀 | 新端口必须双边同步；禁止域直取 layout |
| 与 task 样板文档风格漂移 | ARCHITECTURE 只定稿；进度只在本文 |
| 范围爬到 project | 波次 1 明确非目标；CLOSE 后再开 |

---

## 6. 文档关系

```txt
09-决议总表 / M-F-COMMAND     → WHY
本文                           → 波次顺序 + command 刀序（进度）
11-Task…                       → domain 样板（已收口）
src/features/command/ARCHITECTURE → 定稿日常
src/CONVENTIONS.md             → HOW
```

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-19 | 初版：波次 0–4；command 阶段 C0–C5；对齐 task 样板后扩散 |
| 2026-07-19 | C0 DOC + C1 NORM done：定稿 ARCHITECTURE；public 收窄 + TSDoc |
| 2026-07-19 | C2 HOST done：useShellCommandSystem 内拆至 ~200 |
