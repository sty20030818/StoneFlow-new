# R9 旧链路清理 - Tasks

## 当前阶段

**后端主线已完成**；前端产品/路由硬切另立 follow-up（见同目录 `FRONTEND-FOLLOWUP.md`）。

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

- [x] **单一 baseline 迁移** `m20260723_000001_baseline`（删除 r2–r7 分片迁移）。
- [x] 索引 `ix_tasks_space_no_project_position`（原 inbox 命名）。
- [x] `r7_push` / `r7_pull` → `outbox_push` / `cursor_pull`。
- [x] 注释/错误/测试名去掉 `R2`–`R8` 阶段性标记。
- [x] Launcher / Application 去掉 Inbox 枚举与 `inbox_at` 兼容字段。
- [x] Sidebar settings 去掉 `SidebarMainItemKey::Inbox` 与 `main_items.inbox`。
- [x] 仅 `manage(AppState)`（不再双 manage database/sync）。
- [x] 删除 `runtime/services`（R8 已完成，本阶段确认无残留）。

## 阶段三：前端

- [ ] **不在本阶段完成** → 见 `FRONTEND-FOLLOWUP.md`。

## 阶段四：文档与校验

- [x] 更新 `src-tauri/ARCHITECTURE.md`（v9）、sync/runtime README/DESIGN 相关表述。
- [x] `cargo test -p stoneflow-{application,storage,runtime} --lib` 通过。
- [ ] 全 workspace Clippy / 前端 typecheck（前端未硬切前可能失败，属预期）。

## 与 SPEC 的实施偏差

1. 前端 transport/路由硬切拆到 follow-up，避免后端与前端大 diff 缠在一起。
2. UI session State（ActiveScope、Launcher 窗口、Update 服务）仍独立 manage——非业务双写，属 Tauri 壳层状态。

## 完成记录

- 完成日期：2026-07-23（后端主线）
- 删除/合并证据：见 git diff（migration 7→1；r7_* 模块改名；Inbox 字段删除）
- 遗留：前端 follow-up；R7 阶段五真环境验证；libsql 与 SQLite 同进程链接警告
