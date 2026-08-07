# 更新事务、跨平台独立发布与 Changelog 契约重构 - Tasks

## 当前阶段

**待受控验收** - T1 至 T20 已完成；T21、T22 需要隔离 Git/R2、对应平台与签名凭据，必须另行授权后执行。本轮未修改远端生产状态。

## 阶段任务

- [x] T1 在 `src/features/changelog/contract.ts`、`src/features/changelog/contract.test.ts` 与根 `CHANGELOG.md` 建立唯一 Keep a Changelog 契约，并将现有日志 hard cut 为受支持的版本、日期、六中文分类、已撤回与 footer 语法
  - 纯契约同时提供版本比较、渠道过滤和 `(currentVersion, targetVersion]` 区间选择；不依赖 React、Tauri、Bun 或 Node API。
  - 保留既有用户内容与发布日期，不增加 compare-link，不为旧英文或 emoji 分类保留兼容解析。
  - _对应验收标准：AC-22, AC-23, AC-24, AC-25, AC-26_
  - _测试先行：`src/features/changelog/contract.test.ts`_

- [x] T2 在 `src-tauri/crates/runtime/src/release_endpoint.rs` 与 `src-tauri/crates/runtime/src/commands/changelog.rs` 建立独立 changelog 读取边界，并更新 `src-tauri/crates/runtime/src/lib.rs`、`src-tauri/crates/runtime/src/commands/mod.rs`、`src-tauri/crates/runtime/src/commands/update.rs` 和 `src-tauri/crates/runtime/src/update/adapter.rs` 的端点复用与命令注册
  - `get_changelog` 保持受限时长的文本读取职责；update command 与 adapter 不再拥有 changelog，updater 与 changelog 只共用 release base URL 解析。
  - _对应验收标准：AC-27_
  - _测试先行：`src-tauri/crates/runtime/src/release_endpoint.rs` 与 `src-tauri/crates/runtime/src/commands/changelog.rs` 的 `#[cfg(test)]`_

- [x] T3 在 `scripts/release/release-plan.ts`、`scripts/release/release-plan.test.ts` 与 `scripts/release/types.ts` 将版本规划 hard cut 为 remote annotated `v*` Tag + channel ledger 快照输入，删除 `latest.release.json`、平台 Pointer 和人工 `--version` 对发号的影响
  - 覆盖 Stable 配置版本、Beta next-patch + `beta.N`、同渠道同 commit 复用、schema marker、legacy seed 限制和重复 commit/version 绑定拒绝。
  - _对应验收标准：AC-10, AC-11, AC-15_
  - _测试先行：`scripts/release/release-plan.test.ts`_

- [x] T4 在 `scripts/release/git.ts` 与 `scripts/release/git.test.ts` 实现共享 remote Tag/ledger 刷新、peel、真实对象图 ancestry 校验和 annotated Tag + ledger 的一次 atomic、exact-lease claim
  - 使用本地 bare remote 与两个临时 clone 覆盖同名 Tag 竞争、不同 Tag 竞争同一 ledger、旧 frontier 的后继 commit 仍被 stale lease 拒绝、响应丢失、annotated tag object 冲突、replace ref 绕过、分叉 ancestry 和全成或全败；禁止无条件 `--force`、`+refspec` 与顺序降级 push，actual non-fast-forward 由本地 ancestry 与 remote 保护共同拒绝。
  - _对应验收标准：AC-12, AC-13, AC-15, AC-16_
  - _测试先行：`scripts/release/git.test.ts`_

- [x] T5 在 `scripts/release/preflight.ts` 与 `scripts/release/preflight.test.ts` 以根 `package.json`、`src-tauri/tauri.conf.json`、`CHANGELOG.md`、共享 Git remote 和 `src/features/changelog/contract.ts` 为只读输入，完成构建前发布门禁与构建后候选重检
  - 校验含 untracked 的干净工作区、拒绝隐藏 tracked 变更的 index flags、40 位 HEAD、配置版本一致、唯一 push endpoint、HEAD 可从该 endpoint 的公开分支或 Tag 到达、候选及 Beta Stable 基线 ancestry、目标 changelog 非空且未撤回；发布元数据只从 release commit 原始 blob 读取并拒绝非法 UTF-8，新 claim 还必须保留全部 schema-1 Tag 对应版本，并确认 HEAD/配置/changelog hash/remote refs/endpoint 在构建后未漂移。
  - _对应验收标准：AC-13, AC-14, AC-22, AC-23_
  - _测试先行：`scripts/release/preflight.test.ts`_

