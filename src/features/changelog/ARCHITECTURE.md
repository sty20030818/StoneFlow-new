# changelog · 更新日志

> 描述 `src/features/changelog` 当前稳定边界。模块独立拥有更新日志内容，不拥有应用更新生命周期。

## 职责

changelog 负责：

- 通过独立 Tauri IPC 读取发布根目录的远端 `CHANGELOG.md`。
- 解析并校验仓库唯一 changelog 语法契约。
- 按渠道选择完整历史，或按当前版本与目标版本选择发布区间。
- 管理远端请求合并、最近有效远端文档和内置快照回退。
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
| `useChangelog.ts` | 查询、请求合并、缓存和回退 | 不创建全局 store |
| `ChangelogRelease.tsx` | 单版本分类与撤回状态展示 | 只消费已解析 release |
| `ChangelogDialog.tsx` | 按渠道展示历史并定位版本 | 渠道和开关由调用方显式传入 |
| `ChangelogMarkdown.tsx` | 标准 Markdown/GFM 展示 | 不执行原始 HTML，隐藏水平分隔线 |
| `index.ts` | React 公共入口 | 显式导出，禁止 `export *` |

## 依赖方向

```txt
layout -----------------------> @/features/changelog
@/features/update -----------> @/features/changelog
scripts/release -------------> contract.ts

ChangelogDialog / ChangelogRelease
  -> useChangelog / ChangelogMarkdown
      -> api.ts
      -> contract.ts
      -> bundled CHANGELOG.md

@/features/changelog -X-> @/features/update
@/features/changelog -X-> scripts/release
```

layout 负责完整历史弹窗的打开意图，并把配置渠道作为参数传入。update 只查询 staged 更新对应的版本区间。发布脚本只能复用纯 `contract.ts`，不能读取 React 状态决定发布结果。

## 状态与内容所有权

| 状态或内容 | Owner |
| --- | --- |
| changelog 原始内容 | 根 `CHANGELOG.md` |
| 远端静态副本 | 发布根目录 `CHANGELOG.md` |
| 语法、版本顺序和选择规则 | `contract.ts` |
| 最近有效远端文档与单个在途请求 | `useChangelog.ts` 模块内缓存 |
| 当前查询结果和 loading | 每个 `useChangelog` 调用 |
| Dialog 开关、渠道、定位版本 | layout 调用方 |
| 更新会话和 staged 身份 | update 后端服务 |

内置快照只用于回退，不能写入最近有效远端缓存。模块没有 Zustand、Context 或第二份 changelog 模型。

## 不变式

- 根文件、远端副本、前端展示和发布前校验共用同一语法契约。
- 远端内容只有成功解析后才能成为最近有效远端文档。
- 同一时刻所有消费者共享一个远端请求，请求结束后必须释放在途引用。
- 重新打开 Dialog、切换查询类型或改变版本区间会重新请求远端。
- Stable 查询不展示 Beta 条目；Beta 查询可以包含 Stable 与 Beta 条目。
- 完整历史保留已撤回条目并明确标记，更新区间和发布目标排除已撤回条目。
- Changelog 只接受中文结构标记，不保留英文兼容路径。
- changelog 缺失、无效或没有匹配条目时返回空展示，不阻断 update 操作。

具体语法、区间和回退顺序见 [DESIGN.md](./DESIGN.md)。
