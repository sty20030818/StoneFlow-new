# project · 项目域

> 作用：描述 **当前已落地** 的 `src/features/project` 边界  
> 最后更新：2026-07-17

---

## 1. 心智

```txt
ProjectPage → 内嵌任务列表 / EntityScene
project-overview（独立 feature）→ project API + project bulk
命令 → registerProjectCommands
批量 → bulk/
```

跨模块只 `@/features/project`。**禁止** → `@/layout/**`。  
`project-overview` 是独立 scene feature，勿与本包混淆。

---

## 2. 目录

```txt
src/features/project/
├── ARCHITECTURE.md · index.ts
├── api/ · hooks/ · model/
├── bulk/ · commands/
└── components/
```

---

## 3. Public 要点

| 类 | 示例 |
|----|------|
| 页面/看板 | `ProjectPage` · `ProjectBoard` · `ProjectCreateContent` |
| 数据 | `listAllVisibleProjects` · archive/delete… |
| 批量 | `projectBulkActions` · `createProjectBulkAdapter` |
| 命令选中 | `buildProjectCommandSelection` |
| 命令 handlers | `registerProjectCommands` |
