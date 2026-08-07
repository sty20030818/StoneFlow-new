# ADR-0001：以 Git Tag 表达全局版本身份，以分平台 Pointer 表达可用性

## 状态

已接受。

## 背景

StoneFlow 允许 macOS 与 Windows 在不同时间发布。同一渠道仍需要一条跨平台版本序列，但某个平台可以跳过中间版本，也可以稍后为既有版本补发产物。

旧方案让 R2 的全局 release manifest 同时承担版本分配、commit 绑定和平台发布状态。该可变共享对象既混合了不同职责，也无法可靠处理两台机器或两个平台的并发发布。

## 决策

1. Stable 与 Beta 各自维护一条跨平台全局版本序列；平台不单独编号。
2. 共享 Git remote 上的不可移动 annotated SemVer Tag 是 `version → commit` 的唯一身份记录。
3. 每个渠道使用一个 fast-forward-only ledger ref 作为并发发布的共同 CAS 点；创建新 Tag 与推进 ledger 必须通过一次带 exact lease 的 atomic push 完成。Lease 绑定预期旧值，但客户端上的 `--force-with-lease` 本身可能授权 non-fast-forward，因此发布端必须在禁用 replace/graft 图后证明 ancestry，受保护 remote 必须最终拒绝 non-fast-forward；ledger 只仲裁并发，不拥有版本身份。
4. R2 只保存不可变的 `version × platform` 发布记录与内容寻址产物；`channel × platform/latest.json` 是唯一可变的平台可用 Pointer，并在该平台产物全部可用后以条件写最后推进。
5. 根 `CHANGELOG.md` 是所有渠道和平台共用的用户内容源；R2 只保存其经校验的完整镜像。
6. 旧 R2 版本分配器、共享平台 map 和可变下载别名退出活动协议，不保留兼容双轨。

完整的版本计算、条件写、失败恢复、历史 seed 与迁移步骤由任务 PLAN 和完成后的 release DESIGN 持有，本 ADR 不复制这些可变实现细节。

## 后果

### 正向影响

- 版本身份与平台可用性职责分离，同一版本不会因发布机器或平台不同而改绑代码。
- Mac 可停留在 `beta.3`，Windows 可从包含该 commit 的后继代码直接发布 `beta.4`；两端 Pointer 独立推进。
- 同一 commit 为另一平台补发时复用原版本，不要求同步构建或补齐中间平台版本。
- Git 原子引用更新与 R2 条件写覆盖当前并发需求，无需新增数据库或常驻协调服务。

### 成本与约束

- 所有发布机器必须共享支持 atomic push 的受保护 Git remote，并遵守 Tag 与 ledger 的不可移动约束。
- Git 与 R2 之间没有跨系统事务；失败可能留下不可变孤儿，但 Pointer-last 保证客户端不会看到半发布状态。
- 已发布身份和产物不可覆盖或回退；问题版本只能通过更高版本前进修复。
- 生产 seed、ruleset、Tag、ledger 与 R2 迁移仍需在执行前重新盘点，并取得单独授权。

## 放弃的方案

- **继续用 `latest.release.json` 分配全局版本：** 可变对象同时承担身份与平台状态，并发覆盖风险无法消除。
- **按平台独立编号：** 同一版本将不再代表唯一代码身份，跨平台支持与用户沟通都会变复杂。
- **维护一个可变的全局 `platforms` map：** 两个平台补发时需要并发合并共享对象，容易丢失更新。
- **引入数据库或发布协调服务：** 能提供更强事务，但超出当前规模，增加部署与维护成本。

## 关联文档

- [任务 SPEC](../../03-重构任务/2026-08-05-update-release-changelog-integrity-refactor/SPEC.md)
- [任务 PLAN](../../03-重构任务/2026-08-05-update-release-changelog-integrity-refactor/PLAN.md)
- [系统设计](../A2-系统设计.md)
