# Phase B · Gap 波次方案

> 状态：方案已定 · **尚未开填**  
> 创建：2026-07-15  
> 原则：与 Phase A 一样 **分 Wave、可中断、每 session 可合并的文档补丁**；不一次性填完。  
> 输入：`01-As-Is/**` 全部分册 + 附录债 ID / DRIFT  
> 输出：可排序的债务清单 + 模块评分 + 「故意不做」清单 → 交给 Phase C To-Be

---

## 1. Phase B 在整条链上的位置

```txt
Phase A  As-Is   ✅ 事实（W0–W8）
    ↓
Phase B  Gap     ← 你在这里：评估与排序（G0–G5）
    ↓
Phase C  To-Be   目标边界（依赖策略在此固化，决策 3）
    ↓
Phase D  Migrate 可合并重构切片（含 DOC-DRIFT 批量回写）
```

**Gap 做什么**

- 把 As-Is 里散落的债 **统一编号、打分、排序**
- 标明：阻碍可删除性？真相源？规范？还是纯整洁？
- 产出 **Top 债务** 与 **不做清单（KISS）**

**Gap 不做什么**

- 不定文件搬家清单（To-Be）
- 不开大重构 PR（Migrate）
- 不重新扫全仓目录（事实以 As-Is 为准；仅当证据路径失效时定点复核）

---

## 2. 排序维度（全 Wave 共用）

权重从高到低（与 `00-调研方案` / 评估矩阵一致）：

| 序 | 维度 | 问什么 |
|----|------|--------|
| 1 | **可删除性阻碍** | 是否让「装配+route」理想失效？ |
| 2 | **真相源混乱** | URL / Query / Store 是否分叉？ |
| 3 | **依赖健康** | 方向违规、坏环、God 装配？ |
| 4 | **规范 / 官方同构** | ARCHITECTURE、CONVENTIONS、TanStack 用法 |
| 5 | **Composition / 性能** | boolean 爆炸、barrel、过宽 invalidate |
| 6 | **KISS 整洁** | 空目录、命名噪音（默认可进「不做」） |

评分：`0` Fail · `1` Partial · `2` Pass · `N/A`  
每条债务必有：**ID · 证据路径 · 建议动作 · 是否阻碍可删除性**。

---

## 3. Wave 划分（G0–G5）

| Wave | 主题 | 范围（债 / 模块） | 产出 | 预估 |
|------|------|-------------------|------|------|
| **G0** | 开工与债台账 | 从 As-Is 汇总全部债 ID；冻结评分尺；建总表骨架 | `债台账.md` 初稿 + 矩阵表头 | 0.5 session |
| **G1** | **P0 防火墙** | SHR-D1（shared→app/features）；SHELL-D1（God ShellLayout） | 两案深评 + 反模式条目 | 1 session |
| **G2** | **P1 平台与列表** | PLAT-D1/D2（command）；SCN-D1（三列表 DRY）；相关 selection/bulk 装配 | 评分 + 可删除性差距 | 1 session |
| **G3** | **P2 领域网与死代码** | task↔metadata 环；空目录/healthcheck；DATA-D2/D3 双通道 | 评分 + Delete 候选确认 | 1 session |
| **G4** | **P3 整洁与 KISS** | barrel、DOM-D1 space api 杂项、NAV-D* 小债、DRIFT 回写策略（只计划） | 「不做」清单 + 低优先债 | 0.5–1 session |
| **G5** | **收官汇总** | 补全模块×维度矩阵（Optimal 可快评）；Top N 冻结；Phase B 出口 | 两正式文档定稿 + 给 To-Be 的输入摘要 | 1 session |

```txt
G0 台账
 → G1 P0（方向 + God 装配）
 → G2 P1（command + 列表 DRY）
 → G3 P2（领域环 + 死代码 + 数据双通道）
 → G4 P3 + 不做清单
 → G5 汇总出口
```

**硬约束（同 As-Is）**

1. 一 session **只做一个 G-wave**（G0 可与 G1 同 session 若你赶）。  
2. 证据路径失效才回代码定点读；禁止「再开一轮全仓重构调研」。  
3. G5 完成前：**不定** feature 互依最终策略细则（决策 3 仍开放到 To-Be；Gap 只描述现状代价）。  
4. DOC-DRIFT **仍不改 T1**（除非你单开「漂移回写」任务）；G4 只写回写批次计划。

---

## 4. 各 Wave 详细清单

### G0 · 债台账与评分尺

**做**

1. 从下列分册抽取全部 `*-D*` 债 ID 进一张台账：  
   W1 NAV/RTE · W2 SHELL · W3 PLAT · W4 DOM · W5 SCN · W6 SHR · W7 交叉 · W8 DATA  
2. 映射到 P0–P3（初值用 W7 §9，可改）。  
3. 冻结评分尺（本节 §2）与「债务卡片」字段：  
   `ID | 标题 | 证据 | 维度 | 阻碍可删除? | 建议动作 | Wave | 状态`  
4. 更新 `评估矩阵.md` / `耦合热点与反模式.md` 为「可增量填」结构。

**不做：** 深评单条 P0。

**完成标准：** 台账行数 ≥ As-Is 已点名债；无 TBD 波次归属。

---

### G1 · P0 防火墙

| 债 ID | 标题 | As-Is 出处 |
|-------|------|------------|
| SHR-D1 | shared → app/features 反向依赖 | 07 §14 |
| SHELL-D1 | ShellLayout God composition root | 03 §3 |

**做**

1. 逐条债务卡：爆炸半径、若修/不修对可删除性的影响、候选落点（仍非搬家清单）。  
2. 模块快评：`FE-S-UI-MISC`、`FE-S-FORM`、`FE-APP-SHELL-LAYOUT`。  
3. 反模式章：分层违规、God 装配。

