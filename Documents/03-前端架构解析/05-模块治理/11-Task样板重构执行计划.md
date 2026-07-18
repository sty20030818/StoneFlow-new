# Task 样板重构执行计划（T2a 实现债 · 对齐 CONVENTIONS v2）

> 状态：**可执行** · 2026-07-18
> 决议源：[M-F-TASK](./模块/M-F-TASK.md)（T2a）· 写法：[CONVENTIONS v2.1](../../../src/CONVENTIONS.md) · 定稿契约：[task/ARCHITECTURE.md](../../../src/features/task/ARCHITECTURE.md)
> **前提：** T2 边界刀已完成（禁 task→layout、open/bulk/命令回家）。本计划只还 **实现债 + 规范对齐**，**不重开切分**（不拆 task-list/task-detail 包）。
> **原则：** 串行；每阶段末 `bun run check`；开放前可破坏但须清理干净；源码注释禁止史诗号。
> **文档分工：** `ARCHITECTURE` = 定稿最优形态（无债表）；**债 / 进度只写本文**。

---

## 0. 目标与非目标

### 0.1 目标

1. task 成为 **domain 样板**：可被 project / view / lifecycle 抄 Query、分层、注释、public 纪律。
2. 巨石可控：优先 Shortcut / list-scene；其余按收益拆。
3. `model/` 尽量无 React；hooks 归 `hooks/`。
4. Public + JSDoc（L0/L1）与 CONVENTIONS 一致。

### 0.2 非目标

- 不拆成多个 `features/task-*` 包
- 不把 list-scene 下沉 layout
- 不做视觉 / View Transition 专项（属体验波次）
- 不顺手重构 project/view（样板绿后再复制）

### 0.3 门禁

```bash
bun run check
# 相关：bunx vitest run src/features/task
```

冒烟（人工）：三列表、项目内任务板、创建、抽屉/全页/预览、命令板与行快捷键 complete/archive 一致。

---

## 1. 现网基线（2026-07-18）

