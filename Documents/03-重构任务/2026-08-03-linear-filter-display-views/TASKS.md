# Linear 式 Filter · Display · Views - Tasks

## 当前阶段

**P6 完成 → 下一阶段 P7**（历史债清扫）

执行任意 task 前重读 SPEC 对应 AC 与 PLAN 对应章节。

## 阶段任务

### P0 · 领域核心（无 UI）

- [x] T1 在 `src/features/filter/core/`（或等价路径）新增 `FilterQuery` / `FilterClause` 类型、`normalizeFilterQuery`、`isFilterQueryEmpty`、`filterQueriesEqual`，并写 vitest  
  - _对应验收标准：AC-14_  
  - _测试先行：`src/features/filter/core/*.test.ts`_

- [x] T2 实现 FilterQuery 的 URL search 编解码（parse 失败 → empty）与 round-trip 单测，约定 search 键名写入 core 或路由旁注释  
  - _对应验收标准：AC-1, AC-2_  
  - _测试先行：同上 codec 测试_

- [x] T3 实现唯一适配层 `toListTasksInput` / 对 run view 的映射（clause → 现有 statuses/priorities/date/project 等），禁止其它文件复制映射逻辑；单测覆盖 status/priority/project/due  
  - _对应验收标准：AC-1, AC-14_  
  - _测试先行：`filter/core/adapt*.test.ts`_

### P1 · View / Rust 契约：filters 终态

- [x] T4 将 `TaskViewFilters` 与后端 `filters_json` 迁移为 `FilterQuery` 形状：读写、create/update/validate；提供旧 JSON → clause 的一次性迁移函数（启动或首次 list 时写回），**不**保留运行时双解析长期分支  
  - 触及：`src/shared/types/view.ts`、`src/features/view/**`、`src-tauri/**/view/**`  
  - _对应验收标准：AC-7, AC-8, AC-14_

- [x] T5 从产品路径移除 View 的 sort/group 真源：前端类型/API/编辑器停止读写；Rust run/create/update 忽略或删除对 sort/group 列的产品依赖；请求侧 sort/group 仅允许来自 **当前 Display 解析结果**  
  - _对应验收标准：AC-9, AC-10_

- [x] T6 一次性迁移：旧 View 的 sort/group → 对应 `task:view:{id}` 的 display-options 存储（推荐写入 default 槽），并加测试或脚本可重复执行保护  
  - _对应验收标准：AC-10_

### P2 · Display 独占呈现

- [x] T7 将 completed / 已完成可见性从 page-filter 快捷操作迁入 `DisplayOptionsPanel`；从 filter 能力中删除 showCompleted 筛选语义串味  
  - 触及：`src/features/display-options/components/DisplayOptionsPanel.tsx`、filter controller 调用方  
  - _对应验收标准：AC-9_

- [x] T8 收敛 Display UI：Ordering 行内嵌方向；completedOrder 改为 toggle 语义；隐藏 List/Board；确认 Set as default / Reset 只碰 display store  
  - _对应验收标准：AC-9, AC-10_

- [x] T9 改 `ViewEditorDialog`（及 form）：删除 sort/group 表单项，仅编辑 name/scope/filters（filters 可先简单或接后续 Filter UI）  
  - _对应验收标准：AC-10_

### P3 · 列表会话：base / temp / effective

- [x] T10 实现列表筛选会话 hook（如 `useListFilterSession`）：输入 base（view.filters 或 empty）+ 路由 search temp → effective；提供 setTemp/clearTemp/replace 与路由同步  
  - 触及：task/project/view 的 scene hooks 将接入  
  - _对应验收标准：AC-1, AC-2, AC-4, AC-5, AC-6_

- [x] T11 全部任务 / 独立事项 / 项目详情 / Views 的数据请求改为 effectiveFilters → adapt → list/run input；删除对旧 `PageFilterState` 扁平字段驱动查询的路径  
  - _对应验收标准：AC-1, AC-14_

- [x] T12 导航规则：进入自定义 View 默认干净态（不带其它页 temp）；在 View 上首次编辑写入 temp 标记 dirty  
  - _对应验收标准：AC-5, AC-6_

### P4 · Filter UI 主路径

- [x] T13 实现锚定 `FilterMenu`（字段 → 值 → 生成/合并 clause），由 `PageFilterButton` 打开；**不以**全页 Command 为唯一 UI  
  - 触及：`src/features/filter/components/**`  
  - _对应验收标准：AC-11, AC-12_

- [x] T14 实现 `FilterBar`：chip（field 不可改类型；op/values 可点）、`+`、按 SPEC 显示 Clear、Save 入口；点 op/values 写回 temp/URL  
  - _对应验收标准：AC-1, AC-3, AC-4, AC-5, AC-6_

