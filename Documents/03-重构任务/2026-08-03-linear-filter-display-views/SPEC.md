# Linear 式 Filter · Display · Views - Spec

## 背景与目标

### 白话：我们到底在抄什么？

「对齐 Linear」**不是**把 Linear 每个字段、每个按钮皮肤像素级照搬，而是：

| 说法 | 意思 |
|---|---|
| **照抄的是「规则与结构」** | 什么叫筛选、什么叫显示、chip 怎么改、Save 存什么、刷新后还在不在——这些**产品规则**跟 Linear 同一套 |
| **字段可以少** | Linear 有 Assignee / Labels / AI… 我们没有协作模型就**不做**；有的字段（状态、优先级…）行为要一样 |
| **不是抄 Command 皮肤** | 不是把现在的命令面板画得像 Linear；而是做成 Linear 那种「菜单 + 公式条」 |

一句话：**用户用筛选/显示/视图时的心智模型 = Linear；字段表 = StoneFlow 子集。**

### 三个盒子（必须分清）

| 盒子 | 管什么（人话） | 像什么 | 存哪 |
|---|---|---|---|
| **Filter（筛选）** | **留下谁、藏起谁** | 勾选条件 | 见下：View 定义 / URL 临时 |
| **Display（显示）** | **怎么排、行上显示哪些字段**；**不**决定谁被踢出结果集（完成可见性除外，见边界） | 货架怎么摆 | 个人偏好 + 页面默认（Tauri store） |
| **View（视图）** | 给一串筛选条件**起名字存起来** | 收藏的搜索方案 | SQLite；**只存 filters（+ 名/scope 等元数据）** |

Linear 原话大意：filters 收窄列表；display 只决定 issue 上显示哪些信息。  
→ 改分组/排序，条数逻辑不该变成「又筛了一遍」（完成可见性是 Display 产品能力，单独约定）。

### 当前问题（为何要做）

- 筛选靠全页 Command + 扁平状态，没有公式条（chip）  
- 临时筛选与自定义 View 两套数据，无法「筛完 Save」  
- sort/group 和 Display 职责搅在 View 行上  
- completed 与 filter 串味；工具条槽位错乱  

### 目标（终态，无过渡方案）

破坏性一次到位：

1. 统一 **clause 公式** 为唯一 filters 真源  
2. **临时 filter 进路由 URL（search）**，刷新可恢复（对齐 Linear「filters 进 URL」）  
3. **View 只存 filters**；**grouping / ordering 全部只在 Display**  
4. Filter UI = 锚定菜单 + FilterBar；Command 不作唯一实现  
5. Save 时 **可选覆盖当前 View 或另存为新 View**  
6. **Clear 只服务临时 filter**；纯自定义 View 定义态不出现 Clear  

---

## 与 Linear 的关系（照抄表 / 不做表）

