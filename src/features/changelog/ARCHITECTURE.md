# changelog · 更新日志

> 描述 `src/features/changelog` 当前稳定边界。模块独立拥有更新日志内容，不拥有应用更新生命周期。

## 职责

changelog 负责：

- 通过独立 Tauri IPC 读取发布根目录的远端 `CHANGELOG.md`。
- 解析并校验仓库唯一 changelog 语法契约。
- 按渠道选择完整历史，或按当前版本与目标版本选择发布区间。
- 管理内置首屏、共享文档缓存、远端请求合并和后台刷新。
- 提供完整历史对话框和单版本渲染组件。

changelog 不负责：

- 检查、下载、安装、重启、更新设置或更新会话。
- 决定某个平台当前是否可以获得更新。
- 发布编排、上传或远端指针写入。
- 壳层弹窗开关和当前配置渠道的读取。

## 内部分层

| 文件 | 职责 | 约束 |
| --- | --- | --- |
| `contract.ts` | 纯解析、校验、版本比较和选择 | 不依赖 React、Tauri 或更新模块 |
| `api.ts` | `get_changelog` IPC | 只返回远端文本或空结果 |
| `useChangelog.ts` | 查询、预取、请求合并和文档缓存订阅 | 模块内唯一缓存，不复制到应用 store |
| `ChangelogRelease.tsx` | 单版本元信息与分类正文展示 | 只消费已解析 release；正文直接使用 HeroUI Pro Markdown |
| `ChangelogDialogHost.tsx` | 订阅显式开关，首次打开后 lazy mount 完整 Dialog | 不读取 update 状态 |
| `ChangelogDialog.tsx` | 按渠道展示历史并定位版本 | 渠道和开关由调用方显式传入，不由公共 barrel eager 导出 |
| `index.ts` | Host、查询与预取的轻量公共入口 | 不导出正文展示，不提前引入 Markdown 依赖图 |
| `presentation.ts` | 单版本元信息与正文的展示入口 | 只由弹窗懒加载图消费，显式导出 |

## 依赖方向

```txt
layout -----------------------> @/features/changelog
@/features/update -----------> @/features/changelog
scripts/release -------------> contract.ts

ChangelogDialog -> useChangelog
  -> api.ts / contract.ts / bundled CHANGELOG.md
ChangelogDialog -> ChangelogRelease
  -> ChangelogReleaseContent -> @heroui-pro/react/markdown

@/features/changelog -X-> @/features/update
@/features/changelog -X-> scripts/release
```

layout 负责完整历史弹窗的打开意图，并把配置渠道作为参数传入 `ChangelogDialogHost`。Host、缓存与预取经轻量入口使用；UpdateDialog 通过 `@/features/changelog/presentation` 消费正文，不能将此展示入口重新导出到轻量 barrel。Host 关闭时不加载 Markdown 解析图；update 只查询 staged 更新对应的版本区间。发布脚本只能复用纯 `contract.ts`，不能读取 React 状态决定发布结果。

## 状态与内容所有权

| 状态或内容 | Owner |
| --- | --- |
| changelog 原始内容 | 根 `CHANGELOG.md` |
| 远端静态副本 | 发布根目录 `CHANGELOG.md` |
| 语法、版本顺序和选择规则 | `contract.ts` |
| 当前可读文档、请求状态、保鲜时间与最近请求目标 | `useChangelog.ts` 模块内缓存 |
| 当前查询结果 | 每个 `useChangelog` 从共享文档派生 |
| Dialog 开关、渠道、定位版本 | layout 调用方 |
| 更新会话和 staged 身份 | update 后端服务 |

内置快照作为首次可读文档，不算成功远端请求。有效远端响应替换共享文档，所有已挂载消费者同步得到结果；失败不覆盖。模块没有 Zustand、Context、磁盘缓存或第二份 changelog 模型。

## 不变式

- 根文件、远端副本、前端展示和发布前校验共用同一语法契约。
- 远端内容只有成功解析后才能成为最近有效远端文档。
- 同一时刻所有消费者共享一个远端请求，请求结束后必须释放在途引用。
- 打开 Dialog 立即展示缓存；后台请求不能用 loading 替换已有正文。
- 每次请求后保鲜 5 分钟，包括失败后的重试间隔。短期重开、切换渠道或改变筛选区间直接复用文档，不重复请求。
- 新目标版本缺失且尚未尝试时越过保鲜期预取；若历史请求在途，待响应后仍缺目标时补取一次。
- 后台刷新不重复定位历史版本，保留用户滚动位置。
- Stable 查询不展示 Beta 条目；Beta 查询可以包含 Stable 与 Beta 条目。
- 完整历史保留已撤回条目并明确标记，更新区间和发布目标排除已撤回条目。
- Changelog 只接受中文结构标记，不保留英文兼容路径。
- changelog 缺失、无效或没有匹配条目时返回空展示，不阻断 update 操作。

具体语法、区间和回退顺序见 [DESIGN.md](./DESIGN.md)。
