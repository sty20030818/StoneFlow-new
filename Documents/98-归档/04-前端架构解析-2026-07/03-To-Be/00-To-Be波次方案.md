# Phase C · To-Be 波次方案

> 状态：**Phase C 全部完成（T0–T7 ✅）** · 下一站 **Phase D Migrate**  
> 创建：2026-07-15 · 完成：2026-07-16  
> 出口：[`07-Phase-C出口与Gap映射.md`](./07-Phase-C出口与Gap映射.md) · 契约：[`模块边界契约.md`](./模块边界契约.md)  
> 原则：**长期可演进** > 一次写完；允许破坏性重构，但 To-Be 只定**边界与拼装法**，搬家表在 Phase D  

---

## 1. Phase C 在整条链上的位置

```txt
Phase A  As-Is   ✅ 事实
Phase B  Gap     ✅ 债与排序
Phase C  To-Be   ← 目标长期架构（T0–T7）
Phase D  Migrate 可合并切片（破坏性重构落地处）
```

**To-Be 回答**

- 前端最优分层与依赖法  
- 功能如何模块化、如何拼装（壳 / 路由 / 数据 / 命令）  
- 生命周期：启动、导航、Query、事件、多窗口  
- 与 React / TanStack / Vercel 实践如何对齐  
- Gap Top 债：Accept / Fix（对应哪些目标规则）  

**To-Be 不回答**

- 具体 PR 文件搬家顺序的逐步 diff（Migrate）  
- 后端 crate 边界（另文档）  

---

## 2. 设计锚点（讨论中可修订，T0 冻结）

| 锚点 | 来源 |
|------|------|
| 可删除性：删 feature ≈ 装配 + route | 决策 2=A |
| 真相源：URL=Router · 实体=Query · UI 瞬态=local/Zustand · 恢复=Tauri Store | As-Is/W8 |
| 高内聚低耦合、模块化、DRY、KISS | 你的目标 |
| Composition > boolean props；Provider 露 state/actions/meta | Vercel Composition |
| 直接 import、减 waterfall、rerender 纪律 | Vercel React BP |
| File routes、loader+ensureQueryData、typed search | TanStack Router |
| key factory、定向 invalidate、mutation 后失效 | TanStack Query |
| 破坏性重构可接受，但要**可迭代长期形态** | 你的声明 |

### 2.1 已确认（grill 2026-07-15 · 架构收口 2026-07-16）

| 项 | 结论 |
|----|------|
| Feature / Module 互依 | **B′**：只依赖 **公共面**（`index.public` / 原 api·query·core）；禁跨模块 `ui/` 私有 |
| 破坏性幅度 | **允许阶段性大爆炸**；**每史诗结束 `bun run check` 必须绿**（Q1=A） |
| 三列表 wiring 落点 | **不进 shared**；目标 **`features/task/hooks`**（list-scene facade） |
| 目录形态 **D1** | **C · β 试点再铺开**：先 task + layout 路径，再复制 |
| EntityScene / MainCard **D2** | MainCard→`shared/components`；EntityScene→`layout/entity-scene`；业务板→`features/task/components` |
| 壳位置 | **`src/layout/`**；`app` = bootstrap + navigation |
| routes / pages **D3′** | 无 `pages/`；薄页在 `routes/**` |
| 命名 | `features/{components,hooks,api,model}` + `shared/{components,hooks,lib}` |
| monorepo | **不上**（现阶段） |
| 平台接入 | Providers + 可组合 CommandBridge |
| QC 共享 | L0–L2；不共享 layout |
| 原则正文 | [`01-架构原则与术语.md`](./01-架构原则与术语.md) **T0 冻结** |
| 工作假设（目录讨论稿） | [`01-目标架构草案-分层与防腐.md`](./01-目标架构草案-分层与防腐.md) v3.1；与原则冲突时以 T0 为准 |
| react-doctor | 基线 51/100；T6 精读；大史诗后复跑 |
| T1 开放题 | O1–O3 **已关闭**（见目标架构 §5）；带出 T2–T4 细则题见目标架构 §9 |

---

## 3. Wave 划分（T0–T7）

