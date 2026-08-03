# Linear 式 Filter · Display · Views - Plan

## 方案概述

**终态一次到位，不做过渡双写。**

1. **FilterQuery（clause 列表）** 作为筛选唯一形状  
2. **生效公式** = 有 URL 临时则用临时，否则用 base（自定义 View 的定义 filters，或非 View 页的空）  
3. **临时条件** 编进 **路由 search**（对齐 Linear filters∈URL，刷新可恢复）  
4. **View** 只存 filters（+ 元数据）；**sort/group 从 View 产品面删除**，呈现只读 **display-options**  
5. UI：FilterMenu + FilterBar；Clear 仅临时偏离；Save = 覆盖 | 另存  
6. 删除扁平 PageFilterState / Command 唯一 picker / 旧 TaskViewFilters 运行时路径  

与 Linear「照抄表 / 不做表」见 [SPEC.md](./SPEC.md)。

---

## 备选方案与取舍

| 方案 | 结论 |
|---|---|
| A. 美化 Command + 保留扁平状态 | **否决** |
| B. 双写扁平+clause / View 仍存 sort 当底稿 | **否决**（禁止过渡） |
| C. URL 临时 + View 只 filters + Display 独占呈现 + 破坏性删旧 | **采用** |
| D. 临时只内存会话 | **否决**（用户要刷新可恢复，对齐 Linear URL） |
| E. 本地 cache 代替 URL | **否决作主方案**；URL 是 Linear 模型且可分享地址；桌面 WebView 路由 search 足够 |

**临时存储选定：路由 search（第一性 = Linear URL）。** 不另做平行 cache 真源。

---

## 关键决策

| 决策 | 选择 | 为什么 |
|---|---|---|
| 筛选真源 | `FilterQuery` | chip 1:1 |
| 临时寿命 | URL search | 刷新恢复；对齐 Linear |
| View 存什么 | filters + 元数据 | 对齐 Linear Save view |
| sort/group | **只** display-options | 对齐 Linear Display；删 View 双真源 |
| Clear | 仅临时偏离时显示 | 避免清空「视图定义」 |
| Save | 覆盖 **或** 另存 | 解决覆盖/副本需求 |
| 菜单搜索 | 本任务不做 | 待办 |
| 兼容层 | 无 | 无用户，迁移一次 |

---

## 数据模型

### FilterQuery

```ts
type FilterField = 'status' | 'priority' | 'project' | 'due' | 'planned'
// created/updated 可类型预留，本任务 UI 不做

type FilterOp = 'is' | 'is_not'

type FilterClause = {
  id: string
  field: FilterField
  op: FilterOp
  values: string[] // 规范化字符串；空则 normalize 剔除
}

type FilterQuery = { clauses: FilterClause[] }
```

纯函数（`filter/core`）：`normalize`、`isEmpty`、`equals`、`serialize` / `parse`（URL 与 JSON 共用）、`toListTasksInput` / `toRunViewInput`（**唯一**适配出口）。

### 生效公式

```text
baseFilters =
  自定义 View 页 ? view.filters : empty

tempFilters =
  parse(route.search.filters)  // 无效则 empty

effectiveFilters =
  tempFilters 非空（或「dirty 标记」见下）? tempFilters : baseFilters

dirty =
  URL 存在合法临时 filters 编码
  // 干净 View：无 search filters → 展示 base，无 Clear
  // 一旦用户改 chip / 加条件 → 写入 search → dirty，有 Clear
```

**Clear：** 删除 search 中的临时 filters → 回到 base（View 定义或 empty）。  
**覆盖 Save：** `view.filters = effective` → 清 search。  
**另存：** `create(filters=effective)` → 通常清 search 并导航到新 View。

### View 表 / DTO（破坏性）

| 字段 | 终态 |
|---|---|
| filters_json | FilterQuery JSON |
| sort_json / group_by_json | **停止作为产品真源**；迁移期：若需保留个人呈现，把旧值 **一次性** 写入该 view 的 display default/personal，然后代码路径删除读取；列可 drop 或留空忽略 |
| name, scope, position, … | 保留 |

View 编辑器：**删除** sort/group 表单项；分组排序只在 Display 面板改。

### Display

不变 pageKey 模型；增加/收回 completed 可见性。  
打开 `task:view:{id}` 时只读该 key 的 display，**不**读 View.sort。

### URL search 约定（实现时定名，原则如下）

- 紧凑可逆：例如 `f` = base64url(JSON(FilterQuery)) 或结构化重复 key；须 `parse` 失败安全降级 empty  
- **不得**把 groupBy/orderBy 塞进 filter search  
- 与现有 `parseViewSearch` 等合并时单一 validateSearch，避免多真源  

---

## 数据流

```text
                    ┌──────────── URL search (temp) ────────────┐
                    │                                           │
用户改 chip/菜单 ──►│  setSearch(filters)                       │
                    └───────────────────┬───────────────────────┘
                                        ▼
                              resolve effectiveFilters
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              ▼                         ▼                         ▼
         FilterBar                  adapt → query              Save 对话框
         (Clear 规则)              list / run_view              覆盖 | 另存
                                        │                         │
                                        ▼                         ▼
                                     TaskBoard              View.filters 持久化
                                     + N hidden                  清 temp
```

