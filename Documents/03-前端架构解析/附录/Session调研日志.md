# 附录 · Session 调研日志

> 每个调研 session 追加一节。模板见 [`00-调研协议.md`](../00-调研协议.md) §6。

---

### 2026-07-15 · W0 · 骨架落盘与决策固化

- **完成**：
  - 固化 Grill 决策（读者/可删除性/依赖策略暂缓/scene/文档落点/IPC/完成标准/漂移策略）
  - 新建 `Docs/03-前端架构解析/` 全套骨架
  - 写入调研方案、调研协议、As-Is 分册大纲、Gap/To-Be/Migrate 占位
  - 模块注册表初扫（features 全量、routes 主干、shared、空目录嫌疑）
  - 记录 DOC-DRIFT-001～003
- **更新文件**：`Docs/03-前端架构解析/**`
- **新登记模块**：见 `01-As-Is/00-模块注册表.md` 全表（评级均为 TBD）
- **DOC-DRIFT**：001 T1 路由栈；002 索引滞后；003 文档架构未列 03
- **未决**：
  - 无（决策已齐）
- **下一入口**：**W1** 深挖 `routes/` + `app/router.tsx` + `app/navigation/*`，把 `02-routes-and-navigation.md` 写成颗粒度标尺

---

### 2026-07-15 · W1 · routes + router + navigation

- **完成**：
  - 通读 `app/router.tsx`、`app/navigation/*`（含测试边界）、`routes/**` 全部 file routes
  - 核对真相源矩阵、启动恢复 / remember / back-forward 时序
  - 全量叶子 route 表（all vs spaces 对称与不对称）
  - 六卡级结论：router Optimal；navigation Acceptable；routes Acceptable
  - 债务列表 NAV-D1～D4、RTE-D1～D4（无 Critical）
- **更新文件**：
  - `01-As-Is/02-routes-and-navigation.md`（整篇重写为标尺）
  - `01-As-Is/00-模块注册表.md`
  - `README.md` Wave 进度
- **关键事实**：
  - Hash history + file routes + pathless `_shell`
  - Task 详情仅 `/spaces/:id/tasks/:taskId`
  - settings **不**进入 `isRememberableShellPath`
  - navigation 依赖 features（settings/task/project/command）与 layouts/config
  - 空目录 `routes/debug`、`routes/spaces`
- **DOC-DRIFT**：无新增（DRIFT-001 仍有效）
- **未决**：
  - settings 不可记忆是产品意图还是疏漏？
  - sessionHistory 标签是否应脱离 layouts/config？
- **下一入口**：**W2** · `app/providers` + `app/layouts` + `App.tsx` 装配

---

### 2026-07-15 · W2 · App shell + layouts + providers

- **完成**：
  - 通读 main/App/providers、ShellRouteLayout、ShellLayout（全文件）、MainCard、EntityScene、shell model stores、chrome 分区
  - 校准**生产路径** vs SpaceLayout 遗留
  - Provider 树（App 全局 vs Shell 级）与 QueryClient 默认核对
  - ShellLayout 装配清单、bulk adapters、命令桥
  - 债务 SHELL-D1～D8；DOC-DRIFT-004～006
- **更新文件**：
  - `01-As-Is/03-app-shell-and-layouts.md`
  - `00-模块注册表.md`、`README.md`、附录漂移/Session
- **关键事实**：
  - 生产：route scope → ScopedShellRouteLayout → ShellRouteLayout → ShellLayout
  - ShellLayout ~1271 LOC = God composition root（Debt）
  - MainCard Optimal；EntityScene Acceptable
  - useDrawerStore 半死；实体抽屉走 entity-detail
  - shellDevicePreferences 裸 invoke
- **DOC-DRIFT**：004–006 layouts 短契约过时
- **未决**：
  - SpaceLayout 删除还是仅标测试？
  - ShellLayout 拆分切片粒度（待 W3 摸清 feature 公开面）
- **下一入口**：**W3** · `features/command` 起的平台能力

---

### 2026-07-15 · W3 · features 平台能力（14 个）

- **完成**：
  - 全量文件清单 + 外部消费者计数
  - command / bulk / selection / submit / filter / danger / entity-detail / workspace / sync / update / healthcheck / gsearch / display / metadata 六卡级结论
  - 平台关系图、装配表、平台×平台矩阵、PLAT-D1～D8
