# Launcher 样板重构执行计划（波次 3 · window）

> 状态：**阶段 0–4 已收口** · 2026-07-19
> 决议源：[M-F-LAUNCHER](./模块/M-F-LAUNCHER.md) · 定稿契约：[launcher/ARCHITECTURE.md](../../../src/features/launcher/ARCHITECTURE.md)
> 前置：[12](./12-平台与Domain扩散重构执行计划.md) · 波次 2 domain 全收口
> **原则：** 串行；每阶段末相关门禁；开放前可破坏须清干净；源码禁史诗号。
> **文档：** `ARCHITECTURE` = 定稿最优（无债表）；**债/进度只写本文**；src 不回链 Docs。

---

## 0. 目标与非目标

### 0.1 目标

1. launcher 窗栈与 domain 样板纪律对齐（public / TSDoc / 相对路径 / 禁 layout）。
2. 保持独立窗边界；创建复用 task、搜索复用 global-search。
3. 清死字段与双路径薄包装。

### 0.2 非目标

- 不抽 `useLauncherScene`（Page 已 ~29 薄壳）
- 不 VOLUME 拆 reducer（&lt;300）
- 不恢复 quick-create 命名
- 不顺手开 settings

### 0.3 门禁

```bash
bunx tsc --noEmit -p tsconfig.json
bun run lint:boundaries
bunx vitest run src/features/launcher
```

---

## 1. 现网基线（收口 · 2026-07-19）

| 项 | 状态 |
|----|------|
| launcher → layout | **0** |
| public | **仅 `LauncherPage`** |
| `LauncherPage` | **~29** 薄壳 |
| 最大生产文件 | reducer ~297 |
| 包内路径 | **相对路径** |
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

定稿 ARCHITECTURE；去 `@fileoverview`；包内相对路径；`CreateRow` 接 `derived.createMeta`；`createAndOpen` 复用 `create()`；去掉 identity `LauncherComposer`；收紧未用 export。

### SCENE / VOLUME

Page 已薄、无 &gt;400 → **跳过**。

### CLOSE · 检查表

| # | 结论 |
|---|------|
| public 最小 | **通过** |
| 禁 layout | **通过** |
| 创建→task / 搜索→global-search | **通过** |
| 相对路径 + TSDoc | **通过** |

### 附录 · 复制到 settings 的增补

| # | 检查项 |
|---|--------|
| SET1 | 三入口边界清晰；禁 → layout 倒依赖 |
| SET2 | public + TSDoc；ARCHITECTURE 定稿 |
| SET3 | 厚页抽 facade（若有） |

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-19 | 0–4 全收口；波次 3 开刀 launcher |
