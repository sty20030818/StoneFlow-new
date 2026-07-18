# M-F-SELECTION · features/selection

> 日期：2026-07-17  
> 状态：**decided（方案对比）** · **decide-only**  
> 路径：`src/features/selection`  
> 类型：**platform**  
> 关联：command C3 · bulk B3 · task T2a · layout ShellProviders  

---

## A. 现网事实

### A.1 一句话

**选择平台**：列表多选/焦点、把「当前选中」注册给命令上下文、行级 hover/focus 快捷作用域。  
**不执行**归档/删除等业务（那是 bulk / domain handlers）。

### A.2 能力三块

| 块 | API | 作用 |
|----|-----|------|
| **Command 选中总线** | `CommandSelectionProvider` · `useRegisterCommandSelection` · `useCommandSelectionContext` | 页/列表向壳命令系统申报「现在选中谁」 |
| **快照构建** | `buildTask/Project/LifecycleCommandSelection` | 域实体 → `CommandSelectionContext` 形状 |
| **列表选择状态** | `useEntitySelection` · `useEntitySelectionEscape` | 通用 ids/焦点/范围选 |
| **行交互作用域** | `EntityRowShortcutScope` | 指针/键盘 hover-focus，供 Board 行 |

### A.3 装配与消费者

```txt
layout ShellProviders
  → CommandSelectionProvider

task list-scene / ProjectPage / ViewsPage / LifecycleList…
  → useRegisterCommandSelection(buildXxx(...))
  → useEntitySelection（task 还有 useTaskSelection 薄包一层）

Board 行
  → EntityRowShortcutScope

command host
  → useCommandSelectionContext() 并入 CommandContext
```

### A.4 已做对的

- **平台边界清楚**：选 ≠ 改数据  
- Provider 挂壳、列表 **注册**——可删除性好（不注册即空选中）  
- 与 Gap 里「小平台标杆」印象一致  
- 体量可控（最大 EntityRowShortcutScope ~329）  
- **不** import layout  

### A.5 问题 / 灰区

| 问题 | 说明 |
|------|------|
| **依赖 command 的 `CommandSelectionContext` 类型** | selection → command 类型；平台互依。可接受或抽 shared 类型 |
| **build*CommandSelection 按域硬编码在 selection** | 类似 bulk 旧问题：platform 知道 task/project/lifecycle 形状 |
| **task 另有 useTaskSelection** | 薄封装 OK；避免再长出业务 |
| **与 bulk `useSectionSelection`** | 命名/职责易混；bulk 侧应理清（B3） |
| **与 task RowShortcutScope** | 行 **命令执行**在 task；selection 只做 focus/hover——正确，但名字都叫 Shortcut 易混 |
| **无 hooks/ 夹** | 全在 model/，含 React hook——命名不纯（可迁 hooks/） |

---

## B. 边界争议

| 候选 | 现在 | 目标倾向 |
|------|------|----------|
| 多选状态机 | useEntitySelection | **Keep platform** |
| 命令选中注册表 | Provider | **Keep platform**；壳装配 |
| buildTaskCommandSelection | selection | **可 Keep**（纯映射）或 **域提供 toCommandSelection**（更纯） |
| EntityRowShortcutScope | selection | **Keep**（通用行交互）；与 task 命令 Runtime **分离** |
| CommandSelectionContext 类型 | 定义在 command | **抽到 command 或 shared/types**；避免 selection↔command 环感 |
| 执行 bulk/命令 | 不在 selection | **坚持不在** |
| Escape 清空 | useEntitySelectionEscape | Keep |

---

## C. 多方案对比

### 方案 L1 · 巩固现网

小改命名/夹名；build* 仍在 selection。

| 优点 | 缺点 |
|------|------|
| 稳、已是标杆级 | 域形状知识仍集中在 selection |
| | model 夹不纯 |

**结论：** 可作基线，长期可再收紧。

---

### 方案 L2 · 纯化平台 + 域贡献快照（**推荐**）

```txt
selection（platform）
  - useEntitySelection*
  - CommandSelectionProvider / register
  - EntityRowShortcutScope
  - 通用 CommandSelectionContext 形状（或 re-export 自单一类型源）

task / project / lifecycle
  - toCommandSelection(entities) 或 build 放在域 public
  - 列表页：register(selection.build from domain)

command
  - 只消费 CommandSelectionContext（运行 when/handler）
  - 不拥有多选状态
```

| 优点 | 缺点 |
|------|------|
| 与 bulk B3 / command C3 同构：域贡献、平台总线 | 要搬三个 build 函数 |
| selection 更「无实体知识」 | |
| 卸 task 时选中映射一起走 | |

**结论：长期最优。**

---

### 方案 L3 · 合并进 command

选择状态成为 command feature 子树。