- **更新文件**：
  - `01-As-Is/04-features-platform.md`
  - 注册表 §3、README Wave、Session 日志
- **关键事实**：
  - 标杆：submit、danger-confirm、workspace
  - 最大债：command（barrel + ShellCommandActions 焊死 Shell）
  - healthcheck：**0 外部消费者** → Delete 候选
  - metadata-fields 入度最高平台之一
  - entity-detail = URL search 抽屉，非独立页
- **DOC-DRIFT**：无新增
- **未决**：
  - healthcheck 删还是接 Footer？
  - command 公开 API 收口与 Shell 拆分的先后（待 To-Be）
- **下一入口**：**W4** · 领域 features（task 优先）

---

### 2026-07-15 · W4 · features 领域实体（6 个）

- **完成**：
  - task/project/space/lifecycle/view/activity 结构、IPC、Query keys、跨域依赖、消费者、评级
  - 领域关系图；DOM-D1～D6
- **更新文件**：
  - `01-As-Is/05-features-domain.md`
  - 注册表 §4、README、Session 日志
- **关键事实**：
  - 统一 api→query→ui 模式，invoke 收口 api
  - task 79 文件 + detail 子系统；Delete 1 内核
  - lifecycle 委托 t/p/s，编排域正确
  - space api 混 setActiveScope / takePendingCommandOpenIntent
  - view（域）≠ views（场景页）
- **DOC-DRIFT**：无新增
- **未决**：
  - space 杂项 API 是否拆到 platform？
  - task detail 是否正式标子包边界？
- **下一入口**：**W5** · 场景 features（含 thin-shell 与 QC）

---

### 2026-07-15 · W5 · features 场景/页面

- **完成**：
  - 10 个 scene feature 壳厚度、route 矩阵、Delete 分、评级
  - 细化 thickness：ultra-thin / composition-shell / thick-scene / mixed / thick-feature / empty
  - QC 分层核对；settings 交叉引用；列表三页同构；空目录确认
- **更新文件**：
  - `01-As-Is/06-features-scenes.md`
  - 注册表 §5、README、Session
- **关键事实**：
  - 场景层最接近「删 feature ≈ 改 route」
  - archive/trash = 7 行 LifecycleList
  - inbox/all-tasks/no-project = 200+ 行 composition 复制（SCN-D1）
  - task-drawer 空壳；真抽屉在 task/detail
  - QC = 独立窗模块化标杆
- **DOC-DRIFT**：无新增
- **未决**：
  - 列表编排抽公共组件 vs 保持三 feature 目录？
  - ultra-thin 是否内联 route？
- **下一入口**：**W6** · shared + styles + test

---

### 2026-07-15 · W6 · shared + styles + test

- **完成**：
  - shared 全子包统计、ui 六子域、types/lib/events/query/form/autosave/validation
  - styles token 序核对；test 基建核对
  - **分层违规**三处：breadcrumbResolver、create-dialog-shell、use-submit-target-from-form
  - 空目录 config；barrel 清单；SHR-D1～D5
- **更新文件**：
  - `01-As-Is/07-shared-and-styles.md`
  - 注册表 §6–7、README、Session
- **关键事实**：
  - styles / autosave / ui base·board·row·detail = Optimal 标杆
  - shared 不是无价值，但 **方向泄漏是 Critical 候选**
  - types 作 DTO 契约可接受
- **DOC-DRIFT**：无新增
- **未决**：
  - resolver/dialog 迁 app 还是 feature？
  - lint 禁 shared→features 是否 As-Is 后立刻上？
- **下一入口**：**W7** · 依赖矩阵与耦合热点

---

### 2026-07-15 · W7 · 依赖矩阵与耦合热点

- **完成**：
  - 静态扫描 feature 入/出度、热边、2-环、app/routes/shared 层边
  - God/枢纽表、删不掉清单、可删除性差距叙事
  - Gap 优先级 P0–P3
- **更新文件**：
  - `01-As-Is/08-dependency-matrix.md`
  - 注册表检查项、README、Session
- **关键数字**：
  - 入度：task 64 · command 55 · project 49 · metadata 39 · bulk 33
  - 出度：task 11 · 列表 scene 各 8
  - 热边：task→metadata 15 · task→project 13
