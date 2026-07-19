# M-F-META · features/metadata-fields

> 日期：2026-07-17  
> 状态：**decided（方案对比）** · **decide-only**  
> 路径：`src/features/metadata-fields`  
> 类型：**platform（字段控件 / Action Spec）**  
> 历史债：RING-META（meta 不得依赖 task **私有** UI）  
> 关联：task 创建/详情/行菜单 · project/space 字段 · command 菜单 · QC 收敛 · layout CustomDateDialog  

---

## A. 现网事实

### A.1 一句话

**跨实体元数据字段 UI 与规格**：下拉/按钮/日期/placement 分组、ActionSpec 工厂、CustomDate 对话框；供任务行/详情/创建、项目行、命令菜单、壳 Overlay 复用。

### A.2 结构

```txt
metadata-fields/
  core/        ActionSpec、date options、placement groups/target、icons mapping
  components/  FieldDropdown、Date*、Placement*、CustomDateDialog
  adapters/    task / project / space 组装 props
  index.ts     public 面较宽
```

### A.3 谁在用

- **task**：创建 MetaActions、ContextMenu、Row、Board、详情 placement/properties、draft 类型  
- **project** 行、**command** 菜单视觉、**layout** CustomDateDialog / dialog store 字段 key  
- **bulk** 仅 `TaskPlacementTarget` 类型  
- **QC**：目标应用同款控件（Q3）  

### A.4 已做对的

- 抽出 **统一 Field 交互**（比每页自写 Select 好）  
- ActionSpec → Dropdown 映射，命令菜单与行菜单可同构  
- placement 分组算法独立可测  
- 切分总览：**Keep**，不并 task  

### A.5 问题（边界）

| 问题 | 说明 |
|------|------|
| **meta → task UI** | `PriorityIcon`、`TaskStatusIndicator`、OPTIONS 从 task import → **platform 依赖 domain 组件**（RING 风险；环：task 也大量依赖 meta） |
| **TaskPlacementTarget 定义在 meta** | 更像 **task 领域值对象**，却成 meta 的「全家桶类型」 |
| **public 很宽** | 大量 core 工具导出；难审最小面 |
| **task-placement-\*** 文件名在 meta core | 实体逻辑渗入平台 core |
| **与 task 指示器双源** | 图标既在 task 又在 meta tokens 组装 |

---

## B. 边界争议

| 候选 | 现在 | 目标倾向 |
|------|------|----------|
| 通用 Field chrome（Button/Dropdown/MenuItem） | meta components | **Keep platform** |
| 日期 option 算法 / CustomDate 文案 | meta core | Keep 或 shared/lib 日期（可后） |
| ActionSpec 协议 | meta | **Keep** 跨 command/行菜单 |
| TaskPlacementTarget + groups | meta core | **迁 task model**（或 shared 若多实体 placement） |
| Priority/Status 图标 | task + meta 引用 | **图标真相在 task（或 shared 中性）**；meta adapter 只组合 |
| createPriorityActionSpec 用 TASK_*_OPTIONS | meta → task | adapter 层注入 options，core 不写死 task |
| 并 shared/ui | — | 可选长期；现 Keep feature 有业务适配价值 |
| 并 task | — | **否**（project/space/command 共用） |

---

## C. 多方案对比

### 方案 M1 · 巩固现网

仅收窄 export；保留 meta→task 图标依赖。

| 优点 | 缺点 |
|------|------|
| 稳 | 环依赖与 RING 未解 |

**结论：** 过渡。

---

### 方案 M2 · 纯化平台：通用壳 + 域适配器注入（**推荐**）

```txt
metadata-fields（platform）
  components: 无实体图标硬依赖的 Field chrome
  core: ActionSpec 协议、date 工具、comparator
  adapters/task|project|space: 注入 options/icons（从各域 public）

task
  PriorityIcon / StatusIndicator / OPTIONS / PlacementTarget 类型与 groups
  经 public 给 adapters 用

禁止：meta/core 直接 import task 组件
允许：adapters/task 依赖 task public（单向 domain←adapter 在 meta 包内，或
      更好：adapters 实现迁到 task 的 metadata 适配文件，meta 只 export 纯 chrome）
```

**更干净的所有权变体 M2b：**

- meta = **纯控件 + ActionSpec 映射**（零 task import）  
- `createTaskPriorityDropdownProps` 放在 **task** public（内部用 meta chrome）  

| 优点 | 缺点 |
|------|------|
| 真正断环；符合高内聚 | 要搬 placement/factories |
| QC/command 仍用同一 chrome | 迁移面中 |

