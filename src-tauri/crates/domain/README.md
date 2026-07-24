# stoneflow-domain

纯领域规则与值对象。

## 职责

- 领域类型、不变量与纯函数规则
- 与基础设施无关的错误 `DomainError`

## 禁止依赖

- SeaORM / SQLite
- Tauri
- sqlx / 同步驱动
- application / storage / sync / runtime