- **DOC-DRIFT**：无新增
- **未决**：
  - indegree 是否应排除测试文件再出一版「生产-only」？
- **下一入口**：**W8** · 数据与状态地图

---

### 2026-07-15 · W8 · 数据/状态/副作用地图 · Phase A 收官

- **完成**：
  - Query keys 全表、mutations 清单、invalidate 策略
  - Zustand/Provider 状态表
  - IPC invoke 命令全表（领域+平台+QC）
  - 前端事件 + Tauri 事件 + 刷新链路
  - Tauri Store / localStorage 键
  - 双通道检查；DATA-D1～D6
  - As-Is 验收核对通过
- **更新文件**：
  - `01-As-Is/09-data-and-state-map.md`
  - README 标 Phase A 完成；注册表；Session
- **关键事实**：
  - 服务器状态 Query 主体健康
  - 无列表双写 store
  - badges 直打 api = 双通道
  - workspace 默认广 invalidate
- **DOC-DRIFT**：仍仅记不改（8=B；As-Is 已完成，**可以**开 Batch 回写，但属单独任务）
- **下一入口**：**Phase B Gap**（评估矩阵 + 反模式汇总）

---

### 2026-07-15 · Phase B 波次规划（未执行 G0）

- **完成**：
  - 将 Gap 拆为 **G0–G5**（台账 → P0 → P1 → P2 → P3/KISS → 收官）
  - 写入 `02-Gap/00-Gap波次方案.md`
  - 更新 README / 调研方案 / Gap 文档状态
- **不做**：本 session 不深评任何债务
- **下一入口**：**G0** 建债台账

---

### 2026-07-15 · G0 · 债台账与评分尺

- **完成**：
  - 建 `02-Gap/01-债台账.md`：全部 `*-D*` + DRIFT-001～006
  - 合并别名：DATA-D2=SHELL-D4、DATA-D3=SHELL-D5、DATA-D5=SHELL-D3、SHR-D3=DOM-D3、PLAT-D3⊃DATA-D4
  - 冻结评分尺；每条分配 P0–P3 与 G1–G4
  - 评估矩阵 / 反模式改为可增量结构；Optimal 四行预填 2 分
  - Delete 候选速查列表
- **不做**：不深评 P0（留给 G1）
- **下一入口**：**G1** · SHR-D1 + SHELL-D1

---

### 2026-07-15 · G1 · P0 防火墙评估

- **完成**：
  - **SHR-D1** 债务卡：三文件证据、消费者、迁出候选、模块分 1.0/1.4
  - **SHELL-D1** 债务卡：1271 行、≥22 feature import、拆分候选层、模块分 **0.6**
  - P0 排序：先 SHR-D1（小切片）→ 后 SHELL-D1（绑 PLAT-D2）
  - 确认 **不可 wontfix**；更新矩阵 Top1–2 assessed
- **关键结论**：
  - shared 反向依赖 = 防火墙失效，Extract
  - ShellLayout = 装配位正确、形态失败，Split
- **下一入口**：**G2** · command + 三列表 DRY

---

### 2026-07-15 · G2 · P1 平台与列表

- **完成**：
  - **PLAT-D2**：~34 方法 ShellCommandActions 焊在 ShellLayout → P1-1，绑 SHELL-D1
  - **SCN-D1**：三页 22 共同 import、~663 行 → 可删性 N 阻碍、维护 P1-2
  - **PLAT-D1**：export * barrel → P1-3
  - **PLAT-D4**：仅类型依赖 → **降 P2**，可接受
  - 模块分：command 1.0 · bulk 1.3 · selection 1.9 · 三列表 1.4
- **下一入口**：**G3**

---

### 2026-07-15 · G3 · P2 死代码 / 环 / 双通道

- **完成**：
  - **M-0 Delete 包**：task-drawer、空 api/model、routes 空目录、shared/config、healthcheck（默认删）、SpaceLayout 处理、useDrawerStore
  - DATA-D2 badges / DATA-D5 裸 invoke / DATA-D1 广 invalidate（接受短期）
  - 环：task↔project 接受；meta 治理；command 归壳史诗
  - DOM-D2 Keep 内核
  - 模块分 task 1.3 · meta 1.1 · health 1.6 等
- **下一入口**：**G4**