- [x] T6 在 `scripts/release/types.ts`、`scripts/release/paths.ts`、`scripts/release/artifacts.ts`、`scripts/release/artifacts.test.ts`、`scripts/release/manifest.ts`、`scripts/release/manifest.test.ts` 与 `scripts/release/mock-server.ts` hard cut 为内容寻址产物、确定性分平台 `release.json` 和无 `pub_date` 的单平台 Pointer
  - 删除全局 release manifest、签名 sidecar 上传和 mutable installer alias；相同 Windows updater/manual 文件复用同一 URL。新增最小 Rust verifier，在任何 claim/R2 写入前用应用公钥校验精确 artifact 与捕获的签名字节。
  - _对应验收标准：AC-17, AC-18, AC-20, AC-21_
  - _测试先行：`scripts/release/artifacts.test.ts`、`scripts/release/manifest.test.ts`_

- [x] T7 在 `scripts/release/remote.ts`、`scripts/release/remote.test.ts`、`scripts/release/platform-release.ts` 与 `scripts/release/platform-release.test.ts` 收口可注入的 S3 条件读写，并分别暴露 `publishArtifactsAndRecord` 与 `advancePlatformPointer` 两个平台发布阶段
  - 前一阶段完成产物双面 SHA-256 校验和 record-last 不可变提交，公开大文件以五分钟总超时流式计算摘要且绝不读写 Pointer；后一阶段按 SemVer 分类推进、幂等、回退与同版本异 payload，409/412 最多重读重试三次，ETag 只作 opaque CAS token。
  - 并发平台只写各自 record/Pointer；测试必须断言 record 阶段不触碰 Pointer，供 T9 在 T8 changelog 成功后单独调用推进阶段。
  - _对应验收标准：AC-17, AC-18, AC-19, AC-20, AC-21_
  - _测试先行：`scripts/release/remote.test.ts`、`scripts/release/platform-release.test.ts`_

- [x] T8 在 `scripts/release/changelog-publish.ts` 与 `scripts/release/changelog-publish.test.ts` 复用 `src/features/changelog/contract.ts` 实现完整根原文镜像、version/已撤回状态不变式、ETag CAS、相同 bytes 幂等和既有 Tag 补平台只读校验
  - 保留全部远端版本标识；不可逆 Git claim 前只读校验远端历史与已撤回状态兼容性，claim 后的 CAS 冲突仅接受完全相同 bytes；平台 Pointer 前同时验证 S3 与公开 changelog，旧 checkout 不得覆盖较新历史。既有目标存在时严格只读；仅在 Tag claim 后远端仍缺目标的崩溃恢复窗口，允许满足 version/已撤回状态不变式的 CAS 补齐。
  - _对应验收标准：AC-20, AC-22, AC-23_
  - _测试先行：`scripts/release/changelog-publish.test.ts`_

- [x] T9 在 `scripts/release/build.ts`、`scripts/release/build.test.ts`、`scripts/release/release.ts` 与 `scripts/release/release.test.ts` 将主脚本收口为“预检/恢复 → 构建 → 重新取 refs → 发布前 Changelog 兼容性检查 → atomic claim → artifacts → record → changelog → Pointer-last”的薄编排器
  - 既有 platform record 一致时跳过重建；否则从 `releaseCommit` 创建一次性 detached clone，按大小写不敏感规则隔离 Git/`TAURI_CONFIG` 外部环境，frozen 安装依赖并隔离 Cargo target/staged；Beta 用受控 Tauri `--config`，`--no-upload` 不创建 Tag/ledger、不调用 R2、不改 tracked 配置；删除 `--version` 参数解析，并彻底移除 legacy allocator、共享 platform map 和 mutable alias 活动路径。
  - 故障注入证明任一前置失败保留原 Pointer；自动化测试、质量检查与 `--no-upload` 不得写生产 remote，真实 release 命令本轮只实现不执行，执行前需单独授权。
  - _对应验收标准：AC-12, AC-14, AC-20, AC-23_
  - _测试先行：`scripts/release/build.test.ts`、`scripts/release/release.test.ts`；既有 `scripts/release/cleanup.test.ts` 保持回归通过_

