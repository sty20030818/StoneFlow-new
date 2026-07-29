# 更新记录与 Changelog - Tasks

> 需求与验收以 [SPEC.md](SPEC.md) 为准，技术设计以 [PLAN.md](PLAN.md) 为准。本文件只记录可执行任务、状态、阻塞和实施偏差。

## 当前阶段

阶段 5：实现与验证收尾。

## 阶段任务

### Phase 1：内容源与发布链

- [x] **T1.1 版本内容格式与校验**
  模块：根 `CHANGELOG.md`、`scripts/release/`。
  依赖：无。
  对应：AC-1、AC-3。
  验证：版本标题的有效、重复和无目标版本条目测试。

- [x] **T1.2 独立静态文件发布与 manifest 收口**
  模块：`scripts/release/`、release 测试与 mock。
  依赖：T1.1。
  对应：AC-1、AC-2、AC-3。
  验证：上传列表和顺序测试；生成的 `latest.json` 不含 `notes`。

阶段出口：两个渠道的本地发布预览满足 AC-1 至 AC-3，且不产生远端副作用。

### Phase 2：Changelog 内容模块

- [x] **T2.1 本地快照与版本 Markdown 解析**
  模块：新增 `src/features/changelog/`、打包资源读取边界。
  依赖：T1.1。
  对应：AC-3、AC-7。
  验证：版本标题有效/重复/无条目、轻量 Markdown 块和本地快照读取测试。

- [x] **T2.2 远端读取与本地回退**
  模块：`src/features/changelog/`、Tauri 远端静态文件读取边界。
  依赖：T2.1。
  对应：AC-7。
  验证：远端优先、远端失败回退本地、远端与本地均失败返回空记录测试。

- [x] **T2.3 渠道过滤与目标版本定位**
  模块：`src/features/changelog/`。
  依赖：T2.1、T2.2。
  对应：AC-4、AC-5、AC-6。
  验证：Stable / Beta 版本集合、倒序、目标版本定位和空状态测试。

阶段出口：内容模块不依赖下载状态，能独立返回用户渠道和目标版本所需的记录。

### Phase 3：头像菜单与更新记录弹窗

- [x] **T3.1 菜单 open intent 与 overlay 装配**
  模块：`UserAppMenu`、header shell、`ShellOverlays`。
  依赖：T2.3。
  对应：AC-4、AC-5。
  验证：头像菜单触发、弹窗可关闭、无路由和无命令注册的组件测试。

- [x] **T3.2 宽版记录弹窗与可访问性**
  模块：`src/features/changelog/`、共享 Dialog / ScrollArea。
  依赖：T3.1。
  对应：AC-4、AC-5、AC-7。
  验证：滚动、焦点、空状态、渠道展示和版本定位手动验证。

阶段出口：头像菜单可打开与关闭更新记录，内容与当前更新渠道一致。

### Phase 4：更新弹窗与一次性重启 Toast

- [x] **T4.1 目标版本说明接线**
  模块：`src/features/update/`、`src/features/changelog/`。
  依赖：T2.3。
  对应：AC-2、AC-6、AC-7。
  验证：有内容、无内容、远端失败时，更新下载与操作均保持可用。

- [x] **T4.2 待确认版本与成功 Toast**
  模块：update application/runtime、update store、Toast 与 overlay intent。
  依赖：T3.2、T4.1。
  对应：AC-8、AC-9。
  验证：版本匹配后仅一次显示、定位操作、首次安装与手动安装不显示的状态测试。

阶段出口：更新前说明、更新后确认和既有下载状态机共同满足 AC-6 至 AC-9。

### Phase 5：文档与验证收尾

- [x] **T5.1 长期文档同步**
  模块：`scripts/release/README.md`、`scripts/release/HOWTO.md`、update architecture 文档、新 changelog 模块文档。
  依赖：T1 至 T4。
  对应：Definition of Done。
  验证：不再出现 `RELEASE_NOTES.md` 作为内容源；文档链接与 Owner 一致。

- [x] **T5.2 质量检查与行为核对**
  模块：受影响 TS / Rust workspace。
  依赖：T5.1。
  对应：全部 AC 与 Definition of Done。
  验证：定向测试、`bun typecheck`、`bun lint`、`bun format:check`、受影响 Rust 检查，以及完整手动场景清单。

阶段出口：逐条勾选 AC-1 至 AC-9 和 DoD；所有未解决事项转入明确后续任务后方可归档。

## 阻塞

无。真实 R2 上传、缓存头策略与跨平台安装验证需要在实现完成后取得单独发布授权。

## 与 SPEC/PLAN 的实施偏差

本地验证已完成；真实 R2 发布、远端缓存头与跨平台安装重启需要单独发布授权后验证。

## 完成记录

内容读取使用 Tauri 更新边界的原生 HTTP 请求加构建时快照回退，避免桌面 WebView 的跨域限制；前端不直接请求网络。
