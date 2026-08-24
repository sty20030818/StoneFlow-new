# Task View Workspace Hard Cut

**Status:** completed; archived; manual acceptance transferred

2026-08-24，任务发起人确认以实现与自动化落地作为本工作包的完成口径；尚未执行的真实应用 Smoke 已移入 [统一产品验收](../../unified-product-acceptance/spec.md)，不记为已经通过。

## Problem Statement

StoneFlow 当前把三种不同概念都叫作 View：页面内置的高频查询、用户保存的查询、URL 中的临时筛选。前端又将五个代码常量伪装成 `kind=system` 的 View，再与数据库中的自定义 View 合并到同一 Toolbar。结果是名称过载、入口过多，也无法判断一个“View”是产品预设还是用户数据。

所有任务与 Views 详情目前各自拥有一套任务结果页编排：PageFrame、Toolbar、Filter、Display、TaskBoard、分页查询和保存流程重复。Default View Toggle 的选中反馈又等待 URL 与查询链路回写，造成按下后不跟手。这不是 TaskBoard 虚拟化首要问题，而是交互状态与路由/查询提交顺序错误。

当前从 Standalone 或 Project 页保存 View 时，只保存 FilterQuery，页面 placement 留在外部。重新打开后因此可能丢失“仅独立事项”或“指定项目”边界。同时，clean Saved View 仍重复显示 base filter chips，用户看不出哪些是保存定义、哪些是本次临时修改。

## Canonical Terms

| 术语 | 定义 | 真源 |
|---|---|---|
| **Default View** | 页面专属的高频查询入口；始终单选 | 代码定义，不入库 |
| **Saved View** | 用户命名并持久化的完整 Task 查询 | SQLite/同步投影中的 `scope + context + baseViewKey + filters` |
| **Filter Draft** | 用户在当前 base 上做的临时、可恢复完整 FilterQuery 快照 | 路由 search `f` |
| **Display** | 分组、排序和行字段显示 | 本机呈现偏好；不决定成员资格 |
| **Task Workspace** | 唯一的 Task 结果宿主 | 以 `scope + context + base + draft` 派生查询并组合 Toolbar/TaskBoard |

产品和长期文档不再使用“System View”指代 Default View。代码内也不保留伪 Saved View 实体、兼容 alias 或两套同义类型。

## Query Contract

Saved View 必须持久化：

- `scope`：`all` 或某个 Space。
- `context`：`all`、`standalone` 或 `projectId`。
- `baseViewKey`：保存时 Default View 对应的稳定查询基线。
- `filters`：在该 context 内应用的 FilterQuery。

`context` 是不可由 Filter Draft 移除的查询边界，不是 FilterQuery clause。不增加独立的 origin/page metadata；所属任务页由 context 唯一确定。从 All Tasks、Standalone 或 Project 创建 Saved View 时，必须保存当前 scope、context、baseViewKey 和 effective filters，重新打开必须复现相同查询语义。

Default View 或 Saved View 是 base。Filter Draft 是完整 FilterQuery 快照，不是增量 clause 补丁：

```text
dirty = normalize(draft) != normalize(base)
effective = dirty ? draft : base
```

路由必须区分“无 Draft”与“空 FilterQuery Draft”，否则无法在非空 base 上表达临时清空。规范化后与 base 相等的 Draft 应被 canonicalize 为无 Draft。

Display 不得决定 Task 是否进入结果。“未完成”、“已完成”与“全部”均由 Default/Saved/Draft 查询表达，不再由 `showCompleted` 作为第二真源。

## Information Architecture

```text
/$scopeKey/tasks
└── Task Workspace（All Tasks context）

/$scopeKey/standalone
└── Task Workspace（Standalone context）

/$scopeKey/projects/:projectId
└── Task Workspace（Project context）

/$scopeKey/views
└── Saved View Library（搜索 / 创建 / 重命名 / 删除）

/$scopeKey/views/:viewId
└── Task Workspace（Saved View source）
```

`/views/:viewId` 保留为稳定、可分享的 canonical 路径，但不再挂载独立 ViewsPage 结果编排。`/views` 根页不渲染 TaskBoard，也不显示任务状态 Default View。