- [x] T10 在 `src-tauri/crates/application/src/update.rs` 与 `src-tauri/crates/runtime/src/update/adapter.rs` 建立 exact-handle 检查—下载事务，使 `UpdatePort` 通过关联类型交付 opaque handle，并以互斥会话状态、`operationEpoch`、abort 注册补偿和 `revision` 管理候选、进度与 Ready
  - 测试使用 handle ID 证明 check/download 身份固定，active transaction 的 check 不访问网络，重复下载只调用一次网络，取消竞态和同版本 ABA 的旧回调不能提交 Ready。
  - _对应验收标准：AC-1, AC-6_
  - _测试先行：`src-tauri/crates/application/src/update.rs` 与 `src-tauri/crates/runtime/src/update/adapter.rs` 的 `#[cfg(test)]`_

- [x] T11 在 `src-tauri/crates/application/src/update.rs` 完成 Ready—Installing exact-handle 安装事务，只允许 `Ready + expectedVersion` 消费同一 `Arc<StagedUpdate>`，并在同步失败后恢复原 bytes、handle 与错误
  - 覆盖下载后断网或 Pointer 变化仍安装原版本、无暂存包绝不普通重启、失败后不重新 check/download 即可重试，以及并发入口只调用一次 installer/restart。
  - _对应验收标准：AC-2, AC-3, AC-4, AC-5, AC-7_
  - _测试先行：`src-tauri/crates/application/src/update.rs` 的 `#[cfg(test)]`_

- [x] T12 在 `src-tauri/crates/application/src/update.rs` 与 `src-tauri/crates/runtime/src/update/settings_store.rs` 线性化 update settings 和完成 marker，使渠道切换只影响未来检查，并在 staged/configured channel 不一致时强制校验 `confirmedSourceChannel`
  - 所有 update-settings 写入共用窄门闩；marker 必须在 installer 前写入，失败时恢复 Ready 并清理，启动时原子读取清除且只提示严格匹配的当前版本。
  - 删除 `StoreUpdateSettingsAdapter::load()` 的隐式回写，覆盖 set_channel/check/install 竞争、marker 写入/清除失败和不匹配版本。
  - _对应验收标准：AC-5, AC-8_
  - _测试先行：`src-tauri/crates/application/src/update.rs` 的 `#[cfg(test)]`_

- [x] T13 原子更新 `src-tauri/crates/runtime/src/commands/update.rs`、`src-tauri/crates/runtime/src/commands/mod.rs`、`src-tauri/crates/runtime/src/update/events.rs`、`src-tauri/crates/runtime/src/bootstrap.rs`、`src-tauri/capabilities/main.json`、`src/features/update/api/updates.ts`、`src/features/update/model/useUpdateStore.ts`、`src/features/update/hooks/useUpdateEvents.ts`、`src/features/update/hooks/useUpdateInstallActions.ts` 与 `src/features/update/hooks/useManualUpdateCheck.ts`，hard cut 为单一 revision snapshot 协议
  - 删除 IPC `Channel`，命令改为 `download_update` / `install_staged_update`，manual 与 scheduler 只发布 `update-session-changed`；前端先订阅再 hydrate，只接受更高 revision。
  - 正常、幂等、conflict 与业务失败都返回权威 snapshot，前端先应用再提示；只有 manual check 额外返回 `noUpdate` 交互结果，事件丢失也不会把 UI 卡在旧阶段。
  - 检查使用显式 `Found/NoUpdate/Skipped/Superseded`，跳过版本使用精确 version+channel 生命周期命令；只有匹配的 Available 可进入 Idle，下载竞态、保存失败和事件丢失都返回权威 snapshot。
  - 删除 `src/features/update/model/applyUpdatePhase.ts`、`src/features/update/model/applyUpdatePhase.test.ts`、`src/features/update/hooks/updatePhaseEffects.ts`、旧命令/事件别名和前端第二状态源，并移除全部 `updater:*` renderer 权限。可恢复的 renderer UI 偏好迁到 namespaced localStorage 后删除 plugin-store、`store:default` 与第二个 update-settings writer。
  - _对应验收标准：AC-4, AC-6, AC-7, AC-9_
  - _测试先行：`src/features/update/model/useUpdateStore.test.ts`、`src/features/update/hooks/useUpdateEvents.test.tsx`、`src/features/update/hooks/useManualUpdateCheck.test.tsx`、`src-tauri/crates/runtime/src/commands/update.rs` 的 `#[cfg(test)]`_

