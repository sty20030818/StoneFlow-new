# 头像菜单更新检查与关于窗口 - Plan

## 方案结论

采用“更新域唯一主动检查 Hook + `app-info` 独立 feature + shell overlay 装配”的结构。

`features/update` 继续是更新检查、下载、安装与状态机的唯一所有者；`features/changelog` 继续只拥有更新内容；新增的 `features/app-info` 只拥有运行时应用信息、关于窗口及外部链接配置。关于窗口不是路由页，也不属于 update feature。

## 备选方案与取舍

| 选择 | 结论 | 原因 | 放弃什么 |
|---|---|---|---|
| 菜单和设置页各自 `invoke('check_update')` | 放弃 | 会复制状态迁移、提示与并发控制，入口越多越容易失真 | 表面上少一次 Hook 抽取 |
| 将全部 `useUpdateActions` 作为公共面暴露 | 放弃 | 下载、取消、重启是更新 Dialog 私有动作；只公开主动检查能保持最小契约 | 单一泛化 actions API |
| `useManualUpdateCheck` 作为更新域唯一公共动作 | 采用 | 菜单、设置页和关于窗口有真实复用者；检查中状态来自现有 store | 新增一个窄 public Hook |
| “关于”作为设置路由或主导航页面 | 放弃 | 静态低频信息不应打断当前工作或占据导航层级 | URL 深链与浏览器历史 |
| “关于”放入 `features/update` | 放弃 | 应用版本和外部资料不是更新状态；会延续 `AppVersionFooterItem` 的错误归属 | 少建一个小 feature |
| 新建 `features/app-info` | 采用 | 版本、关于窗口和集中链接配置同属应用元信息，且有页脚与 overlay 两类消费者 | 一个小而明确的 feature |
| 全局 AppInfo Provider / Query 缓存 | 放弃 | 运行时版本读取成本极低、数据不变且仅两个消费者；Provider 或 Query 会增加无收益的生命周期管理 | 进程内强制去重 |
| 伪造链接地址或让占位点击后跳转 | 放弃 | 会误导用户并扩大安全边界 | 提前演示真实跳转 |
| `null` 集中链接配置 + 禁用占位 UI | 采用 | 后续补 URL 只改一处，不会执行无效网络或系统调用 | 未配置时不能跳转 |

## 模块边界

### `src/features/update/`

拆分当前 `useUpdateEvents.ts` 中混合的职责：

- `useUpdateEvents`：仅监听 `update-phase`、恢复后端会话、消费更新完成确认。
- `useManualUpdateCheck`：仅负责用户主动检查、检查中防重、更新 store、成功 Toast 与发现新版后的既有 Dialog 打开。
- Dialog 私有安装动作：下载、取消、重启继续留在 update 内部 Hook，不纳入公共入口。

`UpdateSettingsSection`、头像菜单和关于 Dialog 只能使用 `useManualUpdateCheck`，组件中不得直接调用 `checkUpdate` 或直接写 update store。

### `src/features/app-info/`

目录保持最小：

```text
src/features/app-info/
  ARCHITECTURE.md
  index.ts
  api/appInfo.ts
  hooks/useAppVersion.ts
  model/appInfoLinks.ts
  components/AppVersionFooterItem.tsx
  components/AboutDialog.tsx
```

- `api/appInfo.ts`：唯一调用 Tauri 应用版本 API 的 IO 边界。
- `hooks/useAppVersion.ts`：处理加载与读取失败，不伪造默认版本。
- `model/appInfoLinks.ts`：四个链接的唯一配置点；当前值均为 `null`。
- `components/`：只组合展示和传入的用户动作；不直接调用 updater API。
- `index.ts`：只导出 `AboutDialog`、`AppVersionFooterItem` 与真实外部消费者需要的窄类型或配置入口。

现有 `features/update/components/AppVersionFooterItem.tsx` 迁入后立即删除旧文件与旧 export，不保留转发兼容层。

### Shell 与菜单

`UserAppMenu` 自身消费 update feature 的公开主动检查 Hook，并把“关于”作为 shell open intent 向上交给 header。`ShellLayoutContent` 持有关于窗口的瞬时 open state，`ShellOverlays` 是 `AboutDialog` 的唯一挂载点；这与既有更新记录 intent 的职责一致。

不为关于窗口建立全局 store，也不让 `app-info` 反向依赖 `layout`。

