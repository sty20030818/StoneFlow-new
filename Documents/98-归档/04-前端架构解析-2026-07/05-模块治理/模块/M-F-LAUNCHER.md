# M-F-LAUNCHER · features/launcher（Launcher 独立窗）

> 日期：2026-07-18
> 状态：**S 样板已收口（[18](../18-Launcher样板重构执行计划.md)）** · 2026-07-19
> 路径：`src/features/launcher` · 路由：`routes/launcher.tsx`
> 类型：**window**（独立窗完整栈）
> 活跃契约：[ARCHITECTURE.md](../../../../src/features/launcher/ARCHITECTURE.md)

---

## A. 产品定位

| 维度 | 说明 |
|------|------|
| **入口** | Option+Space → **独立 Tauri 窗**（label `launcher`） |
| **体验** | 快速记任务、连续创建、搜最近/匹配任务与项目并打开 |
| **与主窗** | 创建走 `createTask`，搜索走 `searchEntities`；窗 session / 几何 / 显隐独立 |
| **壳** | 固定 **720×500**；Results 用 `AppScrollArea`；外圆角 Win8 / Mac16 |

旧名 Quick Create / `quick-create` / `quick_create` **已全量废弃**。历史讨论稿见 [M-F-QC.md](./M-F-QC.md)（已归档）。

---

## B. 模块边界（摘要）

```txt
routes/launcher
  → LauncherPage
      → session / domain / chrome / composer / create / results
```

外模块只 `import { LauncherPage } from '@/features/launcher'`。

详情、IPC、列表 IA、键盘 focus lane：见 `src/features/launcher/ARCHITECTURE.md`。

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-18 | 初版（自 QC 迁名） |
| 2026-07-19 | 样板收口：相对路径 + 清死字段；见 [18](../18-Launcher样板重构执行计划.md) |

