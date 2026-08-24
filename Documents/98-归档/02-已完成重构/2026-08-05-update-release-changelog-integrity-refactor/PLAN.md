# 更新事务、跨平台独立发布与 Changelog 契约重构 - Plan

> 需求与验收标准见 [SPEC.md](./SPEC.md)。本文件只负责技术方案、协议、取舍、风险与长期文档同步项，不复制验收标准，也不承担执行进度。

## 方案概述

本次重构收口为三个唯一权威，不再用兼容层维持旧路径：

1. **更新事务权威：** Rust application 层的更新会话。第一次检查得到的精确 updater handle、来源渠道、版本和下载后的完整字节共同组成同一事务；安装只能消费该事务。
2. **发布身份权威：** 共享 Git remote 上不可移动的 annotated SemVer Tag。任意 version 全局只绑定一个 full commit SHA；同一渠道内一个 commit 最多绑定一个 version；R2 不再参与版本分配。
3. **更新日志权威：** 仓库根 `CHANGELOG.md`。前端和发布脚本共用同一个纯解析契约；R2 保存经校验的同一文件镜像。

平台可用性与全局版本身份分离：`channel × platform/latest.json` 只回答“这个平台现在最高能安装什么”，不会代表其他平台，也不会分配版本号。因此 Mac 可以停在 `beta.3`，Windows 可以直接推进到后继 commit 的 `beta.4`；以后 Mac 补发 `beta.4` 时复用该版本。

Git 额外保留 `release-ledger/stable` 与 `release-ledger/beta` 两个 fast-forward-only branch ref，专门作为同渠道发布的共同 CAS 点；它们只解决“不同 tag 名并发创建”竞态，不拥有版本号，版本身份仍只由 annotated tag 表达。

```text
Git commit + 根 CHANGELOG.md
              │
              │ release preflight / build
              ▼
 annotated tag v<version> + channel ledger CAS
              │                        tag 是身份；ledger 只仲裁并发
              │
              ▼
   R2 不可变分平台发布记录与产物      ← 某版本某平台的产物事实
              │
              ├── CAS 更新全局 CHANGELOG.md
              ▼
   R2 channel/platform/latest.json    ← 最后推进的平台可用 pointer
              │
              ▼
   Tauri check → exact handle → download → staged update → install
```

方案不新增数据库、常驻服务、运行时依赖或发布框架。实现复用当前 `UpdatePort`、`tauri-plugin-updater`、Git、Node/Bun 标准库、已安装的 AWS S3 SDK，以及 updater 已锁定的 minisign 校验库。

## 备选方案与取舍

| 决策 | 采用方案 | 原因 | 放弃方案 |
|---|---|---|---|
| 已检查更新的所有权 | application 会话持有 runtime 提供的 opaque updater handle | 从检查到安装只有一个身份和一个状态源，且 application 不依赖 Tauri 类型 | 安装时重新 check；会把可变 pointer 重新引入事务 |
| runtime 暂存 | handle 与 bytes 随会话状态一起移动 | Ready 可由类型和状态直接证明 | adapter 内另放 `Mutex<Option<...>>`；会形成第二真相源 |
| 更新事件传输 | 一个全局 snapshot 事件 + command 返回快照 | 去掉 Channel 与全局事件的重复状态路径，重挂载可通过 session hydrate 恢复 | 保留两种同构 payload；仍可能重复、乱序覆盖 |
| 版本分配与并发仲裁 | 标准 annotated Tag `v<semver>` + 每渠道 fast-forward ledger ref | Tag 绑定身份；共同 ledger 让不同 tag 名也必须竞争同一 CAS 点，不增加服务 | `latest.release.json`；可覆盖且与平台发布状态混杂 |
| 平台发布事实 | 每版本、每平台一个不可变记录 | 平台补发互不写共享 platform map | 全局 release manifest 合并 `platforms`；并发补发会丢更新 |
| 产物路径 | version/platform 下再按 SHA-256 内容寻址 | 签名构建可能非确定；中途失败后可安全重建，不覆盖旧 bytes | 固定 key 无条件覆盖；重试可能改写既有产物 |
| 构建输入 | `releaseCommit` 的一次性 detached clone + 每轮独立 target/staged | 消除可编辑 checkout 与并发构建混包的 TOCTOU | 在当前 checkout 的共享 bundle 目录构建；前后 clean 检查无法证明中间输入 |
| updater 验签 | claim/R2 前用应用公钥验证精确产物与捕获的签名字节 | Tauri CLI 的密钥不匹配警告不能作为 fail-closed 门禁 | 只检查 `.sig` 格式或依赖 CLI 日志 |
| pointer 推进 | S3 `If-Match` / `If-None-Match` CAS | 直接使用 R2 已支持能力和现有 SDK，拒绝回退与同版本异内容 | 无条件 PUT；并发时最后写入者获胜 |
| Changelog 解析 | 一个环境无关的纯 TypeScript 契约 | 发布门禁和 UI 对同一格式只有一种解释 | 发布脚本与前端各自维护 regex |
| Changelog 源格式 | `未发布`、六个中文规范标题和 `[已撤回]` | 单一中文语法，无别名、无 emoji、无 UI 翻译映射 | 兼容旧英文/emoji 标题；长期保留双格式 |
| 下载包持久化 | 继续仅保存在当前进程内存 | 已满足本次离线安装和失败重试边界 | 临时文件或数据库恢复；属于跨进程恢复，超出范围 |
| 发布操作说明 | README 作为入口，ARCHITECTURE / DESIGN 各自持有边界与协议 | 消除当前 README / HOWTO 重复，同时符合文档 Owner 规则 | 继续维护两份重叠操作指南 |

## 更新事务设计

### 所有权与数据模型

