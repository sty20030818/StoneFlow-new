# StoneFlow 文档索引

本索引只回答“去哪里找什么”，不重复正文。当前代码是实现事实；长期文档必须在对应代码变更中同步维护。

## 优先入口

| 场景 | 阅读顺序 |
|---|---|
| 了解项目与启动方式 | [根 README](../README.md) |
| 了解整体结构 | [根 ARCHITECTURE](../ARCHITECTURE.md) |
| 了解产品方向 | [P1 产品内核](./00-产品/P1-产品内核.md) → [P2 产品蓝图](./00-产品/P2-产品蓝图.md) |
| 了解领域与技术实现 | [A1 领域模型](./01-架构/A1-领域模型.md) → [A2 系统设计](./01-架构/A2-系统设计.md) |
| 了解界面共识 | [A3 界面系统](./01-架构/A3-界面系统.md) |
| 了解文档规则 | [文档体系 SOP](./文档体系SOP.md) |
| 了解前端模块 | `src/**/ARCHITECTURE.md` |
| 了解桌面与 Rust 模块 | `src-tauri/ARCHITECTURE.md` |
| 查找历史方案 | [98-归档](./98-归档/) |

## 当前长期文档

| 领域 | Owner |
|---|---|
| 产品定义与边界 | [P1 产品内核](./00-产品/P1-产品内核.md) |
| 用户路径与信息架构 | [P2 产品蓝图](./00-产品/P2-产品蓝图.md) |
| 当前实体、关系与生命周期 | [A1 领域模型](./01-架构/A1-领域模型.md) |
| 全局技术栈与跨模块机制 | [A2 系统设计](./01-架构/A2-系统设计.md) |
| 产品级 UI 与交互规则 | [A3 界面系统](./01-架构/A3-界面系统.md) |
| 重大决策历史 | `Documents/01-架构/adr/`（有真实决策时创建） |

旧版 P1/P2 等已归档，只作历史追溯，不能作为当前实现依据。

## 任务与归档

- 非平凡功能任务使用 `02-开发任务/YYYY-MM-DD-task-slug/`，固定维护 `SPEC.md`、`TASKS.md`，命中方案拆分门槛时增加 `PLAN.md`。
- 重构任务使用 `03-重构任务/YYYY-MM-DD-task-slug/`，文档组成遵循相同门槛；目录仅在有真实任务时创建。
- 已完成任务与过时方案进入 `98-归档/`，保留原主题结构，不作为当前实现依据。
- 图片、原型等非文本文档素材进入 `99-素材/`。

## 当前活跃任务

- [任务集合查询与虚拟列表性能重构](./02-开发任务/2026-07-31-task-collection-query-virtualization/SPEC.md)（[PLAN](./02-开发任务/2026-07-31-task-collection-query-virtualization/PLAN.md) · [TASKS](./02-开发任务/2026-07-31-task-collection-query-virtualization/TASKS.md)）— 待手工验收
- [HeroUI-only UI 平台、Linear 浅色设计系统与键盘交互重写](./03-重构任务/2026-08-12-heroui-ui-interaction-system-refactor/SPEC.md)（[PLAN](./03-重构任务/2026-08-12-heroui-ui-interaction-system-refactor/PLAN.md) · [TASKS](./03-重构任务/2026-08-12-heroui-ui-interaction-system-refactor/TASKS.md)）— PLAN 已确认，待从阶段 A 实施

## 模块文档规则

根 `ARCHITECTURE.md` 列出的一级模块必须有 `README.md`；`ARCHITECTURE.md` 与 `DESIGN.md` 只在触发条件成立时创建。详细职责、模板与触发条件见 [文档体系 SOP](./文档体系SOP.md)。
