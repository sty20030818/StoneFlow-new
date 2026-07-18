# 03 · 前端架构解析

> 状态：**Phase A/B/C 完成** · **Phase D 已开**：模板 + [M-0 执行计划](./04-Migrate/M-0-零行为Delete/执行计划.md) · 总序 [路线图](./04-Migrate/重构切片路线图.md)  
 
 
 
 
 
 
 
> 创建：2026-07-15 · As-Is 收官：2026-07-15  
> 范围：仅 `src/` 前端（Rust / Tauri 后端另立文档）  
> 权威关系：代码事实 > 本文档过程记录 > 长期根文档（漂移只记日志；批量回写放 Migrate/单独任务）

---

## 1. 这份文档在做什么

本目录是 StoneFlow 前端的**架构解构工作区**，服务两条线：

1. **As-Is**：把现有前端拆到几乎无漏的模块粒度，写清职责、依赖、真相源、可删除性。
2. **之后**：基于 As-Is 做 Gap → To-Be → Migrate，最终让前端逼近：
   - 项目规范（`src/ARCHITECTURE.md`、`src/CONVENTIONS.md`）
   - 官方用法（TanStack Router / Query、React 19、Tauri 2）
   - 高内聚低耦合、组件化模块化、DRY、KISS
   - **模块尽量独立：删掉一个 feature 时，理想上只改装配点 + 对应 route**

本目录**不是**日常开发的短契约。日常「代码放哪」仍以：

- `src/ARCHITECTURE.md`
- `src/app/navigation/ARCHITECTURE.md`
- `src/app/layouts/ARCHITECTURE.md`
- `src/CONVENTIONS.md`

为准。本目录负责**细颗粒调研、差距、目标架构与迁移切片**。

---

## 2. 已确认决策（Grill 结果）

| # | 议题 | 结论 |
|---|------|------|
| 1 | 主读者 | 自己 + AI 后续重构（不为 onboarding 叙事扩写） |
| 2 | 「可独立删除」强度 | **理想目标 A**：删 feature 只改装配点 + route 一行级影响 |
| 3 | Feature 间依赖策略 | **先画清现状再定**（调研期不定死 A/B） |
| 4 | 单文件 scene feature | **先登记、不急合并**；注册表标「壳厚度」 |
| 5 | 文档落点 | **细文档在本目录**；`src/**/ARCHITECTURE.md` 保持短契约 |
| 6 | IPC / Rust | **本轮只前端**；后端另文档；As-Is 只记 feature `api` facade 命令名 |
| 7 | As-Is 完成标准 | 项目不大 → **越细越好**（见 §4） |
| 8 | 文档漂移 | **只记入漂移日志**，As-Is 完成后再批量修长期文档 |

---

## 3. 目录结构

```txt
Docs/03-前端架构解析/
├── README.md                      ← 你在这里：入口、决策、进度
├── 00-调研方案与流程.md            ← 怎么一步步解构（方法论）
├── 00-调研协议.md                  ← 每个模块必填的标准卡
├── 01-As-Is/                      ← 现状事实（主战场）
│   ├── 00-模块注册表.md
│   ├── 01-总览与分层.md
│   ├── 02-routes-and-navigation.md
│   ├── 03-app-shell-and-layouts.md
│   ├── 04-features-platform.md
│   ├── 05-features-domain.md
│   ├── 06-features-scenes.md
│   ├── 07-shared-and-styles.md
│   ├── 08-dependency-matrix.md
│   └── 09-data-and-state-map.md
├── 02-Gap/                        ← 评估与差距（Phase B · ✅ 完成）
│   ├── 00-Gap波次方案.md
│   ├── 01-债台账.md
│   ├── 02-To-Be输入摘要.md        ← G5 · 开 To-Be 读这个
│   ├── 评估矩阵.md                ← G5 定稿
│   └── 耦合热点与反模式.md        ← G5 定稿
├── 03-To-Be/                      ← 目标长期架构（Phase C · T0–T7）
│   ├── 00-To-Be波次方案.md        ← 波次 + react-doctor 时机
│   ├── 01-架构原则与术语.md       ← **T0 冻结**
│   ├── 01-目标架构草案-分层与防腐.md  ← 讨论稿 v3.1（辅）
│   ├── 目标架构.md                ← T1 主产出
│   ├── 02-路由与导航生命周期.md   ← T2
│   ├── 03-数据与状态生命周期.md   ← T3
│   ├── 04-壳与平台拼装.md         ← T4
│   ├── 05-Feature模块化.md        ← T5
│   ├── 06-React实践与检测.md      ← T6
│   ├── 模块边界契约.md            ← T7
│   ├── 07-Phase-C出口与Gap映射.md ← **T7 出口**
│   ├── 08-Feature品质验收标准.md  ← **Phase E 门禁**（组合/Query/Router/体量）
│   ├── 模块边界契约.md
│   └── （T0+ 增量：原则/路由/数据/壳/Feature/React检测…）
├── 04-Migrate/                    ← 重构切片路线图（Phase D 骨架 · Phase E 品质）
│   └── 重构切片路线图.md
├── 05-模块治理/                   ← 逐模块边界/实践/治理（清单 + 计划）
│   ├── README.md
│   ├── 01-模块全景清单.md
│   └── 02-讨论与治理计划.md
└── 附录/
    ├── 文档漂移日志.md
    ├── Session调研日志.md
    └── react-doctor/              ← T6 起放基线报告（待建）
```

---

## 4. As-Is「完成」验收（越细越好）

项目规模允许极细。As-Is 视为完成需同时满足：