保留现有 `UpdatePort`，通过关联类型表达 runtime handle，不再增加第二个服务接口：

```text
CheckedUpdate<H>
├── identity: { version, channel }
└── handle: H
          │ exact handle.download()
          ▼
StagedUpdate<H>
├── checked: Arc<CheckedUpdate<H>>
└── bytes: Vec<u8>
          │ exact handle.install(bytes)
          ▼
platform installer
```

- `H` 在 application 层是 `Send + Sync + 'static` 的 opaque 类型；runtime 的唯一实现是当前 `tauri_plugin_updater::Update`。共享 checked / staged 资产时克隆外层 `Arc`，不要求或复制 handle。
- application 只表达检查、下载、安装契约，不导入 Tauri。
- runtime adapter 不再在 download 或 install 阶段重新构造 updater 并 check。
- handle、渠道和版本从第一次有效 check 起固定；bytes 只有验签下载成功后才加入事务。
- `Ready / Installing` 共享一个 `Arc<StagedUpdate<H>>`，状态迁移和失败恢复不复制安装包。

### 后端会话状态机

当前可组合出非法状态的生命周期资产字段收口为互斥 enum：

```text
Idle
  └── committed check ──► Available { checked }
                              │
                              └── download ──► Downloading { checked, progress, abort }
                                                     │
                                  verified success ──┴──► Ready { staged }
                                                               │
                                                               └── install ──► Installing { staged }
                                                                                   │
                                                         synchronous failure ──────┘
                                                         回 Ready，保留同一 staged
```

| 状态 | 持有资产 | 允许的主操作 | 失败后的可恢复状态 |
|---|---|---|---|
| `Idle` | 无 | check | `Idle` + error |
| `Available` | checked handle | download、重新 check、切换渠道 | `Available` 或 `Idle` |
| `Downloading` | checked handle、进度、abort | cancel | 同渠道仍有效时 `Available`，否则 `Idle` |
| `Ready` | exact handle + verified bytes | install、retry install | 始终回同一个 `Ready` |
| `Installing` | 同一个 staged update | 无重复用户操作 | 同步失败回 `Ready`；成功由平台接管 |

`Ready` 的严格定义是“会话内存在完整 `StagedUpdate`”。后端没有 staged update 时，任何安装命令都返回冲突，不再退化为普通重启。

错误不再作为脱离资产的独立后端 phase。`errorMessage` 附着于当前可恢复状态；特别是安装错误附着于 `Ready`，从而让 UI 明确提供“重试同一安装”，而不是重新检查。

### 并发、乱序与 singleflight

- 会话只在短临界区内原子迁移，不在网络下载或安装期间持有 mutex。
- 所有 check / download 尝试共用一个递增的内部 `operationEpoch`；状态保存当前 epoch，进度、abort 注册、完成与失败只有在 epoch 仍匹配时才能提交。`Idle / Available` 的渠道切换会使 check/candidate epoch 失效；取消或新尝试会使旧 download epoch 失效。`Downloading / Ready / Installing` 期间切换渠道不改变当前事务 epoch，从而既保留原事务，又阻断“取消 A 后同版本重试 B”的 ABA 回调。
- `Downloading / Ready / Installing` 期间的 check 不访问网络，返回 `Skipped` 并保留当前快照，不得替换正在消费的资产；只有 `Idle / Available` 可以提交 check 结果。`Found / NoUpdate / Skipped / Superseded` 是 check outcome，不是 lifecycle phase。
- download 只允许 `Available + expectedVersion + expectedChannel` 原子进入 `Downloading`。重复请求在 application 内判定为 `InProgress`，IPC 只返回当前权威快照，不启动第二个网络任务，也不产生 Ready。
- install 只允许 `Ready + expectedVersion` 原子进入 `Installing`。其他入口只能得到 conflict，不能再次调用 installer / restart。
- 每次有效状态或进度提交都递增 `revision`。command 返回和全局事件携带同一 `UpdateSessionSnapshot`；前端只接受更高 revision，迟到事件不能回写旧 phase。
- 取消在 abort handle 完成注册前发生时，注册动作立即执行 abort；取消后的下载结果不得提交 Ready。

快照保持最小且不泄露 handle / bytes：

```text
UpdateSessionSnapshot
├── revision
├── phase: idle | available | downloading | ready | installing
├── update: { version, channel } | null
├── progress: { downloaded, total } | null
└── errorMessage: string | null
```

前端 Zustand 只是该快照的投影；删除 `downloadInFlight` 等可由 phase 推导的第二状态源。

### 渠道切换

- `Idle / Available` 时切换渠道：保存新设置、使在途 operation epoch 失效并清除旧 candidate；下一次 check 使用新渠道。
- `Downloading / Ready / Installing` 时切换渠道：只改变未来检查来源，当前事务继续保留原 `version + channel + handle`。
- 下载取消或失败后，如果设置渠道已变化，不恢复旧渠道的 `Available`。
- install request 始终携带 `expectedVersion`；当设置渠道与 staged channel 不一致时，还必须携带与 staged channel 相同的 `confirmedSourceChannel`。
- Update Dialog 明示“仍将安装 Beta/Stable vX”；Status Chip 只负责打开 Dialog，不能绕过确认直接安装。

### 安装、完成标记与失败恢复

安装顺序固定为：

1. 取得 update-settings 的窄写入门闩，读取后端权威 configured channel；所有 update settings 字段写入和 marker 写入共用该门闩，避免 load-modify-save 相互覆盖，但不扩张为通用 settings 重构。
2. 在短会话锁内校验 Ready、expected version，并原子比较 staged channel 与 configured channel；不一致且缺少正确确认时返回 conflict + 权威快照。
3. 原子迁移为 `Installing`，但仍持有同一个 `Arc<StagedUpdate>`；随后在调用平台 installer 前持久化 `pendingRestartVersion`。marker 保存失败则恢复 Ready，installer 不得启动。
4. 直接调用 exact handle 的 `install(staged bytes)`；此后不访问网络或设置渠道。
5. Windows 成功路径由 updater 接管并退出；macOS 在 install 成功返回后只调用一次应用 restart。
6. install 同步返回错误时清除 marker，恢复同一个 Ready，记录错误并允许断网重试。

