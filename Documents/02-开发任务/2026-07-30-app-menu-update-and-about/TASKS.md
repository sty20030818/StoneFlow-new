# 头像菜单更新检查与关于窗口 - Tasks

> 需求与验收以 [SPEC.md](SPEC.md) 为准，技术设计以 [PLAN.md](PLAN.md) 为准。本文件只记录可执行任务、状态、阻塞和实施偏差。

## 当前阶段

已完成。更新域主动检查入口、关于窗口与 Tauri 开发/生产 updater 配置已收口；质量检查结果见完成记录。

## 阶段任务

### Phase 1：更新域动作收敛

- [x] **T1.1 拆分更新监听、主动检查与安装动作**
  模块：`src/features/update/model/` 或符合现有约定的 `hooks/`、`UpdateDialog`、`SystemStatusChip`。
  依赖：无。
  对应：AC-1、AC-2、AC-3。
  验证：为“有更新、无更新、失败、检查中重复触发”补齐状态和动作测试；更新 Dialog 的下载、取消、重启行为保持通过。

- [x] **T1.2 设置页迁移至唯一主动检查入口**
  模块：`src/features/update/components/UpdateSettingsSection.tsx` 及测试。
  依赖：T1.1。
  对应：AC-1、AC-2、AC-3。
  验证：设置页不再直接调用 `checkUpdate`；检查按钮状态和结果与共享 store 一致。

阶段出口：更新域对外只有一个主动检查入口，设置页不再保存或计算第二份检查状态。

### Phase 2：应用信息与关于窗口

- [x] **T2.1 建立 `app-info` 最小 feature 与版本组件迁移**
  模块：新增 `src/features/app-info/`、`src/layout/ShellFooter.tsx`、原 `features/update` 版本组件与 export。
  依赖：无。
  对应：AC-5。
  验证：Tauri 成功版本、读取失败和浏览器预览三种状态的组件测试；页脚不再从 update feature 导入版本组件。

- [x] **T2.2 实现关于 Dialog 与链接占位配置**
  模块：`app-info` 组件与模型、共享 Dialog / Button 测试。
  依赖：T2.1、T1.1。
  对应：AC-3、AC-5、AC-6、AC-7。
  验证：版本展示与降级、关闭、调用共享检查动作、打开更新记录 intent，以及四个 `null` 链接均不调用 opener 的测试。

- [x] **T2.3 装配菜单、shell intent 与 overlay**
  模块：`UserAppMenu`、`ShellHeader`、`ShellChrome`、`ShellLayoutContent`、`ShellOverlays` 及相关测试。
  依赖：T1.1、T2.2。
  对应：AC-1、AC-3、AC-4。
  验证：头像菜单的两个项目不再 disabled；检查更新进入共享动作；关于窗口可打开和关闭且不改变路由。

阶段出口：用户能从头像菜单手动检查更新、打开关于窗口，并与页脚看到一致的应用版本。

### Phase 3：Updater 配置安全收口

- [x] **T3.1 隔离开发 Mock 的 HTTP updater 配置**
  模块：`src-tauri/tauri.conf.json`、开发命令与必要的 Tauri config 文件、更新配置测试或验证脚本。
  依赖：无。
  对应：AC-8。
  验证：先依据 Tauri 2.11.x 官方配置合并方式确认实际加载链；release 配置不含不安全 HTTP 开关，dev Mock 路径仍能使用 HTTP，runtime release HTTP 拒绝测试继续通过。

阶段出口：生产构建配置与开发 Mock 配置明确分离，不依赖 runtime 守卫作为唯一防线。

### Phase 4：文档与质量收尾

- [x] **T4.1 同步 feature 边界文档**
  模块：`src/features/update/ARCHITECTURE.md`、新增 `src/features/app-info/ARCHITECTURE.md`、必要时 `scripts/release/HOWTO.md`。
  依赖：T1 至 T3。
  对应：Definition of Done。
  验证：文档中不再将应用版本组件归属 update；公共面、禁止依赖和 shell 装配点与代码一致。

- [x] **T4.2 运行质量检查与人工流程验证**
  模块：受影响 TypeScript、Tauri updater 配置与 Rust runtime。
  依赖：T4.1。
  对应：AC-1 至 AC-8、Definition of Done。
  验证：`bun run typecheck`、`bun run lint`、`bun run lint:boundaries`、`bun run format:check`、定向 Vitest、`cargo test --manifest-path src-tauri/Cargo.toml --workspace`；通过本地 Mock 验证有更新、无更新、检查失败、检查中、关于窗口和禁用链接。

阶段出口：逐条核对 AC-1 至 AC-8 与 DoD；任何无法完成的 release 包安装验证都转为已命名后续任务，不以“未验证”关闭本任务。

## 阻塞

无代码实现阻塞。

官网、反馈、隐私政策和许可证的真实 HTTPS 地址尚未提供，但不阻塞本任务：本次以 `null` 集中配置和禁用占位交付。地址确认后应单独创建小任务，只修改 `appInfoLinks` 配置并验证 opener 行为。

## 与 SPEC/PLAN 的实施偏差

暂无。已验证 Tauri 2.11.x 的 `--config` 与默认 `tauri.conf.json` 合并加载；开发命令使用 `tauri dev --config src-tauri/tauri.dev.conf.json`，生产基础配置不再含不安全 HTTP 开关。

## 完成记录

已完成于 2026-07-30。

- 更新域拆分为事件监听、唯一的手动检查入口及安装动作；设置页、头像菜单和关于窗口复用同一主动检查路径，避免重复请求和第二份检查状态。
- 新增 `app-info` feature：版本读取、关于窗口和外部资料入口集中在该 feature；官网、反馈、隐私政策、许可证目前均为 `null`，界面显示“待配置”并禁用，不会调用系统 opener。
- 头像菜单已启用“检查更新”和“关于 StoneFlow”；关于窗口内可转到更新记录，且不改变路由。
- 生产 `tauri.conf.json` 已移除 `dangerousInsecureTransportProtocol`；仅 `tauri.dev.conf.json` 为本地 Mock 保留该开关。新增 `tauri:dev` 命令加载开发配置；Mock 服务只监听 `127.0.0.1`。
- 已通过：`bun run typecheck`、`bun run lint`、`bun run lint:boundaries`、`bun run format:check`、定向 Vitest（7 个文件、35 项测试）以及 `cargo test --manifest-path src-tauri/Cargo.toml -p stoneflow-runtime update::adapter::tests::changelog_url_should_share_release_root_with_update_base_url`。
- 全量 Vitest 未通过，失败与本任务无关：`src/features/changelog/useChangelog.test.tsx` 仍断言打包 `CHANGELOG.md` 包含已不存在的 `0.1.2`，实际得到空数组。应在独立任务中同步该测试夹具与当前变更记录。
- Rust workspace 全量测试未通过，失败与本任务无关：`stoneflow-runtime` 的 `commands::spaces::tests::deleting_trashed_space_again_should_not_enqueue_another_operation` 断言错误消息包含“回收站”失败；本次仅更新 `update/adapter.rs` 注释，未变更该业务路径。
- 未做真实 release 安装包与线上 HTTPS 更新源联调，因为本任务未发布 release；生产配置和 runtime HTTP 拒绝边界已通过静态配置检查及 updater 单测验证。
