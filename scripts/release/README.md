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
# 私钥路径，推荐绝对路径；脚本也兼容 ~/.tauri/stoneflow.key
TAURI_SIGNING_PRIVATE_KEY=/Users/your-name/.tauri/stoneflow.key

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
├── updates/
│   ├── stable/
│   │   ├── darwin-aarch64/
│   │   │   ├── latest.json                # 当前平台 updater 清单
│   │   │   ├── latest.meta.json           # 发布脚本元数据（commit / channel / platform）
│   │   │   └── 0.1.0/
│   │   │       ├── StoneFlow_0.1.0_aarch64.app.tar.gz
│   │   │       └── StoneFlow_0.1.0_aarch64.app.tar.gz.sig
│   │   └── windows-x86_64/
│   │       ├── latest.json
│   │       ├── latest.meta.json
│   │       └── 0.1.0/
│   │           ├── StoneFlow_0.1.0_x64-setup.exe
│   │           └── StoneFlow_0.1.0_x64-setup.exe.sig
│   └── beta/
│       └── ...
└── downloads/
    ├── stable/
    │   ├── darwin-aarch64/
    │   │   ├── latest.dmg
    │   │   └── 0.1.0/
    │   │       └── StoneFlow_0.1.0_aarch64.dmg
    │   └── windows-x86_64/
    │       ├── latest-setup.exe
    │       └── 0.1.0/
    │           └── StoneFlow_0.1.0_x64-setup.exe
    └── beta/
        └── ...
```

## 4. 发布命令

```bash
# 发布稳定版
bun run release

# 发布测试版
bun run release:beta

# 仅构建不 upload（本地验证）
bun run release -- --no-upload
```

### 产物安全（防「版本新、包旧」）

脚本默认执行：

1. 构建前清空 `bundle/{nsis,msi,dmg,macos,appimage}` 历史产物  
2. 按本次 `VERSION` 精确匹配安装包文件名，不取目录第一个文件  
3. 要求 `.sig` 与产物同路径配对  
4. 上传前校验 `latest.json` 的 version / URL / 文件名与上传列表一致  

任一校验失败会中止上传。发布后请确认 `latest.json` 里的 url 文件名含正确版本号。

## 5. latest.json 格式

Tauri updater 期望的 JSON 格式：

```json
{
  "version": "0.1.0",
  "notes": "更新说明...",
  "pub_date": "2024-01-01T00:00:00Z",
  "platforms": {
    "darwin-aarch64": {
      "signature": "base64-signature",
      "url": "https://release.sty20030818.space/stoneflow/updates/stable/darwin-aarch64/0.1.0/StoneFlow_0.1.0_aarch64.app.tar.gz"
    }
  }
}
```

StoneFlow 采用平台级 `latest.json`，远端目录名与 `latest.json.platforms` key 统一使用 Tauri updater 官方平台 key，例如 Windows x64 为 `windows-x86_64`。macOS 和 Windows 可以分别发布不同版本，互不覆盖。Beta 发布会读取同平台的 `latest.meta.json`：当前 git commit 相同则复用 beta 版本，不同则递增 `-beta.N`。

Windows Beta 只构建 NSIS `.exe`。MSI 不支持 `0.1.1-beta.1` 这类带 `beta` 文本的预发布版本号。
