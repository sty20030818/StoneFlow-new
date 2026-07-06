# 应用更新发布指南

## 1. 生成签名密钥对

Tauri updater 使用 Ed25519 非对称签名验证更新包。首次发布前需要生成密钥对：

```bash
bunx tauri signer generate -w ~/.tauri/stoneflow.key
```

这会生成两个文件：
- `~/.tauri/stoneflow.key` - 私钥，**必须保密**，不要提交到 git
- 终端会输出公钥，复制到 `src-tauri/tauri.conf.json` 的 `plugins.updater.pubkey` 字段

**重要**：私钥丢失后无法再发布能被旧版本识别的更新，请妥善备份。

## 2. 环境变量

发布脚本需要以下环境变量（可以放在 `.env.local` 或 CI secrets 中）：

```bash
# 私钥密码（生成密钥时设置的）
TAURI_SIGNING_PRIVATE_KEY_PASSWORD=your-password
# 私钥路径
TAURI_SIGNING_PRIVATE_KEY_PATH=~/.tauri/stoneflow.key

# Cloudflare R2 配置（用于上传）
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://release.sty20030818.space/stoneflow
```

## 3. R2 存储结构

发布到 R2 后的目录结构：

```
stoneflow/
└── updates/
    ├── stable/
    │   ├── latest.json          # 稳定版更新清单
    │   ├── StoneFlow_0.1.0_x64.dmg
    │   ├── StoneFlow_0.1.0_x64.AppImage.tar.gz
    │   └── StoneFlow_0.1.0_x64_en-US.msi.zip
    └── beta/
        ├── latest.json          # 测试版更新清单
        └── ...
```

## 4. 发布命令

```bash
# 发布稳定版
bun run release:stable

# 发布测试版
bun run release:beta

# 仅构建不 upload（本地验证）
bun run release:stable --no-upload
```

## 5. latest.json 格式

Tauri updater 期望的 JSON 格式：

```json
{
  "version": "0.1.0",
  "notes": "更新说明...",
  "pub_date": "2024-01-01T00:00:00Z",
  "platforms": {
    "darwin-x86_64": {
      "signature": "base64-signature",
      "url": "https://release.sty20030818.space/stoneflow/updates/stable/StoneFlow_0.1.0_x64.dmg"
    },
    "darwin-aarch64": {
      "signature": "base64-signature",
      "url": "https://release.sty20030818.space/stoneflow/updates/stable/StoneFlow_0.1.0_aarch64.dmg"
    },
    "linux-x86_64": {
      "signature": "base64-signature",
      "url": "https://release.sty20030818.space/stoneflow/updates/stable/StoneFlow_0.1.0_x64.AppImage.tar.gz"
    },
    "windows-x86_64": {
      "signature": "base64-signature",
      "url": "https://release.sty20030818.space/stoneflow/updates/stable/StoneFlow_0.1.0_x64_en-US.msi.zip"
    }
  }
}
```
