# stoneflow-test-support

测试辅助工具。

## 职责

- 临时数据库与共享 fixture
- 仅供测试使用

## 约束

- 生产 crate 不得依赖本 crate（仅 `dev-dependencies` / `#[cfg(test)]`）