- [x] T14 在 `src/features/update/components/UpdateDialog.tsx`、`src/features/update/components/UpdateDialog.test.tsx`、`src/features/update/components/SystemStatusChip.tsx`、`src/features/update/components/SystemStatusChip.test.ts`、`src/features/update/components/UpdateFooterChip.tsx`、`src/features/update/components/UpdateProgressRing.tsx`、`src/features/update/components/UpdateStatusFooterItem.tsx`、`src/features/update/hooks/useUpdateInstallActions.ts`、`src/features/update/model/useUpdateStore.ts`、`src/features/update/model/updatePresentation.ts`、`src/features/update/model/updatePresentation.test.ts`、`src/features/update/model/deriveUpdateFooterView.ts` 与 `src/features/update/model/deriveUpdateFooterView.test.ts` 完成权威快照的安装交互投影
  - Installing 禁用全部入口；失败显示 Ready + 原版本错误并可直接重试，Footer/Progress 不得退回旧 error phase 或暴露安装动作。
  - Dialog 在 Ready/打开时读取 `getUpdateSettings()`，加载完成前禁用安装；渠道不一致时显示 staged 原渠道和版本，确认后提交精确字段 `confirmedSourceChannel`，但 Zustand 不复制 configured channel，后端仍在安装瞬间复核。
  - Ready Chip 只能打开 Dialog，不能绕过确认直接安装。
  - NotifyOnly 自动弹窗按 revision 受控；用户关闭某一 revision 后，迟到的设置读取和取消下载回退不得重新打开，主动入口仍可覆盖关闭标记。
  - _对应验收标准：AC-5, AC-7, AC-8_
  - _测试先行：`src/features/update/components/UpdateDialog.test.tsx`、`src/features/update/components/SystemStatusChip.test.ts`、`src/features/update/model/useUpdateStore.test.ts`_

- [x] T15 在 `src/features/changelog/api.ts`、`src/features/changelog/useChangelog.ts`、`src/features/changelog/useChangelog.test.tsx`、`src/features/changelog/ChangelogRelease.tsx`、`src/features/changelog/ChangelogRelease.test.tsx`、`src/features/changelog/ChangelogDialog.tsx`、`src/features/changelog/index.ts`、`src/features/update/api/updates.ts`、`src/features/update/contract.ts`、`src/features/update/components/UpdateDialog.tsx`、`src/layout/overlays/ShellOverlays.tsx`、`src/layout/ShellLayoutContent.tsx` 与 `scripts/check-feature-boundaries.ts` 完成前端 changelog 所有权、调用契约和刷新回退 hard cut
  - 历史 Dialog 的渠道由 layout 经 update 公开入口读取后显式传入；Update Dialog 显式传入当前应用版本以及 staged snapshot 的 target/channel，changelog 不反向依赖 update。
  - 只保留 `lastValidRemoteDocument` 与一个 in-flight request；每次打开或目标变化都刷新，失败按“上次有效远端 → bundled → 空集合”回退，并在完整历史中显示已撤回状态。
  - 删除 `src/features/changelog/model.ts` 与 `src/features/changelog/model.test.ts`，禁止跨 feature 深路径导入，不保留旧 hook overload 或兼容 facade。
  - _对应验收标准：AC-26, AC-27_
  - _测试先行：`src/features/changelog/useChangelog.test.tsx`、`src/features/changelog/ChangelogRelease.test.tsx`、`src/features/update/components/UpdateDialog.test.tsx`_

- [x] T16 在 `src/features/update/components/UpdateDialog.tsx` 与 `src/features/update/components/UpdateDialog.test.tsx` 接入 `src/features/changelog/ChangelogRelease.tsx`，按目标渠道展示 `(currentVersion, targetVersion]` 累计条目并保持更新操作不受空说明阻断
  - `currentVersion` 取当前应用版本；`targetVersion` 与 `channel` 只取 staged snapshot 的 `update`，不得使用可能已切换的 configured channel。
  - 累计区域使用有界滚动；Stable 只显示 Stable，Beta 显示 Stable 与 Beta，跳过版本和缺失条目不要求平台补发或逐版安装。
  - _对应验收标准：AC-24, AC-25, AC-26_
  - _测试先行：`src/features/update/components/UpdateDialog.test.tsx`_

