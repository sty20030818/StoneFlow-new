# 模块治理工作区

> 启动：2026-07-17
> 目的：在 **目录骨架已定（Phase D）** 之后，逐模块讨论边界、最佳实践与治理动作。
> 品质门禁：[`../03-To-Be/08-Feature品质验收标准.md`](../03-To-Be/08-Feature品质验收标准.md)
> 历史调研：[`../01-As-Is/`](../01-As-Is/)（路径可能过时，本工作区以**现网**为准）

---

## 文档

| 序 | 文档 | 状态 |
|----|------|------|
| 0 | [03-模块白话导读.md](./03-模块白话导读.md) | **给人读**：谁大谁小、干什么 |
| 0b | [04-长期目标-装配三角.md](./04-长期目标-装配三角.md) | **T2 已锁定**（nav/routes/layout 目标） |
| 0c | [05-模块设计规范.md](./05-模块设计规范.md) | **全仓模块怎么设计**（纯化/协作/检查表） |
| 0d | [06-装配三角-纯化优化清单.md](./06-装配三角-纯化优化清单.md) | nav/routes/layout 还能优化什么 |
| 0e | [07-Feature切分与边界总览.md](./07-Feature切分与边界总览.md) | **防切分错误**：并/拆/Keep 全仓表 |
| 1 | [01-模块全景清单.md](./01-模块全景清单.md) | **Step 1 · 清单**（现网全量 ID） |
| 2 | [02-讨论与治理计划.md](./02-讨论与治理计划.md) | **Step 2 · 计划**（讨论节奏） |
| 3 | [模块/M-APP-NAV.md](./模块/M-APP-NAV.md) | **已讨论**：路径图 + 大文件拆分计划 |
| 4 | [模块/M-ROUTE.md](./模块/M-ROUTE.md) | **已讨论**：薄页、场景表、loader 门闸 |
| 5 | [模块/M-LAYOUT.md](./模块/M-LAYOUT.md) | **已讨论**：L1–L7 层模型 + 巨石拆分 |
| 6 | [模块/M-F-COMMAND.md](./模块/M-F-COMMAND.md) | **已讨论**：C3 注册式 vs Bridge |
| 7 | [模块/M-F-TASK.md](./模块/M-F-TASK.md) | **已讨论**：T2a 纯化 + list-scene + 命令 |
| 8 | [模块/M-F-BULK.md](./模块/M-F-BULK.md) | **已讨论**：B3 引擎纯化 + 域贡献 |
| 9 | [模块/M-F-LAUNCHER.md](./模块/M-F-LAUNCHER.md) | **已落地**：Launcher 独立窗；活跃契约见 `src/features/launcher/ARCHITECTURE.md` |
| 10 | [模块/M-F-PROJECT.md](./模块/M-F-PROJECT.md) | **已讨论**：P2 纯化 + overview Keep |
| 11 | [模块/M-F-SPACE.md](./模块/M-F-SPACE.md) | **已讨论**：S2 纯化 + 迁出 pending intent |
| 12 | [模块/M-F-SELECTION.md](./模块/M-F-SELECTION.md) | **已讨论**：L2 选中平台 + 域贡献快照 |
| 13 | [模块/M-F-VIEW.md](./模块/M-F-VIEW.md) | **已讨论**：V2 定义 domain + view-task facade |
| 14 | [模块/M-F-LIFECYCLE.md](./模块/M-F-LIFECYCLE.md) | **已讨论**：Y2 编排域 Keep + facade |
| 15 | [模块/M-F-FILTER.md](./模块/M-F-FILTER.md) | **已讨论**：F2 总线 + task controller 回家 |
| 16 | [模块/M-F-DISPLAY.md](./模块/M-F-DISPLAY.md) | **已讨论**：D2 与 filter 分界 + 断 layout |
| 17 | [模块/M-F-META.md](./模块/M-F-META.md) | **已讨论**：M2b 纯化 chrome + 域组装 |
| 18 | [模块/M-F-SUBMIT.md](./模块/M-F-SUBMIT.md) | **已讨论**：U2 小平台标杆 Keep |
| 19 | [模块/M-F-ENTITY-DETAIL.md](./模块/M-F-ENTITY-DETAIL.md) | **已讨论**：E2 URL 契约 + 策略回域 |
| 20 | [模块/M-F-DANGER.md](./模块/M-F-DANGER.md) | **已讨论**：N1 标杆 Keep |
| 21 | [模块/M-F-SEARCH.md](./模块/M-F-SEARCH.md) | **已讨论**：G2 统一搜索端口 + QC |
| 22 | [模块/M-F-WORKSPACE.md](./模块/M-F-WORKSPACE.md) | **已讨论**：极薄失效 Keep |
| 23 | [模块/M-F-SYNC.md](./模块/M-F-SYNC.md) | **已讨论**：云同步 Keep |
| 24 | [模块/M-F-UPDATE.md](./模块/M-F-UPDATE.md) | **已讨论**：应用更新 Keep |
| 25 | [模块/M-F-SETTINGS.md](./模块/M-F-SETTINGS.md) | **已讨论**：三入口 Keep |
| 26 | [模块/M-F-ACTIVITY.md](./模块/M-F-ACTIVITY.md) | **已讨论**：Keep 观察 + 单源 query |
| 27 | [模块/M-F-PROJ-OV.md](./模块/M-F-PROJ-OV.md) | **已讨论**：薄 scene Keep |
| 28 | `模块/<id>.md` | （22 feature 卡已齐 · 装配三角另卡） |
| 29 | [08-破坏性重构-准备清单.md](./08-破坏性重构-准备清单.md) | 讨论→动刀：纪律、DoR |
| 30 | [09-决议总表.md](./09-决议总表.md) | **一页目标码总表** |
| 31 | [10-T2重构执行计划.md](./10-T2重构执行计划.md) | **史诗 0–12 + DEP-INV 文件表** |

---

## 怎么用

1. 先认清单：有没有漏模块、要不要拆/并 ID。
2. 按计划顺序：一次只深谈 **一个模块**（边界 → 实践 → 治理 → 是否开改）。
3. 每个模块谈完：落一页 `模块/<id>.md` + 更新清单状态列。
4. 改造时用品质验收表 P0 勾选；不顺手全仓搬家。

---

## 原则（短）

- **全都是模块**：`app` / `layout` / `routes` / `features` / `shared` / `styles` 一视同仁进清单。
- **清单 ≠ 评级定稿**：Step 1 只登记；分数与动作在讨论后写。
- **现网优先**：与 As-Is 冲突时以 `src/` 为准，并回写本清单。