**结论：推荐 M2；落地优先 M2b 方向（域组装、meta 更纯）。**

---

### 方案 M3 · 整包并入 shared/components

| 优点 | 缺点 |
|------|------|
| 更「底层」 | shared 防火墙上堆业务 ActionSpec；placement 分组不宜进 shared |

**结论：不整包并**；纯 chrome 未来可下沉 shared，**现在不强制**。

---

### 方案 M4 · 并入 task

| 优点 | 缺点 |
|------|------|
| 图标同包 | project/space/command 反向依赖 task 仅因日期下拉 |

**结论：否。**

---

### 方案 M5 · 拆 metadata-fields + task-placement feature

| 优点 | 缺点 |
|------|------|
| 名字准 | 过拆；placement 回 task 即可 |

**结论：否新 feature；placement 归 task。**

---

## D. 推荐 = **M2 / M2b**

### D.1 职责

| metadata-fields 负责 | 不负责 |
|----------------------|--------|
| 字段控件交互壳、Dropdown/Menu 行为 | 任务优先级**业务规则** |
| ActionSpec ↔ UI 映射协议 | 拥有 Placement 领域定义（长期） |
| 通用日期 option 生成/格式化 | 持久化实体 |
| CustomDateDialog 壳 | 命令 runtime |

| task/project/space 负责 | |
|-------------------------|--|
| OPTIONS、指示器、PlacementTarget、分组数据源 | 组装「给 meta 控件的 props」 |

### D.2 协作

```txt
task Row/Create/Detail
  → task 提供 options + icons + placement model
  → metadata Field 控件渲染（或 task 封装好的 Dropdown props）

command Menu
  → 同 ActionSpec / 同控件视觉

layout
  → CustomDateDialog 挂载；日期字段 key 类型来自 meta 或 shared

QC（Q3）
  → 同一 Field 控件，勿自研平行 DateControl
```

### D.3 依赖方向（目标）

```txt
components(task) → metadata-fields（chrome）→ shared
adapters 组装：task → metadata chrome + task icons
禁止：metadata-fields/core → task/components
```

### D.4 public 收窄

**宜：** 通用组件、ActionSpec 类型、date helpers、CustomDateDialog。  
**域侧导出：** PlacementTarget、buildTaskPlacementGroups、priority/status dropdown factories。  
**meta index：** 少 re-export 整棵 task 工厂（迁出后）。

---

## E. 最佳实践

**Do**

- 控件无业务；业务 options 注入  
- 行菜单 / 命令菜单 / 创建条 **同一 Spec**  
- 日期存储格式单点 normalize  

**Don't**

- meta 依赖 task 私有路径（深 import）  
- 每页自写一套 Priority 下拉  
- 把 Placement 领域规则锁死在 meta 包名里  

---

## F. 体量

| 区域 | 动作 |
|------|------|
| CustomDateDialog ~279 | 可接受 |
| placement-groups ~176 | 迁 task 后随 task |
| public 面 | 收窄 |

---

## G. 迁移刀序

| 序 | 刀 |
|----|-----|
| 1 | TaskPlacementTarget + groups → task model；全仓改 import |
| 2 | meta/core 去掉 PriorityIcon/Status 硬依赖；改注入 renderIcon |
| 3 | task/project/space dropdown factories 归域或 adapters 仅依赖 public |
| 4 | 收窄 meta index |
| 5 | QC 换用 meta 日期控件（Q3） |

---

## H. 方案小结

| 方案 | 荐 |
|------|-----|
| M1 巩固 | 过渡 |
| **M2/M2b 纯化 chrome + 域组装** | **✅** |
| M3 整包 shared | 不强制 |
| M4 并 task | ❌ |
| M5 新 placement feature | ❌ |

---

## I. 决议

| # | 决议 |
|---|------|
| 1 | **Keep** metadata-fields 平台 |
| 2 | 目标 **M2b**：meta 更纯；域拥有 placement/options/icons 组装 |
| 3 | 断 **meta → task 组件** 硬依赖 |
| 4 | 不并 task / 不整包 shared |
| 5 | decide-only |

### 开放问题

- [ ] Placement 是否永远仅 task（是则类型稳在 task；若 project 也有 placement 再抽 shared）  
- [ ] ActionSpec 是否与 command 菜单强绑定到可抽 `shared` 类型（后）  

---

## J. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：RING、M1–M5、推荐 M2b、placement 归 task |
