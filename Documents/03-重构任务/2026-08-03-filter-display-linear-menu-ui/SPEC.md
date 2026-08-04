# Filter · Display 菜单 Linear UI 对齐 - Spec

## 背景与目标

Filter / Display **产品模型**已收口为单轨（FilterQuery + URL `f` + Display store），但**表面 UI**仍未对齐 Linear：

| 表面 | 现状问题 |
|------|----------|
| Filter 二级菜单 | 勾选在右或样式不像 Linear；缺「左勾选 + icon + 文案 + 可选 count」行结构；优先级未复用 task 自绘 `PriorityIcon` |
| Filter 一级菜单 | 字段 icon 用 Lucide 混搭，与 task row 元数据图标体系不一致 |
| Display 面板 | 结构已接近 Linear，仍需与本任务统一的密度/控件语言 |
| 勾选框 | task row 缺标准 Checkbox 语义；菜单项需要纯视觉标记，不能嵌套第二个交互控件 |

**目标：** 在**不改 FilterQuery / session / adapt 真源**的前提下，把 Filter / Display 菜单做成 Linear 式交互与视觉；row 使用 shadcn Checkbox，菜单使用同视觉的纯 `SelectionIndicator`，各自保持正确语义；优先级/状态图标**只复用** `task/model/indicators`。

一句话：**心智与数据已是 Linear 规则；本任务把菜单表面做成 Linear 结构。**

---

## 范围

### In scope

1. **勾选语义收口**
   - `RowSelectionCell` 组合 shadcn Checkbox，保留行级 hover 显隐与阻断冒泡
   - Filter 二级选项行使用纯视觉 `SelectionIndicator`，交互语义由 `menuitemcheckbox` 持有
   - 两者共用 StoneFlow 语义 token，不嵌套交互控件

2. **Filter 菜单 UI（一级 + 二级）**  
   - 一级：`DropdownMenu` + 顶栏搜索 + 字段列表（icon + 文案 + `›`）  
   - 二级：`DropdownMenuSub` 侧向 flyout；顶栏「筛选…」；每行 = **左勾选 | leading icon | 文案 | 可选 count**  
   - 勾选即时写 `session.replaceEffective`；菜单不因勾选关闭  
   - 优先级选项：文案与 `TASK_PRIORITY_OPTIONS` 一致；leading 用 `PriorityIcon`  
   - 状态选项：leading 用 `TaskStatusIndicator`  
   - 项目 / 日期：leading 可为空或字段级 Lucide，不造第二套业务 icon  

3. **Display 面板 UI 收口**  
   - 保持 Popover 面板（非二级菜单）  
   - 行布局：左 label、右 pill Select / Switch  
   - 属性 pill：选中实心 / 未选描边  
   - 底栏：重置 | 设为默认  

4. **架构卫生**  
   - filter 内拆分：catalog / Option 行 / Menu 壳，禁止巨型单文件继续膨胀  
   - 删除 filter 内对优先级/状态的重复 label-only 定义（与 task 文案冲突部分）  

### Out of scope（不做什么）

1. **不**改 FilterQuery / URL codec / adapt / View.filters 真源  
2. **不**实现 facet 计数后端或假 count（count 槽位可预留，无数据不显示）  
3. **不**做 AI filter / Advanced AND-OR 嵌套 UI  
4. **不**做 List/Board 布局切换、Assignee 等无模型字段  
5. **不**恢复 Command 全页 filter-picker  
6. **不**为 Display 引入第二套呈现状态  

---

## 用户场景与需求

- 作为列表用户，我想按 `F` 打开筛选菜单并侧出二级，以便快速多选条件且不离开当前页。  
- 作为列表用户，我想在优先级二级菜单里看到与任务行相同的优先级图标，以便不费解。  
- 作为列表用户，我想用 `Shift+F` 打开紧凑的显示选项，以便改分组/排序/属性。  
- 作为维护者，我想勾选框只有一套实现，以便 row 与菜单视觉一致、少分叉。  