Task Workspace 保留一个小型 source seam。Default View 直接调用无损 `run_task_query`；Saved View 的 `run_task_view` 只加载并校验定义，再委托同一个查询执行器。storage 以同一 SQL predicate 完成精确 count 与 keyset 窗口：首屏计数，续页不重复 COUNT，侧栏 badge 使用 count-only。不能让两条入口各自近似 FilterQuery，也不能把 Default 页退化为全量内存筛选。

## Per-page Default Views

| 页面 | Default View 顺序 | 默认 |
|---|---|---|
| All Tasks | 未完成 / 今天（含逾期）/ 即将到期 / 全部 | 未完成 |
| Standalone | 未完成 / 今天 / 全部 | 未完成 |
| Active Project | 未完成 / 今天 / 即将到期 / 已完成 / 全部 | 未完成 |
| Completed Project | 全部 / 已完成 / 未完成 | 全部 |
| Project Overview | 进行中 / 已完成 / 全部 | 进行中 |
| Archive / Trash（all scope） | 全部 / 空间 / 项目 / 任务 | 全部 |
| Archive / Trash（space scope） | 全部 / 项目 / 任务 | 全部 |
| Saved View Detail | 当前 Saved View / 所属 context 任务页 Default Views | 当前 Saved View |

所有 Task Workspace 的“今天”均包含尚未完成的逾期任务。space scope 的 Archive/Trash 禁止展示“空间”选项。Project 的矩阵由 Project 自身是否完成决定。

Saved View Detail 的当前 Saved View 始终是第一项且默认选中；后续 Default View 来自其持久化 context。选择所属页 Default View 时进入该页的 canonical 结果，不创建或改写 Saved View。

## Interaction Contract

- Default View 使用稳定业务 key，不使用数组 index；Toggle Group 必须始终有一项选中。
- selection change 在按下的同一交互提交中立即反馈。URL 更新、查询失效和 TaskBoard settle 是后续非紧急工作，不得阻塞 Toggle 选中反馈。
- 如需衔接路由提交，只允许一份短生命周交互 intent；路由/当前 source 仍是最终业务真源。
- FilterMenu 始终可用，并以 effective query 显示选中项。
- FilterBar 仅在 `draft != base` 时渲染；clean Default View 或 Saved View 不显示 base chips、Clear 或 Save bar。
- dirty 时 FilterBar 显示当前完整 Draft 公式，提供“恢复当前 View”与保存/覆盖动作。

## Persistence Cut

- Saved View 定义以单一 JSON 包络写入既有 `views.filters_json`，包含 `context + baseViewKey + filters`；application contract 使用 `all | standalone | projectId` 判别联合，不新增 schema 列或双写路径。
- 旧行只在存储解码边界升级为 `context=all + baseViewKey=all + filters`；可无损表达的旧条件精确转换，无法由当前 FilterQuery 表达的旧日期条件显式报错，禁止静默近似或丢弃。产品 DTO 与运行路径不保留旧形状分支。
- 伪 `SYSTEM_VIEWS` 从未入库，不需要数据迁移；直接替换为每页 Default View 策略。
- JSON 包络必须覆盖 SQLite、Outbox/同步投影、DTO 解码与恢复路径，不得只修前端类型。

## Deletion Targets

- 删除独立 ViewsPage 任务结果编排与重复 scene，Saved View Library 只保留库管理职责。
- 删除 `SYSTEM_VIEWS`、`ViewKind=system`、`SystemViewKey` 及相关映射/兼容测试。
- 删除每个 status 都生成 Toolbar 入口的旧配置，仅保留本规格的每页 Default View 矩阵。
- 删除 `showCompleted` 对查询成员资格的参与、重复 Filter/Display 写入和相关兼容逻辑。
- `PageFilterController` 只保留 Command 所需的最小投影与 action port；删除重复事件发射、`showCompleted` 投影与第二状态源。
- 删除只保护旧组件结构、数组 index 选中或 base chip 重复呈现的实现细节测试；保留产品语义、键盘、可访问性、存储升级边界和已发生回归。