启动时原子读取并清除 marker；只有当前应用版本严格等于读取值时才展示一次完成提示，不匹配则直接丢弃且不提示。若清除失败，记录错误且不展示完成，避免陈旧 marker 在未来误报。

### IPC、事件与权限边界

- `download_and_install` hard cut 为语义准确的 `download_update`。
- `restart_and_install` hard cut 为 `install_staged_update`。
- lifecycle command 正常或幂等路径直接返回权威 snapshot；身份 / 状态非法时返回携带 snapshot 的 typed conflict。只有 manual check 额外返回 `noUpdate` 交互结果，不用 outcome 分支伪造 lifecycle；不保留旧命令别名。
- 删除 IPC `Channel<UpdatePhasePayload>`；manual 与 scheduler 都通过同一个 runtime emitter 发布 snapshot，全局只有 `update-session-changed` 一种生命周期事件。
- 前端挂载时先完成事件订阅，再读取 session snapshot；两条路径都按 revision 提交，避免“hydrate 后、listen 前”的丢事件窗口。Dialog、Chip、Settings 不直接拼 phase。
- `get_changelog` 从 update API / command 拆到 changelog 自己的 API / runtime command，更新模块不再反向拥有更新日志。
- 当前 release base URL 解析从 update adapter 提取为 runtime 基础设施，由 updater 与 changelog command 共用；changelog command 不反向依赖 updater adapter。
- 从 `src-tauri/capabilities/main.json` 删除全部 `updater:*` renderer 权限；保留 Rust 侧 updater plugin 注册，只允许 renderer 调用 StoneFlow 自有 commands。

## 跨平台发布协议

### 权威与不变式

| 事实 | 唯一 Owner | 说明 |
|---|---|---|
| `version → commit` | 共享 remote 的 annotated Git Tag | 任意 version 全局只有一个 commit，永不移动、删除或复用 |
| 同渠道发布顺序仲裁 | `release-ledger/<channel>` branch ref | 只允许 fast-forward；不是版本或平台可用性真源 |
| 用户可见版本内容 | 根 `CHANGELOG.md` | 与发布 commit 一起评审；R2 是经校验镜像 |
| 某版本某平台的产物 | 不可变 platform release record | 记录 URL、签名与 SHA-256 |
| 某平台当前可用版本 | `channel/platform/latest.json` | 唯一可变的平台 pointer，只能向前 |

Tag 使用标准名字，不增加自定义 namespace：

```text
Stable: v0.1.3
Beta:   v0.1.4-beta.1
        v0.1.4-beta.2
```

渠道由 SemVer prerelease 部分推导。同一渠道内一个 commit 最多映射一个 version；不同渠道允许同一 commit 分别承担一次 Beta 和一次 Stable 发布，因为两者是语义不同的版本。

新协议 annotated tag 的 message 固定包含 `stoneflow-release-schema: 1`。一次性历史 seed tag 使用 `stoneflow-release-schema: legacy-seed`：它们只参与版本排序和 ancestry，不允许通过新协议补发平台或改写同版本 pointer。缺少已知 schema marker 的 tag 直接阻断发布，不猜测其来源。

### 版本解析与分配

发布脚本每次从共享 remote 重新读取并 peel `v*` tags，同时读取目标渠道 ledger，绝不信任本地 tag cache 或 R2 pointer：

- 前置校验要求工作区（含 untracked）干净，且不存在 `assume-unchanged` / `skip-worktree` tracked entry；HEAD 可解析为完整 40 位 SHA，`package.json.version` 与 `tauri.conf.json.version` 是相同 Stable SemVer。
- 从配置的 remote 名解析唯一 push endpoint，并固定用该 endpoint 完成预检 fetch、构建后重检和最终 claim；拒绝多 push URL，构建期间 endpoint 漂移立即停止。刷新 remote refs 后，HEAD 必须可从该 endpoint 的公开分支或 Tag 历史到达。
- HEAD 在目标渠道已有 tag 时复用该版本；如果同渠道出现多个 tag 指向同一 commit，直接失败。
- 每个渠道 tag 的 commit 必须位于对应 ledger 历史，最新渠道 tag 必须与 ledger frontier 一致；首次 Beta 允许 ledger 仍位于已确认 Stable 基线。任何 tag / ledger 分叉都先停止修复，不继续分配。
- Stable 候选等于配置中的 stable version，并且必须高于上一 Stable tag。
- Beta 以当前 stable 配置的 next patch 为 base；同 base 的新 commit 使用远端最大 `beta.N + 1`，没有历史则从 `beta.1` 开始。配置基线落后于远端 Beta base 时失败。
- 新 commit 必须包含当前渠道 ledger frontier 与同渠道上一 tag 的 commit；Beta 还必须包含配置版本对应的 Stable 基线 Tag commit，不能只沿旧 Beta ledger 的分叉发出新 base。
- 新 claim 的根 Changelog 必须覆盖全部 schema-1 Tag 对应版本；这样 claim 后、R2 写入前崩溃的版本也会被后继发布恢复。既有 Tag 的跨平台 `reuse` 不受后继版本约束。
- 删除人工 `--version` 逃生口。`--no-upload` 保留为本地构建验证，只计算“未保留候选版本”，不创建 tag、不推进 ledger、不调用 R2。

