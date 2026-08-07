# release · 发布协议设计

## 1. 发布模型

发布身份与平台可用性分离：

- `v<version>` annotated Tag 是全局版本身份，直接指向唯一 commit，并携带 `stoneflow-release-schema: 1` marker。
- `release-ledger/stable` 与 `release-ledger/beta` 是各渠道共享的并发 frontier。
- 每个平台拥有独立的 immutable record 和 `latest.json` Pointer。某平台没有 record，就不宣告该版本可安装。

因此，macOS 可以停在 `beta.3`，Windows 从包含该 commit 的后继 commit 直接发布 `beta.4`；Windows 不需要补发 `beta.3`，macOS Pointer 也不会被改动。

## 2. 版本规划

规划只读取配置版本、待发布 commit、共享 remote 的 annotated Tags 和目标渠道 ledger：

- **Stable**：`package.json` 与 `tauri.conf.json` 的 Stable SemVer 就是目标版本。新版本必须高于远端最新 Stable；同 commit 已有同版本 Tag 时进入 `reuse`。
- **Beta**：配置版本是已存在 Stable Tag 的基线 `x.y.z`；目标 core 为 `x.y.(z+1)`，序号取该 core 的全局远端 Beta Tags 最大 `N + 1`。同 commit 已有 Beta Tag 时复用原版本。
- 版本或 commit 已被另一身份占用、Tag schema 未知、Beta 缺少 Stable 基线、历史分叉或 ledger 与最新 Tag 不一致时立即失败。

`reuse` 用于另一平台补发或故障恢复。即使 ledger 已前进到后继版本，只要它仍包含目标 Tag commit，旧版本仍可为尚未前进的平台补齐；已经指向更高版本的平台 Pointer 不允许回退。

## 3. 构建前门禁

预检在构建和任何远端写入前完成：

1. 发布 remote 必须解析为唯一 push endpoint；每次从该 endpoint 刷新隔离的 Tag、ledger 与公开 branch 快照。
2. 拒绝 shallow repository、dirty/untracked 内容以及 `assume-unchanged`、`skip-worktree` 隐藏修改；工作区 clean 只作为操作门禁，不作为发布元数据来源。
3. `HEAD` 必须解析为完整 commit，且新 claim 能从共享 remote 的公开 branch 或 Tag 历史到达。
4. `package.json`、`tauri.conf.json` 与根 Changelog 都从 `releaseCommit` 的原始 Git blob 读取，不经过 working-tree clean/smudge filter；非法 UTF-8 直接拒绝。两份版本配置必须一致且为 Stable SemVer，Changelog 必须通过统一契约并包含目标版本。新 claim 还必须保留全部 schema-1 Tag 对应版本，防止已认领但尚未镜像的版本永久丢失。
5. 待发布 commit 必须包含渠道旧 frontier；Beta 还必须包含配置版本对应的 Stable 基线。

构建后会重新执行预检，并比较 commit、版本配置摘要、Changelog 摘要、remote refs 和发布计划。任一漂移都会在 claim 前中止。

初次预检通过后，实际构建不会继续读取可编辑 checkout。全部 release Git 子进程按大小写不敏感规则移除危险 Git 环境并使用空 hooks 目录；构建 clone 另使用空 global/system config、attributes 与 template，阻断本机 hook/filter 注入。脚本核对快照 `HEAD` 与工作区没有额外输入，移除继承的 `TAURI_CONFIG`，执行 `bun install --frozen-lockfile`，并把 `CARGO_TARGET_DIR` 与 staged 输出都限制在该 run 内。即使 checkout 在构建期间被修改后恢复，产物输入仍是固定 commit。

## 4. Git 原子 claim

新身份使用一次 push 同时创建 annotated Tag 并推进目标渠道 ledger：

