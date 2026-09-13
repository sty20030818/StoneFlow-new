# 05 完整结果排序与稳定分页：实施与验证

日期：2026-09-13。状态：`implemented-awaiting-acceptance`。

前置 04 已按本轮授权提交为 `7b2a7c5a fix(views): 保留筛选语义并完善条件检查与空态`，提交后工作区干净；05 修改保持未暂存，未推送。

## 已实现

- Display 的排序意图和本地日期经三类页面 scene、Query key、Default/Saved IPC 进入共同 `run_task_query`。本机偏好恢复后才读取任务；Display 不写入 Saved View。
- application 只有一份总序键定义，storage 用它同时生成 ORDER BY 与 keyset。manual、smart、所有现有字段/方向、natural/recency 均在 SQL 截页前执行。删除前端窗口排序比较器，现有分组只保留输入任务次序。
- manual 使用 position/ID，元数据更新不改变顺序；非空键不生成多余 NULL 排序表达式，保留现有位置索引的使用机会。recency 显式把 done 置底，完成时间降序、空值最后、ID 升序。
- cursor v1 绑定规范化成员、有效排序和日期基准，携带实际 UTC 日期边界与完整排序元组；后续页复用边界。编辑条款 ID、等价重复条件不改变身份。损坏、旧版、错查询、错顺序、错日期均明确失败。
- 午夜及休眠后 focus/visibility 更新日期 Query key；慢旧响应保留在旧缓存，不拼进新窗口。续页失败保留重试，并可只重置当前查询“从头加载”。约 150 条窗口、首屏精确 count、续页无 count、单 sentinel 和 loaded-only 几何保持。
- 日期成员、排序和 cursor 共用精确 UTC 时间键，处理不同时区、空值与纳秒。调查证实 SQLite julianday 会舍入亚毫秒，已修正其导致的排序和午夜成员边界问题。
- smart/manual 隐藏方向，完成项文案改为“已完成置底，最近优先”。UI Lab 增加生产受控 Display 浮层样例，仅操作内存，不读写用户偏好或任务。

## 回归证据

- 真实 SQLite 337 条任务，11 种排序 × 2 个方向 × 2 种完成策略，共 44 组；每组逐页比较 150/150/37 条与独立产品合同预期，确认三页无重复、无遗漏，原位置第 337 条的最优先任务进入 smart 首屏。
- 日期数据包含 NULL、同值、同一瞬间的 Z/+08:00/-07:00 写法、微秒/纳秒差异及跨秒边界。新增亚毫秒数据先复现 smart 首屏顺序失败，精确日期键后通过。
- 真实 TaskService 更新标题/优先级/日期后 position 不变；Saved 与 Default 首屏共序；recency 独立覆盖完成项手动位置；两个入口跨日期续用 cursor 均拒绝。
- 真实成员/count 查询验证 `23:59:59.999999999` 留在当天、次日午夜及其后一微秒进入 upcoming、负向日期条件仍保持补集语义。
- Project/Saved 真实页面回归覆盖：排序让原第 152 条进入首屏、重建 QueryClient/页面恢复本机偏好、旧 cursor 失败后从头加载只读取新首屏。补充日期午夜/休眠恢复、不同排序/日期的慢旧续页隔离、缓存身份及 IPC 参数断言。
- TaskBoard 18 项聚焦测试通过，包含失败停止自动续拉、原位重试及从首屏恢复。
- 全仓初跑捕获链接控制器测试完整替代 HeroUI 导致新增查询依赖无法载入；改为只 spy 所需 toast，原错误反馈断言与 4 项行为测试保留并通过。

## 真实 UI 检查

使用已有 `http://localhost:5173/ui-lab.html`，未启动服务或原生应用。入口：StoneFlow → 第十七批 → 显示选项 · 完整结果排序。

- 1280×720 浏览器实际渲染生产 Popover/Panel：手动无方向，优先级显示可切换方向，智能无方向；320 px 浮层中完成项文案完整可见。
- 用 Enter 操作方向及智能选项、Space 操作完成项开关；Escape 关闭浮层后，实际焦点回到“显示选项”按钮。
- 样例仅证明组件视觉与交互；完整查询执行、偏好持久化和错误恢复由上面的真实页面/SQLite 集成测试证明，不能替代 Tauri 现场验收。

## 全仓门禁

- `bun run test:run`：最终 220 个文件、1293 项测试全部通过。
- `bun run test:rust`：workspace 288 项测试通过；12 项需要外部 PostgreSQL 的既有测试仍按条件忽略。
- `bun run test:release`：14 个文件、153 项测试通过；仅测试发布逻辑，未发布或推送。
- `bun run typecheck`、`bun run lint`、`bun run lint:boundaries`、`bun run check:animations` 通过。
- 根 `bun run format` 与 `bun run format:check` 通过（952 个匹配文件）；`cargo fmt --all -- --check`、`git diff --check` 通过。
- 最终审阅未发现旧位置 cursor、前端任务排序比较器或遗漏的运行入口；index 为空，05 所有修改保留为未暂存。

## 后续边界

- 05 完整验收范围是不分组任务总序；主/子分组前缀、完整组交互与空组摘要由 06–08 接入同一合同，尚未声明完成。
- 09 仍需实际 Tauri 原始场景及外部验收。本轮未运行原生 StoneFlow；12 项 PostgreSQL 测试依赖外部数据库，沿用既有忽略条件。
- 未新增依赖、schema/wire 迁移、第二执行器或 renderer，未修改正式数据库；跨并发数据写入的快照隔离不在本包范围。