1. **模块注册表**：`src/` 下每一层、每个 feature、每个 shared 子包、每条主要 route 叶子都有行；无「漏登记」。
2. **深描覆盖**：
   - 所有 `routes` + `app/navigation` + `app/layouts` + `app/providers` 有完整卡（文件级职责表）。
   - 所有 `features/*` 有完整卡（含 1 文件 scene 与 0 文件空壳）。
   - 所有 `shared/*` 子包有完整卡；`shared/ui` 拆到子域（base/board/row/detail/patterns…）。
3. **依赖**：Feature×Feature 邻接矩阵无 TBD；每个模块有 Delete 分与消费者列表。
4. **数据面**：Query 域、客户端状态分布、IPC facade 命令名、Tauri Store key、事件名有汇总表。
5. **评分**：每个模块质量卡打完；结论卡有 Keep/Split/Merge/Delete/Extract。
6. **漂移**：附录漂移日志已收集本阶段发现的全部 DOC-DRIFT（不在本阶段改 T1 等）。

未完成前：**不进入 To-Be 的文件级搬迁设计**（可以写原则，不定具体搬家清单）。

---

## 5. Wave 进度

### 5.1 Phase A · As-Is（✅ 全部完成）

| Wave | 对象 | 状态 | 产出文件 |
|------|------|------|----------|
| W0–W8 | 见各 As-Is 分册 | **完成** 2026-07-15 | `01-As-Is/**` |

### 5.2 Phase B · Gap（规划完成 · 执行未开始）

| Wave | 主题 | 状态 | 产出 |
|------|------|------|------|
| **G0** | 债台账 + 评分尺冻结 | **完成** 2026-07-15 | `01-债台账.md` |
| **G1** | P0：shared 反向依赖 + God Shell | **完成** 2026-07-15 | 债台账 §9 + 矩阵 |
| **G2** | P1：command 公开面 + 三列表 DRY | **完成** 2026-07-15 | 债台账 §10 |
| **G3** | P2：领域环 + 死代码 + 数据双通道 | **完成** 2026-07-15 | 债台账 §11 · M-0 包 |
| **G4** | P3 + KISS 不做清单 + DRIFT 计划 | **完成** 2026-07-15 | 债台账 §12 |
| **G5** | 矩阵收官 + Top 债冻结 → To-Be 输入 | **完成** 2026-07-15 | 评估矩阵定稿 + `02-To-Be输入摘要.md` |

细则：[`02-Gap/00-Gap波次方案.md`](./02-Gap/00-Gap波次方案.md)。  
**Phase B 全部完成。**

### 5.3 Phase C · To-Be（波次已规划 · 执行未开始）

| Wave | 主题 | 状态 |
|------|------|------|
| **T0** | 原则冻结 + 术语 + 讨论收口 | 未开始 · **下一站** |
| **T1** | 目标分层与依赖法 | 未开始 |
| **T2** | 路由与导航生命周期 | 未开始 |
| **T3** | 数据与状态生命周期 | 未开始 |
| **T4** | 壳拼装与平台注册 | 未开始 |
| **T5** | Feature 模块化 | 未开始 |
| **T6** | React 实践 + react-doctor 基线 | 未开始 |
| **T7** | 边界契约 + Gap 映射 + 出口 | 未开始 |

细则：[`03-To-Be/00-To-Be波次方案.md`](./03-To-Be/00-To-Be波次方案.md)。  
Gap 输入：[`02-Gap/02-To-Be输入摘要.md`](./02-Gap/02-To-Be输入摘要.md)。

---

## 6. 原则锚点（评分时用同一套）

1. **可删除性**（决策 2=A）：理想上删 feature ≈ 卸装配 + 删/改 route  
2. **依赖单向**：`app → features → shared → styles`（跨 feature 策略调研后再定）  
3. **真相源唯一**：URL=Router；服务器数据=Query；UI 瞬态=local/Zustand；启动恢复=Tauri Store  
4. **装配集中、规则下沉**：Shell 装配；纯规则进 model；禁止第二路由 DSL  
5. **公开 API 最小**：无无意义 barrel；直接 import（Vercel bundle 规则）  
6. **官方同构**：TanStack Router file routes、Query 管 server state  
7. **Composition**：少 boolean props；compound/children；Provider 暴露 state/actions/meta  
8. **KISS/YAGNI**：空目录、假 feature、过早 shared 要标债，不先发明新层  

细则见 `00-调研协议.md` 质量卡。

---

## 7. 怎么用（给自己和 AI）

1. 开 session 前读：`00-调研方案与流程.md` § Session 模板  
2. 选一个 Wave 目标，按 `00-调研协议.md` 填卡  
3. 更新：对应 As-Is 章节 + `00-模块注册表.md` 一行 + `附录/Session调研日志.md`  
4. 发现文档与代码不符：只写 `附录/文档漂移日志.md`（决策 8=B）  
5. 不在调研 session 做大重构  

**Phase A + B 完成。Phase C 波次 = T0–T7。**  
下一推荐动作：先完成架构讨论 / grill；然后 **开 T0** 写原则文档。react-doctor 定在 **T6** 跑基线（见 To-Be 波次方案 §5）。

---

## 8. 相关代码契约（只读链接）

| 文档 | 用途 |
|------|------|
| [`src/ARCHITECTURE.md`](../../src/ARCHITECTURE.md) | 前端正式分层边界（短） |
| [`src/CONVENTIONS.md`](../../src/CONVENTIONS.md) | 命名、注释、导航、React 规范 |
| [`src/app/navigation/ARCHITECTURE.md`](../../src/app/navigation/ARCHITECTURE.md) | 路由/导航真相源 |
| [`src/app/layouts/ARCHITECTURE.md`](../../src/app/layouts/ARCHITECTURE.md) | Shell / EntityScene 骨架 |
| [`Docs/T1-系统设计.md`](../T1-系统设计.md) | 系统级设计（可能漂移，见附录） |