- [x] T17 在 `Documents/01-架构/A2-系统设计.md`、`src/ARCHITECTURE.md` 与 `src-tauri/ARCHITECTURE.md` 同步已验证的更新事务权威、Git/R2 Owner、changelog feature 地图和 runtime command/endpoint 边界
  - 只记录实现完成后的当前真相，不写执行进度，不复制 PLAN 的完整协议。
  - _对应验收标准：AC-9, AC-10, AC-17, AC-21, AC-27_

- [x] T18 在 `src/features/update/README.md`、`src/features/update/ARCHITECTURE.md`、`src/features/update/DESIGN.md`、`src/features/changelog/README.md`、`src/features/changelog/ARCHITECTURE.md` 与 `src/features/changelog/DESIGN.md` 同步两个 feature 的公开入口、依赖方向、状态机、并发、渠道确认、语法、区间选择和刷新回退
  - 删除 update 架构文档中的时间线式“最后更新”，模块长期文档不记录任务状态。
  - _对应验收标准：AC-1, AC-5, AC-8, AC-24, AC-27_

- [x] T19 在 `scripts/release/README.md`、`scripts/release/ARCHITECTURE.md` 与 `scripts/release/DESIGN.md` 固化最小发布入口、Owner、不变式、并发、失败恢复和生产 cutover 规则，删除重复的 `scripts/release/HOWTO.md`，并同步更新 `Documents/03-重构任务/2026-08-05-update-release-changelog-integrity-refactor/SPEC.md` 的关联文档链接
  - 生产 ruleset、legacy seed、R2 cutover 与删除操作只写可复核前置和授权边界，不把漂移快照写成无需复查的命令清单。
  - _对应验收标准：AC-10, AC-13, AC-16, AC-19, AC-20_

- [x] T20 按根 `package.json` 与 `src-tauri/Cargo.toml` 执行 `bun run test:release`、`bun run typecheck`、`bun run lint`、`bun run lint:boundaries`、`bun run format:check`、`bun run test:run`、`cargo test --manifest-path src-tauri/Cargo.toml --workspace` 和 `bun run check`，并清除本任务遗留的 legacy 协议引用
  - 额外检索旧命令名、旧事件、`updater:*`、`latest.release.json`、mutable alias、signature sidecar 与第二套 changelog validator；只修复本任务造成的失败，不启动 dev server。
  - _对应验收标准：AC-9, AC-14, AC-20, AC-23, AC-27_

- [ ] T21 按 `scripts/release/README.md` 与 `src/features/update/DESIGN.md` 在隔离 Git remote、R2 endpoint 和签名配置上完成一次 macOS 签名包的检查、下载、断网安装、失败重试与完成 marker 受控验收，不推进生产 Pointer
  - _对应验收标准：AC-1, AC-2, AC-3, AC-5, AC-21_

- [ ] T22 按 `scripts/release/README.md` 与 `src/features/update/DESIGN.md` 在隔离环境完成“Mac Beta Pointer 停在 beta.3、Windows 从后继 commit 发布 beta.4 并直接更新”的 Windows 签名包受控验收，不补发 beta.3、不推进生产 Pointer
  - _对应验收标准：AC-12, AC-21, AC-25_

## 阻塞

- T21、T22 涉及真实签名构建、应用安装与重启，必须在执行前取得单独授权，并具备隔离 Git/R2 配置、对应平台环境和签名凭据；T1-T20 当前无外部阻塞。
- 生产 GitHub ruleset、legacy seed Tag/ledger、R2 changelog cutover、对象删除或生产 Pointer 变更不属于本任务的已授权执行项；若后续需要执行，必须重新盘点实时状态并单独确认。

## 与 SPEC/PLAN 的实施偏差

