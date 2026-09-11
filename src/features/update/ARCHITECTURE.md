# update · 应用更新

> 描述 `src/features/update` 当前稳定边界。更新生命周期由后端会话负责，前端模块只投影快照并提供用户操作。
> 最后更新：2026-09-09

## 职责

update 负责：

- 封装更新设置、检查、下载、取消和安装的 Tauri IPC。
- 订阅唯一的更新会话事件，并在前端恢复当前会话。
- 保存对话框开关、手动检查中、无更新提示和就绪提示隐藏状态等局部交互态。
- 提供更新对话框、页脚状态、系统状态提示和更新设置界面。
- 发现更新目标时非阻塞预取 changelog，在更新对话框中消费版本区间结果。

update 不负责：

- 检查、下载和安装的生命周期裁决。该职责属于 Rust application 层的 `UpdateService`。
- 更新日志的读取、解析、筛选和缓存。该职责属于 `@/features/changelog`。
- 发布版本号、平台产物和远端指针。该职责属于 `scripts/release`。
- 壳层弹窗编排、路由或工作区业务数据。

界面直接组合 HeroUI Dialog、Button、Progress 与反馈组件；不维护旧 UI primitive、局部视觉 recipe 或第一方动画。系统状态提示只组合 update 会话投影与 sync public，不创建第三份运行状态。

更新设置的检查方式与渠道直接使用 Pro `RadioButtonGroup` 整卡选择。读取失败时只提供错误和重试，不展示无法保存的配置项；保存完成前保留已确认选中值，失败时仍可重试。自动下载不意味着自动安装或重启。

## 内部分层

| 层 | 职责 | 约束 |
| --- | --- | --- |
| `api/` | Tauri command 和事件名称 | 不含 React 状态或展示逻辑 |
| `model/` | 后端快照投影、纯展示派生 | 不发起 IPC |
| `hooks/` | 手动检查、安装动作、全局事件订阅 | 统一调用 `api/`，不复制生命周期 |
| `components/` | 对话框、设置区块和状态组件 | 不直接调用 `invoke` |
| `index.ts` | 主公开入口 | 显式导出，禁止 `export *` |
| `contract.ts` | 跨模块最小只读契约 | 只暴露当前确有外部消费者的设置读取与渠道类型 |

外模块只能从 `@/features/update` 或 `@/features/update/contract` 导入。模块不得依赖 `@/layout/**`。

## 依赖方向

```txt
layout / settings / app-info
  -> @/features/update
      -> @/features/changelog     更新对话框读取版本区间
      -> @/features/sync          SystemStatusChip 组合状态提示
      -> shared
      -> Tauri IPC

@/features/changelog -X-> @/features/update
```

changelog 不得反向读取更新设置或更新会话。壳层需要打开完整更新日志时，先读取 update 的最小设置契约，再把渠道作为显式参数传给 `ChangelogDialog`。

`useUpdateEvents` 只订阅权威快照中的目标版本变化，并调用 changelog 的公共预取入口；不等待日志决定弹窗或任何更新操作。事件与手动检查都经过同一快照投影，同一目标的下载进度变化不会重复预取。

Available 阅读态通过样式层的 `data-release-dialog` 窄语义 hook 使用次级表面，与白色 Card 区分；标题、Card 与操作区之间间隔 12px，不改变其他更新阶段的底色与布局。

更新弹窗最大宽度 672px，Header 表达状态，Footer 只保留操作。Available 的目标版本使用原生小尺寸 soft Chip，与已知发布日期放在 Header；累计说明的 HeroUI Card 边框固定，只有 Card.Content 内部滚动，并可通过 Tab 聚焦后使用方向键或 PageDown 阅读。目标版本只显示正文，中间版本仍保留版本标题。其他状态提示仍由 Modal.Body 承载，与日志滚动区平级，不嵌套滚动。下载、就绪、安装时版本由简短说明持有，不另叠同义状态卡片。跨渠道安装警告仍明确显示来源渠道和版本，不能为了视觉去重省略安装确认信息。

Available 操作区左侧为“跳过此版本”，右侧为“稍后”和“立即更新”。“稍后”只关闭当前 revision 的提醒，不改跳过记录、不创建定时提醒；后续自动检查是否再提醒仍由现有检查设置和会话控制。

## 状态所有权

| 状态 | Owner |
| --- | --- |
| 更新阶段、目标身份、下载进度、错误和 revision | Rust `UpdateService` 会话 |
| 检查模式、渠道、间隔、跳过版本、重启确认标记 | runtime 的独占设置文件 |
| 后端会话在前端的只读投影 | `useUpdateStore.snapshot` |
| 手动检查中、无更新提示、对话框开关、就绪提示隐藏 | `useUpdateStore` 局部交互态 |
| Ready 时读取的当前配置渠道 | `UpdateDialog` 局部状态 |
| 更新日志文档与查询结果 | changelog 模块 |

前端不创建第二套生命周期。错误附着在当前后端阶段上，不增加 `error` 阶段；安装失败仍是同一份 staged update 的 `Ready`。

## 不变式

- 前端只接受 revision 更高的快照，迟到的 hydrate 或事件不能覆盖新状态。
- 全局监听必须先订阅 `update-session-changed`，再读取当前会话。
- 下载、跳过和安装操作始终携带后端给出的版本与渠道身份，冲突响应先应用权威快照。
- 用户关闭某个 revision 的自动提醒后，同 revision 的迟到异步结果不得重新打开对话框；主动点击状态入口仍可打开。
- `Installing` 期间关闭、检查、下载和安装入口全部锁定。
- `Ready` 状态提示只打开 `UpdateDialog`，不直接启动安装。
- renderer 不获得原生 updater 权限，所有更新操作只能经过本模块 IPC 和后端服务。
- 更新日志为空或读取失败不得阻止下载、安装或重启。

## 装配点

| 位置 | 装配内容 |
| --- | --- |
| `layout/ShellLayoutContent.tsx` | 单例 `useUpdateEvents` |
| `layout/overlays/ShellOverlays.tsx` | 常驻 `SystemStatusChip`；`UpdateDialogHost` 只订阅轻量开关，并在首次打开后 lazy mount `UpdateDialog` |
| `layout/ShellFooter.tsx` | `UpdateStatusFooterItem` |
| `features/settings` | `UpdateSettingsSection` |
| 头像菜单、关于窗口 | `useManualUpdateCheck` |

具体状态机、并发和失败恢复见 [DESIGN.md](./DESIGN.md)。
