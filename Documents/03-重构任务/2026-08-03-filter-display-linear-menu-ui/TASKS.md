# Filter · Display 菜单 Linear UI 对齐 - Tasks

## 当前阶段

**已完成** - SPEC / PLAN 已按长期单轨方案落地并完成定向回归。

## 阶段任务

- [x] T1 收口 row 与菜单的勾选语义
  - 新增 shadcn `src/shared/components/base/checkbox.tsx`
  - 新建纯视觉 `src/shared/components/base/selection-indicator.tsx`
  - `RowSelectionCell` 组合 shadcn Checkbox，保留 hover 显隐与 stopPropagation
  - Filter 二级组合 `SelectionIndicator`，避免嵌套交互控件
  - _对应验收标准：AC-6_  
  - _测试：更新 `src/shared/components/row/RowShell.test.tsx`，并由 FilterValueOption 测试覆盖 SelectionIndicator_

- [x] T2 建立 filter 选项 catalog，对齐 task 文案与图标
  - 新建 `src/features/filter/components/filterOptionCatalog.tsx`
  - priority 选项来自 `@/features/task` 的 `TASK_PRIORITY_OPTIONS` + `PriorityIcon`  
  - status 选项 leading 用 `TaskStatusIndicator`  
  - 删除或收敛 `filterLabels.ts` 中与 task 冲突的 P1–P4 值文案  
  - _对应验收标准：AC-4, AC-5_  

- [x] T3 实现 `FilterValueOption` 行组件（Linear 二级行结构）
  - 新建 `src/features/filter/components/FilterValueOption.tsx`  
  - 布局：左 `SelectionIndicator` · leading · label · 可选 count
  - 供 Sub 菜单使用；不写 session  
  - _对应验收标准：AC-2_  

- [x] T4 改写 Filter 二级 / 一级菜单接线
  - 拆分或改写 `src/features/filter/components/FilterMenu.tsx`  
  - 二级用 `FilterValueSubMenu` + `FilterValueOption`；勾选调用 `setFilterFieldClause` + `session.replaceEffective` 且 `preventDefault` 不关菜单  
  - 一级保持 DropdownMenu Sub 侧向展开，禁止恢复 Popover drill-in + 应用按钮  
  - _对应验收标准：AC-1, AC-3, AC-8_  
  - _依赖：T1, T2, T3_  

- [x] T5 Display 面板密度与 pill 与底栏对齐（若仍偏差）
  - 调整 `src/features/display-options/components/DisplayOptionsPanel.tsx`、`PropertyToggleGrid.tsx`、`DisplayOptionsPopover.tsx`  
  - 验收：左标签右控件、属性 pill、底栏重置/设为默认  
  - _对应验收标准：AC-7_  

- [x] T6 文档与回归
  - 更新 `src/features/filter/ARCHITECTURE.md`（及需要时 display ARCHITECTURE）  
  - 跑 `bun run typecheck`；`RowShell` / Display 按钮 / 相关 vitest  
  - _对应验收标准：AC-6, AC-7, AC-8_  

## 阻塞

- 无。

## 与 SPEC/PLAN 的实施偏差

- 用户确认后进一步收口：`RowSelectionCell` 使用 shadcn Checkbox；`SelectionIndicator` 只服务复合控件视觉，交互语义由 `FilterValueOption` 外层持有。
- Filter 通过 `@/features/task/presentation` 窄入口消费 task 文案与指示器，避免加载 task 主 facade 形成循环依赖和测试 mock 扩散。
- Display 原结构已满足 AC-7，仅删除分组行中错误复用的排序图标，并补齐按钮按压反馈，未扩大状态或布局边界。

## 完成记录

| 日期 | 记录 |
|------|------|
| 2026-08-03 | 创建 SPEC / PLAN / TASKS；待方案确认 |
| 2026-08-04 | 完成 shared 勾选、Filter Linear 二级菜单、task 指示器复用、Display 表面收口、文档与定向回归 |
