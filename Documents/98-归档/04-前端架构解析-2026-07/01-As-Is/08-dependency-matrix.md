# As-Is · 08 依赖矩阵与耦合热点

> 状态：**W7 完成**（2026-07-15）  
> 方法：静态 `from '@/features/X'` / `@/app` / `@/shared` 扫描（Python 汇总）+ W1–W6 定性结论  
> 单元格语义见 [`00-调研协议.md`](../00-调研协议.md) §5（本分册以文件计数为主）  
> **非**运行时依赖；动态 import 极少，未单独计。

---

## 0. 执行摘要

| 发现 | 含义 |
|------|------|
| **入度枢纽** | `task`(64) · `command`(55) · `project`(49) · `metadata-fields`(39) · `bulk-action`(33) |
| **出度枢纽** | `task`(11 个其他 feature) · 三列表 scene 各 8 · `lifecycle` 7 |
| **2-环最多** | `task ↔ project` · `task ↔ metadata-fields` · `task ↔ command` · `task ↔ bulk-action` |
| **God 装配** | `ShellLayout` 同时拉 ~15+ platform/domain feature（W2） |
| **方向违规** | `shared → app/features`（W6 SHR-D1） |
| **真可删** | 多数 scene、healthcheck、空目录（W5/W3） |
| **删不掉（预期）** | task/project/space/command + navigation + ShellLayout |

**对决策 2=A：** 场景层已接近理想；**平台+领域网 + God Shell** 使「删平台 feature 只改装配一行」目前不成立。

---

## 1. 方法说明

| 度量 | 定义 |
|------|------|
| **边 A→B** | `src/features/A` 下至少 1 个文件 `from '@/features/B...'` |
| **边权** | 发生此类 import 的 **文件数**（非 import 语句数） |
| **入度** | 仓库内（排除自身目录）import 该 feature 的 **文件数** |
| **出度** | 该 feature 依赖的 **其他 feature 种类数** |
| **2-环** | A→B 且 B→A |
| **3-环** | 在枢纽子集上抽样（示意耦合密度，非穷尽） |

路径别名：`@/features/*`、`@/app/*`、`@/shared/*`。

---

## 2. Feature 入度 / 出度排行

### 2.1 入度 Top（被谁依赖 · 外部文件数）

| 入度 | Feature | 角色初判 |
|------|---------|----------|
| 64 | **task** | true-domain 内核 |
| 55 | **command** | true-platform 内核 |
| 49 | **project** | true-domain 内核 |
| 43 | quick-create | 独立窗（自测+内部多；外部 route 少但 feature 内大）* |
| 39 | **metadata-fields** | 横切 UI 契约 |
| 33 | **bulk-action** | true-platform |
| 28 | settings | mixed scene（nav/shell） |
| 27 | space | true-domain |
| 23 | danger-confirm | 小平台高复用 |
| 22 | display-options | 列表横切 |
| 16 | sync / update | 系统服务 |
| 14 | lifecycle | 编排域 |
| 13 | selection | 平台 |
| 11 | entity-detail / global-search | 壳协作 |
| 10 | activity / filter / submit | |
| ≤5 | view(s)、scenes、workspace、healthcheck | 叶子或壳 |
| 0 | **task-drawer** | 空壳 |

\* quick-create 入度含大量内部/测试引用路径统计；生产外引用仍以 route 为主（W5）。

### 2.2 出度 Top（依赖多少其他 feature）

| 出度 | Feature | 含义 |
|------|---------|------|
| 11 | **task** | 领域+平台网中心 |
| 10 | **project** | 同上 |
| 8 | all-tasks / inbox / no-project / views | composition-shell 装配面大 |
| 7 | lifecycle | 编排 t/p/s + bulk/selection… |
| 6 | bulk-action | |
| 0 | submit / danger / workspace / sync / healthcheck / activity… | 叶子或只被依赖 |

**解读：** 列表 scene 出度高 = **页面知道太多 wiring**（SCN-D1），不是领域逻辑外溢到 scene 目录名，而是 composition 过重。

---

## 3. Feature × Feature 热边（Top 边权）

| 权 | from → to | 解读 |
|----|-----------|------|
| 15 | task → metadata-fields | 行/菜单/详情字段 |
| 13 | task → project | 归属/选项/展示 |
| 5 | task → danger / bulk | 删除与批量 |
| 5 | quick-create → task | 创建与展示适配 |
| 5 | project → danger | |
| 4 | task → space | |
| 4 | command → metadata-fields | 命令菜单字段 |
| 4 | bulk → metadata-fields | placement 等 |
| 3 | selection → command | **类型环** CommandSelectionContext |
| 3 | command ↔ task | 命令与任务展示/动作 |
| 3 | metadata-fields → task | adapter 反引 task 状态标签等 |
| 3 | lifecycle → bulk / danger | |
| 2+ | project ↔ task · bulk ↔ task/project | 列表与批量 |