| 项 | 状态 |
|----|------|
| task → layout | **0**（已断） |
| open / create 内核 / bulk / registerTaskCommands | **已在 task** |
| 行快捷键共用 `runTaskRowBulkCommand` | **已接** |
| `TaskRowShortcutScope` | 壳 ~36 行 + controller/navigation/runtime · **已拆** |
| `TaskPreviewProvider` | 壳 ~13 + store/helpers/register · **已拆** |
| `TaskContextMenu` | 主拼装 ~331 + helpers/items · **已拆** |
| `useTaskListScene` | 主文件 ~100 行 + `hooks/list-scene/` · **已内拆** |
| `TaskBoard` / `TaskRowAdapter` | ~407 / ~354 · **后置（不挡关闭）** |
| `useTaskListController` / `useTaskSelection` | **已在 hooks/** |

---

## 阶段总表

| 阶段 | ID | 内容 | 破坏性 | 依赖 | 状态 |
|------|-----|------|--------|------|------|
| 0 | DOC | 卡落地对照 + task ARCHITECTURE 同步 | 无 | — | **done**（随本文） |
| 1 | NORM | Query / JSDoc / public 对齐 CONVENTIONS | 低 | 0 | **done**（2026-07-18） |
| 2 | HOOKS | model 内 hooks 归位；list-scene 内拆 | 中 | 1 | **done**（2026-07-19） |
| 3 | SHORTCUT | 拆 TaskRowShortcutScope | 中 | 1（可 ‖ 2） | **done**（2026-07-19） |
| 4 | VOLUME | PreviewProvider / ContextMenu（Board 可选） | 低中 | 2–3 | **done**（2026-07-19） |
| 5 | CLOSE | 契约收口、样板检查表、可选扩散备忘 | 无 | 1–4 | pending |

推荐串行：**0 → 1 → 2 → 3 → 4 → 5**。若赶体量，**3 可与 2 弱并行**（冲突文件少时）。

---

## 阶段 0 · DOC（文档同步）

| 字段 | 内容 |
|------|------|
| 目标 | M-F-TASK = 决议档案 + 落地对照；ARCHITECTURE = 定稿最优（无债表） |
| 状态 | **done**（2026-07-18 再收：去掉 ARCHITECTURE 债表） |

- [x] M-F-TASK：状态改为 archived-decision；加「T2 后落地对照」
- [x] 本文执行计划落盘
- [x] `src/features/task/ARCHITECTURE.md` = 定稿最优；债只留本文

---

## 阶段 1 · NORM（规范对齐）

| 字段 | 内容 |
|------|------|
| 目标 | Query / 注释 / public 成为样板写法 |
| 破坏性 | 低 |
| 状态 | **done**（2026-07-18） |

### 落地

| 项 | 结果 |
|----|------|
| Query keys | `task.keys.ts` 补 L0；约定 `taskKeys.all` 前缀失效 |
| queryOptions | list/detail/links 均工厂化；hooks 共用 |
| mutations | 文件头写明 api-only + keys invalidate |
| api | `tasks.ts` 标明唯一 invoke 层 |
| TSDoc L1 | `index.ts` / `contract.ts` 导出均有中文摘要（多行 `/**`；入口用 `@remarks`） |
| public 收窄 | 撤无外部消费者：`getTaskPriorityOption` · `normalizeTaskPriorityValue` · `getTaskStatusOption` |

### 验收

- [x] `index.ts` 导出均有 L1 TSDoc（对齐 CONVENTIONS v2.1）
- [x] keys / queryOptions / mutations 符合 CONVENTIONS §4
- [x] typecheck + `vitest run src/features/task` 绿（150）

---

## 阶段 2 · HOOKS（分层归位 + list-scene）

| 字段 | 内容 |
|------|------|
| 目标 | `model/` 无 React hook；list-scene 内拆、facade 仍单一 |
| 破坏性 | 中（路径迁移；public 导出路径可变） |
| 状态 | **done**（2026-07-19） |

### 步骤

1. `useTaskListController` · `useTaskSelection`：`model/` → `hooks/`（纯 selection 算法可留 `model/taskSelection.ts`）。
2. 更新内部 import 与 `index.ts` 再导出（外模块仍只走 `@/features/task`）。
3. **拆 `useTaskListScene`**（不拆 feature）建议子模块：
   - 数据 / filter·display 注册 / selection·preview 注册 / board props 组装 / 创建 port
4. Facade 签名尽量稳定；破坏性变更写进 ARCHITECTURE。

### 落地

| 项 | 结果 |
|----|------|
| hooks 归位 | `useTaskListController` / `useTaskSelection` → `hooks/`；`model/` 无 `use*` |
| list-scene 拆分 | `hooks/list-scene/`：`variantConfig` · `useListSceneFilterDisplay` · `useListSceneSelectionBridge` · `useListSceneBoard` |
| facade | `useTaskListScene` 主文件 ~100 行；对外返回形状不变 |
| public | `index.ts` 改再导出路径；外模块仍 `@/features/task` |

### 验收

- [x] `model/` 下无 `use*.ts(x)`（指示器组件除外）
- [x] `useTaskListScene` 主文件 &lt; ~250 行，子文件边界清晰
- [x] typecheck + task/project/view 相关 vitest 绿
- [x]（冒烟：三列表 + project/view 嵌入 — 依赖现有单测；未做手工 UI）

---

## 阶段 3 · SHORTCUT（行快捷键巨石）

| 字段 | 内容 |
|------|------|
| 目标 | `TaskRowShortcutScope` 可维护；仍共用 commands handlers |
| 破坏性 | 中（仅拆文件，行为不变） |
| 状态 | **done**（2026-07-19） |

### 建议拆分

| 文件 | 职责 |
|------|------|
| `TaskRowShortcutScope.tsx` | 壳：Provider / 绑定入口（目标 &lt;250） |
| `taskRowShortcutBindings`（已有可扩） | 键位表 |
| `rowTargetResolver`（已有） | 行目标解析 |
| 新增：导航 / bulk / meta picker 等 handler 分段文件 | 按现网分支切 |

**禁止：** 再引入第二套 complete/archive 业务实现；必须走 `runTaskRowBulkCommand` / 既有 register handlers。

### 落地

| 项 | 结果 |
|----|------|
| 壳 | `TaskRowShortcutScope.tsx` ~36 行 |
| controller | `useTaskRowShortcutController.ts`（hover + window 键盘） |
| 分段 | `types` · `rowNavigation` · `rowCommandRuntime` · `keyboardScroll` · `rowShortcutGuards` |
| bulk | 仍经 `createTaskRowCommandActions` → `runTaskRowBulkCommand` |

### 验收

- [x] 主文件明显下降；`TaskRowShortcutScope` + `rowTargetResolver` 单测绿（34）
- [x] complete/archive/delete 仍走 `runTaskRowBulkCommand`（未另写业务）
- [x] typecheck 绿

---

## 阶段 4 · VOLUME（其余体量）

| 字段 | 内容 |
|------|------|
| 目标 | Preview / ContextMenu 可控；Board 按余力 |
| 破坏性 | 低中 |
| 状态 | **done**（2026-07-19） |

| 优先级 | 文件 | 动作 |
|--------|------|------|
| P0 | `TaskPreviewProvider` | 拆 state / actions / register source |
| P1 | `TaskContextMenu` | 拆菜单段 / metadata |
| P2 | `TaskBoard` · `TaskRowAdapter` | 有余力再拆；不挡样板关闭 |

### 落地

| 项 | 结果 |
|----|------|
| Preview | `TaskPreviewProvider` 壳；`useTaskPreviewStore` · `taskPreviewHelpers/Types/Context` · `useRegisterTaskPreviewSource` |
| ContextMenu | `task-context-menu-helpers` · `task-context-menu-items`；主文件只拼装 |
| Board | **跳过**（P2，不挡阶段 5） |

### 验收

- [x] Preview 相关单测绿；task 全量 150 绿
- [x] ContextMenu 组件相关测绿
- [x] typecheck 绿
- [x] Board 后置（明确不挡关闭）

---

## 阶段 5 · CLOSE（收口）

| 字段 | 内容 |
|------|------|
| 目标 | 样板可复制；定稿架构与债清零一致 |
| 状态 | pending |

### 步骤

1. 更新 `task/ARCHITECTURE.md` 为**当时定稿**（目录树、public）；**不写债表**——未清项只留本文。
2. 回写本文各阶段状态 + M-F-TASK 落地对照勾选。
3. 写一小节 **「复制到 project/view 的检查表」**（Query keys 形态、hooks 归位、禁 layout、TSDoc L1）——只备忘，本阶段不改其它 feature。
4. 全量 `bun run check`；相关 vitest。

### 验收

- [ ] 本文阶段 1–4 done
- [ ] ARCHITECTURE = 定稿最优，且与代码一致
- [ ] 检查表可给下一 feature 用

---

## 依赖与风险

| 风险 | 缓解 |
|------|------|
| list-scene 拆坏 project/view | 每阶段跑 task + project + view 相关测；保持 facade 导出稳定 |
| Shortcut 拆文件漏绑 | 单测优先；冒烟行快捷键表 |
| public 收窄漏引用 | 改前 rg 外部引用；boundaries + tsc |

---

## 与其它文档关系

```txt
M-F-TASK.md          → WHY / 决议 / 落地对照（档案）
本文                 → 刀序、债、验收（进度）
task/ARCHITECTURE.md → 定稿最优契约（日常；无债表）
CONVENTIONS.md       → 怎么写（含 TSDoc）
```

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-18 | 初版：阶段 0–5；基线行数；对齐 CONVENTIONS v2 / T2a |
| 2026-07-18 | 阶段 1 NORM done：Query/JSDoc/public；撤 3 个无外消费者导出 |
| 2026-07-18 | 文档分工收口：ARCHITECTURE 去债表；注释改 TSDoc（CONVENTIONS v2.1） |
| 2026-07-19 | 阶段 2 HOOKS done：hooks 归位 + list-scene 内拆 |
| 2026-07-19 | 阶段 3 SHORTCUT done：TaskRowShortcutScope 拆文件 |
| 2026-07-19 | 阶段 4 VOLUME done：Preview + ContextMenu；Board 后置 |