- T2 为解除既有 runtime lib-test 编译阻断，额外在 `src-tauri/crates/runtime/src/commands/tasks.rs` 的测试输入补齐 `priorities: None` 与 `date_filter: None`；只修复测试夹具，不改变业务逻辑。
- T2 全量 runtime 测试为 106/107；唯一失败是既有 `commands::spaces::tests::deleting_trashed_space_again_should_not_enqueue_another_operation` 的错误文案断言，与本任务改动无调用关系，已在 T20 复核为既有基线，留待 spaces 模块修复。
- T4 红队证明普通 atomic fast-forward push 不能严格绑定预检 frontier；随后又证明 exact `--force-with-lease` 本身可能授权 non-fast-forward，且本地 replace/graft 图可伪造 ancestry。PLAN 与 ADR 已再次修正：exact lease 只承担 CAS，本地禁用 replace refs、显式拒绝非空 legacy grafts，再验证 ancestry，受保护 remote 最终拒绝 actual non-fast-forward；新增赢家后继、replace ref 与 legacy graft 反例测试。
- T8 将“既有 Tag 补平台一律只读”收窄为“远端已有目标时只读”：若 atomic claim 已成功但进程在 changelog 写入前崩溃，重跑可在保留全部远端 version 且不改变既有已撤回状态时执行一次 CAS 补齐，避免已建立 Tag 永久无法恢复。
- Changelog 中文语法为 hard cut，不增加英文兼容代码。如果 R2 仍是旧英文文档，下一次 release 会在 claim 前 fail closed；需要另行授权一次 ETag CAS cutover。新旧客户端在远端语法不兼容时只回退到各自内置日志，不阻断 updater。
- T20 终审把既有 AC 的完整性边界继续前移：补齐 updater record 恢复验签、流式公开摘要、commit blob/隔离构建输入、Git 与 Tauri 环境清理、claim 前 Changelog 兼容性、显式检查结果、失败快照、精确跳过身份、监听恢复和 revision-fenced 自动弹窗。这些是原验收标准的 fail-closed 与竞态闭环，不增加新的产品功能或兼容路径。
- T20 全量门禁仍暴露任务外基线：`format:check` 有 15 份未被本任务修改的文件未格式化；前端全量测试 861/864，失败为 RowShell/LifecycleBoard/ProjectBoard 的 3 项既有 CSS class 断言；Rust workspace 的 application 66/66 通过，runtime 仍因 spaces 既有错误文案断言为 113/114。上述文件均无本任务 diff，因此未越界修改；`bun run check` 按顺序在既有 format 基线处停止。

## 完成记录

