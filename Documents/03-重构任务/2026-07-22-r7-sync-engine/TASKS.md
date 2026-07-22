# R7 同步引擎 - Tasks

## 当前阶段

未开始。依赖 R6 和 R0 的远端备份；同步是单进程后台能力，不引入 sidecar、独立 CLI 或同步工作台。

## 阶段一：定义协议、远端数据面与设备身份

目标：建立能表达字段级 LWW、生命周期优先与 tombstone 的最小协议，而不是把本地 SQLite 复制到远端。

- [ ] 定义 sync crate 的 patch、operation、cursor、baseline、tombstone、错误与状态 DTO；不得依赖 Tauri。
- [ ] 规定冲突规则：服务端单调 sequence 排序；不同字段可合并；同字段以 sequence 最新值获胜；生命周期操作压过普通 patch。
- [ ] 设计并建立远端 change log、entity snapshot/patch、operation 去重、tombstone 与必要索引。
- [ ] 定义稳定 device ID；将 token 存 Keychain，远端 URL 可存在本地 SQLite；日志不得输出凭证。
- [ ] 对协议进行纯测试，覆盖字段合并、相同字段覆盖、生命周期优先、generation 与无效 patch。

验收：协议能独立表达已确认冲突语义；远端 schema 与索引可从空环境建立；没有共享业务正文到 tombstone。

## 阶段二：实现 Outbox Push 与远端幂等提交

目标：以一次本地 operation 为原子同步单位，减少重复上传并保证重试安全。

- [ ] 从本地 Outbox 按 operation 聚合读取，合并同一实体/字段的可合并 patch，保留生命周期操作顺序。
- [ ] 实现 push API：以 `device_id + operation_id` 去重，远端事务内写入变更、分配单调 sequence、更新 tombstone 或实体快照。
- [ ] 确认远端提交成功后再标记本地 outbox 已确认；网络失败、超时和进程退出均可安全重试。
- [ ] 禁止网络调用包在 SQLite 写事务中；记录不含业务正文的结构化耗时和结果日志。
- [ ] 覆盖重复 push、部分网络失败、操作内多字段更新、删除 operation 和并发提交测试。

验收：同一 operation 重试不会产生重复远端变更；本地和远端不会因失败出现半提交；push payload 明显小于完整数据库传输。

## 阶段三：实现 Cursor Pull、删除语义与全量基线

目标：正常同步走增量 delta，首次设备或日志过期才回退到可恢复的 baseline。

- [ ] 实现 cursor pull，按服务端 sequence 拉取有限 change log 并持久化本地 cursor。
- [ ] 在本地 transaction 内应用 pull 结果，遵守字段级 LWW、生命周期优先和 generation 检查。
- [ ] 收到 tombstone 时物理删除业务实体并保留最小删除 metadata；旧 patch 必须被拒绝，不能复活实体。
- [ ] 实现 stale cursor 判断和 full baseline；baseline 完成后以最后 sequence 继续增量，不把全量作为常规路径。
- [ ] 覆盖两个设备的不同字段合并、同字段竞争、长期离线删除、stale patch 拒绝、日志过期 baseline 和中断恢复测试。

验收：不同字段能合并；删除对长期离线设备可靠；正常同步不拉取全量数据；baseline 可恢复到一致状态。

## 阶段四：实现无感调度、状态与性能观测

目标：把同步留在应用进程内，降低启动和前台操作对用户的影响。

- [ ] 建立进程内 singleflight engine：同一时刻只执行一轮 push 后 pull，后续触发合并而非并发。
- [ ] 接入触发器：本地写入 debounce、启动、恢复/回到前台、手动触发；不要增加同步工作台。
- [ ] 实现指数退避，最大间隔 5 分钟；区分离线、鉴权、可重试网络错误与协议错误。
- [ ] 维护最小用户可见状态：上次成功、正在同步、可恢复错误；设置页为唯一状态 surface。
- [ ] 复用 HTTP client/连接；记录 phase 耗时、变更数量和 payload 大小，禁止记录 token 或业务内容。
- [ ] 删除 `sync-worker` binary、stdout JSON 解析、sidecar 启动与旧同步 loop，确保无新旧同步双跑。

验收：连续触发只会合并为安全轮次；push 与 pull 串行；离线不会阻塞 UI 或无限重试；旧 sidecar 路径完全删除。

## 阶段五：双设备、性能与恢复验证

目标：用真实风险场景证明语义和性能，而不是只验证单设备 happy path。

- [ ] 建立两设备测试矩阵：不同字段并发编辑、同字段并发编辑、删除对离线设备、批量 operation、重复请求和 cursor 过期。
- [ ] 记录首次 baseline、单 patch、批量 operation 的上传/下载耗时和 payload；与旧全量/sidecar 链路比较。
- [ ] 验证正常有网络时同步目标为秒级；若未达标，先依据 phase 日志定位远端索引、payload、连接复用或批量策略，不先增加并发。
- [ ] 验证 Keychain 凭证读取失败、远端不可用、应用重启和中断同步的恢复路径。
- [ ] 运行 sync 定向测试、workspace 级检查，并更新系统设计、同步 DESIGN 与用户设置说明。

验收：两设备语义符合已确认规则；性能证据可复现；失败后可恢复且不会破坏本地数据；文档描述与实现一致。

## 阻塞

- R6 业务查询与本地 outbox 基线未完成。
- R0 远端备份未验证前不得删除旧 Turso 数据。
- 未取得远端数据库管理权限时，只能完成协议和本地模拟验证，不能声称端到端完成。

## 与 SPEC 的实施偏差

无。

## 完成记录

- 完成日期：
- 已更新的长期文档：
- 遗留技术债：