| Wave | 主题 | 产出 | 预估 |
|------|------|------|------|
| **T0** ✅ | 原则冻结 + 术语 + 开放问题收口 | [`01-架构原则与术语.md`](./01-架构原则与术语.md) | 已完成 2026-07-16 |
| **T1** ✅ | 目标分层与依赖法 | [`目标架构.md`](./目标架构.md) | 已完成 2026-07-16 |
| **T2** ✅ | 路由与导航生命周期 | [`02-路由与导航生命周期.md`](./02-路由与导航生命周期.md) | 已完成 2026-07-16 |
| **T3** ✅ | 数据与状态生命周期 | [`03-数据与状态生命周期.md`](./03-数据与状态生命周期.md) | 已完成 2026-07-16 |
| **T4** ✅ | 壳拼装与平台能力注册 | [`04-壳与平台拼装.md`](./04-壳与平台拼装.md) | 已完成 2026-07-16 |
| **T5** ✅ | Feature 分类与模块内部结构 | [`05-Feature模块化.md`](./05-Feature模块化.md) | 已完成 2026-07-16 |
| **T6** ✅ | React 实践映射 + **react-doctor** | [`06-React实践与检测.md`](./06-React实践与检测.md)；基线见附录 | 已完成 2026-07-16 |
| **T7** ✅ | 边界契约 + Gap 映射 + 出口 | [`模块边界契约.md`](./模块边界契约.md) · [`07-Phase-C出口与Gap映射.md`](./07-Phase-C出口与Gap映射.md) | 已完成 2026-07-16 |

```txt
T0 原则与问题收口
 → T1 分层与依赖法（骨架）
 → T2 路由生命周期
 → T3 数据/状态生命周期
 → T4 壳与平台如何拼
 → T5 Feature 如何切、如何复用
 → T6 实践检查表 + react-doctor 基线
 → T7 契约 + Gap 映射 + 冻结 → Phase D
```

**硬约束**

1. 一 session 默认 **一个 T-wave**（T0 可与讨论合并）。  
2. T1 未冻结前，不写细契约（T7）。  
3. **不在 To-Be 写完整 git 搬家表**（可写「目标目录示意」）。  
4. 破坏性重构的「愿不愿意砍」在 T0 问清幅度（全量 vs 分史诗）。  
5. `npx react-doctor`：**T6 正式跑基线**；T0 只定用法；Migrate 后复跑（见 §5）。

---

## 4. 各 Wave 详细清单

### T0 · 原则冻结与讨论收口

**做**

1. 写下 8–12 条**不可破原则**（可删除性、真相源、shared 防火墙、KISS…）。  
2. 术语表：platform / domain / scene / assembly / public surface / shell bridge。  
3. 用 grill 结果关闭关键选择题（互依策略、破坏性幅度、list wiring 落点…）。  
4. 明确 react-doctor 在本项目的角色与时机。  

**不做：** 画最终目录树细节。

**完成标准：** 原则条数固定；开放问题 ≤3 个带进 T1。

---

### T1 · 目标分层与依赖法

**做**

1. 目标 `src/` 心智图：`app` / `routes` / `features` / `shared` / `styles` / `test`。  
2. 依赖允许矩阵（含 feature→feature 的 B′ 或你选的策略）。  
3. 公开面 vs 私有面约定（`api`/`query`/`model`/`ui`/`core`）。  
4. 与 Gap：SHR-D1、分层违规如何在目标态消失。  

**产出写入：** `目标架构.md` 主体。

---

### T2 · 路由与导航生命周期

**做**

1. 启动 → 恢复 → scope layout → remember → session history 时序（目标态）。  
2. route 文件只做什么；navigation 只做什么；业务只发 intent。  
3. loader + Query：`ensureQueryData` 边界；detail redirect。  
4. search 契约：抽屉 `task`/`project`；settings section；debug。  
5. 对齐 TanStack：file routes、pathless layout、typed params/search、intent preload（已有可保留）。  

**参考：** 现有 W1 事实；Router BP（org- / load- / search- / nav-）。

---

### T3 · 数据与状态生命周期

**做**

1. Server state：key factory、mutation→invalidate→event 标准路径。  
2. Client state 分类表：何时 Zustand / Provider registry / URL / Tauri Store。  
3. workspace sync 与定向 invalidate 目标策略（相对 DATA-D1：接受 vs 收窄原则）。  
4. 多窗口：main vs quick-create 数据边界。  
5. 对齐 Query BP（qk- / mut- / cache-）。  

---

### T4 · 壳拼装与平台注册

