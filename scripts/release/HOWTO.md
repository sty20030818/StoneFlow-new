# StoneFlow 应用内更新系统：开发·测试·发布指南

## 一、日常开发

更新相关代码在日常开发中不需要特殊处理，正常 `bun tauri dev` 即可。

### 代码结构

```
src-tauri/crates/
├── domain/src/update.rs          # 领域模型（纯数据结构，无 I/O）
├── usecase/src/update.rs         # 业务编排（检查逻辑、节流、跳过版本）
└── runtime/src/
    ├── services/
    │   ├── update_adapter.rs     # Tauri updater 适配
    │   ├── update_settings_store.rs  # 设置持久化
    │   └── update_service.rs     # 服务组装
    ├── commands/update.rs        # IPC 命令（7个）
    └── bootstrap.rs              # 自动检查调度

src/features/update/
├── api/updates.ts                # Tauri invoke 封装 + TS 类型
├── model/
│   ├── useUpdateStore.ts         # Zustand 状态管理
│   └── useUpdateEvents.ts        # 事件监听 hook + actions
├── ui/
│   ├── UpdateDialog.tsx          # 更新弹窗
│   └── UpdateSettingsSection.tsx # 设置页区块
└── index.ts                      # 统一导出
```

### 修改更新相关代码时的注意事项

- Rust 端枚举和结构体用了 `#[serde(rename_all = "camelCase")]`，TS 端必须对应 camelCase
- `UpdateStatus` 是 internally tagged enum（tag 字段为 `status`），两端变体名必须一致
- 修改领域模型（domain 层）不影响 Tauri/网络，最安全
- 修改 IPC 命令时必须同步修改 TS 端的类型定义
- 自动检查间隔常量：`AUTO_CHECK_INTERVAL_SECS`（6小时）、`STARTUP_CHECK_DELAY_SECS`（3秒）

---

## 二、测试更新流程

**重要前提**：Tauri updater 在 `tauri dev` 模式下**不会真正执行下载和安装**（因为开发环境没有签名的安装包），但检查更新和弹窗 UI 是可以测试的。

### 方式 A：快速测试弹窗 UI（不需要构建）

用本地 mock 服务器模拟远端返回新版本，测试弹窗、设置页交互：

1. 启动 mock 服务器：
   ```bash
   bun run mock:updates
   # 或测试 beta 渠道：
   # bun run mock:updates:beta
   ```

2. 临时修改 `src-tauri/tauri.conf.json` 的 endpoints 指向本地：
   ```json
   "endpoints": [
     "http://localhost:1420/stoneflow/updates/stable/latest.json",
     "http://localhost:1420/stoneflow/updates/beta/latest.json"
   ]
   ```

3. 启动开发模式：
   ```bash
   bun tauri dev
   ```

4. 打开设置页 → 应用更新 → 点击「检查更新」，即可看到弹窗。

5. **测试完后记得把 endpoints 改回正式地址！**

你可以测试的内容：
- 弹窗展示、更新说明显示
- 4 种检查模式切换
- 稳定版/测试版渠道切换
- 跳过此版本
- 手动检查更新按钮
- 下载进度条（mock 数据）
- 错误状态展示

### 方式 B：完整端到端测试（需要构建）

要测试真实的下载和安装流程，必须构建 release 版本：

1. 先把当前版本号改小（比如从 `0.1.0` 改成 `0.0.9`），构建并安装"旧版本"
2. 正常发布一个新版本到 R2（版本号高于旧版本）
3. 运行安装的旧版本，应该能检测到更新
4. 点击"立即更新"，观察下载、安装、重启全流程

**更简单的端到端测试方式**：不需要真的上传 R2，你可以：
1. 本地构建一个 release 包（版本号 0.0.9），安装它
2. 修改版本号到 0.1.0，再构建一次
3. 用 mock 服务器（mock-server.ts），但把 mock 版本设为 0.1.0，并且把 bundles 目录的真实安装包路径映射进去
4. 运行安装的 0.0.9 版本，修改 endpoints 指向本地 mock 服务器，测试完整流程

---

## 三、发布新版本

### 第一次发布前：生成密钥

如果你已经生成过密钥并填好了 pubkey，跳过这步。

```bash
bun run release:keygen
```

- 私钥保存在 `~/.tauri/stoneflow.key`（**不要提交到 git，不要泄露**）
- 终端输出的公钥复制到 `src-tauri/tauri.conf.json` 的 `plugins.updater.pubkey`

### 配置环境变量

复制 `.env.example` 为 `.env.local`（`.env.local` 已在 gitignore 中）：

```bash
cp .env.example .env.local
```