完整 Top40 见调研脚本输出（Session 日志可附）；上表为决策相关热边。

---

## 4. 环依赖

### 4.1 稳定 2-环（产品向 · 需纪律）

| 环 | 边权 | 是否可接受 | 说明 |
|----|------|------------|------|
| **task ↔ project** | 13 / 2 | 可接受 | 任务归属项目；项目页嵌任务板 |
| **task ↔ metadata-fields** | 15 / 3 | 偏紧 | 字段平台与 task 展示互相引用 |
| **task ↔ command** | 3 / 3 | 偏紧 | 命令系统认识 task 实体 |
| **task ↔ bulk-action** | 5 / 2 | 可接受 | bulk adapter 调 task api；task UI 调 bulk |
| **task ↔ selection** | 1 / 1 | 可接受 | 选择类型/注册 |
| **task ↔ entity-detail** | 2 / 2 | 可接受 | 抽屉打开与 TaskDrawer |
| **task ↔ display-options** | 2 / 1 | 可接受 | |
| **project ↔ bulk / filter / meta…** | 弱 | 可接受 | |
| **bulk ↔ lifecycle** | 1 / 3 | 可接受 | 归档批量 |
| **command ↔ selection** | （类型） | 应保持单向类型 | selection 依赖 command **类型**（W3） |

### 4.2 3-环密度（示意）

在 hub 子集上可枚举大量 `task → X → Y → task` 形态，说明：

> 不是偶然双依赖，而是 **task 为中心的网状核心**。

**不要**为拆环而拆环；To-Be 原则：

1. **类型/DTO** 下沉 `shared/types` 或 `command/core` 纯类型包  
2. **UI 字段** metadata 不 import task 实现细节  
3. **adapter** 只依赖 api，不依赖 ui  

---

## 5. 层间依赖

### 5.1 允许方向（回顾）

```txt
routes / app → features → shared → styles
```

### 5.2 app → feature（文件数 Top）

| 文件数 | Feature | 主因 |
|--------|---------|------|
| 15 | settings | sidebar 设置、section、nav |
| 7 | task | Preview/Create/Board 接线 |
| 6 | command | Shell 命令桥 |
| 5 | space / sync | scope、Footer |
| 4 | project | sidebar projects |
| 3 | danger / entity-detail / filter / lifecycle / metadata | 装配 |
| ≤2 | 其余平台 | |

→ **ShellLayout 是 app 侧耦合中心**（W2 SHELL-D1）。

### 5.3 routes → feature

薄：settings/space/views/project/task/scenes/qc/activity — 与 W1 叶子表一致。**Pass**。

### 5.4 features → app

几乎所有 **列表 scene + task/project/lifecycle** import：

- `app/layouts`（EntityScene、MainCard、ShellRouteContext、dialog store）  
- `app/navigation`（scope、intents）  

| 评价 | **可接受的壳依赖**（页面读 route 上下文） |
| 风险 | dialog store / EntityScene 类型过厚时页面绑死壳版本 |

### 5.5 shared → app/features（**违规**）

| 边 | 严重度 |
|----|--------|
| breadcrumbResolver → navigation + shell config + project | high |
| create-dialog-shell → metadata-fields | high |
| form submit hook → submit | med |

→ **SHR-D1**（W6）。

### 5.6 shared 入度（基建）

| 消费者文件约 | 包 |
|--------------|-----|
| 145 | types |
| 122 | ui |
| 103 | lib |
| 18 | events |
| 14 | autosave |
| 10 | query |

---

## 6. 枢纽与 God 模块

| 模块 | 类型 | 证据 | 处理策略 |
|------|------|------|----------|
| **ShellLayout** | God 装配 | ~1271 LOC；挂 10+ Provider + command/bulk | To-Be 拆 Providers / CommandBridge / Chrome / Overlays |
| **task** | 领域枢纽 | 入度 64、出度 11、多 2-环 | 保持内核；收紧公开 API |
| **command** | 平台枢纽 | 入度 55；ShellCommandActions 焊死壳 | 公开 API + 可插拔 actions |
| **project / space** | 领域枢纽 | 高入度 | 保持 |
| **metadata-fields** | 横切枢纽 | 入度 39；与 task 2-环 | 契约稳定、减少反引 task ui |
| **bulk-action** | 平台枢纽 | 入度 33；与 task/lifecycle 环 | adapter 边界保持 |
| **EntityScene types** | 编排契约 | 依赖 display/meta/task 类型 | Acceptable |
| **navigation** | 真平台 | Delete 1；被 layouts/features 广泛用 | Keep |
| **三列表 scene** | 出度尖峰 | 各依赖 8 feature | 抽 composition（SCN-D1） |

---

## 7. 「删不掉」清单（相对决策 2=A）

