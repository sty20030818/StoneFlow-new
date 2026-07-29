# 更新记录与 Changelog - Plan

## 方案结论

采用“根 `CHANGELOG.md` 为唯一人工源 + R2 单一静态副本 + 应用内资源快照回退”的模型。updater manifest 只负责版本、发布日期、平台下载 URL 与签名；更新内容完全脱离 `latest.json`。

应用新增独立 `features/changelog`。它读取、解析和筛选内容；`features/update` 只消费指定版本结果，不重新实现内容逻辑。更新记录以头像菜单打开的宽版 Dialog 呈现，不增加路由或命令。

## 备选方案与取舍

| 选择 | 结论 | 原因 | 放弃什么 |
|---|---|---|---|
| 将 notes 保留在 updater manifest | 放弃 | 安装协议与产品内容职责不同，manifest 只能表达最新版本，无法支撑历史 | 少一次独立静态读取 |
| 为每个版本发布 changelog JSON / Markdown | 放弃 | 多文件发布与索引维护没有实际收益 | 单版本按 URL 直接读取能力 |
| 单一远端 `CHANGELOG.md` | 采用 | 一份人工源、一份公开副本，历史与更新前读取都可用 | 客户端需轻量解析整份文件 |
| 独立路由 / 设置页 | 放弃 | 更新记录是低频信息，不值得占导航或设置层级 | 深链与浏览器历史 |
| 头像菜单的宽版 Dialog | 采用 | 复用现有快捷键帮助的低频帮助内容形态，打开后可滚动回看 | 大屏专用页面空间 |
| 完整 Markdown / HTML | 放弃 | 只需要标题、列表、加粗和图标，完整渲染会增加依赖与安全边界 | 富文本、链接和媒体 |
| Git 自动生成发布说明 | 放弃 | Git 提交不等于用户价值 | 自动化初稿 |

## 内容与发布数据流

```text
人工或 AI 起草并确认根 CHANGELOG.md
  -> 发布脚本校验版本标题
  -> 上传 R2 stoneflow/CHANGELOG.md
  -> 上传 artifacts 与 release manifest
  -> 最后覆盖 updates/<channel>/latest.json

客户端发现新版本
  -> changelog 模块读远端静态文件
  -> 失败时读打包快照
  -> 按目标版本取条目
  -> UpdateDialog 选择性渲染
```

R2 路径由现有 `R2_PUBLIC_URL` 推导，不在多个前端组件散落硬编码地址。静态文档上传必须先于可变 `latest.json`，并为文档配置与发布频率匹配的缓存策略，避免客户端先看到版本却读不到内容。

## 内容格式与解析契约

唯一人工文件使用：

```md
# StoneFlow 更新记录

## [0.2.0-beta.3] - 2026-07-29

### ⚡ 优化
- 提升后台同步失败后的恢复体验
```

- `## [version] - YYYY-MM-DD` 是条目边界；版本号必须符合当前 release 支持的 SemVer / beta 形式。
- `###` 以下内容不做分类枚举，保留用户撰写的分类标题和图标。
- 只渲染标题、段落、列表和加粗；不解析 HTML 或链接。
- 没有版本标题代表该版本没有用户 changelog，不能阻断发布。
- Stable 过滤掉预发布版本；Beta 保留全部版本。排序以解析后的版本比较为准，不按文件偶然顺序猜测。

## 模块边界

### `scripts/release/`

负责校验、临时工作区生成和上传顺序。它不解析或渲染用户界面，不把 changelog 再写回 updater manifest。

### `src/features/changelog/`

负责内容读取、进程内缓存、轻量解析、版本定位、渠道过滤和 `ChangelogDialog`。它不拥有下载、更新渠道设置或安装状态。

### `src/features/update/`

继续拥有更新检查、下载、跳过、重启和会话状态。它通过 changelog 模块取得目标版本说明；内容失败降级为无说明，不能改变更新相位或错误语义。

### Shell 与 Tauri 边界

头像菜单只发出打开意图；shell/header 持有 open state，`ShellOverlays` 装配 Dialog。远端静态读取和打包资源读取走同一 Tauri 边界，集中处理 URL、超时和本地回退，前端不直接散落网络实现。

## 重启成功确认状态机

```text
ready(version)
  -> 用户点击“立即重启”
  -> 持久化 pendingRestartVersion = version
  -> updater 重启安装
  -> 新进程启动
  -> currentVersion === pendingRestartVersion ? 显示一次 Toast 并清除 : 清除且不提示
```

Toast 的“查看更新内容”只发出 Dialog 打开与版本定位意图。它不会重新检查更新，也不会把手动安装误判为应用内更新。

## 风险与恢复

| 风险 | 处理 |
|---|---|
| R2 内容缓存晚于 `latest.json` | 固定发布顺序；内容读取失败时不阻断更新并回退本地快照 |
| 标题格式错误或版本重复 | 发布前校验；错误时阻止发布静态内容与 latest 指针更新 |
| 远端不可用或 CSP/资源路径异常 | 统一 Tauri 读取边界；本地快照回退；最终返回空记录 |
| Toast 重复或错报 | 待确认版本一次性消费且与当前安装版本严格匹配 |
| 内容模块侵入 update 状态机 | changelog 模块只返回内容结果；update 只消费，不共享可变状态 |

## 需要同步的长期文档

- `src/features/update/ARCHITECTURE.md`：移除 updater notes 依赖，记录 update 与 changelog 的单向协作。
- `src/features/changelog/README.md`：新增模块公开入口与最小使用说明。
- 依据最终实现复杂度决定 `src/features/changelog/ARCHITECTURE.md` 与 `DESIGN.md`；资源读取、回退和重启状态机若稳定成型，应记录不变式与流程。
- `scripts/release/README.md`、`scripts/release/HOWTO.md`：改为维护和发布根 `CHANGELOG.md`，删除 `RELEASE_NOTES.md` 引导。
- 若 R2 静态资源发布成为全局机制，更新 `Documents/01-架构/A2-系统设计.md`。
