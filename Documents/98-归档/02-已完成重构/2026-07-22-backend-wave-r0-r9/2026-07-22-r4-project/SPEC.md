# R4 Project - Spec

## 目标

完成 Project 的完整纵切，使用共享 WorkState，但不从子 Task 推导 Project 状态。

## 范围

- Project 创建、读取、更新、状态、优先级、时间、排序与生命周期。
- Project 必属一个 Space，Task 只能关联同 Space Project。
- Project 归档/删除级联 Task；恢复严格恢复本次影响对象及原排序。
- 完成 application、storage、runtime command、前端 DTO 与测试。

## 不做什么

- 不支持 Project 父子层级、自动完成或子 Task 聚合状态。

## 当前上下文

- Project 是 Space 内手动组织 Task 的容器，状态和时间表达项目本身，不是 Task 统计视图。
- Project 生命周期会级联 Task，但 Project 更新不应遍历 Task 计算状态。
- Project 归属规则必须在 Task 指派、Task 移动和 Project 删除时共同执行。

## 用例与输入输出

- 创建 Project 时指定 Space、名称及可选 WorkState；position 插入该 Space Project 容器尾部或目标位置。
- 更新 Project 可修改名称、描述、WorkState、position；每个字段都形成可同步 patch。
- 改变 Project 状态只更新自身 `status_changed_at`/`completed_at`，不更新子 Task。
- 归档/删除/恢复遵循 R3 的 operation manifest 规则，但 Owner 是 Project。
- Task 改到不同 Space 时必须先清除 `project_id`；Task 指派 Project 时必须验证 Space 一致。

## 实施设计

1. 将 WorkState 规则复用为值对象，不建立泛型实体父类或 trait hierarchy。
2. Project persistence 只处理 Project SQL；跨聚合级联由 application lifecycle use case 协调，避免 Repository 相互调用。
3. 重排使用 position，不用连续整数和全表重写；必要时仅重整一个容器。
4. command 返回 Project DTO 与受影响 Task 范围，前端通过 Query invalidation 刷新。

## 前端契约影响

- Project 创建/编辑表单新增状态、优先级、三个时间字段。
- Overview、sidebar、详情页使用同一 Project WorkState DTO，不保留 complete/reopen 专用 API。

## 退出条件

- Project 的 WorkState 完全手动维护。
- Space 归属、排序与级联约束在数据库和 application 中可验证。
- 旧 Project complete/reopen 兼容接口无新调用路径。

## 验证

- 同 Space 约束、跨 Space Project 拒绝、排序、级联及恢复测试。

## 风险

- WorkState 共享的是字段和规则，不是 UI 行为；不要让 Task 的“今天/逾期”查询语义污染 Project 视图。

## 关联

- [总重构 Spec](../2026-07-22-backend-rearchitecture/SPEC.md)
- [R3 Space](../2026-07-22-r3-space/SPEC.md)
