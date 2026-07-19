# View 样板重构执行计划（V2 · 对齐 lifecycle / project）

> 状态：**阶段 0–4 已收口** · 2026-07-19
> 决议源：[M-F-VIEW](./模块/M-F-VIEW.md)（V2）· 写法：[CONVENTIONS v2.1](../../../src/CONVENTIONS.md) · 定稿契约：[view/ARCHITECTURE.md](../../../src/features/view/ARCHITECTURE.md)
> 前置：[11](./11-Task样板重构执行计划.md) · [12](./12-平台与Domain扩散重构执行计划.md) · [13](./13-Project样板重构执行计划.md) · [14](./14-Lifecycle样板重构执行计划.md)
> **原则：** 串行；每阶段末相关门禁；开放前可破坏须清干净；源码禁史诗号。
> **文档：** `ARCHITECTURE` = 定稿最优（无债表）；**债/进度只写本文**；src 不回链 Docs。

---

## 0. 目标与非目标

### 0.1 目标

1. view 成为 **视图定义 + 跑任务板** 编排样板（Keep 一 feature，不拆回空 `views`）。
2. 对齐 11 附录 + 12 C1–C6 + 13/14 附录（含 V1–V3）。
3. 任务板只组合 task / display-options / selection public；禁复制 list-scene。
4. `ARCHITECTURE` / public / TSDoc 与 CONVENTIONS 一致。

### 0.2 非目标

- 不拆 `view`（定义）与 `views-scene` 两包（V3 否）
- 不把整页吞进 `TaskListSceneView variant=view`（V4 只部分吸收任务能力）
- 不做徽章 / 性能专项 / 视觉专项
- 不顺手开 space / launcher

### 0.3 门禁

```bash
bunx tsc --noEmit -p tsconfig.json
bun run lint:boundaries
bunx vitest run src/features/view
```

冒烟（人工）：`/views` 列表轨、切视图、创建/编辑/删/隐藏视图、任务板选择与打开详情。

---

## 1. 现网基线（收口 · 2026-07-19）

| 项 | 状态 |
|----|------|
| view → layout | **0** |
| `ViewsPage` | **~69** 薄壳 |
| `useViewsScene` | **~342**（&lt;400，VOLUME 不拆） |
| `ViewEditorDialog` | ~406 · 已有 `.form` · **无痛不拆** |
| public | `ViewsPage` + `useViewsQuery` |
| ARCHITECTURE | **定稿最优** |

---

## 2. 阶段总表

| 阶段 | ID | 内容 | 破坏性 | 状态 |
|------|-----|------|--------|------|
| 0 | DOC | ARCHITECTURE 定稿；本文落盘；12 指向 | 无 | **done** |
| 1 | NORM | TSDoc / public 收窄；去 `@fileoverview`；包内相对路径 | 低 | **done** |
| 2 | SCENE | 抽 `useViewsScene`；压薄 ViewsPage | 中 | **done** |
| 3 | VOLUME | &gt;400 / 痛点内拆 | 低 | **done**（跳过拆分） |
| 4 | CLOSE | 对照勾选；space 检查表备忘 | 无 | **done** |

---

## 阶段落地摘要

### DOC / NORM

定稿 ARCHITECTURE；public 收窄为 `ViewsPage` + `useViewsQuery`；包内相对路径；去 `@fileoverview`。

### SCENE

| 项 | 结果 |
|----|------|
| facade | `hooks/useViewsScene.ts` |
| `ViewsPage` | ~363 → **~69** |
| 测 | mock 对齐 `view.queries` / `view.mutations`；7 绿 |

### VOLUME

| 优先级 | 项 | 结果 |
|--------|-----|------|
| P0 | &gt;400 生产单文件 | Editor ~406 已有 form · **跳过** |
| P1 | facade ~342 | **跳过**（&lt;400 无痛） |

### CLOSE · 检查表

| # | 结论 |
|---|------|
| 11·1–10 | **通过**（定稿 ARCH、public、禁 layout、相对路径） |
| 12 C1–C4 | **N/A / 通过**（本域无 register/bulk；任务 bulk 走 task） |
| 12 C5 | **通过**（任务板只组合 task public） |
| 12 C6 | **通过**（ARCHITECTURE 定稿；进度只写本文） |
| 14 V1 | **通过** |
| 14 V2 | **通过**（`useViewsScene`） |
| 14 V3 | **通过** |

### 附录 · 复制到 space 的增补

| # | 检查项 |
|---|--------|
| S1 | pending intent 纯化（见 M-F-SPACE） |
| S2 | 厚页 / facade 对齐；禁 → layout |
| S3 | public + TSDoc；ARCHITECTURE 定稿最优 |

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-19 | 初版；DOC done |
| 2026-07-19 | NORM + SCENE + VOLUME 跳过 + CLOSE；波次 view 收口 |
