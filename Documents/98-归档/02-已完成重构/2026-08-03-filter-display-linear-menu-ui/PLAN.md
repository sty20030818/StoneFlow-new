# Filter · Display 菜单 Linear UI 对齐 - Plan

## 方案概述

在**不改动 FilterQuery 真源**的前提下，做一次**表面重构**：

1. row 使用 **shadcn Checkbox**，菜单使用同视觉的纯 `SelectionIndicator`
2. Filter 二级菜单做成 Linear 行结构（左勾选 · icon · 文案 · 可选 count）  
3. 值级 icon 复用 task indicators  
4. Display 面板保持 Popover，统一密度与 pill  

```txt
shared: Checkbox（真实控件）   SelectionIndicator（纯视觉）
              ↑                    ↑
      RowSelectionCell       FilterValueOption
      （行 hover/冒泡）       （menuitemcheckbox）

FilterMenu
  ├ FilterFieldList（一级 + 搜索）
  └ FilterValueSubMenu
       └ FilterValueOption × N
            leading ← PriorityIcon | TaskStatusIndicator | null

DisplayOptionsPopover → DisplayOptionsPanel（行 + pill + 底栏）
```

---

## 备选方案与取舍

### A. 勾选框落点

| 方案 | 说明 | 取舍 |
|------|------|------|
| **A1 按语义拆分** | row 使用 shadcn Checkbox；菜单使用纯 `SelectionIndicator` | **采用**：真实控件获得标准键盘语义，菜单不嵌套第二个交互控件 |
| A2 shared 纯组件 | row 与 filter 共用纯视觉组件 | row 仍需手写 checkbox 语义，无法复用 shadcn 能力 |
| A3 留在 row 导出 | filter import `@/shared/components/row` 的勾选 | 行语义污染菜单；hover 显隐会缠住 |
| A4 各写一套 class | 快 | **放弃**：双轨视觉必漂移 |

**结论：** A1。`RowSelectionCell` 组合 shadcn Checkbox 与行级 `opacity`/`stopPropagation` 包装；`FilterValueOption` 组合纯视觉 `SelectionIndicator`。

### B. Filter 二级行实现

| 方案 | 说明 | 取舍 |
|------|------|------|
| **B1 DropdownMenuItem + 自绘左勾选** | `onSelect preventDefault` 保持打开 | **采用**：完全控制左勾选布局，对齐 Linear |
| B2 改 DropdownMenuCheckboxItem 样式 | 勾默认在右，硬改 class | 脆、与 Radix 默认相悖 |
| B3 继续 Popover drill-in | 旧路径 | **放弃**（AC-1/AC-8） |

### C. 图标

| 方案 | 取舍 |
|------|------|
| **C1 直接 import task indicators** | **采用**：与 ContextMenu / metadata 一致；filter → task 仅 UI 展示依赖，可接受 |
| C2 经 metadata-fields 注册表 | 间接层多，菜单选项不需要 action spec |
| C3 filter 自绘 SVG | **放弃**：与 PriorityIcon 双轨 |

### D. Count

| 方案 | 取舍 |
|------|------|
| **D1 prop 可选，无则不渲染** | **采用**（本任务） |
| D2 假数据凑数 | **禁止** |
| D3 本任务做 facet API | 超范围，另开任务 |

---

## 组件与目录（目标）

```txt
src/shared/components/
  base/
    checkbox.tsx               # NEW：shadcn 真实 Checkbox
    selection-indicator.tsx    # NEW：复合控件内纯勾选视觉
  row/
    RowFieldCells.tsx          # RowSelectionCell 组合 Checkbox

src/features/filter/components/
  FilterMenu.tsx               # 壳：open / session / Dropdown root
  FilterValueOption.tsx        # NEW：二级单行
  FilterValueSubMenu.tsx       # NEW：二级搜索 + 列表
  filterOptionCatalog.tsx      # NEW：field → options（value/label/leading 工厂）
  filterLabels.ts              # 仅字段级文案；priority 值文案改引 task
  filterLabels 中 PRIORITY_* 与 TASK_PRIORITY_OPTIONS 对齐或删除重复
```

### 职责边界

