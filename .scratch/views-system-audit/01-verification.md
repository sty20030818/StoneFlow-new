# Ticket 01 实施与验证

日期：2026-09-13。代码基线：`ef38c0b5`。本轮只实施 01；其余票保持原计划。

## 实施结果

- `application::view::codec` 统一当前 View 定义、Outbox 字段、origin seed、协议预热和下载物化。旧 sort/group 不再阻断当前业务编辑，协议字段保持原形状。
- repository 精确修复裸 `none`，不修改名称、查询、时间、generation 或 Outbox；普通编辑保留已有 generation，只上传变化字段；删除继续生成更高代际 tombstone。
- 下载 View delta 缺失的字段从完整本机记录补齐，远端已提供字段优先。无法恢复或定义无效时整页回滚，不推进 cursor。补齐恢复条件后重放原页成功，重复重放不重复写入。
- origin seed 的标记检查、业务读取、全部入队和完成标记共用 IMMEDIATE 事务，失败不会残留半批 Outbox。
- 重命名失败保留输入、可重试；删除失败保留记录并在原菜单重试。提交中防重复，关闭或换来源后的迟到请求不会污染新会话或触发旧详情导航。
- 重命名按钮等待时使用 HeroUI `isPending` 保持焦点，输入使用 `readOnly`；原生禁用不再使焦点掉到 body。
- 更新 A2 同步说明和 View 模块文档，补齐 Alert 消费登记；UI Lab 增加生产组件的内存恢复样例。

## 失败证据与回归

修复前实际运行回归，分别观察到：

1. 下载落盘 `group_by_json` 是裸 `none`，不是合法 JSON 字符串。
2. 旧代际 rename-only patch 未物化，新名称没有落盘。
3. 无法补全的 View patch 返回成功，并推进同步位置。
4. seed 遇到坏 View 后重试，原有 2 条 Outbox 增加到 6 条。
5. 重命名等待时按钮和输入失去焦点；浏览器实际焦点落到 body。

对应修复后回归通过。运行时测试使用临时 SQLite、真实 View 用例与 Outbox、真实协议合并和下载物化；没有连接 PostgreSQL 或写用户正式数据库。

## 自动检查

| 检查 | 结果 |
| --- | --- |
| `cargo test --manifest-path src-tauri/Cargo.toml -p stoneflow-application -p stoneflow-storage -p stoneflow-runtime --lib` | 226 项通过：application 72、storage 14、runtime 140 |
| `bun run test:run`（最后一轮） | 209 个文件、1,206 项通过 |
| `bun run test:release`（独立重跑） | 14 个文件、153 项通过 |
| `bun typecheck`、`bun lint`、`bun run lint:boundaries` | 通过 |
| `bun format:check`、变更 Rust 文件格式检查、`git diff --check` | 通过 |

首次发布测试与 Rust 编译并行时，两条验签用例超过 5 秒超时；其验签入口会执行同一 Cargo workspace 的 `cargo run`。Rust 结束后按原命令独立重跑全部发布测试通过，没有修改超时、跳过测试或更改发布实现。

日志在本机临时文件：`/tmp/stoneflow-view-ticket01-rust.log`、`/tmp/stoneflow-view-ticket01-vitest-final.log`、`/tmp/stoneflow-view-ticket01-release-recheck.log`。

## 浏览器交互与几何

使用已有 `localhost:5173/ui-lab.html`，样例 ID `stoneflow-view-management-recovery`。没有新建开发服务。样例只保存内存数据，组件与生产共用；真实页面 Router、Query、IPC 失败恢复另由 `ViewManagement.test.tsx` 验证。

- 640 × 480：长错误正常换行；弹窗底部 434px，重试按钮底部 421px，均在窗口内。
- 480 × 320：弹窗上下各留 16px；内容区可视高 126px、内容高 286px，底部重试按钮仍在 291px 以内。
- 删除长错误菜单可实际滚至末尾：scrollTop 183px，错误底部 226px，小于弹层底部 231px。按方向键可回到“重试删除”，弹层自动滚回操作位置，再按 Enter 删除成功。
- 重命名按钮在等待、失败后保持焦点，失败保留完整输入；直接 Enter 重试后关闭弹窗并恢复菜单触发点焦点。
- 输入框 Enter 提交在浏览器实际验证等待与失败均保留输入焦点，直接 Enter 重试成功后焦点恢复至“视图操作”；组件回归也覆盖该路径。

上述浏览器证据只证明对应组件行为；后续 Tauri 操作与真实 200% 缩放见 [09 验证记录](./09-verification.md)，错误朗读仍待确认。

## 发布与兼容边界

1. **本包未承诺 0.2.0 与新版同时编辑支持。** 旧版普通编辑推进 generation，较低代际待上传编辑仍可能被忽略。若要支持混写，须另行确认迁移和冲突恢复范围；这项后续决策不阻塞本包已有判据。
2. **旧云端已丢失的完整定义不会自动回传恢复。** 旧版 `create g1 → rename g2 delta` 可使远端仅余变化字段；本次本机 hydrate 不会补回云端缺失内容。缺少完整记录时明确失败、不推进 cursor，符合父规格的恢复或失败边界；自动同 ID 修复涉及迁移和并发规则，属于另行授权的工作。没有修改用户云端数据。
3. **真实设备同步未验。** 本票完成了规定的临时 SQLite、Outbox 与真实协议投影往返；没有把本地副本或原生待上传 Outbox 称为远端接收成功。后续发布若开展双设备验证，应单独记录版本与远端结果，不将其新增为本包完成条件。

范围依据为[父规格](./spec.md)第 108／109／175／185／193／214 行：完整定义不足允许明确失败；V01 采用 SQLite／Outbox／真实投影往返；真实设备证据须分开记录；旧协议改造和未核对历史数据清理不在授权范围。01 的实现与证据已具备，整体仅余实际错误朗读待确认，见 09；本次不改票状态、不归档。

本轮所有代码与文档保持未暂存；index 仍为空，未提交或推送。父规格未改写。