实际发布固定预检时取得的 `releaseCommit` 与唯一 push endpoint。构建只在该 commit 的一次性 detached clone 中进行，checkout hooks 与危险 Git 环境被禁用，外部 `TAURI_CONFIG` 被移除，依赖按 frozen lockfile 安装，Cargo target 与 staged 输出按 run 隔离；可编辑 checkout 只用于构建后重检。所有 Git 子进程强制禁用 replace/graft 图；在本地校验和构建成功后、任何 R2 写入前，先以真实对象图证明预检时的 ledger frontier 是 `releaseCommit` 的 ancestor，再使用一次 `git push --atomic` 同时建立 annotated tag，并推进 `refs/heads/release-ledger/<channel>`。Ledger ref 使用 exact `--force-with-lease=<ref>:<expected>` 把预检 frontier 编码为 CAS 前置；首次创建使用保留末尾冒号的空 expected。由于 exact lease 在客户端仍可能授权 non-fast-forward，实际 fast-forward 不变式由本地 ancestry 校验与受保护 remote 的 non-fast-forward 拒绝共同保证，不能从“refspec 不带 `+`”推导。Remote 不支持 atomic push 时直接失败，不回退到两个顺序 push。

claim 前再次确认 HEAD、工作区、版本配置和 changelog hash 均未变化，并重新 fetch 全部 `v*` tags 与 ledger，重跑候选计算、schema marker、ledger frontier、同渠道前驱和 ancestry 校验；候选或前提发生任何变化都丢弃本次构建并停止，不能用已构建产物自动改号。所有新版本无论 tag 名是否相同都必须竞争同一渠道 ledger，因此并发争用时：

- 远端 tag 指向当前 commit，且 ledger 等于或已经 fast-forward 到包含该 commit 的后继：视为成功，包括 atomic push 成功但响应丢失。
- 同名 tag 指向其他 commit，或 ledger 已移到不包含当前 commit 的分支：立即停止，不能自动换号继续。
- 两个不同 tag 名从同一 frontier 并发时，只有先完成的 atomic push 能推进 ledger；另一方整组 push 失败，不会留下孤立 tag。
- 失败方必须先同步获胜方代码和 changelog，再以包含它的新 commit 重新发布。
- 如果本轮刚创建的本地 annotated tag object 与另一机器已成功推送的同 commit tag object 不同，只删除本轮创建的本地 ref，再 fetch 并验证远端 tag；预先存在且非本轮创建的本地冲突不自动清理。

GitHub 对 `v*` 配置 ruleset，限制 tag update / deletion；对 `release-ledger/*` 限制删除、non-fast-forward 更新和非发布维护者更新，同时允许发布脚本的实际 fast-forward。发布脚本禁止无条件 `--force`、`+refspec` 和任何已知 non-fast-forward 候选；ledger 唯一允许 exact `--force-with-lease=<ref>:<expected>`，仅承担 CAS 前置。Ruleset 必须作为 non-fast-forward 的最终拒绝边界，其真实行为在隔离 remote 验证后才能用于生产，不在代码里复制权限系统。

Beta 构建时使用 Tauri CLI 已有的 `--config` 合并覆盖发布版本，不再临时改写并恢复受 Git 管理的 `tauri.conf.json`；Stable/Beta 都删除继承的 `TAURI_CONFIG`，防止外部配置覆盖提交中的 updater 公钥或端点。

如果 HEAD 已有目标渠道 tag 且当前平台的 immutable release record 也已存在，脚本先验证 record 的 commit、签名、摘要及其引用对象，再直接恢复 changelog / pointer 阶段，不重新构建签名包。record 不存在时才构建；record 存在但身份或引用内容不一致时立即失败。这使“record 已写、pointer 尚未写”的重跑不依赖签名构建可复现。

### R2 对象模型

活动协议只保留以下对象：

```text
stoneflow/
├── CHANGELOG.md
├── updates/<channel>/
│   ├── releases/<version>/platforms/<platform>/
│   │   ├── release.json
│   │   └── artifacts/<sha256>/
│   │       └── <updater-artifact>
│   └── platforms/<platform>/latest.json
└── downloads/<channel>/<platform>/<version>/<sha256>/<installer>
```

不再创建全局 R2 release manifest：Git Tag 已经拥有全局版本身份，分平台 record 已经拥有产物事实，再写一份全局 JSON 只会增加同步点。

不可变 `release.json` 采用无时间戳的确定性结构：

```json
{
  "schemaVersion": 1,
  "channel": "beta",
  "version": "0.1.4-beta.4",
  "commit": "40-char-full-sha",
  "sourceVersion": "0.1.3",
  "platform": "windows-x86_64",
  "updater": {
    "url": "https://.../artifact",
    "signature": "...",
    "sha256": "..."
  },
  "downloads": [
    { "kind": "nsis", "url": "https://.../installer", "sha256": "..." }
  ]
}
```

Windows updater 与手动安装包为同一文件时复用同一 URL，不复制 bytes。`latest.json` 只保留 Tauri 客户端所需字段：

```json
{
  "version": "0.1.4-beta.4",
  "platforms": {
    "windows-x86_64": {
      "url": "https://.../artifact",
      "signature": "..."
    }
  }
}
```

`pub_date` 在 Tauri updater schema 中是可选字段，本方案删除它，避免同一发布重试生成不同 pointer。发布日期由 changelog 条目唯一表达。

Tauri 生成的本地 `.sig` 只作为构建输入读取，其精确文本与精确 artifact bytes 会先通过应用内置公钥的 minisign 校验，再内联到 immutable platform record 与 `latest.json`；R2 不再上传 signature sidecar。客户端本来就消费 pointer 内签名，这也避免相同 artifact bytes 因重签名文本变化而占用同 key。

活动协议删除：