预期净删除约 `250–450` 行，以实际 zero-consumer 证据为准；不为达到数字删除有价值的领域和行为测试。

## User Stories

1. 作为任务用户，我希望每个页面只提供与其上下文相关的 Default View，从而快速切换高频查询，而不是横向扫过每个 status。
2. 作为高频用户，我希望按下 Default View 时选中状态立即反馈，不必等待路由、查询或虚拟列表完成。
3. 作为使用 Saved View 的用户，我希望从独立事项或项目页保存后，任何时候重新打开都看到同一查询边界。
4. 作为整理 Saved View 的用户，我希望“视图”根页是清晰的库，而不是与所有任务重复的第二个 TaskBoard。
5. 作为筛选用户，我希望 clean Default/Saved View 不重复显示 FilterBar，只在我真正修改筛选后才显示 Draft 与恢复/保存操作。

## Acceptance Criteria

- 四组 Task 结果路由共用一个 Task Workspace 结果 Interface；`/views` 根页不渲染 TaskBoard。
- 每页 Default View 的名称、顺序和默认项与本规格矩阵一致；space scope 的 Archive/Trash 不出现“空间”。
- Toggle 在点击同一提交中展示新选中态，且组不能取消到空选择。
- Saved View 类型、数据库、同步投影与 API 均包含 context 与 baseViewKey；从 Standalone/Project 保存并重新打开的结果语义不变。
- 旧 Saved View 只在单一存储解码边界升级为 `context=all + baseViewKey=all`；不可无损转换的旧条件保留为 Library 中可删除的“需要重建”行，但不可编辑或执行，也不影响其它行；产品 DTO、运行分支和写路径没有旧形状双轨。
- clean Default/Saved View 不存在 FilterBar；修改筛选后出现；恢复后消失并回到 base。
- 非空 base 可被空 Draft 临时覆盖，刷新后仍可恢复；不会被误判为“无 Draft”。
- 查询成员资格只由 `scope + context + baseViewKey + effective FilterQuery` 决定，Display 不再通过 `showCompleted` 二次剔除。
- `SYSTEM_VIEWS`、独立 ViewsPage 结果 scene、旧 status 全量 pills、重复 Filter event 与其零消费兼容测试已删除。

## Verification

- 最小纯函数测试覆盖 context 解析、每页 Default View 矩阵、draft/base 相等性和空 Draft。
- DOM 行为测试覆盖 Toggle 同提交选中、单选不为空、FilterBar 出现/恢复、Saved Detail 与 Library 路由。
- Rust 测试覆盖 Saved View context/baseViewKey 校验、存储升级边界、定义往返和 run 边界。
- 根级执行 `bun run typecheck`、`bun run lint`、`bun run lint:boundaries`、`bun run format:check`、受影响前端测试、`bun run test:rust` 与 `bun run build`。
- 真实 Tauri 最小 Smoke 已移入 [统一产品验收](../../unified-product-acceptance/spec.md)；本工作包未执行该步骤。

## Non-goals

- 不重写 TaskBoard 虚拟几何；本轮先修正交互反馈与查询所有权。
- 不为“单一 command”删除 Saved View 的按 ID 校验入口；统一的是查询执行语义，不是路由资源身份。
- 不新增 Favorite、Pinned View、自定义 Default View、用户自定义 Toolbar 或视图分享权限。
- 不强制迁移到 `/tasks?view=`；保留 `/views/:viewId` canonical 路径。
- 不保留 System View 命名兼容层、旧 View 双类型或两套结果页。
- 不新增依赖，不修改本轮之外的视觉系统。

## Source of Truth

- [产品蓝图](../../../Documents/00-产品/P2-产品蓝图.md)
- [领域模型](../../../Documents/01-架构/A1-领域模型.md)
- [系统设计](../../../Documents/01-架构/A2-系统设计.md)
- [界面系统](../../../Documents/01-架构/A3-界面系统.md)

本 spec 只承载实施范围和验收；长期产品/领域/系统/界面真源属于上述四份既有文档。不新建 ADR 或 CONTEXT。