| 日期 | 记录 |
|------|------|
| 2026-08-06 | 用户确认 PLAN；创建 ADR-0001 与 TASKS，进入待实施阶段 |
| 2026-08-06 | 完成 T1：建立纯 TypeScript changelog 契约并迁移根日志；相关测试 42/42、typecheck、lint、feature boundaries 与新增文件格式检查通过 |
| 2026-08-06 | 完成 T2：拆分 runtime changelog command 与共享 release endpoint；11 项定向测试、release cargo check、Clippy 和改动文件格式检查通过 |
| 2026-08-06 | 完成 T3：版本规划只接受 remote Tag + 目标 ledger 快照；29 项测试覆盖 Stable/Beta、复用、schema、legacy seed、重复绑定、乱序与 BigInt 边界 |
| 2026-08-06 | 完成 T4：建立隔离 remote refs、annotated Tag peel、禁用 replace/graft 的 ancestry 与 atomic exact-lease claim；本地 bare remote 双 clone 的 11 项协议测试通过，typecheck 与 lint 通过 |
| 2026-08-06 | 完成 T5：预检固定唯一 push endpoint，拒绝普通与隐藏 dirty，校验公开 branch/Tag、Beta Stable 基线、Changelog 与构建后快照漂移；17 项预检测试通过 |
| 2026-08-06 | 完成 T6：产物改为 SHA-256 内容寻址，Windows/Linux 同文件复用单一对象，分平台 record 无时间戳且 Pointer 删除 `pub_date`；9 项定向测试通过 |
| 2026-08-06 | 完成 T7：S3 对象读写收口为 ETag 条件协议，产物/record 与 Pointer 分阶段；补齐 record/Pointer 版本平台 namespace 校验，19 项定向测试通过 |
| 2026-08-06 | 完成 T8：完整根 Changelog 原文按 version/已撤回状态不变式 CAS 发布，既有目标只读并支持 claim 后崩溃恢复；21 项定向测试通过 |
| 2026-08-06 | 完成 T9：主脚本 hard cut 为可恢复的 Pointer-last 薄编排，Beta 通过 `--config` 构建且 `--no-upload` 不创建 Tag/ledger、不访问 R2；发布模块全量 129 项测试、typecheck、lint 与 feature boundaries 通过 |
| 2026-08-06 | 完成 T10：`UpdatePort` 以关联类型交付 opaque handle，check/download 固定同一身份；互斥会话、epoch、abort 补偿与 revision 覆盖重复下载、取消和 ABA 竞态，application 定向 21/21、runtime adapter 3/3 通过 |
| 2026-08-06 | 完成 T11：Ready/Installing 共享同一 `Arc<StagedUpdate>`，安装要求精确版本且无暂存包不再普通重启；失败保留原 handle/bytes 可重试，并发入口单飞，application 定向 24/24 通过 |
| 2026-08-07 | 完成 T12：update settings 的读写共用窄门闩，并收口为 WebView 前构造的独占 JSON 适配器，以同目录临时文件、`sync_all` 和原子替换落盘；渠道切换不改写在途事务，installer 前持久化完成 marker，失败恢复同一 Ready，启动时严格匹配后一次性消费；application 定向 34/34、全量 57/57、runtime update 3/3 与 all-target check 通过 |
| 2026-08-07 | 完成 T13：hard cut 为 `{revision, phase, update, progress, errorMessage}` 权威快照、唯一 `update-session-changed` 事件和精确身份命令；前端先订阅再 hydrate，只接受更高 revision，删除 Channel、旧 phase 辅助文件、命令别名与 renderer updater 权限；application 59/59、update 定向 36/36、runtime update 6/6、前端 14 项相关测试、typecheck、lint 与 boundaries 通过 |
| 2026-08-07 | 完成 T14：前端只投影后端五态快照，Ready 安装失败保留原 staged 身份直接重试，Installing 锁定入口，跨渠道安装显式确认，Ready Chip 只打开 Dialog；update 模块 42/42、typecheck、lint 与 boundaries 通过 |
| 2026-08-07 | 完成 T15：changelog 独立拥有 IPC、查询、刷新回退与历史展示，只保留上次有效远端文档和单一 in-flight，删除旧 model、hook overload 与 update 侧 changelog facade；changelog 44/44、lint 与 boundaries 通过 |
| 2026-08-07 | 完成 T16：Update Dialog 以运行中版本与 staged snapshot 目标/渠道查询开闭区间，复用 `ChangelogRelease` 有界滚动展示，空区间不阻断下载；相关 50/50、typecheck、lint 与 boundaries 通过 |
| 2026-08-07 | 完成 T17：A2、前端与 Tauri 架构文档同步 snapshot、Tag、ledger、platform record、per-platform pointer 与根 Changelog 的 Owner，并登记唯一 update 事件、命令和权限边界；链接与 diff-check 通过 |
| 2026-08-07 | 完成 T18：新建或重写 update/changelog 六份模块 README、ARCHITECTURE 与 DESIGN，长期 Owner 分别收口公开入口、依赖边界、更新事务、语法区间和刷新回退；链接、旧术语与 diff-check 通过 |
| 2026-08-07 | 完成 T19：release README 收口为最小发布入口，新建 ARCHITECTURE/DESIGN 固化 Owner、并发、幂等恢复与 cutover 授权边界，删除过时 HOWTO 并修正 SPEC 链接；旧协议关键词、文档链接与 diff-check 通过 |
| 2026-08-07 | 完成 T20：typecheck、lint、boundaries、本任务 TS/Rust 格式、legacy 扫描与 diff-check 通过；发布模块 146/146、application update 43/43、runtime update 8/8 与 runtime changelog 5/5 通过；前端 861/864、Rust application 66/66 且 runtime 113/114，全量 format 的 15 份失败与 4 项测试失败均已确认为无本任务 diff 的既有基线 |
| 2026-08-07 | 按用户追加确认将 Changelog hard cut 为纯中文结构：唯一接受未发布、六个中文分类和已撤回标记，删除 UI 翻译映射，明确拒绝英文旧语法；changelog 49/49、release 146/146、typecheck、lint 与 boundaries 通过 |