**完成标准：** P0 两条均有「建议动作 + 不做的代价」；进入 G2 前 P0 无「未评估」。

---

### G2 · P1 平台与列表

| 债 ID | 标题 | 出处 |
|-------|------|------|
| PLAT-D1 | command/bulk 根 barrel | 04 |
| PLAT-D2 | ShellCommandActions 焊死 Shell | 04 / 03 |
| SCN-D1 | inbox/all-tasks/no-project 编排复制 | 06 |
| （关联） | selection/bulk 装配耦合 | 04 / 08 |

**做**

1. 评 `FE-F-COMMAND`、`FE-F-BULK`、三 composition-shell 的可删除性距离。  
2. 区分：**可删除性债** vs **可维护性债**（SCN-D1 偏后者）。  
3. 反模式：巨型 adapter、页面 wiring 复制。

**完成标准：** P1 债有优先级内部排序（例如 command 先于 barrel 纯清理）。

---

### G3 · P2 领域网与死代码 / 数据双通道

| 债 ID | 标题 | 出处 |
|-------|------|------|
| task↔metadata 等 2-环 | 实现双向依赖 | 05 / 08 |
| 空目录 / healthcheck | 死代码 | 05/06/03/W3 |
| DATA-D2 / DATA-D3 | badges 双通道；drawer 双轨 | 09 |
| DOM-D2 | task 体积/detail 三形态 | 05（可只定性） |

**做**

1. 确认 Delete 候选：`task-drawer`、空 api/model、`healthcheck`、可选 `shared/config`。  
2. 2-环：哪些必须接受（产品）、哪些应单向化（实现债）。  
3. 数据双通道：是否进 Migrate 早期「小刀」。

**完成标准：** 死代码列表可直接进 Migrate M-000；2-环有「接受/治理」标签。

---

### G4 · P3 整洁 + KISS 不做清单

| 类型 | 例 |
|------|-----|
| barrel 蔓延 | PLAT-D7 / SHR-D2 |
| space api 杂项 | DOM-D1 |
| NAV 小债 | NAV-D3 settings 记忆等 |
| patterns 膨胀 | SHR-D4 |
| DOC-DRIFT | 附录 · 只计划 Batch 不执行 |

**做**

1. 默认倾向 **不做或极后做** 的进「不做清单」并写理由。  
2. 少数仍值得做的升到 P2 边角。  
3. DRIFT 回写批次计划（A/B/C）对齐附录。

**完成标准：** 「不做清单」≥ 5 条有理由；P3 无误标为 P0。

---

### G5 · 收官汇总

**做**

1. `评估矩阵.md`：核心模块行填满（Optimal 可快评 2/2/2…）。  
2. `耦合热点与反模式.md`：与 W7 对齐并升格为 Gap 结论。  
3. **Top 债务总表**（建议 10–15 条）冻结，作为 To-Be 输入。  
4. Phase B 出口检查（§5）。  
5. 写「给 To-Be 的一页纸」：必须解决的边界问题列表（仍不写搬家）。

**完成标准：** 见 §5。

---

## 5. Phase B 出口（G5 结束才算 Gap 完成）

- [x] 债台账覆盖 As-Is 全部已点名 `*-D*`  
- [x] P0 / P1 每条有完整债务卡  
- [x] Top 债务总表已排序（可删除性优先）→ `评估矩阵.md` §3  
- [x] 「不做清单」已写清  
- [x] 模块评分矩阵覆盖：app 壳、navigation、command、task、project、shared 违规点、代表 scene  
- [x] **无** To-Be 文件级搬家清单混入 Gap  
- [x] Session 日志有 G0–G5 记录  
- [x] To-Be 输入摘要：`02-To-Be输入摘要.md`

---

## 6. 文档落点（Gap 目录演进）

```txt
02-Gap/
  00-Gap波次方案.md          ← 本文件
  01-债台账.md               ← G0 建，其后增量
  评估矩阵.md                ← G0 骨架 → G5 定稿
  耦合热点与反模式.md        ← G1 起增量 → G5 定稿
```

可选（若总表太长）：`G1-P0笔记.md` 等过程稿，G5 合并后可删或归档。

---

## 7. Session 模板（Gap）

```txt
1. 选 G?
2. 打开 01-债台账.md 对应行
3. 只评本 Wave 清单（写证据路径）
4. 更新：评估矩阵相关行 + 反模式条目
5. Session 日志 + 下一 G?
```

禁止：G1 做到一半开始写 To-Be 目录树或开删目录 PR（除非你单开 hotfix）。

---

## 8. 与 Migrate 的预映射（仅心智，非承诺）

| Gap 优先 | 可能进入的 Migrate 波次（示意） |
|----------|--------------------------------|
| 死代码 / 空目录 | M-0 删除 |
| SHR-D1 迁出 shared | M-1 分层修复 |
| ShellLayout 拆分 | M-2+ 大切片 |
| command 公开 API | M-2+ |
| 三列表 DRY | M-3 体验/维护 |
| DOC-DRIFT | 单独 Batch 或 M-1 文档 |

正式切片在 **Phase D** 写。

---

## 9. 进度表

| Wave | 状态 | 日期 |
|------|------|------|
| G0 | **完成** | 2026-07-15 |
| G1 | **完成** | 2026-07-15 |
| G2 | **完成** | 2026-07-15 |
| G3 | **完成** | 2026-07-15 |
| G4 | **完成** | 2026-07-15 |
| G5 | **完成** | 2026-07-15 |

---

## 10. 下一动作

**Phase B 已完成。** 说 **「开 To-Be」** / Phase C → 基于 `02-To-Be输入摘要.md` 写目标架构。  