| 模块 | Delete 分 | 原因分类 | 说明 |
|------|-----------|----------|------|
| task / project / space | 1 | `true-domain` | 产品内核 |
| command | 1 | `true-platform` + `historical-tangle` | 类型+壳+快捷键网 |
| ShellLayout / navigation / router | 1 | `true-platform` | 壳与 URL |
| bulk-action / selection / submit / danger | 1–2 | `true-platform` | 可插拔后可降耦合 |
| metadata-fields / display-options | 2 | `true-platform`（横切） | 入度高 |
| settings | 2 | `route-coupled` + shell | 非纯 scene |
| shared/types / ui base | 1 | 基建 | |
| lifecycle | 3 | 编排 | 可删体验不可删实体 |
| view | 3 | 域卫星 | |
| 多数 scene | **4–5** | 可删 | 接近理想 |
| healthcheck | 5 | 零接线 | 已可删 |
| task-drawer / 空目录 | 5 | 死代码 | 应删 |
| quick-create | 3–4 | 独立窗 | 删窗不影响主壳 |

### 原因分类枚举（沿用协议）

- `true-platform` / `true-domain`  
- `historical-tangle`  
- `fake-shared`（shared 装了壳语义）  
- `route-coupled`  
- `api-leak`（私有实现被外用 — 待个案）  
- `god-assembly`（ShellLayout）  

---

## 8. 与可删除性理想的差距叙事

1. **场景层已经做对：** 对称 route + 薄/中等 page feature，删 scene ≈ 改 route（W5）。  
2. **列表 composition 复制**让「改一处行为」仍要改三页——可删性高、**可维护性**低（SCN-D1）。  
3. **平台 feature 理论可插拔，实践焊在 ShellLayout + 巨型 command adapter**——删 command/bulk 不是卸 Provider 那么简单（W2/W3）。  
4. **领域 task/project 网状互依**是产品结构，不是失败；失败的是 **metadata/command 与 task 的双向实现依赖**。  
5. **shared 反向依赖**破坏分层防火墙，使「shared 可任意被依赖」的假设带毒（W6）。  

**差距一句话：**  
> 叶子可删，树干（Shell+command+task 网）不可拔；下一步不是再拆 scene 目录名，而是 **拆装配根 + 修 shared 方向 + 抽列表编排**。

---

## 9. 耦合热点优先级（进 Gap）

| 优先级 | 热点 | 关联债 ID |
|--------|------|-----------|
| P0 | shared → app/features | SHR-D1 |
| P0 | ShellLayout God 装配 | SHELL-D1 |
| P1 | command 公开面 + adapter | PLAT-D1/D2 |
| P1 | 三列表 scene DRY | SCN-D1 |
| P2 | task ↔ metadata 双向 | DOM/PLAT 交叉 |
| P2 | 空目录/healthcheck 删除 | 多处 |
| P3 | barrel 蔓延 | PLAT-D7 / SHR-D2 |
| P3 | space api 壳职责 | DOM-D1 |

---

## 10. 矩阵简表（枢纽子集）

> 数字 = feature 内 import 对方的文件数；`·` = 0。完整图见脚本；此处服务决策。

| from \ to | task | project | space | command | bulk | selection | meta | danger | lifecycle |
|-----------|------|---------|-------|---------|------|-----------|------|--------|-----------|
| task | — | 13 | 4 | 3 | 5 | 1 | 15 | 5 | · |
| project | 2 | — | 1 | · | 2 | 2 | 1 | 5 | · |
| space | · | · | — | · | · | · | · | · | · |
| command | 3 | · | · | — | · | · | 4 | · | · |
| bulk | 2 | 2 | · | 3 | — | · | 4 | 2 | 1 |
| selection | 1 | · | · | 3 | · | — | · | · | · |
| meta | 3 | 1 | · | · | · | · | — | · | · |
| danger | · | · | · | · | · | · | · | — | · |
| lifecycle | 2 | 2 | 2 | · | 3 | 2 | · | 4 | — |

---

## 11. 导航 / 布局 耦合（非 feature）

| 模块 | 外部引用量级 | 笔记 |
|------|--------------|------|
| `app/navigation` | ~33 文件 | 语义中心；sessionHistory→layouts config（NAV-D1） |
| `app/layouts` | ~26 文件（features 侧） | EntityScene/MainCard/Shell 上下文 |

---

## 12. W7 未覆盖

- package 级 import 图（Vite chunk）  
- 动态 `import()`  
- 测试文件是否计入（**已计入** indegree；生产-only 可再滤）  
- 精确 3-环去重列表（仅示意密度）  

---

## 13. Session 收口

- W7 完成：入出度、热边、2-环、层违规、删不掉清单、差距叙事  
- **下一 Wave：W8** 数据/状态/IPC/Store/事件地图  
- Gap 阶段可直接以 §9 优先级开评估矩阵  

### 复现脚本提示

```bash
# 仓库根目录；逻辑同本分册生成时的 Python 扫描
# 匹配: from '@/features/<name>
```
