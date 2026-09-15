# Ticket 03 实施与验证

## 实施结果

- Library 的有效 `View` 与 `UnavailableView` 分离。不可用记录只保留身份、排序、时间、可空范围与原因，不伪造 context/base/filters。已知范围精确归原 Library；未知范围只在 all Library 可达，all 不聚合其它 Space 的记录。
- create/update 在 SQLite 写事务中校验当前项目；list/run 重新检查项目存在、归档、回收站与固定 scope。迁出使单 Space View 暂不可用，全范围项目 View 仍可用；迁回或恢复后重新校验，不改写原定义。
- 同步下载、baseline、冷协议预热、后续 patch 补字段与 origin seed 共用保留定义的 codec。坏 scope/filters 保留 JSON 原值，本地非法 JSON 文本保留为 JSON String；业务记录、协议状态和 cursor 同事务提交。必要元数据不可恢复或写库失败仍整页回滚，不跳过记录推进 cursor。
- 删除仅依赖 ID，与 tombstone/Outbox 同事务，失败保留原记录。入站拒绝无法再删除的最大 generation；本地删除使用 checked_add，避免溢出。已有极端非法元数据不做猜测修复。
- Library 与详情的读取失败有实际 refetch；首次失败后重试的 pending 阶段保留恢复界面与焦点。无效详情可返回 Library、删除或从有效项目重新保存，不能运行、重命名或覆盖。
- 同步 Project 事件同时刷新 View 可用性与任务结果；手动任务刷新也检查有效查询入口，防止禁用查询被 refetch 意外执行。A1、A2 与 View 模块说明同步更新。

## 自动验证

| 检查 | 结果 |
| --- | --- |
| application View 聚焦 Cargo 测试 | 14 通过 |
| storage View adapter 临时 SQLite 测试 | 6 通过 |
| runtime cursor_pull View 与 origin_seed 聚焦测试 | 9 + 1 通过 |
| `bun run test:rust` | workspace 通过；12 个需要外部 PostgreSQL 的既有测试 ignored |
| `bun run test:run` | 214 文件，1,239 测试通过，103.60 秒 |
| 末轮 DOM 受影响页面、菜单、同步 Hook | 4 文件，23 测试通过 |
| View API 边界单测 | 2 通过 |
| `bun typecheck`、`bun lint` | 通过 |
| `bun run lint:boundaries` | 25 features、HeroUI 与 repository 合同通过 |
| `bun run check:animations` | 通过 |
| `bun format:check` | 942 文件通过；Markdown 沿用项目忽略配置 |
| 精确 Rust 文件 rustfmt、`git diff --check` | 通过 |

真实 Memory Router + Query + 页面 + mock IPC 的 6 个恢复用例覆盖：混合坏 scope/不可迁移定义/两个有效 Space、ID 删除失败和键盘重试、从有效项目重新保存、项目同步迁出/迁回并刷新任务、读取失败的重试焦点、未加载/读取错误/不可用/真实零任务区分。无效详情收到真实 TASKS_CHANGED_EVENT 后仍不执行任务查询。

SQLite/同步测试同时检查坏原值、有效记录、协议文档和 cursor；覆盖 warm、cold seed、cold delta 的补丁与删除重放，以及缺元数据、空 ID、非法 generation、真实 INSERT 失败的回滚。旧 origin seed 回滚用例改用真实 Outbox INSERT trigger 拒绝；坏 filters 已属于可保留记录，不再被错误用作回滚故障。

前端恢复测试先在缺少重试/隔离行为时失败，修后通过。Rust 首轮尝试被并行 DTO 迁移期间的编译错误阻断，未取得运行期红测证据；另一个新 fixture 最初使用非 UUID 项目 ID，被现有语法校验拒绝，已修正 fixture，未放宽产品校验。

## 浏览器与验收边界

使用现有 `localhost:5173/ui-lab.html` 的生产 Library 内容、恢复详情与删除菜单，内存样例不连接 IPC 或正式库。检查 480×320 与 640×480：

- 初次发现默认 nowrap 让异常行达到 2,308px；修复为块级换行后，480px 窗口中行宽与 scrollWidth 均为 414px，按钮横向范围 409–437px，长名称和无空格错误不再撑宽。
- 异常行 Enter 可打开详情，详情显示具体原因；菜单只有删除动作。删除失败显示 role=alert，可键盘定位重试；Escape 返回来源条目，重试成功移除样例。
- Library 的 Tab → 重试 → Enter 后按钮保留焦点、aria-disabled=true；480px 窗口中重试按钮 y=251–279。读取错误具有 role=alert，详情返回入口与读取重试均可达。
- 480px 窗口中的长删除错误沿 Popover 自带滚动容器阅读：clientHeight=211、scrollHeight=362、滚到底 scrollTop=151；随后方向键定位重试并成功删除。另复现打开菜单后缩窗导致来源按钮 y=352–380 移出视口、菜单底边停在345的问题。最终在窗口 resize 时仅检查真实来源按钮可见性，移出视口才关闭；未保留限高旁路、未伪造锚点。CUA 确认关闭后菜单数为0，重新打开仍可删除；DOM 测试同时确保来源可见时不会关闭。

全量前端验证后又完成上述 UI 收尾及无效详情任务事件 guard，并通过末轮聚焦回归与静态检查。结束已恢复 viewport。

自动测试和 UI Lab 证明当前代码及受控恢复路径。本票实施时未运行原生 StoneFlow、未启动服务或操作正式数据；后续 Tauri 与 200% 缩放证据见 [09 记录](./09-verification.md)，实际错误朗读仍待确认。[01](./01-verification.md)所列真实设备同步未验、0.2.0 混写未承诺支持及历史云端不自动修复分别属于验证与发布边界，不是本包额外完成前提。无法恢复完整定义时明确失败符合批准规格，不能据此声称云端历史数据已修复。

## Git 范围

02 已按本轮用户授权提交为 `a59fa1a7 fix(views): 统一保存切换与失败恢复流程`，提交后工作区干净。03 全部改动留在未暂存区；未推送。本票为 implemented-awaiting-acceptance，下一张实现票是 04。