依据：[Filters](https://linear.app/docs/filters)、[Display options](https://linear.app/docs/display-options)、[Custom Views](https://linear.app/docs/custom-views)。

### 照抄的行为（实现必须长这样）

| # | Linear 怎么做 | 我们怎么做（同一规则） |
|---|---|---|
| 1 | Filter 决定谁在列表里 | 同上；clause 驱动查询 |
| 2 | Display 决定分组/排序/行上字段等 | 同上；**不再**用 View 行存 sort/group 当呈现真源 |
| 3 | `F` 打开加筛选菜单 | 同上；表面是锚定菜单，不是全页 Command 唯一入口 |
| 4 | 条件显示为公式：`Priority is High`，可点 is、可点值；点字段名通常不改类型 | chip 同行为 |
| 5 | 可多条条件；≥1 条后可 Save 成 View | 同上 |
| 6 | 主 filters 进 **URL**，刷新/打开链接可恢复；view options **不进** filter URL | 临时 filter 进 **TanStack Router search**；Display 不进 filter search |
| 7 | Save view 固化的是筛选方案（filters） | Save **只写 filters**，不写 Display |
| 8 | Display 个人偏好会记住；可 Set as default / Reset | pageKey 个人 + 页面 default |
| 9 | completed 类「显不显示已完成」在 Display 语境 | 从 filter 快捷操作迁到 Display |

### 明确不做（字段/能力减配，不是半吊子）

| 不做 | 说明 |
|---|---|
| AI filter、Advanced AND/OR 嵌套 UI | 模型用 clause 列表（默认 AND）留扩展，**不做** UI |
| Assignee / Labels / Creator / Relations… | 无产品模型 |
| List/Board 真切换、`⌘B` | 无第二布局；**不**放可点假开关 |
| 菜单内 Add Filter 键入搜索 | **延后待办**，本任务不做 |
| 多用户工作区「给别人设 default」 | 单用户页面 default 即可 |
| 长期双写旧扁平 PageFilterState | **禁止过渡方案**，直接删旧真源 |

### 操作符（照抄精神、简化实现）

- Linear：单值 is/is not，多值 is either of…  
- 我们 v1：数据层 `is` | `is_not`；多值 = 属于/不属于集合；chip 文案中文「是 / 不是」即可  

---

## 范围

### In scope（终态能力）

#### A. 领域模型

- `FilterQuery = { clauses: FilterClause[] }`  
- `FilterClause = { id, field, op, values }`  
- field v1：`status` | `priority` | `project` | `due` | `planned`（`created`/`updated` 模型可预留，UI 本任务可不做）  
- View.`filters_json` **仅**此形状；旧 `TaskViewFilters` **一次迁移后删除双路径**  
- **View 实体删除 sort/group 作为产品真源**：grouping/ordering **只**来自 display-options；DB 列可删或忽略并停止读写（破坏性，见 PLAN）

#### B. 临时 Filter ↔ URL

- 列表相关路由的 **search params** 编码当前**临时** `FilterQuery`  
- 刷新页面 / 复制地址再开 → 临时筛选恢复  
- Display 偏好 **不** 写入 filter 的 search  
- 换路由、换 View：按 PLAN 的 base/temp 规则切换，不残留错误页的 temp

#### C. Base vs 临时（Clear / chip 语义）

| 状态 | chip 展示 | Clear 按钮 |
|---|---|---|
| **非 View 列表**（如全部任务）+ 有 URL 临时条件 | 临时条件 | **有** Clear → 清空 URL 临时 |
| **非 View 列表** + 无临时条件 | 无公式条或空 | **无** Clear |
| **自定义 View** + URL **无**临时偏离（干净：生效=View 定义） | View 定义的 filters | **无** Clear（不能一键清空「视图本身」） |
| **自定义 View** + URL **有**临时偏离（在定义上改过/加过） | 生效=临时公式 | **有** Clear → **丢掉临时，恢复为 View 定义** |

单条 chip 的 ×：  
- 临时态：删该 clause，写回 URL  
- 干净 View 态：修改即进入「临时偏离」（写入 URL），再按上表出现 Clear  

#### D. Filter UI

- `FilterMenu`：锚定加条件（字段 → 值）  
- `FilterBar`：chip + `+` +（条件满足时）Clear + Save  
- 「N 条被筛选隐藏」反馈（有 total 语义时）  
- `F` 打开同一菜单；旧 Command-only picker **删除为主路径**

#### E. Save View

Save 打开选择（或等价双按钮）：

1. **覆盖当前 View**（仅当已在自定义 View 上下文）→ 只更新该 View 的 filters 为当前生效公式，并清掉临时偏离（URL）  
2. **另存为新 View** → 命名 → create，只写入 filters；可选跳转新 View  

非 View 页：仅「另存为新 View」。  
**禁止**把 Display 写入 View。

#### F. Display（终态）

- 唯一呈现真源：groupBy / subGroupBy / orderBy / orderDirection / completedOrder / showEmptyGroups / visibleProperties / **completed 可见性**  
- Ordering 行内嵌方向；completed order 用 toggle 语义  
- Set as default / Reset to default  
- List/Board：**不做**（隐藏）  
- 每个 `TaskDisplayPageKey`（含 `task:view:{id}`）独立个人偏好  

#### G. 接线

- 全部任务 / 独立事项 / 项目详情 / Views 页工具条槽位正确  
- PageFrame 支持 FilterBar 区域（toolbar 下）  

#### H. 破坏性

- 无用户：允许删列、改 JSON、删旧 controller、改 View 编辑器（去掉 sort/group 表单项，改由 Display 管）

### 场景

全部任务、独立事项、项目详情任务列表、自定义 Views。

---

## 不做什么

- AI / Advanced 嵌套 UI / 协作筛选项  
- List/Board 实现、菜单搜索（**待办，本任务不做**）  
- Display 写入 View、旧扁平 filter 双写兼容层  
- 多用户分享权限产品化  
- 为「过渡」保留 View.sort/group 与 Display 双真源  

---

## 用户场景与需求

1. 作为用户，我想加「优先级 是 高」并看到公式条，改「是/不是」，刷新后还在。  
2. 作为用户，我想 Save 时选择覆盖当前视图或另存为新视图，且只保存筛选条件。  
3. 作为用户，我想在干净的自定义 View 上看定义条件但**没有** Clear，避免误清空视图本身；我改乱了可以用 Clear 回到定义。  
4. 作为用户，我想只改 Display 的分组排序，不影响「筛了谁」的公式。  
5. 作为键盘用户，我想按 `F` 打开加筛选菜单。

---

## 能力边界

| 项 | 边界 |
|---|---|
| 条件连接 | 仅 AND |
| 操作符 | `is` / `is_not` |
| 临时 filter | **URL search**；刷新恢复；不进 Display store |
| View 内容 | name、scope、**filters**、position 等元数据；**不含** sort/group 产品真源 |
| 呈现 | **仅** display-options |
| Save | 覆盖和/或另存；只 filters |
| Clear | **仅临时偏离时出现**；效果=清除 URL 临时并恢复 base |
| 查询 | clause → list/view 输入单点适配；复用既有下推 |
| 规模 | ≤2k 任务量级；不重做虚拟列表 |

---

## Definition of Done

- [ ] clause 为 filters 唯一真源；旧扁平 page-filter 与旧 TaskViewFilters 运行时路径已删除  
- [ ] 临时 filter 在 URL；刷新可恢复  
- [ ] View 不再作为 sort/group 真源；呈现只读 Display  
- [ ] FilterMenu + FilterBar + Save（覆盖/另存）+ Clear 规则符合上表  
- [ ] Display 含 completed 可见性与 default/reset；与 filter 无串味  
- [ ] 全列表场景槽位正确  
- [ ] typecheck + 相关测试通过；A2/A3/模块 ARCH 已同步  
- [ ] 可归档  

---

## 验收标准

- **AC-1**：当用户添加「优先级 是 高」时，系统应展示可编辑 chip，列表仅匹配项，且 URL search 含对应临时条件。  
- **AC-2**：当用户刷新当前页时，系统应恢复刷新前的临时筛选（URL），chip 与列表一致。  
- **AC-3**：当用户点击 chip 的「是/不是」并切换时，系统应更新同一 clause、列表与 URL，无需删建。  
- **AC-4**：当用户处于**非 View**列表且存在临时条件时，系统应显示 Clear；Clear 后 URL 临时清空、列表与 chip 一致。  
- **AC-5**：当用户打开自定义 View 且**未**产生临时偏离时，系统应展示 View 定义 chip，且**不**显示 Clear。  
- **AC-6**：当用户在自定义 View 上修改条件产生临时偏离后，系统应显示 Clear；Clear 后应恢复为该 View **定义**的 filters（非空世界除非定义本空）。  
- **AC-7**：当用户 Save 并选择「另存为新 View」时，系统应只持久化当前生效 filters，不写入 Display。  
- **AC-8**：当用户在自定义 View 上 Save 并选择「覆盖」时，系统应更新该 View.filters 为当前生效公式，并清除临时偏离，再次进入与定义一致。  
- **AC-9**：当用户仅改 Display 分组/排序/显示属性时，系统不得改写 View.filters 或 filter URL。  
- **AC-10**：系统不得再从 View 行读取 sort/group 作为列表呈现真源；呈现只来自 display-options。  
- **AC-11**：Filter 主入口应为锚定菜单/面板，不得以全页 Command 为唯一筛选 UI。  
- **AC-12**：`F`（若注册）与按钮打开同一加筛体验。  
- **AC-13**：各任务列表页工具条 filter / display / 视图操作槽位不得错位。  
- **AC-14**：filters 持久化与运行时均为 clause 形状；无 op 的扁平 statusValues 真源不得存在。  
- **AC-15**：存在 total 语义且有隐藏条数时，应有「N 条被筛选隐藏」类反馈；其 Clear 与 FilterBar Clear 规则一致（仅临时态）。  
- **AC-16**：typecheck 与本任务自动化测试通过；手工走通加条件 → 刷新 → 改 op → 覆盖/另存 → 干净 View 无 Clear → 偏离后 Clear 恢复。

---

## 关联模块

- `src/features/filter/**`  
- `src/features/display-options/**`  
- `src/features/view/**`、`src-tauri/**/view/**`  
- `src/features/task/**`、project 详情、`ViewsPage`  
- `src/features/command/**`（删除/收敛 filter-picker）  
- `src/shared/types/view.ts`、路由 search  
- `PageFrame` / 各 scene  
- `Documents/01-架构/A2`、`A3`  

---

## 当前技术方案

见 [PLAN.md](./PLAN.md)。  
摘要：clause 唯一真源；URL 临时 + View 定义 base；Display 独占呈现；Save 覆盖/另存；无过渡双写；分阶段落地见 TASKS。

---

## 关联文档

- 《任务方案编写 SOP》  
- Linear：Filters / Display options / Custom Views  
- `filter` / `display-options` ARCHITECTURE  
- 归档：`2026-08-03-task-query-board-closeout`（totalCount / 下推）  
- 决议：长期终态、URL 临时 filter、Clear 仅临时、Save 双选项、sort/group 迁出 View  
- **历史过渡/兼容清扫清单**：[优化债台账.md](./优化债台账.md)（与 TASKS P7 对照）  