## 关键数据流

### 手动检查更新

```text
头像菜单 / 设置页 / 关于窗口
  -> useManualUpdateCheck.checkNow()
  -> 先将 update store 置为 checking，拒绝重复触发
  -> getUpdateSettings() + checkUpdate(true)
  -> 有新版：showAvailable(..., { openDialog: true }) -> 既有 UpdateDialog
  -> 无新版：setUpToDate() -> 既有成功 Toast
  -> 失败：setError() -> 错误 Toast
```

检查状态只从 update store 派生。Hook 不维护第二份 `checking` 局部 state，避免菜单、设置页和关于窗口不同步。

### 关于窗口与版本信息

```text
头像菜单“关于 StoneFlow”
  -> ShellLayoutContent about open intent
  -> ShellOverlays 挂载 AboutDialog
  -> useAppVersion() -> Tauri app version API
  -> 成功：展示 v<version>
  -> 失败或浏览器预览：展示“版本信息暂不可用”

AboutDialog
  -> “检查更新” -> useManualUpdateCheck
  -> “查看更新记录” -> shell changelog intent
  -> 外部链接配置为 null -> 禁用占位，不调用 opener
```

版本读取不使用 Provider、全局 mutable cache 或 Query。它是低频、常量、低成本的本机元信息；只用统一 API 与 Hook 去除复制的读取和降级逻辑。

## 外部链接占位契约

`appInfoLinks` 固定包含以下键：`website`、`feedback`、`privacyPolicy`、`license`。当前均为 `null`。

- UI 统一展示“待配置”语义，不使用实际 URL，也不使用 `#`。
- 配置为 `null` 的项必须带禁用语义，点击、键盘激活和快捷键均不得调用 `openUrl`。
- 后续仅可配置经产品确认的 HTTPS URL；实际打开操作复用现有 `@tauri-apps/plugin-opener` 边界，不新增 shell 或 HTTP 插件权限。

## Tauri 更新安全边界

当前 `tauri.conf.json` 含 `dangerousInsecureTransportProtocol: true`，尽管 runtime adapter 已在 release 拒绝 HTTP，这仍不应留在生产配置中。

实现前先按项目当前 Tauri 2.11.x 与官方配置合并机制确认开发专用 config 的加载方式，然后：

- 正式配置移除该开关，只保留 HTTPS endpoint 与签名公钥。
- 开发 Mock 配置单独启用该开关，并只由 `tauri dev` 路径加载。
- 保留 runtime adapter 的 release HTTP 拒绝逻辑，作为第二层防线，而不是替代配置隔离。

此调整不改 updater IPC、权限或发布端点协议。

## 视觉与交互

关于窗口沿用当前紧凑 Dialog、语义 token、Lucide outline 图标和系统字体，不引入第二套样式或动画库。应用图标和等宽版本号是唯一视觉焦点；内容按“产品身份、版本、操作、资料入口”排序。

关闭、更新记录、检查更新与每个资料入口都具备清晰文本、键盘焦点和禁用反馈。检查中只做必要的文字与禁用状态变化，不添加高频动画；尊重现有 reduced-motion 约束。

## 风险与恢复

| 风险 | 处理 |
|---|---|
| 多入口同时触发检查 | 在发起异步请求前同步进入 `checking`；所有入口读取同一 store 相位 |
| 更新事件与手动检查交错 | 沿用现有 update phase 单轨；新 Hook 不创建并行状态机 |
| 关于窗口在浏览器测试环境无法读版本 | 以明确不可用状态降级；组件测试 mock app-info API |
| 占位链接误触发外部程序 | `null` 配置走 disabled 分支，测试断言 opener 从未调用 |
| HTTP 开关配置拆分失效 | 针对 dev/release config 写配置验证；保留 runtime release HTTP 拒绝 |
| 版本组件迁移留下旧 public 面 | 完成后删除旧文件、export 和所有旧引用，运行 boundary 检查 |

## 需要同步的长期文档

- `src/features/update/ARCHITECTURE.md`：更新为事件、主动检查和安装动作分离；删除版本组件归属。
- 新增 `src/features/app-info/ARCHITECTURE.md`：记录其职责、不负责项、public 与 shell 装配点。
- `scripts/release/HOWTO.md`：仅在 Tauri config 加载命令或 Mock 使用方式变化时，同步开发/生产 HTTP 边界。
