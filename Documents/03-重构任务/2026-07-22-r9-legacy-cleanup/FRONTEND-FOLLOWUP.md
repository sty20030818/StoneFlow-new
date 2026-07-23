# standalone 全栈硬切（完成）

## 结论

前后端统一为 **standalone**（产品文案：**独立事项**）。

| 层 | 约定 |
|---|---|
| UI | 独立事项 |
| 路径 | `/$scopeKey/standalone` |
| Section / variant | `standalone` |
| placement DTO | `project` \| `standalone` |
| 命令 ID | `navigation.goStandalone` / `new.standaloneTask` |

## 已删除

- `inbox` 路由、映射、命令 ID、memory 白名单
- `noProject` / `no-project` / `no_project` 全量标识符
- 兼容 redirect / 历史书签映射
- 冗余 identity 转换与 `inbox-count` 死分支

## 产品规则

- 主导航：全部任务 / 项目总览 / 视图
- 独立事项：Space 项目列表顶部虚拟入口；列表 = 该 Space 下 `project_id == null`
- 无全局未归类 View
- Launcher 默认 Space + standalone

## 验证

- `bun typecheck` ✅
- `bun lint` ✅
- `bun run test:run` ✅ 728/728
- `cargo check --workspace` ✅
- 活跃代码路径无 `inbox` / `noProject` / `no-project` 标识符 ✅
