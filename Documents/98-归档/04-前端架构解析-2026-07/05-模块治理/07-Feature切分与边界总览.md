# Feature 切分与边界总览（防「单模块最优、切分错误」）

> 日期：2026-07-17  
> 目的：在继续 lifecycle / filter 等**单模块深谈**之前，先回答：  
> **现在这 22 个 feature 目录切得对不对？该并、该拆、还是只迁所有权？**  
> 与单卡关系：单卡谈「模块内如何纯化」；本文谈「该不该有这个模块」。  
> 前提：T2 + 模块设计规范；允许破坏性重构。

---

## 0. 你的担心（成立）

```txt
每个 feature 内部都谈成「最优」
    ≠
feature 边界（目录怎么切）正确
```

若切分错了：再纯化也是在**错误格子**里装修。  
本文给出 **全仓切分审计** 与 **推荐目标切分**，再决定是否继续逐个深谈。

---

## 1. 切分原则（用来判 Keep / 并 / 拆）

| # | 原则 | 判据 |
|---|------|------|
| C1 | **一个可删产品能力 ≈ 一个 feature（或明确 scene）** | 卸掉时主要删 routes 挂载 + public 消费者 |
| C2 | **有独立持久实体/聚合 → domain feature** | 自有 api + query keys 根 |
| C3 | **跨多实体、被壳装配 → platform feature** | 不宜并进 task/project |
| C4 | **仅一页 UI、数据全来自 domain → scene（可独立夹或 routes 内）** | 禁止再造第二套 api |
| C5 | **独立窗/进程体验 → window feature** | 不与 main layout 合并 |
| C6 | **第三次重复再抽 platform**；禁止预防性拆包 | |
| C7 | **巨石先内拆夹，不优先新 feature 名** | task-detail 不必 `features/task-detail` |
| C8 | **所有权归位 ≠ 新 feature** | bulk 的 task adapter 回 task，不必 `features/task-bulk` |

---

## 2. 现网 22 feature 一张表

| Feature | 类 | ~文件 | 切分裁决 | 说明 |
|---------|-----|-------|----------|------|
| **task** | domain | 82 | **Keep** · 内拆 | 内核；不吞其它实体；不拆成 task-list/detail 包 |
| **project** | domain | 19 | **Keep** | 独立实体 |
| **space** | domain | 11 | **Keep** | 独立实体；pending intent 迁出属 api 纯化 |
| **view** | domain+scene | 12 | **Keep** | 定义+跑列表；页 facade 减重 |
| **lifecycle** | domain 编排 | 14 | **Keep** | 跨实体归档/回收；**不要**并进 task |
| **activity** | domain 薄 | 8 | **Keep 观察** | 若几乎仅 task 时间线 → 可「实现内聚 task、夹可留/可薄」 |
| **command** | platform | 59 | **Keep** | 总线；handlers 不归 layout |
| **bulk-action** | platform | 43 | **Keep 引擎** | 域 actions/adapter **迁出**（非删包） |
| **selection** | platform | 13 | **Keep** | 与 bulk 不合并 |
| **filter** | platform | 4 | **Keep** | 与 display-options 不合并 |
| **display-options** | platform | 29 | **Keep** | 观感偏好 ≠ 筛选条件 |
| **submit** | platform | 5 | **Keep** | 小而精 |
| **danger-confirm** | platform | 6 | **Keep** | 可与 bulk 协作，不并包 |
| **metadata-fields** | platform | 27 | **Keep** | 跨实体字段；禁并 task |
| **entity-detail** | platform | 10 | **Keep** | URL 抽屉契约 |
| **global-search** | platform | 14 | **Keep** | 与 QC 搜共享端口，不并 QC |
| **workspace** | platform 极薄 | 3 | **Keep** | 仅失效；不并 space |
| **sync** | platform | 12 | **Keep** | |
| **update** | platform | 18 | **Keep** | 不并 sync |
| **settings** | scene+配置 | 18 | **Keep** | |
| **project-overview** | scene | 5 | **Keep（默认）** | 可选并 project；非必须 |
| **launcher** | window | 48 | **Keep** | 创建内核复用 task，**不并** task |

**已不在目录、正确删掉的假 feature：** inbox / all-tasks / no-project / archive / trash / views 壳 / healthcheck / task-drawer。

---

## 3. 并？拆？迁？——分类清单

### 3.1 建议 **不要合并** 的（常见误判）

| 误判 | 为何不并 |
|------|----------|
| task ∪ project ∪ space | 三实体；页可嵌列表，包不可吞 |
| task ∪ view ∪ lifecycle | 定义/跨实体编排 ≠ 任务实体 |
| selection ∪ bulk ∪ command | 选 / 执行 / 总线 三职 |
| filter ∪ display-options | 条件 vs 展示 |
| sync ∪ update | 云同步 vs App 更新 |
| space ∪ workspace | 实体 vs 失效总线 |
| QC ∪ task | 窗生命周期 vs 领域 |
| entity-detail ∪ task | 打开契约 vs 详情 UI |
| metadata ∪ task | 跨实体控件 |

### 3.2 建议 **保持独立、只改所有权**（不是并包）