- [x] T15 PageFrame 或列表 scene 增加 toolbar 下方 FilterBar 插槽；全部任务/独立事项/项目/Views 接线  
  - _对应验收标准：AC-13_

- [x] T16 「N 条被筛选隐藏」反馈（有 total 时）；Clear 与 Bar 规则一致  
  - _对应验收标准：AC-15_

### P5 · Save、删旧、槽位

- [x] T17 Save 流程：effective 非空可 Save；自定义 View 上下文提供「覆盖当前」与「另存为」；非 View 仅另存为；只写 filters；成功后 clearTemp  
  - 触及：`src/features/view/**` dialog/actions  
  - _对应验收标准：AC-7, AC-8_

- [x] T18 打开已保存 View：base=view.filters，干净态 chip，无 Clear；列表结果与定义一致  
  - _对应验收标准：AC-5, AC-7, AC-8_

- [x] T19 删除或掏空旧路径：`PageFilterState` 扁平真源、`FilterPickerCommandGroup` 作为主实现、register 里仅 filter 的重复逻辑；`F` 改为打开 FilterMenu（可保留 command action 薄封装）  
  - 触及：`src/features/filter/**`、`src/features/command/**`  
  - _对应验收标准：AC-11, AC-12, AC-14_
  - 注：扁平 controller 仍作 Command 桥/兼容至 P7；主路径已改为 emitFilterUiEvent → FilterMenu，不再 openCommand(filter-picker)

- [x] T20 修复 ViewsPage 及所有列表页工具条：filterAction / displayAction / 视图操作分离，禁止再占错槽  
  - 触及：`ViewsPage.tsx`、`TaskListSceneView.tsx`、`ProjectPage.tsx` 等  
  - _对应验收标准：AC-13_

### P6 · 验收与长期文档

- [x] T21 跑 typecheck 与相关 vitest/cargo test；按 AC-1…AC-16 对照清单（自动化 + 代码路径核对；完整手工 UI 仍建议发布前点一遍）  
  - _对应验收标准：AC-16_  
  - 自动化：`typecheck` ✅ · `lint:boundaries` ✅ · filter/display/view/page-frame vitest 57 ✅ · cargo view 9 ✅  
  - AC 代码路径核对见下方「P6 AC 核对」

- [x] T22 同步长期文档：A2、A3、`filter`/`display-options`/`view` ARCHITECTURE；更新本 TASKS 与 [优化债台账.md](./优化债台账.md)  
  - _对应验收标准：DoD_

#### P6 AC 核对（代码路径，非全量手工）

| AC | 结果 | 依据 |
|---|---|---|
| AC-1 加条件 chip + 列表 | 路径具备 | FilterMenu→session→adapt→listInput |
| AC-2 刷新恢复 temp | 路径具备 | URL `f` + useListFilterSession |
| AC-3 改 op | 路径具备 | FilterBar OpPicker→replaceEffective |
| AC-4 Clear 临时 | 路径具备 | dirty 时 Clear / clearTemp |
| AC-5 干净 View 无 Clear | 路径具备 | FilterBar：!dirty 不渲染清除 |
| AC-6 dirty Clear→base | 路径具备 | clearTemp；effective=base |
| AC-7/8 Save 另存/覆盖 | 路径具备 | FilterSaveDialog + createView/updateView 只 filters |
| AC-9 Display 不改 filters | 路径具备 | display store 独立 |
| AC-10 呈现不读 View sort | 路径具备 | create/update 不写；apply 用 display |
| AC-11/12 锚定菜单 + F | 路径具备 | emitFilterUiEvent；register 停 filter-picker |
| AC-13 槽位 | 路径具备 | PageFrame + ViewsPage 修正 |
| AC-14 clause 真源 | 路径具备 | FilterQuery 前后端 |
| AC-15 N hidden | 部分 | UI 位已接；count 现为 null（无可靠反推） |
| AC-16 自动化 | 通过 | 见上 |

**未自动化、建议手工：** 真机加筛→刷新→改 op→覆盖/另存→干净 View Clear 行为→Display 改分组条数。

### P7 · 历史债清扫与架构收口（对照优化债台账）

> 依据：[优化债台账.md](./优化债台账.md)。本阶段目标：**过渡/兼容/双路径删干净**，不是加功能。  
> 与 P0–P6 重叠的删除若已在前面做完，本阶段 **复查 + grep 验收** 即可勾选。

- [ ] T23 按债台账 **§2.4 删除清单** 全库 grep：确认活跃路径无扁平 PageFilter 真源、无 Command-only filter-picker、无 showCompleted∈filter hasActive、无产品读 View.sort/group 驱动呈现；有则删净  
  - 债：D-01, D-05, D-04, D-03  
  - _对应验收标准：AC-10, AC-11, AC-14 · DoD_