---

### 2026-07-15 · G4 · P3 + 不做清单 + DRIFT 计划

- **完成**：
  - P3 全部分桶：wontfix / piggyback / later / product / Document
  - 不做清单 13 条有理由（RTE-D1、SCN-D5、命名债、DATA-D6 等）
  - piggyback 挂靠 SHELL-D1 / PLAT-D1
  - NAV-D3 标 product（默认不记忆 settings）
  - DRIFT Batch A/B/C 计划写入台账 + 附录
- **下一入口**：**G5** Gap 收官

---

### 2026-07-15 · G5 · Phase B 收官

- **完成**：
  - 评估矩阵定稿（治理组 + 健康组模块分）
  - Top 15 债冻结（可删除性优先）
  - 耦合热点叙事定稿
  - `02-To-Be输入摘要.md`（决策问题 + 推荐 B′ + M-0…M-3 史诗序）
  - Phase B 出口清单全部打勾
  - `03-To-Be/目标架构.md` 挂接输入
- **下一入口**：**Phase C To-Be**

---

### 2026-07-15 · Phase C 波次规划（未执行 T0）

- **完成**：
  - Phase C 拆为 **T0–T7**（原则→分层→路由→数据→壳→Feature→doctor→契约）
  - 写入 `03-To-Be/00-To-Be波次方案.md`
  - 约定 `npx react-doctor@latest`：**T6 基线**；M-0/M-1/M-2 后复跑；不替代架构设计
- **不做**：本 session 不写死全部 To-Be 细则（待讨论/grill）
- **下一入口**：架构讨论答题 → **T0**

---

### 2026-07-15 · Phase C 讨论启动 + react-doctor 基线

- **grill 已确认**：
  - 互依 **B′**
  - 破坏性：**允许阶段性大爆炸**
  - 列表 wiring：T0 只锁不进 shared，落点 T5
  - doctor：**现在跑基线**
- **react-doctor v0.7.8**：709 files · **51/100 Critical** · 271 issues  
  归档：`附录/react-doctor/`（log + diagnostics + README 摘要）
- **下一入口**：继续 grill（见对话）→ **开 T0** 写原则

---

### 2026-07-16 · T0 · 架构原则与术语冻结

- **完成**：
  - 写入 `03-To-Be/01-架构原则与术语.md`（P1–P12 · 术语 · 决策日志 · doctor · 决策树）
  - 吸收讨论 v3.1：`features/{components,hooks,api,model}` · `shared/*` · `layout/` 上提 · routes 薄页 · 无 monorepo
  - 实践对齐（原则级）：Composition / React BP / TanStack Router / Query → 分波 T2–T6 深化
  - 开放问题压到 3 个（O1 细目录矩阵 · O2 小 feature 夹强度 · O3 public 形态）→ T1
- **同步**：波次方案 T0 ✅ · README · 目标架构.md 改为 T1 占位 · 草案标「服从 T0」
- **不做**：完整目录树（T1）、搬家表（Migrate）
- **下一入口**：**T1** 填写 `目标架构.md`

---

### 2026-07-16 · T1 · 目标分层与依赖法

- **完成**：
  - 定稿 `03-To-Be/目标架构.md`：目标 `src/` 树、feature 内四夹、顶层+B′ 依赖矩阵、public 约定
  - 关闭 O1–O3；Gap SHR-D1/SHELL-D1/SCN-D1 等目标态消灭表；β 试点标准
  - 带出非阻塞题 → T2 loader 策略 / T3 invalidate / T4 CommandBridge API
- **同步**：波次方案 T0–T1 ✅ · README 下一站 T2 · T0 文档 O 题标已关
- **不做**：搬家表、路由时序正文（T2）
- **下一入口**：**T2** `02-路由与导航生命周期.md`

---

### 2026-07-16 · T2 · 路由与导航生命周期

- **完成**：
  - 定稿 `03-To-Be/02-路由与导航生命周期.md`
  - 时序：冷启动恢复 → scope remember → session history → intent 导航 → 详情 loader
  - 职责三分：routes / navigation / intents；loader+ensureQueryData 边界；search 契约；TanStack 对齐
  - settings 不记忆 Accept；列表 DRY 在 feature hooks 不在合并 route 文件
