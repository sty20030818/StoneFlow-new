# project · 项目域

> 定稿最优架构。写法见 [`CONVENTIONS.md`](../../CONVENTIONS.md)。最后更新：2026-08-19

---

## 1. 心智

```txt
详情页
  → ProjectPage（薄壳）
  → useProjectDetailScene（组合 task public 的 useTaskCollectionScene）
  → 不复制 task mutation；不 import layout

概览（独立 scene）
  → features/project-overview → 只调本域 public

创建
  → 壳 Overlay 挂 ProjectCreateContent

批量 / 命令
  → 行与右键动作统一投影为 Command selection
  → bulk/（动作定义 + adapter）
  → commands/registerProjectCommands
```

跨模块 **只** `import { … } from '@/features/project'`。
**禁止** `features/project` → `@/layout/**`。
`project-overview` 是独立薄 scene，勿与本包混淆、勿深路径进本包内部。

---

## 2. 目录结构（定稿）

```txt
src/features/project/
├── ARCHITECTURE.md
├── index.ts                 # 主 public
├── api/                     # IO only（唯一 invoke）
├── hooks/
│   ├── project.keys|queries|mutations
│   ├── useProjectData       # options / sidebar / overview / detail
│   └── useProjectDetailScene  # 详情页编排（组合 task public）
├── model/                   # sections + command selection 纯模型（无 React hook）
├── bulk/                    # 批量动作 + adapter
├── commands/                # registerProjectCommands
└── components/
    ├── ProjectPage          # 详情页薄壳（槽位拼装）
    ├── ProjectBoard · ProjectRowAdapter · ProjectContextMenu
    └── ProjectCreateContent · form
```

详情任务板编排在 `hooks/useProjectDetailScene`；`ProjectPage` 只组合项目头部与任务集合。

---

## 3. Public 要点

| 类 | 示例 |
|----|------|
| 页面 / UI | `ProjectPage` · `ProjectBoard` · `ProjectRowAdapter` · `ProjectCreateContent` |
| 数据 hooks | `useProjectOptions` · `useProjectSidebarData` · `useProjectOverviewData` |
| Query | `projectDetailQueryOptions` · `useProjectSidebarQuery` |
| 变更 | `useComplete/Reopen/Archive/DeleteProjectMutation`（外消费者） |
| IO | `getProjectDetail` · `listAllVisibleProjects` · `restoreProject` · `deleteProject` |
| 批量 | `projectBulkActions` · `createProjectBulkAdapter` |
| 命令 | `registerProjectCommands` · `buildProjectCommandSelection` |
| 类型 | `ProjectDetail` · `ProjectOption` · `ProjectOverviewViewKey` |

新增导出前确认已有外消费者。导出符合 CONVENTIONS TSDoc L1。

---

## 4. 与其它模块

| 协作 | 方向 |
|------|------|
| task | 详情任务板只组合 task public；本域不写 task mutation |
| bulk-action | 引擎在 bulk-action；本域贡献 actions/adapter |
| command | 经 `registerProjectCommands` 注入 handlers |
| page-frame | 详情页组合纯页面框架；Board 走本域 / task public |
| shell-dialogs | 创建对话框状态在壳；本域只出表单内容 |
| project-overview | 薄 scene；只依赖本域 public |
| layout | 侧栏/options 数据走 public；**禁**本域 → layout |
| navigation | 换页 path-only intent；详情存在性校验走本域 public/api |

---

## 5. 变更纪律

改定稿目录或 public 时更新本文件。`bun run check`（或至少 tsc + boundaries + project vitest）。
