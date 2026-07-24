# R4 Project - Tasks

## 当前阶段

实施中。依赖 R3；后端纵切、通用 Activity、Outbox、生命周期与前端 DTO 已完成。Project 创建/编辑界面的完整属性控件仍待落地；状态、优先级和时间始终是手动维护的项目属性，绝不由 Task 聚合推导。

## 阶段一：实现 Project 基础模型与读写

目标：用共享 WorkState 建立 Project 的唯一业务实现。

- [x] 定义 Project create/update/list/detail DTO、port、校验与稳定错误码。
- [x] 实现标题、描述、WorkState、优先级和 planned/due/remind 的创建与更新。
- [x] 复用 R2 的完成时间语义和时间值对象；禁止另建 Project 专用状态枚举。
- [x] 写入项目变更 outbox，但不在本任务实现同步 transport。
- [ ] 覆盖五种状态、五级优先级、三个时间的独立更新与完成时间回退测试。

验收：Project 与 Task 共享同一 WorkState 契约；Project 字段从不由 Task 状态自动覆盖。

## 阶段二：落实 Space 内排序与 Task 归属约束

目标：让 Project 能稳定承载任务归属，不在前端隐式维护排序和跨 Space 校验。

- [x] 实现 Project 在所属 Space 内按 `position` 插入与查询；局部重整按实际 position 耗尽时在 R5 统一补充。
- [x] 保留 R2 的 `(project_id, space_id)` 复合外键约束；Task 归属变更的 application 入口在 R5 接入同一约束。
- [x] 定义 Project archive/delete 对其 Task 的 operation 来源级联，R4 已在 storage 落实。
- [ ] 为空 Space、相邻移动、末尾插入、position 冲突和跨 Space 指派编写测试。

验收：Project 排序可重复且只影响自己的 Space；Task 永远不能挂接到其他 Space 的 Project。

## 阶段三：实现 Project 生命周期与管理动作

目标：把项目的 archive、restore、永久删除与同步删除语义一次定义清楚。

- [x] 实现 Project lifecycle command，不把 complete/reopen 当作独立旧接口保留。
- [x] 将 archive/restore/delete 与 Task operation 来源级联、Outbox、tombstone 放在确定的原子边界内。
- [x] 物理删除 Project 时一并物理删除其 Task、写最小 tombstone，并删除其 Activity。
- [ ] 覆盖级联、恢复、重复删除、失败回滚和 stale patch 防护基础测试。

验收：管理操作不可产生孤儿 Task；旧 complete/reopen API 已被新状态更新契约替代。

## 阶段四：迁移前端与清理旧模型

目标：让 Project overview、sidebar 和详情页只消费新 DTO 与 Query 契约。

- [x] 替换前端 invoke、Project Query、mutation invalidation 与排序调用。
- [ ] 验证 overview、sidebar、详情页和 Task 创建器都使用明确的 Space/Project 归属。
- [x] 删除旧 Project complete/reopen command 与兼容调用；旧 repository 已在 R2 拆除。
- [x] 运行 Project 定向测试、前端类型检查和 workspace 校验，更新长期文档。

验收：前端没有旧 Project 状态模型；新 Project API 与产品约束一致。

## 阻塞

- Project 创建/编辑 UI 尚未暴露状态、优先级与三个时间字段；这是 R4 当前唯一功能性剩余项。

## 与 SPEC 的实施偏差

- Activity 表从 Task 专属结构迁移为通用 `entity_type + entity_id`；R2 旧 Activity 数据通过迁移保留为 Task timeline。
- Task 的 application 归属变更、完整排序重整与更广的生命周期回归测试属于 R5 的 Task 纵切。

## 完成记录

- 完成日期：
- 已更新的长期文档：
- 遗留技术债：