| 现状错位 | 目标 |
|----------|------|
| bulk 内 task/project/lifecycle actions+adapters | **回各 domain**；bulk 只剩引擎 |
| layout command-bridge 业务 slices | **handlers 回 domain**；command 总线 |
| layout taskOpenStrategy | **task public** |
| QC / 主窗双份创建规则 | **task create 内核**；两宿主 |
| takePendingCommandOpenIntent 在 space | **command/app 端口** |
| build*CommandSelection 在 selection | **可选回 domain** |

这些是 **切分大体对、所有权歪了**——继续单模块谈时要盯这个，而不是再切目录名。

### 3.3 真正值得讨论的 **并/拆**（开放、数量少）

| ID | 选项 | 推荐 | 条件 |
|----|------|------|------|
| **M1 project-overview** | 并入 project vs Keep scene | **Keep** | 若永远 1 页极薄且无独立迭代 → 可并 |
| **M2 activity** | Keep vs 实现并入 task | **Keep 夹，可迁实现** | 仅 task 时间线且无独立演进时再并 |
| **M3 filter 极小（4 文件）** | Keep vs 并入 display-options 或 task | **Keep** | 壳 Provider 独立装配；并了反而糊 |
| **M4 workspace 极小（3 文件）** | Keep vs 并入 sync/app | **Keep** | 失效与同步 UI 不同；过瘦不是错 |
| **M5 danger-confirm** | Keep vs 并入 bulk | **Keep** | 单条危险确认也被用 |
| **M6 task 内拆新 feature** | task-list / detail / create 包 | **否 · 只内拆夹** | 见 C7 |
| **M7 view 再拆 views scene** | 定义 / 页两包 | **否** | 已合并 views；用 facade |
| **M8 settings 拆多 feature** | 按 panel | **否** | 一 settings 足够；panel 内拆 |
| **M9 command 拆 keybinding feature** | | **否** | 同生命周期，内拆夹即可 |

### 3.4 **不存在**的切分问题（已处理）

- 每 URL 一个 feature → 已消灭  
- archive/trash 独立 feature → 已归 lifecycle + routes  
- views vs view 双包 → 已并 view  

---

## 4. 目标切分图（推荐终态目录心智）

```txt
domain/
  task          （内：list-scene, detail, create内核, bulk贡献, commands注册）
  project       （内：detail scene facade, bulk贡献, commands；overview 可选同包或旁夹）
  space
  view
  lifecycle
  activity      （薄；可观察）

platform/
  command       （总线+UI；无业务 handlers）
  bulk-action   （纯引擎）
  selection
  filter
  display-options
  submit
  danger-confirm
  metadata-fields
  entity-detail
  global-search
  workspace
  sync
  update

scene/
  settings
  project-overview   （可选并进 project）

window/
  launcher       （runtime/几何后议；创建规则用 task）
```

**相对现网：目录名几乎不用大变；变的是「谁拥有代码」与「禁止倒依赖」。**

---

## 5. 和「逐个谈模块」怎么配合

| 顺序 | 内容 | 状态 |
|------|------|------|
| **0** | **切分总览（本文）** | 现在补 |
| 1 | 装配三角 + 规范 + T2 | 已做 |
| 2 | 内核域 task/project/space + 平台 command/bulk/selection | 已做 |
| 3 | QC（+ 几何后议）view | 已做 |
| 4 | 其余 platform：lifecycle, filter, display-options, meta, submit, entity-detail, search, workspace, sync, update, settings, activity, overview | **在切分认可后再深谈** |
| 5 | 改代码：所有权归位优先于新切包 | |

**建议你先认可/修改本文 §3–§4**，再继续 lifecycle/filter 深谈——否则可能在错误切分上优化。

---

## 6. 直接回答

**Q：有没有该合并或拆分的 feature？**  
**A：**  
- **该大拆大并的包：基本没有。** 现网 22 个切分大体正确。  
- **该做的是所有权归位 + 内拆夹**，不是再发明一堆 `task-*` 或把平台并进 task。  
- **真正可选并的只有少数：** project-overview（弱）、activity 实现位置（弱）。  
- **明确不要并的：** selection/bulk/command/filter/display、QC/task、lifecycle/task 等。

**Q：怕每个模块最优但 feature 分错？**  
**A：** 风险主要在 **「业务写在 layout/bulk 里」**，不在「目录多了两个 platform」。用本文锁定切分后，单模块谈只优化**格子内**与**格子间端口**。

---

## 7. 请你拍板（切分层）

| # | 议题 | 推荐 |
|---|------|------|
| 1 | 22 包大体 Keep，不大合并潮 | 是 |
| 2 | task/project 不拆成多 feature 名 | 是 |
| 3 | project-overview 默认 Keep scene | 是 |
| 4 | activity 暂 Keep，不强制并 task | 是 |
| 5 | filter/workspace 虽小也 Keep | 是 |
| 6 | 优先「迁所有权」而非「改目录名」 | 是 |

**2026-07-17 用户确认：** 切分大体正确则放心；拆分也要最佳实践；**默认以上拍板通过**，继续逐模块深谈（lifecycle 起）。

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：全仓 22 切分审计、并拆迁分类、目标图 |
