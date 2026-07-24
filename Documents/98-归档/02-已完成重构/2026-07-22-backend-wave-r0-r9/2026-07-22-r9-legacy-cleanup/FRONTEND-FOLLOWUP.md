# standalone 全栈硬切（完成）

## 结论

前后端统一为 **standalone**（产品文案：**独立事项**）。代码与文档（领域模型 / 界面 IA）已对齐。

| 层 | 约定 |
|---|---|
| UI | 独立事项 |
| 路径 | `/$scopeKey/standalone` |
| Section / list variant | `standalone` |
| write placement | `project` \| `standalone` |
| list placement | `all` \| `project` \| `standalone` |
| UI target | `TaskPlacementTarget` ≡ `TaskUpdatePlacementInput` |
| 命令 ID | `navigation.goStandalone` / `new.standaloneTask` |
| 快捷键 | `G I` / `N I`（保留；`S` 预留 Space） |

## 已删除

- Inbox 容器、`inbox_at`、收件箱路由与映射
- `noProject` / `no-project` / `no_project` 标识符与兼容层
- Launcher 平行 `*Response` 拷贝层（直出 application DTO）
- 死代码：`sceneVariant` 无用 prop、`ensure_task_placement` 未接线 domain 等

## 产品规则

- 主导航：全部任务 / 项目总览 / 视图
- 独立事项：Space 项目列表顶部虚拟入口 = 该 Space 下 `project_id IS NULL`
- 不做全局未归类 View
- Launcher：默认 Space + create standalone

## 验证（代码侧）

- `bun typecheck` / `bun lint` / `bun run test:run`
- `cargo check --workspace`；task command 集成测
- 活跃代码路径无 `inbox` / `noProject` / `no-project` 标识符

## 文档

- 领域：`Documents/01-架构/A1-领域模型.md`
- 界面 IA：`Documents/01-架构/A3-界面系统.md`
- 前端树：`src/ARCHITECTURE.md`