- `updates/<channel>/latest.release.json`
- 含可变 `platforms` map 的版本级 `release.json`
- `latest.dmg`、`latest-setup.exe`、`latest.msi` 等可变手动下载别名
- 任何无条件覆盖的同 key 上传路径

### 不可变写与 pointer CAS

不可变对象使用 `PutObject If-None-Match: *`：

- key 不存在时创建。
- key 已存在时读取并比较：JSON 比较规范化结构，artifact 比较实际 SHA-256；record 内签名随 JSON 一起比较。一致视为幂等成功，不一致立即失败。
- 所有 updater / manual artifacts 必须先分别上传并通过 S3 readback SHA-256 校验，再从 record 将要写入的每个公开 URL 以五分钟总超时流式计算 SHA-256。只有桶内对象与公开下载面都完整时才写 platform `release.json`，再读回核对 record。`release.json` 是该平台发布事实的最终不可变提交点，绝不能先于其引用对象出现。
- ETag 只作为 CAS token，不作为内容摘要；multipart ETag 也不能代替 SHA-256。
- 内容哈希使用 Node `crypto`，不引入新依赖。

平台 pointer 使用读—判定—条件写：

1. S3 `GetObject` 读取 body 与 opaque ETag；不存在时用 `If-None-Match: *` 创建。
2. 远端版本更低时，用 `If-Match: <etag>` 推进。
3. 远端 payload 完全相同时，视为幂等成功。
4. 远端版本更高时拒绝回退；同版本但 URL、签名或平台字段不同则判定冲突。
5. 409 / 412 后重新读取并重新分类，最多重试三次；不盲目覆盖。
6. 成功后通过 S3 控制面读回精确校验，再检查 pointer 自身的公开 URL。该 post-pointer 传播检查失败时只报告验证失败，不回滚已建立的 Tag 或 pointer；pointer 引用的 artifact 可访问性已经在写 record 前验证。

immutable 产物使用长缓存；pointer 与 changelog 使用 `no-cache`。控制面判断始终使用认证 S3 API，不把公开 CDN 响应当成并发权威。

### 发布事务顺序

协议顺序固定为：

```text
只读预检与既有 platform record 恢复判断
  → record 不存在时，本地构建与产物/签名/摘要校验
  → 重检候选并只读确认远端 changelog 历史/已撤回状态兼容
  → atomic claim annotated tag + channel ledger，或验证既有 tag
  → If-None-Match 上传并通过 S3 + 公开 URL 校验全部不可变 artifacts
  → 最后写入并读回校验 immutable platform release record
  → CAS 发布完整 changelog，并通过 S3 + 公开 URL 验证目标版本
  → CAS 推进当前 channel × platform pointer
  → S3 与公开下载面终检
```

pointer 必须是最后一个影响客户端的写入。任何前置失败最多留下不可变、未被引用的对象，不改变现有用户的更新路径。

### Changelog 发布并发

R2 `stoneflow/CHANGELOG.md` 是跨渠道共享的唯一可变内容对象，保存通过同一 parser 校验的根文件原文，不生成第二种投影格式或 serializer：

- 新版本发布先读取远端正文和 ETag；本地文件必须包含远端已有的全部 release version 标识，并包含当前非空、未撤回的目标版本，防止陈旧 checkout 删除较新的历史。
- 上述确定性兼容检查必须在不可逆 Git claim 前只读完成；claim 后仍重复检查并执行 CAS，处理远端并发漂移。
- 已存在版本的日期和正文允许随新的受审 commit 修订；版本标识只能新增，不物理删除。
- 已撤回状态在某版本第一次进入远端镜像时确定，此后不可改变。已进入远端的未撤回问题版本只能通过更高版本修复，避免 changelog 与分平台 pointer 之间出现无法原子化的撤回竞态。
- 本地与远端 bytes 相同时不写；需要更新时使用观察到的 ETag 条件覆盖。远端不存在时使用 `If-None-Match: *`。
- 409 / 412 后只重读一次：远端最终 bytes 与本地完全相同且目标条目有效时视为幂等成功；内容不同时当前运行停止，不自动 merge 或覆盖，维护者同步最新代码后再发布。
- 对既有 tag 补发其他平台且远端已有目标条目时，不用旧 checkout 的本地文件覆盖 changelog；只读验证远端目标非空、未撤回。若 atomic claim 已成功但进程在 changelog 写入前崩溃，远端对象或目标条目仍缺失时，允许在本地保留全部远端 version 且既有已撤回状态完全不变的前提下执行一次 CAS 补齐。
- 中文语法为一次性 hard cut。若 R2 当前镜像仍使用旧英文标记，claim 前检查 fail closed；经单独授权后，以已观察 ETag 将完整中文根文件 CAS cutover，不保留英文兼容代码。
- pointer 写入前再次从 S3 读取最终 changelog，确认目标版本仍有效。
- pointer 写入前还必须从公开 changelog URL 读取同一 bytes；公开面尚不可用时本次停止，平台 pointer 保持原值。

这条规则防止 Windows 已发布 `beta.4` 后，Mac 用 `beta.3` checkout 补发时把远端日志降回旧历史。

### 失败恢复

