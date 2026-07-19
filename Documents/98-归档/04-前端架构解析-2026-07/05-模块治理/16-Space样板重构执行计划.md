# Space 样板重构执行计划（S2 · 对齐 view / lifecycle）

> 状态：**阶段 0–4 已收口** · 2026-07-19
> 决议源：[M-F-SPACE](./模块/M-F-SPACE.md)（S2/S2a）· 写法：[CONVENTIONS v2.1](../../../src/CONVENTIONS.md) · 定稿契约：[space/ARCHITECTURE.md](../../../src/features/space/ARCHITECTURE.md)
> 前置：[12](./12-平台与Domain扩散重构执行计划.md) · [15-View](./15-View样板重构执行计划.md)
> **原则：** 串行；每阶段末相关门禁；开放前可破坏须清干净；源码禁史诗号。
> **文档：** `ARCHITECTURE` = 定稿最优（无债表）；**债/进度只写本文**；src 不回链 Docs。

---

## 0. 目标与非目标

### 0.1 目标

1. space 成为 **小而纯 domain** 样板（实体 + 视觉 + 编辑 UI + setActiveScope）。
2. 对齐 15 附录 S1–S3：pending intent 已迁出；禁 → layout；public + TSDoc。
3. `ARCHITECTURE` / public / TSDoc 与 CONVENTIONS 一致。

### 0.2 非目标

- 不把 UI 吞进 layout（S3 否）
- 不与 workspace / navigation 合并（S4/S5 否）
- 不强制 registerSpaceCommands
- 不顺手开 activity / launcher

### 0.3 门禁

```bash
bunx tsc --noEmit -p tsconfig.json
bun run lint:boundaries
bunx vitest run src/features/space
```

冒烟（人工）：侧栏新建/编辑/归档 Space、设默认、切 scope（setActiveScope）、lifecycle 恢复/删除 space。

---

## 1. 现网基线（收口 · 2026-07-19）

| 项 | 状态 |
|----|------|
| space → layout | **0** |
| `takePendingCommandOpenIntent` | **已在 command**（S1 通过） |
| `setActiveScope` | 留 space（S2a）；仅 ShellRouteLayout |
| 厚页 | **无**（`SpaceEditorDialog` ~249） |
| public | **收窄**（hooks + 必要 api + getSpaceVisual + Dialog） |
| ARCHITECTURE | **定稿最优** |

---

## 2. 阶段总表

| 阶段 | ID | 内容 | 破坏性 | 状态 |
|------|-----|------|--------|------|
| 0 | DOC | ARCHITECTURE 定稿；本文落盘；12 指向 | 无 | **done** |
| 1 | NORM | TSDoc / public 收窄；去 `@fileoverview`；相对路径；hooks 显式 export | 低 | **done** |
| 2 | SCENE | 无厚页 → **跳过** | — | **done** |
| 3 | VOLUME | 无 &gt;400 → **跳过** | — | **done** |
| 4 | CLOSE | 对照勾选；activity 检查表备忘 | 无 | **done** |

---

## 阶段落地摘要

### DOC / NORM

定稿 ARCHITECTURE；收窄 public；包内相对路径；hooks 显式 export。
删未用 `useRestoreSpaceMutation`（lifecycle 走 `restoreSpace` api）。

### SCENE / VOLUME

无厚页、无 &gt;400 → **跳过**。

### CLOSE · 检查表

| # | 结论 |
|---|------|
| 15 S1 | **通过**（intent 在 command） |
| 15 S2 | **通过**（无厚页；禁 layout） |
| 15 S3 | **通过** |
| 12 C6 | **通过** |

### 附录 · 复制到 activity 的增补

| # | 检查项 |
|---|--------|
| A1 | 单源 query；可极薄 |
| A2 | 禁 → layout；public + TSDoc |
| A3 | ARCHITECTURE 定稿最优 |

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-19 | 初版；DOC done |
| 2026-07-19 | NORM + SCENE/VOLUME 跳过 + CLOSE；波次 space 收口 |