填入以下内容：
- `TAURI_SIGNING_PRIVATE_KEY`：私钥文件路径，推荐绝对路径；脚本也兼容 `~/.tauri/stoneflow.key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`：生成密钥时设置的密码
- `R2_ACCOUNT_ID`：Cloudflare Account ID（在 R2 概览页能找到）
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`：在 Cloudflare "我的个人资料" → "API 令牌" → "R2 存储令牌" 创建
- `R2_BUCKET_NAME`：你的 R2 bucket 名称

### 发布稳定版

1. 确保代码已提交，版本号正确（`src-tauri/tauri.conf.json` 和 `package.json` 的 version 一致）
2. 在项目根目录写 `RELEASE_NOTES.md`（可选，作为更新说明）
3. 运行：
   ```bash
   bun run release:stable
   ```

脚本会自动：
- 执行 `tauri build`（带签名）
- 收集 updater 产物（macOS 为 `.app.tar.gz`，Linux 为 `.AppImage.tar.gz`，Windows 为 `.msi.zip`）和对应 `.sig` 签名文件
- 额外收集 macOS `.dmg` 到 `downloads/<channel>/`，用于用户手动下载安装
- 读取 RELEASE_NOTES.md 作为更新说明
- 生成符合 Tauri updater 格式的 `latest.json`
- 上传 updater 文件到 R2 的 `stoneflow/updates/stable/` 目录，上传下载包到 `stoneflow/downloads/stable/` 目录
- 上传完成后输出更新地址

### 发布测试版（Beta）

测试版发布流程相同，只是命令不同：

```bash
bun run release:beta
```

文件会上传到 `stoneflow/updates/beta/` 目录。

**注意**：Beta 版本号建议带预发布后缀，比如 `0.2.0-beta.1`。Stable 渠道的版本比较器会自动过滤掉预发布版本，用户在设置里切换到 Beta 渠道才能收到。

### 仅构建不上传（验证用）

如果只想在本地验证构建产物，不上传：

```bash
bun run release:stable -- --no-upload
```

产物会保存在 `.release-tmp/` 目录。

### 手动上传（CI/CD 或不想配 R2 密钥）

如果不想配置 R2 API 密钥，或者用 CI/CD 发布：

1. 运行 `bun run release:stable -- --no-upload`
2. 手动把 `.release-tmp/updates/` 上传到 R2 的 `stoneflow/updates/stable/`
3. 手动把 `.release-tmp/downloads/` 上传到 R2 的 `stoneflow/downloads/stable/`
4. 或者用 wrangler CLI：
   ```bash
   npx wrangler r2 object put your-bucket-name/stoneflow/updates/stable/latest.json --file .release-tmp/updates/latest.json
   # 其他文件同理
   ```

---

## 四、R2 存储结构

发布后 R2 中的文件结构：

```
stoneflow/
├── updates/
│   ├── stable/
│   │   ├── latest.json                         # 更新清单（Cache-Control: no-cache）
│   │   ├── StoneFlow_0.1.0_aarch64.app.tar.gz  # macOS updater 包
│   │   ├── StoneFlow_0.1.0_aarch64.app.tar.gz.sig
│   │   ├── StoneFlow_0.1.0_x64.AppImage.tar.gz # Linux
│   │   ├── StoneFlow_0.1.0_x64.AppImage.tar.gz.sig
│   │   ├── StoneFlow_0.1.0_x64_en-US.msi.zip   # Windows
│   │   └── StoneFlow_0.1.0_x64_en-US.msi.zip.sig
│   └── beta/
│       ├── latest.json
│       └── ...（同上）
└── downloads/
    ├── stable/
    │   ├── StoneFlow_0.1.0_aarch64.dmg          # 用户手动下载安装包
    │   └── latest-macos-aarch64.dmg             # 下载页稳定别名
    └── beta/
        └── ...
```

Cloudflare R2 公共访问配置（你已经配好了）：
- 自定义域：`release.sty20030818.space`
- 绑定到 bucket 下的 `stoneflow/` 前缀
- 公开访问已开启

---

## 五、版本号规范

- **正式版**：语义化版本，如 `0.1.0`、`0.2.0`、`1.0.0`
- **测试版**：在正式版本号后加 `-beta.N`，如 `0.2.0-beta.1`、`0.2.0-beta.2`

版本比较规则：
- Stable 渠道：只接收无预发布后缀的版本
- Beta 渠道：接收所有版本（包括带 `-beta` 后缀的）
- 远端版本号 > 本地版本号时才提示更新

---

## 六、常见问题

### Q: 用户收不到更新？
1. 检查 `latest.json` 是否正确上传，访问 `https://release.sty20030818.space/stoneflow/updates/stable/latest.json` 能否正常返回
2. 检查 `latest.json` 里的 version 是否确实高于用户当前版本
3. 检查用户设置的更新渠道（stable 收不到 beta）
4. 检查用户是否跳过了该版本
5. 检查自动检查节流（6小时内不重复检查，手动检查不受限）

### Q: 签名验证失败？
- 确认 `tauri.conf.json` 里的 pubkey 和生成密钥对时的公钥一致
- 确认构建时使用了正确的私钥（`TAURI_SIGNING_PRIVATE_KEY` 环境变量）
- 确认 .sig 文件和安装包是同一次构建生成的

### Q: 开发模式下为什么不弹窗？
- `tauri dev` 模式下 updater 会检查版本，但本地开发版本号通常和远端相同，不会弹窗
- 用 mock 服务器返回一个高版本号（如 99.0.0）就能触发弹窗
- 真正的下载安装必须在 release 构建的包中测试

### Q: 如何撤销一个坏版本？
- 把 R2 上的 `latest.json` 回退到上一个版本的内容即可
- 已下载但未重启的用户，重启后会安装当前 latest.json 指向的版本
- 已安装坏版本的用户会在下一次检查时收到好版本的更新（如果好版本号更高）