| 失败点 | 恢复规则 |
|---|---|
| 本地校验或构建失败 | 尚无远端变更，修复后重跑 |
| tag / channel ledger claim 被其他 commit 抢占 | atomic push 不留半套 ref；不自动递增，同步获胜方并创建后继 commit |
| tag 已建立、R2 尚未完成 | 同 commit 重跑并复用同一 tag；不可变写和 CAS 均幂等 |
| tag 已建立但必须修改代码 | tag 永不移动；下一 commit 使用更高版本，不自动改写旧版本状态 |
| artifact 上传中断 | pointer 未动；重跑可复用已存在内容或写入新的内容哈希 key |
| artifact 的公开 URL / 摘要验证失败 | 不写 platform record、changelog 或 pointer；公开面恢复后重跑 |
| platform record 同 key 异内容 | 停止，保留首个不可变事实，不推进 pointer |
| changelog CAS 冲突 | 重读后 bytes 相同则幂等成功；不同则停止，同步最新代码和日志后以后继 commit / 版本重试 |
| pointer 409 / 412 | 有界重读；更高版本不回退，同版本异内容不覆盖 |
| pointer 写成功但响应丢失 | 读回相同 payload 后视为成功 |
| 已发布版本有问题 | 不回退 pointer、不覆盖产物；发布更高版本前进修复 |

Git Tag、R2 不可变对象和 pointer 不是跨系统原子事务。本方案接受“可能留下不可变孤儿”，但通过 pointer-last 保证用户可见状态不会半发布；为消灭孤儿而引入协调服务不符合当前规模。

## Changelog 契约与模块边界

### 唯一语法契约

新增 feature-owned、环境无关的纯 TypeScript 契约 `src/features/changelog/contract.ts`，由 changelog 内部和 Bun release script 共同导入。它不依赖 React、DOM、Tauri、Bun 或 Node API，只负责解析、验证、受支持版本比较和区间选择，不把产品专属规则下沉到 `shared`。

根文件 hard cut 为以下规则：

- 允许 H1 和规范简介；第一个 H2 必须是唯一的 `## [未发布]`，可以为空。
- 已发布标题只能是 `## [X.Y.Z] - YYYY-MM-DD` 或 `## [X.Y.Z-beta.N] - YYYY-MM-DD`，可在末尾增加 `[已撤回]`。
- `X / Y / Z` 禁止前导零，`N` 从 1 开始且禁止前导零；本轮不接受 alpha、rc、其他 prerelease 或 build metadata，出现真实渠道需求时再扩展。
- 版本唯一、日期为有效 ISO 日历日期、版本按受支持的 SemVer 子集严格从新到旧排列。
- 版本内容只能放在 `### 新增`、`变更`、`弃用`、`移除`、`修复`、`安全` 六类中；不接受 emoji、英文标题或别名。
- 每个出现的分类必须有正文；每个已发布版本至少有一个非空分类。
- 文末允许 Keep a Changelog 比较链接定义；解析器将其识别为 footer，绝不并入最旧版本正文。
- `未发布` 不是发布条目；已撤回条目不可作为发布目标，不进入累计更新区间，但在完整历史中保留并标记“已撤回”。

语法层和展示层共用同一组中文分类，UI 直接渲染已解析标题，不维护第二份翻译映射。

纯解析结果包含结构化 sections，而不是仅保存一段无法验证的 Markdown：

```text
ChangelogDocument
├── unreleased
└── releases[]
    ├── version
    ├── date
    ├── yanked
    └── sections: Map<Category, MarkdownBody>
```

发布脚本通过同一结果验证目标；前端通过同一结果渲染。旧 `model.ts` 的宽松 regex 和 `release.ts` 的第二份 validator 一并删除。

### 版本区间选择

选择函数显式接收 `currentVersion`、`targetVersion` 和 `channel`，不自行读取 update settings：

- 先按 SemVer 选择 `(currentVersion, targetVersion]`。
- 排除已撤回和无有效正文条目。
- Stable 目标只保留无 prerelease 的 Stable 条目。
- Beta 目标保留区间内的 Beta 与 Stable 条目。
- 结果按新到旧返回；区间为空时返回空集合，不阻断更新。
- 历史日志视图使用同一渠道过滤规则但不设目标区间，并保留已撤回条目供追溯。

平台是否曾发布或安装中间版本不参与选择；版本序列来自 changelog，本地版本和目标 pointer 只提供上下界。

累计 UI 复用一个单版本展示组件：每条显示版本、日期和分类正文；Update Dialog 的累计区域使用有界滚动，不改变弹窗整体视觉结构。完整历史 Dialog 复用同一组件并显示已撤回标记；累计区间为空时维持现有“无更新说明”状态，更新操作仍可继续。

### 依赖方向

```text
scripts/release ──────► src/features/changelog/contract.ts
                                      ▲
                                      │ feature internals
                         src/features/changelog
                                      ▲
                                      │ public UI / hook
                         src/features/update / src/layout

禁止：src/features/changelog ──► src/features/update
```

- changelog feature 自己拥有 `get_changelog` IPC facade、远端加载、回退与渲染。
- update / layout 调用 changelog 的公开入口，并显式传入渠道、当前版本和目标版本。
- release script 只依赖纯契约，不依赖 React feature、store 或 Tauri API。
- `scripts/check-feature-boundaries.ts` 将 changelog 纳入 feature 清单；跨 feature 只允许 root / `contract`，禁止 API、hook、model 或 component 深路径。
- `get_changelog` 的 Rust command 只负责受限时长的文本读取；内容合法性由唯一 TypeScript 契约判断。

### 远端刷新与回退

进程内只保留两个缓存概念：`lastValidRemoteDocument` 和当前 `inFlightRequest`。

- 每次 Dialog 从关闭变为打开，或目标版本改变时，都尝试刷新远端。
- 同时打开产生的请求复用一个 in-flight promise；请求结束后无论成功失败都清空它。
- 远端响应只有通过完整格式验证后才替换 `lastValidRemoteDocument`。
- 网络失败、空响应或格式无效时，回退顺序为“上次有效远端 → 构建内置快照 → 空集合”。
- bundled snapshot 如果因开发错误无法解析，记录错误并降级为空集合，不让更新界面崩溃；发布门禁和自动化测试负责在正常构建中提前阻断这种情况。
- bundled snapshot 永远不标记为远端成功，因此恢复网络后下一次打开仍会请求。
- 不新增磁盘缓存、过期时间或后台轮询；打开时刷新已经满足恢复要求。