- push 要求 remote 支持 atomic；不支持就失败，不降级为两个 push；
- ledger 使用预检旧值的 exact lease；客户端先在禁用 replace/graft 影响的对象图上验证 ancestry；
- 生产 remote 还必须以 ruleset 拒绝 Tag update/delete 以及 ledger non-fast-forward/delete；
- 若 push 响应丢失，脚本重新读取 remote。远端身份已经精确成立时视为恢复成功，并把本轮创建的本地 Tag 对齐到远端 canonical annotated Tag object；否则清理本轮本地 Tag 并失败。

Tag 只表达身份，不代表任一平台已经可下载。客户端只能看到最后成功推进的分平台 Pointer。

## 5. R2 对象协议

活动对象结构如下：

```text
stoneflow/
├── CHANGELOG.md
├── updates/<channel>/
│   ├── platforms/<platform>/latest.json
│   └── releases/<version>/platforms/<platform>/
│       ├── release.json
│       └── artifacts/<sha256>/<file>
└── downloads/<channel>/<platform>/<version>/<sha256>/<file>
```

### 5.1 Artifacts 与 record

产物 key 包含 SHA-256。上传使用 `If-None-Match: *`；对象已存在或响应不确定时，只有 S3 字节摘要完全一致才可复用。所有 artifact 还要通过公开 URL 读回并验证摘要；大文件使用五分钟总超时的流式 SHA-256，不与 Pointer/JSON 的小对象读取共用整包缓冲。

暂存前会捕获将要内联的精确 `.sig` 文本，并由 `release-verifier` 使用应用配置中的 updater 公钥对精确产物字节执行 minisign 验证。公私钥不匹配、签名被替换或产物被篡改都会在 Git claim 和 R2 写入前失败；不依赖 Tauri CLI 的警告文本。

当前平台的 `release.json` 最后写入，记录 `channel/version/commit/sourceVersion/platform`、updater URL/签名/摘要和下载包引用。它同样只能创建或验证结构等价内容。签名是记录字段，不单独上传 `.sig` sidecar。

若远端已有身份与全部引用字节均一致的 record，重跑会在固定 commit 快照内重新验证 updater 字节、公开摘要和 minisign 签名，成功后才跳过不可复现的签名构建；任一身份、签名或摘要不一致都拒绝复用。

### 5.2 Changelog CAS

根 `CHANGELOG.md` 经统一 parser 验证后，完整原文发布到 `stoneflow/CHANGELOG.md`：

- 首次写入使用 `If-None-Match: *`，更新使用读取到的原始 ETag 作为 `If-Match`；
- 本地文档不得删除远端已有版本，也不得改变其 `YANKED` 状态；
- 不可逆 Git claim 前先只读执行上述远端历史兼容性检查；claim 后仍保留同一校验和 CAS，以防并发漂移；
- `reuse` 时远端已经包含目标版本，则只验证远端与公开 bytes，不用旧 checkout 覆盖它；
- claim 已完成但 Changelog 尚未写入时，重跑可在保留远端历史的前提下 CAS 补齐；
- 写入后必须同时验证 S3 与公开 URL，且目标版本仍是可发布条目。

### 5.3 分平台 Pointer CAS

`updates/<channel>/platforms/<platform>/latest.json` 只包含当前平台。推进前必须读取并验证对应 immutable record：

- Pointer 不存在时用 `If-None-Match: *` 创建；存在时用其不透明 ETag 原样 `If-Match`；
- 仅更高 SemVer 可写；同版本仅完全相同 payload 幂等成功，回退或同版本冲突都失败；
- CAS 冲突后重新读取并最多重试三次；目标已由并发方精确写入时直接成功；
- 成功后同时精确读回 S3 与公开 URL。公开终检失败只报告失败，不伪装回滚已经发生的条件写。

## 6. 固定发布顺序

