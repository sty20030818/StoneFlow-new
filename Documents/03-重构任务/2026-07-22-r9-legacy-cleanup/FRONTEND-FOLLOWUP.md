# 前端硬切 Follow-up（R9 后端完成后）

## 背景

后端 R9 已按长期模型硬切：

- 无 Inbox 容器 / 无侧栏 `inbox` 配置键
- 独立事项 = **当前 Space 下无 Project 归属的任务**
- 侧栏顶栏仅：全部任务、项目总览、视图
- 独立事项入口在 **当前 Space 的项目列表顶部**（虚拟项，非 Project 实体）
- 单一 schema baseline；Launcher DTO 无 `inbox` / `inboxAt`

前端仍有历史路由与类型，需单独硬切，不做兼容层。

## 产品规则（已确认）

| 项 | 规则 |
|---|---|
| 收件箱 | **删除**入口与文案 |
| 独立事项 | 仅 Space 上下文；列表 = `spaceId` 固定 + `projectId == null` |
| 全局未归类 View | **不做** |
| 收集 | Launcher → 默认 Space + noProject |

## 建议任务拆分

### F1. 侧栏信息架构

- [ ] 主导航去掉「收件箱」；配置类型与 `SidebarMainItemKey` 对齐后端（仅 allTasks / views / projectOverview）
- [ ] 当前 Space 项目列表顶部固定「独立事项」行（虚拟 id，如 `__no_project__`）
- [ ] 点击后进入该 Space 下无项目任务列表（filter / placement = noProject）
- [ ] 删除或重定向 `/$scopeKey/inbox` 路由 → 建议重定向到 space 任务或 noProject 列表

### F2. 类型与 API 契约

- [ ] `shared/types` 去掉 Task 创建/列表 placement 的 `inbox`（若仍保留则无法对接后端 create）
- [ ] Launcher 类型已部分清理；删除剩余 `inboxAt` / `inbox` 文案
- [ ] Settings facade 适配无 `mainItems.inbox` 的 payload
- [ ] commandOpen / placement 字符串仅 `project` | `no_project`

### F3. 页面与测试

- [ ] 任务列表「独立事项」容器 UI（标题、空态、排序）
- [ ] 更新所有依赖 inbox 的测试与 story
- [ ] `bun typecheck` / `bun lint` / 相关单测全绿

## 验收

- 产品内无「收件箱」入口与路由可达
- 每个 Space 可打开「独立事项」且只见该 Space 未归属任务
- 前端无旧 invoke 兼容转换；与后端 DTO 一致
- typecheck + lint + 定向测试通过

## 非目标

- 不做全局未归类视图
- 不恢复 Inbox 领域模型
- 不在本 follow-up 做无关 UI 改版
