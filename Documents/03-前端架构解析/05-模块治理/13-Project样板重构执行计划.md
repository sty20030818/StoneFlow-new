# Project 样板重构执行计划（P2 · 对齐 task / command）

> 状态：**P0–P2 done** · 下一刀 **VOLUME** · 2026-07-19
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

## 1. 现网基线（2026-07-19）

| 项 | 状态 |
|----|------|
| project → layout | **0** |
| bulk/ · `registerProjectCommands` | **已在 project**（B3/C3 已收） |
| `ProjectPage` | **~95** 薄壳；wiring 在 `useProjectDetailScene` ~324 |
| `ProjectBoard` / `ProjectRowAdapter` | ~273 / ~237 · 临界，VOLUME 按痛 |
| `index.ts` | **NORM done**（TSDoc + 收窄 public） |
| ARCHITECTURE | **定稿最优** |

---

## 2. 阶段总表

| 阶段 | ID | 内容 | 破坏性 | 状态 |
|------|-----|------|--------|------|
| 0 | DOC | ARCHITECTURE 定稿；M-F-PROJECT 落地对照；本文落盘 | 无 | **done**（2026-07-19） |
| 1 | NORM | TSDoc / public；去 `@fileoverview`；审计导出 | 低 | **done**（2026-07-19） |
| 2 | SCENE | 抽详情编排（`useProjectDetailScene` 或等价）；压薄 ProjectPage | 中 | **done**（2026-07-19） |
| 3 | VOLUME | Board/Row/ContextMenu 按痛内拆 | 低 | pending |
| 4 | CLOSE | 对照勾选；lifecycle/view 检查表备忘 | 无 | pending |

推荐串行：**0 → 1 → 2 → 3 → 4**。bulk/命令已回家，**无**独立 B3/C3 阶段。

---

## 阶段 0 · DOC

| 字段 | 内容 |
|------|------|
| 目标 | 卡 + ARCHITECTURE + 本文对齐；债只留本文 |
| 状态 | **done**（2026-07-19） |

- [x] `src/features/project/ARCHITECTURE.md`：定稿最优；无债表
- [x] `M-F-PROJECT`：落地对照；archived-decision；链本文
- [x] [12](./12-平台与Domain扩散重构执行计划.md) 波次 2 project 指向本文

---

## 阶段 1 · NORM

| 字段 | 内容 |
|------|------|
| 目标 | public + TSDoc 对齐 task/command 样板 |
| 破坏性 | 低 |
| 状态 | **done**（2026-07-19） |

### 落地

| 项 | 结果 |
|----|------|
| `index.ts` | 多行摘要 + `@remarks`；去掉 `@fileoverview` |
| public 收窄 | 撤无外消费者：低层 query/keys、create/update api、bulk 定义表、内部类型等 |
| 包内路径 | components/hooks/api 改相对路径 |
| 门禁 | tsc · boundaries · project+overview 33 测绿 |

---

## 阶段 2 · SCENE

| 字段 | 内容 |
|------|------|
| 目标 | 详情页可扫完；任务板 wiring 进 hooks facade |
| 破坏性 | 中 |
| 状态 | **done**（2026-07-19） |

### 落地

| 项 | 结果 |
|----|------|
| facade | `hooks/useProjectDetailScene.ts`（组合 task public） |
| `ProjectPage` | ~370 → **~95** 薄壳（只拼 EntityScene 槽位） |
| 行为 | 未改产品路径；禁 layout / 禁复制 task mutation |
| 门禁 | tsc · boundaries · project+overview 33 测绿 |

---

## 阶段 3 · VOLUME

| 字段 | 内容 |
|------|------|
| 目标 | 边角可控；不挡 CLOSE |
| 状态 | pending |

| 优先级 | 项 | 动作 |
|--------|-----|------|
| P0 | 若 SCENE 后仍有 &gt;400 生产单文件 | 内拆 |
| P1 | `ProjectBoard` / `RowAdapter` | 有痛再拆 |
| P2 | ContextMenu | 有痛再拆 |

---

## 阶段 4 · CLOSE

| 字段 | 内容 |
|------|------|
| 目标 | project 可当第二样板；lifecycle/view 可开工 |
| 状态 | pending |

- [ ] 回写 M-F-PROJECT 对照；ARCHITECTURE 与代码一致
- [ ] 检查表：11 附录 + 12 增补 C1–C6 勾选结论
- [ ] 写下节「复制到 lifecycle/view」增补（若有）
- [ ] 门禁绿

---

## 3. 与其它文档

```txt
M-F-PROJECT.md     → WHY / 决议 / 落地对照（档案）
本文               → 刀序、债、验收（进度）
project/ARCHITECTURE → 定稿日常
12 扩散计划        → 波次顺序
CONVENTIONS.md     → HOW
```

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-19 | 初版：阶段 0–4；基线；DOC done |
| 2026-07-19 | NORM done：public 收窄 + TSDoc；包内相对路径 |
| 2026-07-19 | SCENE done：useProjectDetailScene；ProjectPage ~95 |