Display 平行：

```text
DisplayPanel → display store (personal/default) → apply 到 board 呈现
（不经过 filter adapt）
```

---

## UI 职责

| 单元 | 职责 | 不负责 |
|---|---|---|
| `filter/core` | 类型、normalize、URL codec、adapt、equals | React |
| `FilterMenu` | 加 clause | 查列表 |
| `FilterBar` | chip；op/values；条件显示 Clear；Save 触发 | 写 SQLite |
| `useListFilterSession`（名可改） | base+temp+effective；setTemp；clearTemp | Display |
| `display-options` | 呈现 + default | filters |
| `view` | CRUD；filters 读写 | chip 细节 |
| scenes | 组装 | 内联业务规则 |

**Command：** 可调用「打开 FilterMenu」；删除 FilterPicker 作为唯一实现。

**PageFrame：** toolbar 下 `filterBar` 槽；filterAction / displayAction / viewActions 分离。

### FilterBar 可见性

| 条件 | 显示 |
|---|---|
| effective 非空 | 整条 Bar + chips |
| dirty（有 temp） | Clear |
| 可 Save（effective 非空） | Save |
| 干净且 empty | 可只保留入口按钮，无 Bar |

---

## Save 状态机

```text
点 Save（effective 非空）
  ├─ 上下文 = 自定义 View
  │    选择：
  │      [覆盖当前] → update filters → clearTemp → 仍当前 View
  │      [另存为…] → 命名 → create → clearTemp → 可选 navigate
  └─ 上下文 ≠ View
       → 仅 [另存为…] → create → …
```

---

## Display 面板收敛

- 去独立「排序方向」行 → Ordering 内嵌  
- completed order → toggle  
- completed 可见性从 filter 迁入  
- 无 List/Board 控件  
- View 编辑器去 sort/group  

### View → Display 迁移（一次性）

对每条旧 View：若存在 sort/group JSON，写入 `task:view:{id}` 的 display 记录（personal 或 default，二选一写进实现说明，推荐 **default** 作底、personal 优先覆盖）。之后 **永不**再读 View 的 sort/group。

---

## 后端 / Rust

- validate filters = FilterQuery  
- run_task_view：filters 为 clause；**group/sort 输入改由前端 apply display** 或 run API 显式传 display 衍生的 sort/group **但不存 View**  
  - 推荐：list/view 查询仍接受 sort/group **请求参数**（来自当前 display 解析），与「存哪」分离  
- 迁移脚本/启动迁移：旧 filters → clause；旧 sort/group → display store 或丢弃到 default  

---

## 模块依赖

```text
filter/core
    ↑
filter/ui · scenes · view(api shapes)
display-options  ⊥  filter   （禁止交叉业务）
```

---

## 风险

| 风险 | 缓解 |
|---|---|
| URL 过长 | 紧凑 codec；clause 数量实际上限 |
| search 与 viewId 打架 | 进 View 时策略：默认清 temp 或仅当 search 针对该 view；PLAN 定：**导航到 View 默认清其他页 temp，打开时不带 temp 则干净态** |
| 旧 View 迁移丢排序 | 一次性写入 display；单测 + 抽样 |
| Clear 被理解成删 View | UI：干净态无 Clear；文案「清除临时筛选」 |
| run_view 仍读 group_by 列 | 后端忽略列；前端不传自 View |

---

## 完成后同步长期文档

- A2：FilterQuery、URL 临时、View 只 filters、Display 独占呈现  
- A3：FilterBar、Clear/Save 规则、工具条槽位  
- filter / display-options / view ARCHITECTURE  
- 可选 ADR：筛选公式与 Display 分离  

---

## 阶段划分（与 TASKS 对应）

| 阶段 | 主题 | 出口 |
|---|---|---|
| P0 | 领域 FilterQuery + URL codec + 单测 | 无 UI 也可测 |
| P1 | View/Rust filters 迁移；去掉 sort/group 真源 | 读写新契约 |
| P2 | Display 收回 completed + 呈现唯一；View 编辑器去 sort/group；迁移 sort→display | 呈现不读 View |
| P3 | session hook：base/temp/effective + 列表 adapt | 无 chip 也能筛 |
| P4 | FilterMenu + FilterBar + Clear/Save UI | 主路径可点 |
| P5 | Save 覆盖/另存；全场景接线；删旧 Command filter | 产品闭环 |
| P6 | 验收与长期文档 | AC + A2/A3 |
| P7 | 历史债清扫（serverDriven/externalFilter/旧 query/双枚举/删除清单） | 见 [优化债台账.md](./优化债台账.md) |

详细勾选见 [TASKS.md](./TASKS.md)。现状→终态检查表见 [优化债台账.md](./优化债台账.md)。
