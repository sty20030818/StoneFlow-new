# release · 架构

## 职责

`scripts/release` 负责把一个已提交、可从共享 remote 到达的 Git commit 发布为当前平台可安装的 StoneFlow 版本：

- 以远端 annotated Tag 固定 `version → commit` 身份，以渠道 ledger 仲裁并发；
- 校验版本配置、Changelog、Git 历史、签名产物与远端对象；
- 发布内容寻址产物和不可变 platform record；
- CAS 更新全局 Changelog 镜像，最后推进当前渠道、当前平台的 updater Pointer。

它不负责应用内更新状态机、生成用户更新内容、管理生产 Git/R2 权限，也不提供绕过主流程的手工上传协议。

## Owner

| 模块 | 唯一职责 |
|---|---|
| `release.ts` | 薄编排入口，固定发布顺序与 `--no-upload` 边界 |
| `preflight.ts` | 工作区门禁，并从 `releaseCommit` 原始 blob 读取版本、公钥、Changelog 后校验候选 |
| `release-plan.ts` | 仅根据远端 Tag、渠道 ledger 与配置版本计算 claim/reuse 计划 |
| `git.ts` | 刷新隔离 refs、校验 annotated Tag/ancestry、原子 claim Tag + ledger |
| `workspace.ts` | 从 `releaseCommit` 创建一次性 detached clone，并封装成功/失败清理边界 |
| `build.ts` | 在固定快照中 frozen 安装依赖并按渠道、平台调用 Tauri 构建 |
| `artifacts.ts` | 精确选择、验签、摘要并暂存当前平台产物 |
| `signature.ts`、`src-tauri/crates/release-verifier` | 使用客户端同族 minisign 算法校验将要发布的精确产物与签名字节 |
| `manifest.ts` | 构造 platform record 与单平台 `latest.json` |
| `platform-release.ts` | 不可变产物/record 发布、远端复用与 Pointer CAS |
| `changelog-publish.ts` | claim 前只读校验远端历史兼容性，并以 CAS 发布、验证完整 `CHANGELOG.md` 镜像 |
| `remote.ts` | 最小 S3 Get/条件 Put 边界，保留服务端 ETag |
| `paths.ts` | 平台标识、对象 key、公开 URL 与每轮唯一的 source/target/staged 路径 |
| `cleanup.ts` | 只清理指定 run 或其一次性构建工作区 |

## 权威数据与边界

| 数据 | Owner | 语义 |
|---|---|---|
| `refs/tags/v<version>` | 共享 Git remote | 不可移动的全局 `version → commit` 身份 |
| `refs/heads/release-ledger/<channel>` | 共享 Git remote | Stable/Beta 各自的并发 CAS frontier，不拥有版本身份 |
| 根 `CHANGELOG.md` | 仓库 | 所有渠道与平台共用的用户内容源 |
| R2 `CHANGELOG.md` | 发布模块 | 经契约校验的完整公开镜像 |
| 内容寻址 artifact | 发布模块 | `version × platform` 的不可变字节事实 |
| platform `release.json` | 发布模块 | commit、版本、平台、摘要、签名和下载引用的不可变记录 |
| platform `latest.json` | 发布模块 | 该 `channel × platform` 当前可安装的最高版本 |

发布脚本只复用 `src/features/changelog/contract.ts` 的纯解析与 SemVer 契约。Changelog/UI/update 模块不得反向依赖发布脚本，发布脚本也不得读取前端状态决定版本或平台可用性。

## 不变式

1. 同一渠道内，一个版本只绑定一个 commit；同一 commit 只绑定一个版本。
2. 版本序列跨平台共享，平台 Pointer 可停在不同版本，也可跳过中间版本。
3. 新 claim 必须包含渠道 ledger 的旧 frontier；Tag 与 ledger 只能一次 atomic、exact-lease push，不顺序降级。
4. 新 claim 的 Changelog 必须覆盖全部 schema-1 Tag，并在 claim 前只读证明不会删除远端版本或改变已撤回状态；旧版本 `reuse` 不得用旧 checkout 覆盖远端历史。
5. 捕获的精确签名字节必须能用应用内置公钥验证精确产物；新建和既有 record 的恢复路径都必须在 Pointer 前验签。
6. artifact 和 platform record 只能创建或验证相同内容，不能覆盖；record 在全部引用产物可公开验证后才写入。
7. Pointer 只在 record、Changelog 和公开读取验证完成后推进，只能向更高 SemVer 前进。
8. 签名保存在 record 与 Pointer payload 中；R2 不发布独立 `.sig` sidecar。
9. 发布元数据与构建 source 都必须来自 `releaseCommit`；release Git 子进程不执行继承 hooks 或危险环境，构建不继承外部 filter/config/`TAURI_CONFIG`，依赖、Cargo target 和 staged 输出不得复用可编辑 checkout 或其它 run。
10. 旧全局 allocator、共享 platform map、版本级全局 manifest 与可变下载别名不属于活动协议，不保留兼容读写。

完整流程与恢复规则见 [DESIGN.md](./DESIGN.md)。
