# Activity 样板重构执行计划（A1 · 薄收）

> 状态：**阶段 0–4 已收口** · 2026-07-19
> 决议源：[M-F-ACTIVITY](./模块/M-F-ACTIVITY.md)（A1）· 写法：[CONVENTIONS v2.1](../../../src/CONVENTIONS.md) · 定稿契约：[activity/ARCHITECTURE.md](../../../src/features/activity/ARCHITECTURE.md)
> 前置：[12](./12-平台与Domain扩散重构执行计划.md) · [16-Space](./16-Space样板重构执行计划.md)
> **原则：** 串行；每阶段末相关门禁；开放前可破坏须清干净；源码禁史诗号。
> **文档：** `ARCHITECTURE` = 定稿最优（无债表）；**债/进度只写本文**；src 不回链 Docs。

---

## 0. 目标与非目标

### 0.1 目标

1. activity 保持 **薄查询域**：单一 `getEntityActivities` / `useEntityActivitiesQuery`。
2. 对齐 16 附录 A1–A3：单源 query；禁 → layout；ARCHITECTURE 定稿。
3. task 时间线 UI **只**走本域 public（消双源）。

### 0.2 非目标

- 不并入 task（A2 否）
- 不扩大为全站动态流（A3 否）
- 不顺手开 project-overview / launcher

### 0.3 门禁

```bash
bunx tsc --noEmit -p tsconfig.json
bun run lint:boundaries
bunx vitest run src/features/activity
```

---

## 1. 现网基线（收口 · 2026-07-19）

| 项 | 状态 |
|----|------|
| activity → layout | **0** |
| 双源 | **已消**（`TaskActivityTimeline` → `useEntityActivitiesQuery`） |
| 厚页 | **无**（Debug ~206 展示壳） |
| public | **收窄** |
| ARCHITECTURE | **定稿最优** |

---

## 2. 阶段总表

| 阶段 | ID | 状态 |
|------|-----|------|
| 0 | DOC | **done** |
| 1 | NORM | **done** |
| 2 | SCENE | **done**（跳过） |
| 3 | VOLUME | **done**（跳过） |
| 4 | CLOSE | **done** |

---

## 阶段落地摘要

### DOC / NORM

定稿 ARCHITECTURE；收窄 public；相对路径；hooks 显式 export；去 `@fileoverview`。

### SCENE / VOLUME

无生产厚页、无 &gt;400 → **跳过**。

### CLOSE · 检查表

| # | 结论 |
|---|------|
| 16 A1 | **通过**（单源 query） |
| 16 A2 | **通过** |
| 16 A3 | **通过** |

### 附录 · 下一刀备忘（project-overview / 波次 3）

| # | 检查项 |
|---|--------|
| O1 | Keep 薄 scene；禁吞进 project |
| O2 | 禁 → layout；public + TSDoc |
| O3 | ARCHITECTURE 定稿最优 |

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-19 | 0–4 全收口；波次 2 domain 薄收完 |
