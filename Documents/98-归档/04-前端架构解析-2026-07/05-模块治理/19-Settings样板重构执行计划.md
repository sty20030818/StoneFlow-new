# Settings 样板重构执行计划（波次 3 · scene）

> 状态：**阶段 0–4 已收口** · 2026-07-19
> 决议源：[M-F-SETTINGS](./模块/M-F-SETTINGS.md)（S1）· 定稿契约：[settings/ARCHITECTURE.md](../../../src/features/settings/ARCHITECTURE.md)
> 前置：[12](./12-平台与Domain扩散重构执行计划.md) · [18-Launcher](./18-Launcher样板重构执行计划.md)
> **原则：** 串行；每阶段末相关门禁；开放前可破坏须清干净；源码禁史诗号。
> **文档：** `ARCHITECTURE` = 定稿最优；**债/进度只写本文**；src 不回链 Docs。

---

## 0. 目标与非目标

### 0.1 目标

1. 保持 **三入口**（主 / contract / page）为规范标杆。
2. 对齐 SET1–SET3：禁 layout 倒依赖；public + TSDoc；ARCHITECTURE 定稿。
3. SyncPanel 体量债内拆（非切分）。

### 0.2 非目标

- 不拆 settings-sync / settings-update feature
- 不取消 contract
- 不把配置 API 并入 layout
- 不删 legacy device invoke（迁移收口，非双轨 public）

### 0.3 门禁

```bash
bunx tsc --noEmit -p tsconfig.json
bun run lint:boundaries
bunx vitest run src/features/settings
```

---

## 1. 现网基线（收口 · 2026-07-19）

| 项 | 状态 |
|----|------|
| settings → layout | **0** |
| 三入口 | **冻结保留** |
| SettingsPage | ~85 薄壳 |
| SettingsSyncPanel | **~467** + presentation ~298 |
| public | **收窄**（store / 侧栏类型 / SettingsSidebar + contract 再导出） |
| ARCHITECTURE | **定稿最优** |

---

## 2. 阶段总表

| 阶段 | ID | 状态 |
|------|-----|------|
| 0 | DOC | **done** |
| 1 | NORM | **done** |
| 2 | SCENE | **done**（跳过） |
| 3 | VOLUME | **done**（拆 presentation） |
| 4 | CLOSE | **done** |

---

## 阶段落地摘要

### DOC / NORM

定稿 ARCHITECTURE；三入口 TSDoc；包内相对路径；收窄 public；删 identity `SettingsUpdatePanel`（内联 `UpdateSettingsSection`）。

### SCENE

Page 已薄 → **跳过**。

### VOLUME

`SettingsSyncPanel.presentation.tsx`：徽章 / 指标 / copy 纯展示抽出。

### CLOSE · 检查表

| # | 结论 |
|---|------|
| 18 SET1 | **通过**（三入口；禁 layout） |
| 18 SET2 | **通过** |
| 18 SET3 | **N/A**（无厚页 facade；债在 SyncPanel 内拆） |

### 附录 · 复制到 project-overview 的增补

| # | 检查项 |
|---|--------|
| O1 | Keep 薄 scene；禁吞进 project |
| O2 | 禁 → layout；public + TSDoc |
| O3 | ARCHITECTURE 定稿最优 |

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-19 | 0–4 全收口 |
