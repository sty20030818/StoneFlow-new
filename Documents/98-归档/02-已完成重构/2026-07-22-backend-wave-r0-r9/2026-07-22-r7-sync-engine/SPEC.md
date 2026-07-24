# R7 同步引擎 - Spec

## 目标

在稳定本地模型上实现快速、无感、可诊断的同进程逻辑同步，并彻底替换旧 sidecar 协议。

## 范围

- 同进程 `sync` library、Turso 远端 schema、Keychain token 与本地非敏感配置。
- `operation_id` 幂等、字段 patch、服务端 sequence LWW、生命周期优先。
- 远端事务、change log、cursor、tombstone、generation、全量基线回退。
- 单飞调度、写后防抖、启动/恢复/前台检查/手动重试、指数退避和同步状态。
- 同步性能分段日志与远端索引。

## 不做什么

- 不实现账号系统、冲突工作台、CRDT、多人协作、常驻 daemon 或 Turso Embedded Replica。

## 当前上下文

- 旧 worker 以外部 binary 运行，通过 CLI 参数定位数据库，使用 stdout/stderr JSON 回传；push/pull 存在整行 snapshot、反复序列化和进程启动成本。
- 当前远端已经具备 mutation ack、server sequence、change log 和 snapshot 回退的雏形，但规则散落在 runtime 与 worker，且与新模型不兼容。
- R7 只在 R2-R6 的本地业务语义稳定后开始，不能把同步协议反向决定产品模型。

## 协议设计

### 本地提交

1. application 创建一个 `operation_id` 与一个或多个 entity patch。
2. storage 在同一 SQLite transaction 写业务实体、Activity、级联 manifest、Outbox。
3. scheduler 合并触发，等防抖窗口后运行单飞 sync；本地 command 立即返回。

### Push

1. 读取未确认 Outbox，普通连续 patch 可按实体/字段压缩为最终值。
2. 对单 operation 或 batch 在一个远端 transaction 中检查 `applied_operations`。
3. 未处理 operation 应用 patch、分配单调 server sequence、写 change log/tombstone 与 operation ack。
4. 已处理 operation 返回此前结果；网络超时重试不会重复写 Activity 或远端变化。
5. patch 命中已删除 ID/generation 时返回 entity-gone，客户端标记对应本地 mutation 无效并继续 pull。

### Pull 与基线

1. push 成功或可安全跳过后，以本地 cursor 拉取 `server_seq` 之后的 change page。
2. 每个 page 在一个本地短 transaction 回放变化、写 cursor；不在网络等待期间持有 transaction。
3. cursor 已过期时，先处理可推送 Outbox，再下载当前业务快照和最新 cursor，以原子 replace 更新同步管理表。
4. delete change 删除本地业务行；tombstone 防止旧 patch 写入恢复后的 generation。

## 远端 schema 与安全

- 远端只保存同步实体、change log、applied operations 与 tombstone；不上传本地日志、UI 偏好或 token。
- URL 作为非敏感配置保存在本地 SQLite；token 仅使用 macOS Keychain/Windows Credential Manager。
- 首次配置可创建缺失远端表和索引，但发现不兼容 schema 时进入“需要处理”，绝不自动 drop/rebuild。

## 性能设计

- 同进程复用远端 client/连接；不再 spawn sidecar。
- 远端按 `server_seq`、`operation_id`、tombstone identity 建索引。
- page/batch 有上限，但参数只在耗时日志证明后调整；禁止并行 push/pull 破坏顺序。
- 将 Outbox 读取、push、pull、local apply 的 duration/record count 写结构化日志；不记录业务正文与 token。

## 约束

- 本地操作不等待同步；同步过程不持有 SQLite 事务等待网络。
- 同一轮同步顺序为 push 后 pull；不并发 push/pull。
- 普通连续编辑可合并最终 patch，生命周期和批量 operation 不合并。
- 日志过期或新设备才全量基线；正常同步不得全量传输实体。

## 退出条件

- 不再启动 `sync-worker` binary 或依赖 CLI JSON。
- 长期离线 patch 不会复活已删除实体。
- 正常增量同步的阶段耗时可观察，且 UI 不被同步阻塞。

## 验证

- 幂等重试、不同字段合并、同字段 LWW、删除/恢复、游标过期、鉴权失败与退避测试。
- 记录重构前后同步阶段耗时并验证无全量快照回归。

## 风险与降级

- Turso 短暂网络错误使用指数退避到 5 分钟；本地写、前台恢复和手动重试可提前唤醒。
- 鉴权、schema、baseline 失败不是重试噪音，必须停在“需要处理”并给用户可执行原因。
- 不提供常规冲突 UI；字段 LWW 与 lifecycle 优先是已确认产品规则。

## 关联

- [总重构 Spec](../2026-07-22-backend-rearchitecture/SPEC.md)
- [R6 View 与查询](../2026-07-22-r6-view-queries/SPEC.md)
