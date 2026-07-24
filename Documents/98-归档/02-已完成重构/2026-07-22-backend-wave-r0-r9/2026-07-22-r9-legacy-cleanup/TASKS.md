# R9 旧链路清理 - Tasks

## 当前阶段

**后端 + 前端 hard-cut 均已完成**（含 standalone 统一与后续结构精简）。

## 产品结论（侧栏，已确认）

- **方案 A**：顶栏仅「全部任务 / 项目总览 / 视图」。
- **去掉收件箱**（无 Inbox 容器）。
- **独立事项**：当前 Space 项目列表顶部的虚拟入口 = 该 Space 下 `project_id IS NULL` 的任务。
- **不做**全局未归类 View。

## 阶段一：清单与替代证据

- [x] 扫描 Cargo / command / migration / 阶段性命名 / Inbox 兼容。
- [x] 确认 migration 可合并（空库、无在线升级）。
- [x] 确认 AppState 为唯一业务 State 根。

## 阶段二：Rust / 同步 / schema

- [x] **单一 baseline 迁移** `m20260723_000001_baseline`。
- [x] 索引 `ix_tasks_space_standalone_position`（独立事项排序）。
- [x] `r7_push` / `r7_pull` → `outbox_push` / `cursor_pull`。
- [x] 注释/错误/测试名去掉阶段性标记。
- [x] Launcher / Application 去掉 Inbox；placement = project \| standalone。
- [x] Sidebar settings 去掉 Inbox 主入口键。
- [x] 仅 `manage(AppState)`（业务双 State 移除）。
- [x] 删除 `runtime/services`。
- [x] create/list placement 内部类型拆分；`resolve_write_placement`；Launcher 直出 DTO。

## 阶段三：前端

- [x] 主导航无收件箱；独立事项虚拟行 + `/$scopeKey/standalone`。
- [x] 类型/API/命令硬切为 standalone；无兼容映射。
- [x] `TaskPlacementTarget` ≡ update placement；`standaloneOnly` 客户端筛选命名。
- [x] typecheck / lint / vitest 全绿。

## 阶段四：文档与校验

- [x] 领域模型 / 界面 IA / src 架构表述对齐 standalone。
- [x] `FRONTEND-FOLLOWUP.md` 标完成。
- [x] `cargo check` + task 相关 lib 测；前端 typecheck / lint / test。

## 完成记录

- 后端主线：2026-07-23
- 前端 hard-cut + 结构精简：2026-07-23～24
- 遗留（非阻断）：R7 真环境同步验证；Clippy 全量可选；Space 快捷键 `S` 产品化
