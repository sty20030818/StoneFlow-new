# stoneflow-application

业务用例编排层。

## 职责

- 用例编排与 DTO
- application ports（repository / transaction / 外部能力）
- 边界错误 `ApplicationError`

## 公开入口

- 各聚合服务模块（`space` / `project` / `task` / `view` / …）
- `ports`
- `ApplicationError`

## 禁止依赖

- SeaORM
- Tauri
- libsql / 同步协议实现