**做**

1. 目标 Provider 树（哪些全局、哪些 shell-only）。  
2. Command / bulk / submit / selection / filter 如何**注册**而非内联巨石。  
3. ShellChrome vs Overlays vs Bridge 职责。  
4. 新平台能力接入检查清单。  
5. 对齐 Composition：compound、避免 boolean 模式、Provider 接口。  

**对应 Gap：** SHELL-D1、PLAT-D2。

---

### T5 · Feature 模块化

**做**

1. platform / domain / scene 定义与例子（映射现有 ~30 feature）。  
2. 推荐目录模板（强制 vs 建议）。  
3. 列表 scene wiring 目标模块（不塞 shared）。  
4. QC 独立窗保持/加强边界。  
5. DRY：共享编排 vs 复制的判据（KISS：第三次复制再抽）。  

---

### T6 · React 实践映射 + react-doctor

**做**

1. 把 Vercel / TanStack 规则**落成项目检查表**（N/A 标桌面场景）。  
2. 运行 `npx react-doctor@latest`（见 §5），归档分数与 Top 规则。  
3. 将 doctor 发现映射：已在 Gap / 新债 / 可忽略。  
4. 约定：Migrate 每完成一大史诗复跑 doctor。  

---

### T7 · 契约、Gap 映射、出口

**做**

1. 填 `模块边界契约.md`：关键模块公开 API + 删除检查清单。  
2. Gap Top15 → Accept / Fix 对照表。  
3. Phase C 出口检查。  
4. 给 Phase D 的史诗序（可微调 Gap 的 M-0…M-3）。  

---

## 5. react-doctor：是什么、何时用

### 5.1 工具能力（CLI）

```bash
npx react-doctor@latest [directory]
# 选项摘要：
#   --lint / --no-lint
#   --dead-code / --no-dead-code      # 未使用文件/导出、循环依赖
#   --supply-chain / --no-supply-chain
#   --verbose / --score / --json / --json-out
#   --scope full | changed | ...
```

定位：**React 代码库健康诊断**（lint + 死代码 + 依赖供应链等），**不是**替代 To-Be 架构设计。

### 5.2 对本项目的价值

| 有用 | 有限 |
|------|------|
| 未使用导出/文件（对齐 M-0） | 不替你设计 feature 边界 |
| 循环依赖（对齐 W7 环） | 桌面 Tauri 部分 Web/SSR 规则 N/A |
| 常见坏 React 模式 | 不理解「壳装配 vs domain」产品分层 |
| 基线分数可回归 | 供应链扫描与架构债优先级不同 |

### 5.3 推荐时机

| 时机 | 用途 |
|------|------|
| **T6（正式）** | 建立 **To-Be 前/迁移前基线**，写入 `06-React实践与检测.md` 或 `附录/react-doctor/` |
| **M-0 后** | 验证死代码删除是否反映在 dead-code 项 |
| **M-1 / M-2 后** | 看循环依赖、import 健康是否改善 |
| **日常可选** | `--scope changed` 只看增量（若适用） |
| **不要** | T0 讨论原则时用 doctor 结论绑架分层设计；也不要每次改一行都全量跑 |

### 5.4 建议命令（T6 执行时）

```bash
cd /Users/stonefish/Desktop/StoneFlow
npx react-doctor@latest . --yes --verbose \
  --json-out Docs/03-前端架构解析/附录/react-doctor/baseline-$(date +%Y%m%d).json
```

（路径可调；需网络拉包。若 CI 要用，再固定版本。）

---

## 6. 讨论与文档的关系

```txt
你现在
  → 架构讨论 + grill 答题（可多轮）
  → T0 把答案写进原则文档
  → T1–T5 展开
  → T6 doctor 基线
  → T7 冻结 → Phase D
```

破坏性重构：**在 Phase D 做**；Phase C 只保证「拆完以后长什么样、规则是什么」，避免无蓝图的 bulk move。

---

## 7. 进度表

| Wave | 状态 |
|------|------|
| T0 | 未开始 · **下一站（先讨论）** |
| T1–T7 | 未开始 |

---

## 8. 下一动作

1. 你先回答 grill 问题（架构理解 + 需求幅度）。  
2. 说 **「开 T0」** → 把结论写入 `01-架构原则与术语.md`。  
3. 或 **「原则我答完了，直接 T0」**。  