- **同步**：波次方案 T0–T2 ✅ · README 下一站 T3
- **下一入口**：**T3** `03-数据与状态生命周期.md`

---

### 2026-07-16 · T3 · 数据与状态生命周期

- **完成**：
  - 定稿 `03-To-Be/03-数据与状态生命周期.md`
  - Server：key factory、mutation→invalidate→event、QueryClient 默认、与 loader/preload 衔接
  - Client 分类表：URL / Query / Store / Zustand / Registry；DATA-D1 Accept+渐进 include；D2/D3/D5 Fix
  - 主窗 vs QC 数据边界；workspace sync 刷新全图
- **同步**：波次方案 T0–T3 ✅ · README 下一站 T4
- **下一入口**：**T4** `04-壳与平台拼装.md`

---

### 2026-07-16 · T4 · 壳与平台拼装

- **完成**：
  - 定稿 `03-To-Be/04-壳与平台拼装.md`
  - 全局 vs shell-only Provider；四块：Providers / CommandBridge / Chrome / Overlays
  - 命令 slices 组合灭 PLAT-D2；注册式 bulk/selection/submit/filter
  - 新能力 10 项接入清单；Composition；Gap SHELL-D1 映射与 M-2 子序
- **同步**：波次方案 T0–T4 ✅ · README 下一站 T5
- **下一入口**：**T5** `05-Feature模块化.md`

---

### 2026-07-16 · T5 · Feature 模块化

- **完成**：
  - 定稿 `03-To-Be/05-Feature模块化.md`
  - platform/domain/scene/window 定义；~30 feature 映射表
  - 目录强制/建议；SCN-D1 → `useTaskListScene`；QC 边界；DRY 第三次法则
  - 试点 task + 三列表薄页标准
- **同步**：波次方案 T0–T5 ✅ · README 下一站 T6
- **下一入口**：**T6** `06-React实践与检测.md`

---

### 2026-07-16 · T6 · React 实践与检测

- **完成**：
  - 定稿 `03-To-Be/06-React实践与检测.md`
  - Composition / React BP / Router / Query 项目检查表（含桌面 N/A）
  - doctor 基线精读：51 分 · Top rules 映射 Gap/新债/忽略
  - 复跑协议绑定 M-0…M-3；不刷分替代架构
  - 更新附录 react-doctor README §4–5
- **同步**：波次方案 T0–T6 ✅ · README 下一站 T7
- **下一入口**：**T7** 模块边界契约 + Gap Accept/Fix + Phase C 出口

---

### 2026-07-16 · T7 · Phase C 出口

- **完成**：
  - `模块边界契约.md`：app/layout/routes/shared + domain/platform/scene/QC 公开面与删除清单
  - `07-Phase-C出口与Gap映射.md`：Top15 Accept/Fix · 出口核对 · D 史诗序
  - `04-Migrate/重构切片路线图.md`：M-0…β 卡片与验收
- **同步**：波次方案 T0–T7 ✅ · README → Phase D
- **下一入口**：**Phase D** 从 **M-0** 零行为 Delete 开刀（或 Doc-C 并行）

---

## Phase 总览（截至 T7）

| Phase | 状态 |
|-------|------|
| A As-Is | ✅ |
| B Gap | ✅ |
| C To-Be T0–T7 | ✅ |
| D Migrate | 模板 + M-0 执行计划已建 · 代码未动 |

---

### 2026-07-16 · Phase D 执行计划体系

- **完成**：
  - `04-Migrate/00-执行计划模板.md`
  - `04-Migrate/M-0-零行为Delete/执行计划.md`（路径级清单 + 验收）
  - 路线图挂执行计划链接与状态列
- **约定**：一史诗一目录一 `执行计划.md`；开干前写，合并后标 done
- **下一入口**：按 M-0 计划改代码，或先建 Doc-C 计划并行

---

### 2026-07-16 · M-0 执行完成

- **删除**：task-drawer、healthcheck、SpaceLayout(+test)、useDrawerStore、inbox/trash 空 api·model、空 routes/debug·spaces
- **改**：useDialogStore 去掉死 drawer close；LifecycleList/ViewsPage 测试改 mock entity-detail
- **验收**：`bun run check` 绿
- **下一入口**：M-1 shared 防火墙（先写执行计划）或 Doc-C 文档回写

---