```text
预检并规划
→ 读取并验证既有 platform record
→ record 不存在时创建固定 commit 快照，隔离构建、收集和校验本平台产物
→ 重做预检，确认 checkout 与 remote 候选未漂移
→ 只读确认远端 Changelog 历史与 YANKED 状态兼容
→ atomic claim Tag + channel ledger，或验证既有 Tag
→ artifacts 条件创建并经 S3/公开 URL 验证
→ immutable platform record 最后写入
→ Changelog CAS 并经 S3/公开 URL 验证
→ 当前 channel × platform Pointer 最后 CAS 推进
```

Git 与 R2 没有跨系统事务。Pointer-last 是客户端安全边界：任一前置失败都保留原 Pointer，已可用版本继续可下载。

## 7. 失败恢复

| 失败点 | 恢复方式 |
|---|---|
| 预检或构建失败 | 无远端写入；修复后重跑 |
| Tag/ledger 被并发者抢占 | atomic push 不留半套 refs；同步远端，在后继 commit 重新规划，不盲目递增 |
| claim 成功但响应丢失 | 重读并验证远端 Tag 与 ledger；身份精确成立则恢复 |
| Tag 已建立，R2 未完成 | 保持同 commit 重跑，复用同 Tag；不可移动旧 Tag |
| artifact 上传中断 | Pointer 未动；相同摘要对象可复用，不同字节写入新的 hash key |
| record 已建立 | 验证 record 和全部私有/公开产物后跳过重建 |
| Changelog CAS 冲突 | 只接受远端最终 bytes 与本地完全相同；否则失败且不推进 Pointer |
| Pointer CAS 冲突或响应丢失 | 重读最新 ETag；目标完全一致则成功，否则按上限重试或失败 |
| Pointer 已写但公开终检失败 | 不假定回滚；公开面恢复后以同版本同 payload 重跑终检 |
| 已发布版本有缺陷 | Tag、record、artifact 与 Pointer 都不回写；提交修复并发布更高版本 |

本地临时目录清理不属于远端发布事务。主流程失败且清理也失败时，CLI 同时保留两项错误；Pointer 已成功推进后清理失败只报告“发布已完成但本地清理失败”，不得把公开成功误报为发布失败。

不要通过手工上传补流程。手工操作无法复现 Git claim、条件写、远端读回和 Pointer-last 的共同前置。

## 8. `--no-upload`

`--no-upload` 执行相同的 Git 只读预检、版本规划、Tauri 构建、签名和产物收集，然后停止：

- 不创建 Tag；
- 不推进渠道 ledger；
- 不创建 S3 client，也不读写 R2；
- 不改写 tracked 版本配置；Beta 通过 Tauri `--config` 注入计算出的版本；
- 清理临时 clone 与 Cargo target，只保留 `.release-tmp/<run-id>/staged/` 供本地检查并打印其路径。

它用于验证本机能否产出正确包，不是离线上传或绕开生产并发协议的入口。

## 9. 生产 cutover

代码和文档就绪不等于生产迁移授权。执行 ruleset、legacy seed、R2 Changelog 切换、对象删除或生产 Pointer 变更前，必须重新盘点实时 remote refs、对象 key/ETag、Pointer 和 ancestry，并单独确认精确目标。

获授权后的 cutover 原则是：

1. 先验证 remote 支持 atomic push，并配置 Tag 不可 update/delete、ledger 只允许 fast-forward 且不可 delete 的保护规则。
2. 一次 atomic push 创建经重新核验的 Stable `legacy-seed` annotated Tags，并把 Stable/Beta ledger 初始化到最新已确认 Stable commit；不伪造历史 Beta Tag。
3. 以现场读取的 ETag 为前置，CAS 发布通过当前契约的完整 Changelog。
4. 从第一个 schema 1 Tag 起使用新对象协议。Seed 只参与排序与 ancestry，禁止为其补发平台。

旧 allocator、全局/版本级 manifest、共享 platform map、mutable download alias 即使暂时保留在 R2，也不再被代码读取或写入。物理删除是另一项破坏性操作，必须再次按 exact keys 盘点并授权。