---

## 能力边界

| 能力 | 边界 |
|------|------|
| shadcn Checkbox | 真实 checkbox 交互；不管选择集合业务 |
| SelectionIndicator | 纯视觉；不持有 role、焦点或点击行为 |
| Filter 二级 count | 可选 prop；本任务不接真实 facet |
| 图标 | status/priority 只从 `@/features/task` indicators 引入；filter 不自绘优先级 |
| 键盘 | 沿用 Radix Dropdown 方向键/Enter；勾选后保持打开 |

---

## Definition of Done

- Filter 一级/二级视觉与交互符合本 SPEC 验收标准  
- Display 面板行密度与底栏符合验收标准  
- 勾选框仅有一套 shared 实现，row 与 filter 均消费  
- `PriorityIcon` / `TaskStatusIndicator` 在 filter 二级被使用  
- `bun run typecheck` 通过；相关 vitest（row 勾选、Display 按钮、filter 若有测）通过  
- filter / display 的 ARCHITECTURE 如有表面契约变化则已同步一句  

---

## 验收标准

- **AC-1**：当用户打开 Filter 一级菜单时，系统应当展示顶栏搜索与字段列表（每项含 leading icon 与 `›`），且不以 Popover drill-in 替换整页内容。  
- **AC-2**：当用户展开某字段二级菜单时，系统应当侧向展示子菜单，且每行从左到右为：勾选框、可选 leading icon、标签、可选 count（无 count 时右槽不占位）。  
- **AC-3**：当用户勾选/取消二级选项时，系统应当立即更新 FilterQuery 会话（URL `f`），且二级与一级菜单不因勾选而关闭。  
- **AC-4**：当二级字段为 priority 时，系统应当使用 `PriorityIcon` 与 task 域 `TASK_PRIORITY_OPTIONS` 文案（无/紧急/高/中/低），不得使用另一套 P1–P4 或 Lucide 信号条作为优先级值图标。  
- **AC-5**：当二级字段为 status 时，系统应当使用 `TaskStatusIndicator` 作为 leading。  
- **AC-6**：列表行应使用 shadcn Checkbox；Filter 二级应使用同 token 的纯视觉 `SelectionIndicator`，不得在 `menuitemcheckbox` 内嵌套第二个 checkbox 控件。
- **AC-7**：当用户打开 Display 面板时，系统应当呈现「左标签 + 右控件」紧凑行、属性 pill、底栏「重置 / 设为默认」，且不出现第二套筛选公式 UI。  
- **AC-8**：如果执行重构，则系统不得新增 filter 兼容层或第二套筛选状态；旧 drill-in「返回 + 应用」路径不得保留。  

---

## 关联模块

| 模块 | 角色 |
|------|------|
| `shared/components` | shadcn Checkbox 与纯视觉 `SelectionIndicator` |
| `shared/components/row` | `RowSelectionCell` 组合 shadcn Checkbox |
| `features/filter` | FilterMenu 壳 + 二级 Option + catalog |
| `features/task` | 只读消费 `PriorityIcon` / `TaskStatusIndicator` / priority 文案 |
| `features/display-options` | Display 面板密度与 pill 收口 |

---

## 当前技术方案

摘要：row 使用 shadcn Checkbox；Filter 用 DropdownMenu Sub + 左侧纯 `SelectionIndicator`（不用默认右勾 CheckboxItem，也不嵌套 Checkbox）；图标复用 task indicators；count 可选空。细节与取舍见 [PLAN.md](./PLAN.md)。

---

## 关联文档

- [任务方案编写SOP](../../任务方案编写SOP.md)  
- [filter ARCHITECTURE](../../../src/features/filter/ARCHITECTURE.md)  
- [display-options ARCHITECTURE](../../../src/features/display-options/ARCHITECTURE.md)  
- 归档：`98-归档/02-已完成重构/2026-08-03-linear-filter-display-views/`（模型已落地，本任务只做表面）  
