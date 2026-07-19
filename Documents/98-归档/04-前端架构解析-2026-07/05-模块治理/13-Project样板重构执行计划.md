# Project 样板重构执行计划（P2 · 对齐 task / command）

> 状态：**阶段 0–4 已收口** · 2026-07-19
> 决议源：[M-F-PROJECT](./模块/M-F-PROJECT.md)（P2）· 写法：[CONVENTIONS v2.1](../../../src/CONVENTIONS.md) · 定稿契约：[project/ARCHITECTURE.md](../../../src/features/project/ARCHITECTURE.md)
> 前置：[11-Task样板](./11-Task样板重构执行计划.md)（0–5 done）· [12 扩散计划](./12-平台与Domain扩散重构执行计划.md)（command C0–C5 done）
> **原则：** 串行；每阶段末相关门禁；开放前可破坏须清干净；源码禁史诗号。
> **文档：** `ARCHITECTURE` = 定稿最优（无债表）；**债/进度只写本文**；src 不回链 Docs。

---

## 0. 目标与非目标

### 0.1 目标

1. project 成为 **第二块 domain 样板**：可被 lifecycle / view 抄。
2. 对齐 task 检查表（11 附录）+ command Host/register 增补（12 附录 C1–C6）。
3. 详情页任务板 **只组合 task public**；本域不复制 task mutation。
4. `ARCHITECTURE` / public / TSDoc 与 CONVENTIONS 一致。

### 0.2 非目标

- 不合并 `project-overview` 进本包（Keep 薄 scene）
- 不整页把项目详情交给 task（页面壳与项目动作留 project）
- 不做视觉 / View Transition
- 不顺手开 lifecycle / view / launcher

### 0.3 门禁

```bash
bunx tsc --noEmit -p tsconfig.json
bun run lint:boundaries
bunx vitest run src/features/project
```

冒烟（人工）：项目详情任务板、完成/归档项目、创建项目、overview 列表、命令板项目 bulk。

---

## 1. 现网基线（收口 · 2026-07-19）

| 项 | 状态 |
|----|------|
| project → layout | **0** |
| bulk/ · `registerProjectCommands` | **已在 project** |
| `ProjectPage` | **~95** 薄壳 |
| `useProjectDetailScene` | **~325**（&lt;400，VOLUME 不拆） |
| `ProjectBoard` / `ProjectRowAdapter` | ~273 / ~237 · **无痛不拆** |
| `index.ts` | TSDoc + 收窄 public |
| ARCHITECTURE | **定稿最优** |

---

## 2. 阶段总表

| 阶段 | ID | 内容 | 破坏性 | 状态 |
|------|-----|------|--------|------|
| 0 | DOC | ARCHITECTURE 定稿；M-F-PROJECT 落地对照；本文落盘 | 无 | **done** |
| 1 | NORM | TSDoc / public；去 `@fileoverview`；审计导出 | 低 | **done** |
| 2 | SCENE | 抽 `useProjectDetailScene`；压薄 ProjectPage | 中 | **done** |
| 3 | VOLUME | Board/Row/ContextMenu 按痛内拆 | 低 | **done**（跳过拆分） |
| 4 | CLOSE | 对照勾选；lifecycle/view 检查表备忘 | 无 | **done** |

---

## 阶段 0 · DOC · **done**

- [x] `ARCHITECTURE` 定稿最优
- [x] `M-F-PROJECT` 落地对照 + archived-decision
- [x] 本文落盘；[12](./12-平台与Domain扩散重构执行计划.md) 指向本文

---

## 阶段 1 · NORM · **done**

| 项 | 结果 |
|----|------|
| `index.ts` | 多行摘要 + `@remarks`；去掉 `@fileoverview` |
| public 收窄 | 撤无外消费者导出 |
| 包内路径 | 相对路径 |
| 门禁 | 绿 |

---

## 阶段 2 · SCENE · **done**

| 项 | 结果 |
|----|------|
| facade | `hooks/useProjectDetailScene.ts` |
| `ProjectPage` | ~370 → **~95** |
| 门禁 | 绿 |

---

## 阶段 3 · VOLUME · **done**（跳过拆分）

| 优先级 | 项 | 结果 |
|--------|-----|------|
| P0 | &gt;400 生产单文件 | **无**（最大 facade ~325） |
| P1 | Board / RowAdapter | **跳过**（~273 / ~237，无编辑痛） |
| P2 | ContextMenu | **跳过**（无痛） |

---

## 阶段 4 · CLOSE · **done**

- [x] M-F-PROJECT 对照勾满；ARCHITECTURE 与代码一致
- [x] 检查表结论见下
- [x] 「复制到 lifecycle/view」增补见下
- [x] 门禁：`tsc` · `lint:boundaries` · `vitest run src/features/project`（+ overview）

### 检查表结论（11 附录 + 12 C1–C6）

| # | 结论 |
|---|------|
| 11·1–10 | **通过**（禁 layout、public、Query keys、api invoke、model 无 hook、TSDoc） |
| C1–C4 | **通过**（register / bulk 已在本域；Host 双边既有纪律） |
| C5 | **通过**（`useProjectDetailScene` 只组合 task public） |
| C6 | **通过**（ARCHITECTURE 定稿；进度在本文） |

### 附录 · 复制到 lifecycle / view 的增补

> 开刀时：**先跑 11 附录 + 12 C1–C6（若有命令/bulk）**，再加：

| # | 检查项 | 说明 |
|---|--------|------|
| L1 | lifecycle：编排 facade；**禁**吞进 task / project | Y2 |
| L2 | lifecycle bulk/commands 若有：留本域，layout 只 compose | 对标 project |
| V1 | view：任务列表走 task public / facade；禁复制 list-scene | V2 |
| V2 | view 自身 CRUD 与任务板 wiring 分清；厚页可抽 `useViewsScene` | 对标 ProjectPage |

---

## 3. 与其它文档

```txt
M-F-PROJECT.md     → WHY / 决议 / 落地对照（档案）
本文               → 刀序、债、验收（进度 · 已收口）
project/ARCHITECTURE → 定稿日常
12 扩散计划        → 波次顺序（下一刀 lifecycle）
CONVENTIONS.md     → HOW
```

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-19 | 初版：阶段 0–4；基线；DOC done |
| 2026-07-19 | NORM done：public 收窄 + TSDoc；包内相对路径 |
| 2026-07-19 | SCENE done：useProjectDetailScene；ProjectPage ~95 |
| 2026-07-19 | VOLUME 跳过（无 &gt;400 / 无痛）；CLOSE done；波次 2 project 收口 |
| 2026-07-19 | 收尾清死代码：ProjectTaskBoard、无消费者 alias/hook/bulk getter |