| 优点 | 缺点 |
|------|------|
| 少一个包 | command 已过重；选中被多页使用，不必绑命令 UI |
| | 可删除 command 时误伤列表多选 |

**结论：否。**

---

### 方案 L4 · 合并进 bulk-action

| 优点 | 缺点 |
|------|------|
| 「选了再批量」口语近 | 多选也服务 **单选命令/行焦点**，不是仅 bulk |
| | bulk B3 引擎应更瘦 |

**结论：否。** 协作紧密但 **模块分离**：selection 选，bulk 执行。

---

### 方案 L5 · 取消平台，各列表自写多选

| 优点 | 缺点 |
|------|------|
| 无 | 三列表+项目+lifecycle 复制；历史倒车 |

**结论：否。**

---

## D. 推荐 = **L2**

### D.1 职责

| 负责 | 不负责 |
|------|--------|
| 通用多选/焦点状态 | mutation / bulk run |
| 向命令系统注册当前选中 | 命令定义与 handler |
| 行 hover/focus 作用域 UI 状态 | 行上业务快捷键绑定表（task shortcuts） |
| （过渡）build* 映射 | 长期域自己 toCommandSelection |

### D.2 协作

```txt
[列表页 task/project/lifecycle/view]
  entitySelection = useEntitySelection(...)
  registerCommandSelection(domain.toCommandSelection(...))

[ShellProviders]
  CommandSelectionProvider

[CommandHost / Runtime]
  ctx.selection = useCommandSelectionContext()

[Board 行]
  EntityRowShortcutScope → 焦点/hover
  task RowShortcutScope → 按键 → handlers / runBulk
      （可读 selection，但不实现多选核心）

[Bulk bar / handlers]
  从 selection 或页面 ids 建 BulkSnapshot → runBulkAction
```

### D.3 与已定模块

| 模块 | 关系 |
|------|------|
| **command C3** | 只读 selection context；handler 内用 ids |
| **bulk B3** | 不拥有 selection；消费 snapshot |
| **task T2a** | useTaskSelection 可留薄封装；build 迁 task；去 layout |
| **layout** | 只挂 Provider，不存业务选中列表 |

### D.4 public 目标

**宜：** Provider 三件套、useEntitySelection*、EntityRowShortcutScope、（过渡）build*。  
**域迁出后：** buildTask* 从 task public 出。  
**目录：** `hooks/` 与 `components/` 分开；model 仅纯函数。

---

## E. 最佳实践

**Do**

- 一页一个 register；离页 clear  
- 选择状态局部在列表；命令只看注册结果  
- Escape 清空与焦点策略一致  
- 行 ShortcutScope（selection）与 命令 Runtime（task）职责分离  

**Don't**

- 在 selection 里调 archive/delete  
- 用 Zustand 全局镜像「当前选中任务列表」当第二真相（除非明确会话级产品需求）  
- Board 私写第二套多选状态机  

---

## F. 体量

| 文件 | ~行 | 动作 |
|------|-----|------|
| EntityRowShortcutScope | 329 | 临界；可拆 session/pointer |
| useEntitySelection | 228 | OK / 可抽纯函数到 entitySelection.ts（已有部分） |
| 其余 | 健康 | — |

---

## G. 迁移刀序

| 序 | 刀 |
|----|-----|
| 1 | 文档钉死：选 vs 命令 vs bulk |
| 2 | model 中 React hook → hooks/ 夹（可选整理） |
| 3 | buildTask/Project/Lifecycle* → 各域 public（L2） |
| 4 | CommandSelectionContext 类型单源（command 或 shared）避免环感 |
| 5 | 与 bulk `useSectionSelection` 命名/职责对齐或迁移 |
| 6 | EntityRowShortcutScope 超 300 再拆 |

---

## H. 方案小结

| 方案 | 荐 |
|------|-----|
| L1 巩固 | 基线/过渡 |
| **L2 域贡献快照** | **✅** |
| L3 并入 command | ❌ |
| L4 并入 bulk | ❌ |
| L5 取消平台 | ❌ |

---

## I. 决议

| # | 决议 |
|---|------|
| 1 | selection **保持独立 platform** |
| 2 | 长期 **L2**：选中映射由域贡献；引擎留 selection |
| 3 | **不**执行业务；与 bulk/command 分工固定 |
| 4 | layout 只挂 Provider |
| 5 | decide-only |

### 开放问题

- [ ] `CommandSelectionContext` 类型最终放 command 还是 shared（推荐：**command 定义，selection 只依赖类型-only**；或双方依赖 shared 小类型文件）  
- [ ] 多页同时挂载时 register 覆盖策略（现网 active token——保持并文档化）  

---

## J. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：三块能力、L1–L5、推荐 L2 |