- [ ] T24 删除 `serverDrivenFilters` 跳过表主路径：列表只走 effective→`filter/core` adapt→query；移除 `useTaskPageFilterController` 内「跳过 + 本地 matches」双执行（无正当降级则整段删）  
  - 触及：`src/features/task/hooks/useTaskPageFilterController.ts` 及 list/project/view 传参  
  - 债：D-10  
  - _对应验收标准：AC-14 · DoD_

- [ ] T25 删除 `externalFilter` + `EMPTY_TASKS_FOR_EXTERNAL_FILTER` 占位双挂：`useTaskCollectionScene` 只消费唯一 filter session，不再 internal/external 分叉  
  - 触及：`src/features/task/hooks/useTaskCollectionScene.ts`、`useTaskListScene.ts`、`useProjectDetailScene.ts`  
  - 债：D-11, D-21  
  - _对应验收标准：DoD_

- [ ] T26 统一全部列表场景（全部任务 / 独立事项 / 项目详情 / Views）的 effective→adapt 规则，消灭 Views 与 list 的 serverDriven 不一致  
  - 触及：`useViewsScene.ts` 等  
  - 债：D-12  
  - _对应验收标准：AC-13, AC-14_

- [ ] T27 清理 `useTaskViewRunQuery`「兼容旧调用」：应用侧只保留 infinite；删除死调用或移入测试/明确废弃并去掉生产 import  
  - 触及：`src/features/view/hooks/view.queries.ts` 及引用方  
  - 债：D-13  
  - _对应验收标准：DoD_

- [ ] T28 收敛日期枚举双轨：`PageDateFilterValue` 与 View `DateFilterMode` 合并进 clause 值语义 + 单一 codec；删除仅服务旧 page filter 的重复日期工具（若已被 T3 覆盖则复查）  
  - 债：D-14  
  - _对应验收标准：AC-14_

- [ ] T29 View 查询「SQL 候选 + 内存」策略：在 `src-tauri/.../view` 用显式分支/模块命名标清可 SQL vs 内存降级，禁止静默丢条件；**不**在本任务强上全 SQL keyset（见债台账 F-02）  
  - 债：D-24  
  - _对应验收标准：与 AC-14 一致不丢条件_

- [ ] T30 对照债台账 §2 将 D-01…D-24 标 `done`；§3 后置项 F-01…F-07 写明去向（后续任务名或 won't fix）；确认无「兼容层」回流  
  - _对应验收标准：DoD_

- [ ] T31 全部 P0–P7 勾选且债台账本任务内条目完成后，将本目录（含 SPEC/PLAN/TASKS/优化债台账）移入 `Documents/98-归档/02-已完成重构/`  
  - _对应验收标准：DoD_

---

## 阻塞

- 无（方案已按用户决议修订）  
- 延后不阻塞本任务：见 [优化债台账.md](./优化债台账.md) §3（菜单搜索、View 全 SQL keyset、Board 布局等）

## 与 SPEC/PLAN 的实施偏差

（执行期填写；若 Clear/URL 与真机 Linear 细节冲突，先记偏差再改 SPEC）

## 完成记录

| 日期 | 记录 |
|---|---|
| 2026-08-03 | 初版 SPEC/PLAN；TASKS 曾停方案确认 |
| 2026-08-03 | 对照 Linear 文档补「对齐与偏差」 |
| 2026-08-03 | 按用户澄清重写：白话照抄表；URL 临时 filter；sort/group 终态进 Display；Clear 仅临时；Save 覆盖\|另存；禁止过渡；TASKS 拆 P0–P6 / T1–T23 |
| 2026-08-03 | 审计历史任务债；新增 [优化债台账.md](./优化债台账.md)；TASKS 增加 **P7**（T23–T31）清扫过渡/兼容/双路径 |
| 2026-08-03 | **P0 完成**：`src/features/filter/core`（types/normalize/url-codec/adapt）+ 20 tests；公共面导出；ARCHITECTURE 更新 |
| 2026-08-03 | **P1 完成**：View/Rust filters→FilterQuery；create/update 不写 sort/group；编辑器只存 filters；T6 迁 display + update 清空 |
| 2026-08-03 | **P2 完成**：showCompleted∈Display；排序方向内嵌；完成按近到远 toggle；设为默认/恢复默认；List 用 display 下推 |
| 2026-08-03 | **P3 完成**：useListFilterSession + URL `f`；list/project/views effective→adapt；Command 桥不覆盖纯 URL temp |
| 2026-08-03 | **P4 完成**：FilterMenu/FilterBar/Save 对话框；PageFrame.filterBar；Views 槽位修正；ListFilterUiProvider |
| 2026-08-03 | **P5 完成**：Save 覆盖/另存；F/命令→FilterMenu 事件；停用 filter-picker 主路径；Views 槽位 |
| 2026-08-03 | **P6 完成**：自动化验收；A2/A3/三 feature ARCH + 债台账同步；AC 路径核对 |
