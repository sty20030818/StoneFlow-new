# StoneFlow

> 面向个人工作者的跨设备任务与轻量项目管理工具。

## 这是什么

StoneFlow 用于把想到或收到的事情快速转成可管理的任务，并在 Space、Project 和任务视图中持续推进。它是本地优先的桌面应用：离线时仍可工作，已配置的设备会在后台同步。

产品服务个人工作流，不提供团队成员、共享工作区、权限或实时协作。

## 快速开始

```bash
bun install
bun run dev
```

常用校验：

```bash
bun typecheck
bun lint
bun test:run
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
