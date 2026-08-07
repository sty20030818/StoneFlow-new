# release · 应用发布

发布入口会先从共享 Git remote 确认全局版本身份，再构建并发布当前平台。真实发布会验证已有版本身份，或原子创建新 Git Tag 并推进渠道 ledger，随后写入 R2；执行前必须确认目标环境与授权。

## 发布前准备

- 工作区必须完整、干净，`HEAD` 已提交且可从发布 remote 的公开分支或 Tag 到达。
- `package.json` 与 `src-tauri/tauri.conf.json` 使用相同的 Stable SemVer。
- 根 `CHANGELOG.md` 符合项目契约，并包含本次目标版本的非空条目。
- Tauri updater 公钥已写入 `src-tauri/tauri.conf.json`，签名私钥安全保存在仓库外。
- 真实发布配置以下环境变量：

```bash
TAURI_SIGNING_PRIVATE_KEY=/absolute/path/to/stoneflow.key
TAURI_SIGNING_PRIVATE_KEY_PASSWORD=your-password
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
# 可选；默认 https://release.sty20030818.space/stoneflow
R2_PUBLIC_URL=https://release.example.com/stoneflow
```

首次生成签名密钥：

```bash
bunx tauri signer generate -w ~/.tauri/stoneflow.key
```

私钥不得提交；丢失后，已安装客户端无法验证新密钥签出的更新。

## 命令

```bash
# Stable：发布配置文件中的版本
bun run release:stable

# Beta：由远端全局 Beta Tag 序列计算 beta.N
bun run release:beta

# 仅在本机完成预检、构建与产物收集
bun run release:stable -- --no-upload
bun run release:beta -- --no-upload
```

`--no-upload` 仍会只读访问共享 Git remote 以计算候选版本，但不会创建 Tag、推进 ledger 或访问 R2；本地产物保留在本轮唯一的 `.release-tmp/<run-id>/staged/`，命令结束时会打印精确路径。它不是手工上传方案，正式发布必须由主脚本保持条件写与 Pointer-last 顺序。

## 安全边界

- Stable 与 Beta 分别共享一条跨平台版本序列；macOS、Windows、Linux 只独立推进各自 Pointer。
- 已发布 Tag、产物和 platform record 不可覆盖；同版本 Pointer 只接受完全相同的 payload，Pointer 不允许回退。
- Windows Beta 只构建 NSIS，避免 MSI 不接受预发布版本文本。
- 构建只读取 `releaseCommit` 的临时 detached clone；Git hooks/危险环境和外部 `TAURI_CONFIG` 被隔离，依赖使用 frozen lockfile 安装，Cargo 与 staged 输出按 run 隔离。
- 新建 Tag 前只读校验远端 Changelog 历史与已撤回状态，已知冲突不会留下不可恢复的版本身份。
- 中文 Changelog 契约不兼容旧英文语法。如果 R2 仍是英文文档，下一次发布会在 claim 前 fail closed；必须另行授权一次 ETag CAS cutover，不得绕过检查或增加双语兼容。
- 每个 updater 产物都会用应用内置公钥验证将要发布的精确签名字节；密钥不匹配会在 Git/R2 写入前失败。
- 不移动或删除发布 Tag，不手工改 ledger、record 或 Pointer。坏版本通过更高版本修复。
- 生产 ruleset、legacy seed、R2 cutover、对象删除和生产 Pointer 变更都需要重新盘点实时状态并单独授权。

## 进一步阅读

- [ARCHITECTURE.md](./ARCHITECTURE.md)：Owner、模块边界与不变式
- [DESIGN.md](./DESIGN.md)：版本规划、发布顺序、并发与恢复协议
- [ADR-0001](../../Documents/01-架构/adr/ADR-0001-global-release-identity-and-platform-pointers.md)：全局版本身份与分平台可用性决策
