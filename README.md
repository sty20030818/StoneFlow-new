# StoneFlow

> 面向个人工作者的跨设备任务与轻量项目管理工具。

## 这是什么

StoneFlow 用于把想到或收到的事情快速转成可管理的任务，并在 Space、Project 和任务视图中持续推进。它是本地优先的桌面应用：离线时仍可工作，已配置的设备会在后台同步。

产品服务个人工作流，不提供团队成员、共享工作区、权限或实时协作。

## 快速开始

StoneFlow 使用私有依赖 HeroUI Pro。新开发机先通过官方 CLI 登录，凭据由 CLI 保存在仓库外；不要把 token 写入 `.env`、源码、lockfile 或日志。

```bash
bunx heroui-pro@latest login
bun install
bun run dev
```

CI 与正式发布使用专用 `HEROUI_AUTH_TOKEN`。发布脚本会在安装前检查凭据，只把它交给 frozen install，并在安装后从其余子进程环境移除；随后验证实际安装的包版本满足声明范围且必需入口可加载。不要把个人 token 用于自动化。

常用校验：

```bash
bun typecheck
bun lint
bun test:run
bun run test:release
```

Rust workspace 校验：

```bash
cargo check --manifest-path src-tauri/Cargo.toml --workspace
```

清理可再生依赖与构建输出：

```bash
bun clean
```

## 仓库结构

```text
src/          前端应用、路由与功能模块
src-tauri/    Tauri 桌面运行时与 Rust workspace
Documents/    产品、架构、任务与归档文档
scripts/      发布和维护脚本
```

## 文档入口

- [文档索引](./Documents/_INDEX.md)
- [整体架构](./ARCHITECTURE.md)
- [产品内核](./Documents/00-产品/P1-产品内核.md)
- [产品蓝图](./Documents/00-产品/P2-产品蓝图.md)
