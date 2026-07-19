# Project-overview 样板重构执行计划（O1 · 薄 scene）

> 状态：**阶段 0–4 已收口** · 2026-07-19
> 决议源：[M-F-PROJ-OV](./模块/M-F-PROJ-OV.md)（O1）· 定稿契约：[project-overview/ARCHITECTURE.md](../../../src/features/project-overview/ARCHITECTURE.md)
> 前置：[12](./12-平台与Domain扩散重构执行计划.md) · [19-Settings](./19-Settings样板重构执行计划.md)
> **文档：** `ARCHITECTURE` = 定稿最优；债/进度只写本文。

---

## 0. 目标

Keep 独立薄 scene；只依赖 project public；对齐 O1–O3。

### 非目标

- 不并入 project（O2 次选不做）
- 不自建 api（O3 否）

### 门禁

```bash
bunx tsc --noEmit -p tsconfig.json
bun run lint:boundaries
bunx vitest run src/features/project-overview
```

---

## 1. 收口基线

| 项 | 状态 |
|----|------|
| → layout | **0** |
| public | **仅 ProjectOverviewPage** |
| Page | **~70**；`useProjectOverviewScene` ~200 |
| 死代码 | **已删** List / EmptyState（EntityScene 后无人用） |

---

## 2. 阶段

| 阶段 | 状态 |
|------|------|
| DOC / NORM / SCENE / VOLUME / CLOSE | **done** |

VOLUME：无 &gt;400 → 跳过。SCENE：抽 facade。

### CLOSE

| # | 结论 |
|---|------|
| O1 Keep 薄 scene | **通过** |
| O2 禁 layout；public | **通过** |
| O3 ARCHITECTURE 定稿 | **通过** |

### 附录 · 波次 4 入口备忘

波次 3 收口后下一档：display-options / metadata-fields / selection / global-search 等 **按债短刀**；submit 等 **只验收**。

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-19 | 0–4 收口；波次 3 完 |
