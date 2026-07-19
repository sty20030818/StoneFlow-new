# Lifecycle 样板重构执行计划（Y2 · 对齐 task / project）

> 状态：**阶段 0–4 已收口** · 2026-07-19
> 决议源：[M-F-LIFECYCLE](./模块/M-F-LIFECYCLE.md)（Y2）· 写法：[CONVENTIONS v2.1](../../../src/CONVENTIONS.md) · 定稿契约：[lifecycle/ARCHITECTURE.md](../../../src/features/lifecycle/ARCHITECTURE.md)
> 前置：[11](./11-Task样板重构执行计划.md) · [12](./12-平台与Domain扩散重构执行计划.md) · [13-Project](./13-Project样板重构执行计划.md)
> **原则：** 串行；每阶段末相关门禁；开放前可破坏须清干净；源码禁史诗号。
> **文档：** `ARCHITECTURE` = 定稿最优（无债表）；**债/进度只写本文**；src 不回链 Docs。

---

## 0. 目标与非目标

### 0.1 目标

1. lifecycle 成为 **编排域样板**（跨实体 · Keep 独立）。
2. 对齐 11 附录 + 12 C1–C6 + 13 附录 L1–L2。
3. 写路径只委托 task/project/space public；禁吞进 task。
4. `ARCHITECTURE` / public / TSDoc 与 CONVENTIONS 一致。

### 0.2 非目标

- 不拆 archive / trash 为两 feature
- 不把 UI 并进 layout
- 不做徽章 count API 性能专项
- 不顺手开 view / launcher

### 0.3 门禁

```bash
bunx tsc --noEmit -p tsconfig.json
bun run lint:boundaries
bunx vitest run src/features/lifecycle
```

---

## 1. 现网基线（收口 · 2026-07-19）

| 项 | 状态 |
|----|------|
| lifecycle → layout | **0** |
| bulk/ · register | **已在本域** |
| api 委托 t/p/s public | **done** |
| `LifecycleList` | **~88** 薄壳 |
| `useLifecycleScene` | **~245** |
| `LifecycleBoard` | ~285 · 无痛不拆 |
| ARCHITECTURE / public | **定稿 + NORM** |

---

## 2. 阶段总表

| 阶段 | ID | 状态 |
|------|-----|------|
| 0 | DOC | **done** |
| 1 | NORM | **done** |
| 2 | SCENE | **done** |
| 3 | VOLUME | **done**（跳过拆分） |
| 4 | CLOSE | **done** |

---

## 阶段落地摘要

### DOC / NORM

定稿 ARCHITECTURE；收窄 public；包内相对路径。

### SCENE

| 项 | 结果 |
|----|------|
| facade | `hooks/useLifecycleScene.ts` |
| 纯函数 | `model/buildLifecycleSections.ts` |
| List | ~356 → **~88** |
| 测 | mock 对齐相对路径模块；27 绿 |

### VOLUME

无 &gt;400 生产文件；Board ~285 无痛 → **跳过**。

### CLOSE · 检查表

| # | 结论 |
|---|------|
| 11·1–10 | **通过** |
| 12 C1–C4 | **通过**（register/bulk 本域） |
| 13 L1–L2 | **通过**（Keep；facade；禁吞 task） |
| C5/C6 | **N/A / 通过**（无任务板；ARCHITECTURE 定稿） |

### 附录 · 复制到 view 的增补

| # | 检查项 |
|---|--------|
| V1 | 任务列表走 task public / facade；禁复制 list-scene |
| V2 | 厚页抽 `useViewsScene`（对标 useLifecycleScene / useProjectDetailScene） |
| V3 | 禁 view → layout；public + TSDoc |

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-19 | 初版；DOC + NORM done |
| 2026-07-19 | SCENE done；VOLUME 跳过；CLOSE；波次 lifecycle 收口 |