## Hard-cut 迁移

### 仓库内迁移

- 根 `CHANGELOG.md` 增加顶部 `未发布`，按原意将“新功能 / 核心能力”迁到 `新增`、“优化”迁到 `变更`、“修复”迁到 `修复`；保留所有已有用户内容与发布日期。
- `0.1.0` 的介绍文字移入 `新增` 正文，避免版本下出现未分类内容。
- 本次不添加可选 compare-link footer，避免旧客户端在远端切换期间把 footer 当作最旧版本正文；新 parser 仍完整支持以后添加。
- 新发布脚本立即停止读写 legacy allocator、共享 platform map 与 mutable aliases；不实现兼容解析。
- 当前平台 `latest.json` 路径和 Tauri 标准 payload 继续使用，因此客户端 endpoint 不迁移。

### 生产状态迁移

2026-08-06 的只读快照显示：远端尚无 `v*` tags 或 `release-ledger/*` refs；Stable `latest.release.json` 为 `0.1.3`，两个 Stable 平台 pointer 均可用；Beta allocator 与两个 Beta pointer 均为 404。仓库可验证的 Stable 历史绑定为：

```text
v0.1.2 → 2f699a47963dcb0078f830a388de268208773b90
v0.1.3 → 4bef5dccf8bd5116f01218e805e8df1c673ba4f6
```

两 commit 当前 ancestry 连续且位于 `origin/main` 历史。该快照会漂移，执行任何迁移前必须重新读取 remote tags、R2 对象和 ancestry。

获得单独生产授权后，迁移只做以下一次性动作：

1. 先为 `v*` 配置并验证“允许创建、禁止 update / delete”的 GitHub ruleset，并为 `release-ledger/*` 配置“允许发布维护者 fast-forward、禁止 force / delete”的 ruleset。
2. 用一次 atomic push 创建带 `legacy-seed` marker 的可验证 Stable tags，并将 Stable 与 Beta ledger 都初始化到 `v0.1.3` commit；Beta ledger 此时只充当首个新 Beta 的 Stable ancestry / CAS 基线，不伪造历史 Beta tag。
3. 以观察到的旧 changelog ETag 为前置条件，用 CAS 上传严格中文格式的完整根文件。

新 object model 从 cutover 后第一个带 schema 1 tag 的版本开始；seed tags 对应的旧 R2 对象和 pointer 只作为历史现状保留，发布脚本明确拒绝给 seed 版本补发平台。

旧 `latest.release.json`、旧版本级 release manifest 和 mutable download aliases 即使暂时留在 R2，也立即退出活动协议。其物理删除属于另一项生产破坏性操作，必须再次盘点 exact keys 并单独授权；新代码不为它们保留兼容读取。

## 验证策略

### Rust application / runtime

- 使用带 handle ID 的 mock 证明 check、download、install 始终消费同一 handle。
- 覆盖下载完成后断网、pointer 改变或消失时仍安装原 staged update。
- 用并发测试证明重复 download 只调用一次网络，重复 install 只调用一次 installer / restart。
- 覆盖取消注册竞争、同版本 ABA 的旧 operation epoch、旧 snapshot revision 和渠道切换。
- 覆盖 install 与 set_channel 的线性化、首次失败后 marker 清除、Ready 恢复、同 bytes 断网重试，以及启动时不匹配 marker 被清除且不提示。
- 配置回归测试直接解析 capability JSON，断言 renderer 不含任何 `updater:*` 权限。

### TypeScript / UI

- parser 表驱动覆盖规范中文标题、六分类、日期、顺序、重复、已撤回、footer 与非法英文旧格式。
- 区间测试覆盖 Stable / Beta、跳过多个版本、空区间、已撤回和 SemVer 边界。
- loader 测试覆盖首次失败回 bundled、再次打开恢复远端、invalid remote 不污染 last-valid、并发去重。
- store / hooks 测试覆盖旧 revision 丢弃、Installing 禁止重复操作、安装失败保留 Ready 和渠道 mismatch 确认。

### Release protocol

- 通过本地 bare Git remote + 两个临时 clone 验证同 tag 竞争、不同 tag 名竞争同一 ledger、旧 frontier 的后继 commit 仍被 stale lease 拒绝、atomic push 全成或全败、同 commit 跨平台复用、annotated tag object 冲突恢复、replace/graft 绕过拒绝、push endpoint 固定、隐藏 index flag 阻断、Beta Stable 基线 ancestry、checkout 漂移阻断和 remote non-fast-forward 拒绝，不访问生产仓库。
- 覆盖 schema 1 tag、legacy seed tag 与未知 marker：seed 只参与排序 / ancestry，不能触发平台补发。
- remote helper 直接接收 `S3Client` 已有的最小 `send(command)` 能力；测试用内存 fake 断言 command 输入，并返回 ETag、409 / 412 等结果，不自建 S3 HTTP stub，也不增加 mocking 依赖。
- 上传编排测试断言 artifacts 经 S3 与公开 URL 校验后才写 platform record、changelog 公开可读后才写 pointer、pointer 永远最后，且列表中不存在 `latest.release.json`、signature sidecar 与 mutable aliases。
- 故障注入覆盖部分 artifact、changelog CAS、pointer response lost 和远端更高版本。
- `--no-upload` 验证不创建 tag、不调用 S3，且 Tauri `--config` 不改写 tracked config；Stable/Beta 构建环境都移除大小写变体的外部 `TAURI_CONFIG`。

### 质量入口与受控验收

实现完成后执行仓库既有入口，不启动 dev server：