| 组件 | 负责 | 不负责 |
|------|------|--------|
| `Checkbox` | checkbox 语义、键盘、checked / disabled 外观 | 选择集合业务、row hover 显隐 |
| `SelectionIndicator` | checked 外观、尺寸 | role、焦点、点击行为 |
| `RowSelectionCell` | 行内可见性、阻断冒泡 | 勾选像素细节 |
| `FilterValueOption` | 一行四槽布局 | 写 session |
| `FilterValueSubMenu` | 搜索过滤 options、调用 onToggle | 图标绘制 |
| `filterOptionCatalog` | 选项定义与 leading 工厂 | React 菜单状态 |
| `FilterMenu` | 打开态、接 session | 选项目录细节 |

---

## 关键交互细节

### Filter 二级行（目标 DOM 结构）

```txt
<button role="menuitemcheckbox" aria-checked>
  [SelectionIndicator]  [Leading 16px]  [Label truncate]  [Count?]
</button>
```

- 行高约 32–36px，`rounded-md`，hover `bg-muted/80`  
- checkbox 固定 16×16 视觉（与 row 内圈一致）  
- leading 固定 16×16，与 `PriorityIcon size="sm"` 对齐  
- count：`tabular-nums text-[12px] text-sf-text-tertiary`；无 count 时不占列  

### 勾选与 session

```txt
onToggle(value)
  → 读 effective 中 field= is 的 values
  → 增删 value
  → setFilterFieldClause + session.replaceEffective
  → 不 close menu
```

### 优先级映射

| value | 文案 | icon |
|-------|------|------|
| 0 | 无优先级 | PriorityIcon 0 |
| 4 | 紧急 | PriorityIcon 4 |
| 3 | 高 | PriorityIcon 3 |
| 2 | 中 | PriorityIcon 2 |
| 1 | 低 | PriorityIcon 1 |

顺序与 `TASK_PRIORITY_OPTIONS` 一致（无 → 紧急 → 高 → 中 → 低）。

---

## 数据流（仅 UI）

```txt
F / 按钮
  → FilterMenu open
  → 用户展开 priority Sub
  → FilterValueOption onToggle
  → useListFilterSession.replaceEffective
  → URL f + list adapt（既有）
```

无新状态机；无新后端。

---

## 风险

| 风险 | 缓解 |
|------|------|
| filter → task 依赖变重 | 仅 indicators + priority 文案；禁止 import task hooks/scene |
| Row 勾选回归 | 保留 `RowShell.test` / TaskRowAdapter 勾选测；接入 shadcn 后跑 shared row 测 |
| Checkbox 在菜单内焦点 | 用 menuitemcheckbox 语义 + 测键盘勾选不关菜单 |
| 双文案源 | catalog 直接用 `TASK_PRIORITY_OPTIONS`，删 filter 内 P1–P4 |

---

## 完成后需要同步的长期文档

- `src/features/filter/ARCHITECTURE.md`：补一句「二级 Option 行结构 + 图标来源 task indicators」  
- `src/features/display-options/ARCHITECTURE.md`：若面板分区文案有变更，补一行  
- 可选：`Documents/01-架构/A3-界面系统.md` 仅当要登记「菜单表面规范」时  

---

## 线稿（实现对照）

### 二级（照抄 Linear）

```txt
┌ 筛选… ────────────────────────┐
├───────────────────────────────┤
│ ☐  [---]  无优先级             │
│ ☐  [!]    紧急                 │
│ ☑  [|||]  高                   │
│ ☐  [|||]  中                   │
│ ☐  [|||]  低                   │
└───────────────────────────────┘
```

### 勾选抽取

```txt
Checkbox                  RowSelectionCell
┌──────────┐               ┌─────────────────────┐
│ □ / ☑   │  ← 真实控件    │ [hover opacity 壳]  │
└──────────┘               │      Checkbox       │
                           └─────────────────────┘

SelectionIndicator        FilterValueOption
┌──────────┐               ┌─────────────────────┐
│ □ / ☑   │  ← 纯视觉      │ menuitemcheckbox    │
└──────────┘               │ SelectionIndicator  │
                           └─────────────────────┘
```