```bash
bun run typecheck
bun run lint
bun run lint:boundaries
bun run format:check
bun run test:run
bun run test:release
cargo test --manifest-path src-tauri/Cargo.toml --workspace
bun run check
```

macOS / Windows 的签名包安装验收必须使用隔离 endpoint / bucket。真实安装、重启、生产 Tag 或生产 pointer 仍需单独授权。

## 风险与前提

| 风险 / 前提 | 影响 | 控制 |
|---|---|---|
| `tauri_plugin_updater::Update` 可跨确认周期持有 | 若未来 API 改变，exact-handle 模型需调整 | 当前锁定 2.10.1 的 `Update` 是 `Clone + Send + Sync`，且 `download(&self)` / `install(&self, bytes)` 支持该用法；升级时由 adapter 编译和测试暴露 |
| release tags 或 ledger 被人工破坏 | 版本身份或发布顺序失真 | 脚本固定 endpoint、禁用 replace/graft、拒绝已知 non-fast-forward；GitHub ruleset 最终保护 tag update / delete 与 ledger non-fast-forward / delete；预检验证两者一致 |
| Git remote 不支持 atomic push | tag 与 ledger 无法作为一个 CAS 事务提交 | 启动真实发布前验证 capability；不支持就阻断，不降级为顺序 push |
| Git 与 R2 无跨系统原子事务 | 失败可能留下 tag 或不可变孤儿 | pointer-last；同 commit 幂等重试；不删除、不复用，需要修复时发布更高版本 |
| 签名构建不完全可复现 | 固定 key 重试可能冲突 | 内容哈希 key；已存在 platform record 时复用其产物，不重新构建或覆盖 |
| 两台机器使用陈旧 checkout | 可能尝试降级 changelog / pointer | remote tag 与 S3 ETag 每次重读；旧版本补发不上传本地 changelog |
| 安装包仅在内存 | 进程退出后无法恢复 Ready，且占用安装包大小的内存 | 属于已确认边界；只有出现明确内存或跨进程需求时再设计磁盘暂存 |
| 生产 legacy 状态会漂移 | 静态迁移清单可能误操作 | 所有远端迁移和删除前重新盘点 exact objects、ETag、tags 与 pointer |

最脆弱的系统前提是：**所有发布机器共享同一个支持 atomic push 的受保护 Git remote，并承认 remote tag 是唯一版本身份、channel ledger 是唯一同渠道仲裁点。** 如果未来发布不再经过共享 remote，或平台团队需要在互不连通的网络中独立发号，本方案的 Git 原生仲裁将失效；只有到那时才值得引入独立发布协调服务。

## 完成后需要同步的长期文档

以下内容只在实现完成并验证后写为“当前真相”，不提前把 PLAN 原文复制过去：

- `Documents/01-架构/A2-系统设计.md`：补充更新事务权威、Git / R2 发布边界和跨模块数据流。
- `src/ARCHITECTURE.md`：把 changelog 纳入 feature 地图并登记 update / layout 只能经其公开入口依赖。
- `src-tauri/ARCHITECTURE.md`：同步 runtime updater、changelog command 与共享 release endpoint 的边界。
- `src/features/update/README.md`：新增一级 feature 的极简公开入口与相关文档链接。
- `src/features/update/ARCHITECTURE.md`：更新职责、依赖方向、snapshot 单轨与 renderer 权限不变式；删除时间线式“最后更新”。
- `src/features/update/DESIGN.md`：新增 exact-handle 状态机、并发、渠道切换、marker 与平台安装恢复机制。
- `src/features/changelog/README.md`：收口为公开入口和最小使用方式。
- `src/features/changelog/ARCHITECTURE.md`：新增内容 Owner、依赖方向与禁止反向依赖 update 的不变式。
- `src/features/changelog/DESIGN.md`：新增语法、区间选择、远端刷新和回退机制。
- `scripts/release/README.md`：收口为最小命令、凭据和安全入口。
- `scripts/release/ARCHITECTURE.md`：新增 Git Tag、R2 record、pointer 和 changelog 的 Owner 边界。
- `scripts/release/DESIGN.md`：新增版本分配、条件写、发布顺序、失败恢复与 hard-cut 迁移协议。
- 删除 `scripts/release/HOWTO.md`，其仍有效内容分别归入 README / ARCHITECTURE / DESIGN，避免重复维护。

该方案包含“Git Tag + channel ledger 取代 R2 allocator、平台 pointer 与版本身份分离、legacy 协议 hard cut”这一跨模块且难逆转的决策，已记录于 [ADR-0001](../../../01-架构/adr/ADR-0001-global-release-identity-and-platform-pointers.md)。ADR 只记录背景、决策、替代方案与后果；状态机和完整协议仍由模块 DESIGN 持有。

## 参考资料

- [Keep a Changelog 1.1.0（中文）](https://keepachangelog.com/zh-CN/1.1.0/)
- [Semantic Versioning 2.0.0（中文）](https://semver.org/lang/zh-CN/spec/v2.0.0.html)
- [Tauri Updater plugin](https://v2.tauri.app/plugin/updater/)
- [`tauri_plugin_updater::Update` Rust API](https://docs.rs/tauri-plugin-updater/2.10.1/tauri_plugin_updater/struct.Update.html)
- [Tauri capabilities](https://v2.tauri.app/security/capabilities/)
- [Git tag](https://git-scm.com/docs/git-tag.html)
- [Git push](https://git-scm.com/docs/git-push.html)
- [GitHub ruleset rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
- [Cloudflare R2 S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/)
- [Cloudflare R2 consistency](https://developers.cloudflare.com/r2/reference/consistency/)
- [AWS conditional writes](https://docs.aws.amazon.com/AmazonS3/latest/userguide/conditional-writes.html)
