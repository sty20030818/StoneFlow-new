# M-F-FILTER · features/filter

> 日期：2026-07-17  
> 状态：**decided（方案对比 · 切分 Keep）** · **decide-only**  
> 路径：`src/features/filter`（仅 4 文件，小平台）  
> 类型：**platform（页筛选总线）+ 现含 task 控制器**  
> 切分总览：filter **Keep**，不与 display-options 合并  
> 关联：display-options · selection · command · task list-scene · layout Header  

---

## A. 现网事实

### A.1 两块能力（别混）

| 块 | API | 职责 |
|----|-----|------|
| **页筛选总线** | `PageFilterProvider` · `useRegisterPageFilterController` · `usePageFilterContext` | 当前页向壳/命令申报「筛选状态与动作」 |
| **任务列表控制器** | `useTaskPageFilterController` | **客户端**按 status/priority/date/project/完成态过滤 `TaskListItem[]` |

另有纯函数：`hasTaskDate` / `isTaskCompleted` / `resolveTaskDateValue`（与 task 语义相关）。

### A.2 装配

```txt
layout ShellProviders → PageFilterProvider
task list-scene / ProjectPage / ViewsPage…
  → useTaskPageFilterController(...)
  → useRegisterPageFilterController(controller)
layout Header / CommandMenu / bridge
  → usePageFilterContext() → openFilterPicker / applyFilter / …
```

### A.3 与 display-options 的区别（切分关键）

| | **filter** | **display-options** |
|--|------------|---------------------|
| 管什么 | **哪些任务算进列表**（条件） | **怎么呈现**（分组/排序/列可见） |
| 状态形态 | 页内 controller 状态 | 常持久化 per pageKey |
| 命令 | openFilterPicker、clearAll… | 较少进全局命令 |
| 并包？ | **否**（总览已否） | 否 |

### A.4 已做对的

- **注册式**与 selection 同构：页注册、壳消费  
- 极小包、无 layout 倒依赖  
- 和 display-options **职责可分清**  
- 切分总览：虽小也 Keep  

### A.5 问题

| 问题 | 说明 |
|------|------|
| **平台包内嵌 task 专用 controller** | 类似 bulk 旧病：filter 知道 TaskListItem 过滤细节 |
| **纯函数挂在 Provider 文件** | 可迁 model 纯文件 |
| **无 project/lifecycle 专用 controller** | 其它页或不用或自建——可扩展性靠「控制器在域」 |
| **与 view 服务端 filters** | 视图定义里的 filters ≠ 本页即时 filter UI；勿混 |
| **client filter vs server query** | 现网 list 多先拉再滤；大列表后议是否下推 query（产品/性能） |

---

## B. 边界争议

| 候选 | 现在 | 目标倾向 |
|------|------|----------|
| PageFilterProvider + 注册协议 | filter | **Keep platform** |
| PageFilterState/Kind 类型 | filter（偏 task 字段） | 可保留通用形状；或泛化 |
| useTaskPageFilterController | filter | **迁 task**（F2）或 Keep 过渡 |
| date/status 纯函数 | filter | **task model** 更合适 |
| display-options | 独立 | **永不并入 filter** |
| Header 筛选 UI | layout | 壳展示；状态来自 context |

---

## C. 多方案对比

### 方案 F1 · 巩固现网

controller 继续放 filter；只整理文件。

| 优点 | 缺点 |
|------|------|
| 零迁移 | 平台永远绑 task |

**结论：** 可过渡。

---

### 方案 F2 · 总线留 filter，task 控制器回 task（**推荐**）

```txt
features/filter
  PageFilterProvider / register / context
  通用类型：PageFilterController 接口（state/actions/capabilities）
  （可选）与实体无关的工具

features/task
  useTaskPageFilterController
  task 日期/完成纯函数
  list-scene 继续 register

其它域若要页筛选
  useXxxPageFilterController + register
```

| 优点 | 缺点 |
|------|------|
| 与 selection L2 / bulk B3 同构 | 小搬迁 |
| 卸 task 时过滤逻辑一起走 | |
| filter 保持可被命令/壳使用的稳定端口 | |

**结论：长期最优。**

---

### 方案 F3 · 并入 display-options

| 优点 | 缺点 |
|------|------|
| 少一个包 | **条件与展示搅在一起**；持久化模型不同 |

**结论：否**（切分总览一致）。

---

### 方案 F4 · 并入 task

| 优点 | 缺点 |
|------|------|
| controller 回家 | Provider 被 task 绑架；project 页筛选也要用总线 |
| | 壳/command 依赖 task 仅因 filter |

**结论：否整包并**；只迁 **task 控制器**（F2）。

---

### 方案 F5 · 并入 command

| 优点 | 缺点 |
|------|------|
| 命令常开筛选 | 筛选状态服务列表，不单服务命令菜单 |

**结论：否。**

---

## D. 推荐 = **F2**

### D.1 职责

| filter 负责 | 不负责 |
|-------------|--------|
| 页级筛选 **注册总线** 与 Controller 契约 | 任务实体规则、mutation |
| 供 Header/Command 读取的 context | 分组/排序/列（display-options） |
| | 视图定义里的服务端 filters（view domain） |

| task 负责（目标） | |
|-------------------|--|
| useTaskPageFilterController + 过滤纯函数 | 在 list-scene 内 register |

### D.2 协作

```txt
list-scene / ProjectPage / ViewsPage
  controller = useTaskPageFilterController(tasks, capabilities, …)
  useRegisterPageFilterController(controller)
  board 使用 controller 过滤后的 tasks
       +
display-options.apply(…）  // 另一管道，先后顺序在 scene 文档化

Header / CommandMenu
  usePageFilterContext() → openFilterPicker / apply / clear

layout
  只挂 PageFilterProvider
```

### D.3 与已定模块

| 模块 | 关系 |
|------|------|
| **display-options** | 正交；scene 里 **先 filter 再 display apply**（或固定顺序写清） |
| **selection** | 过滤后列表上的选择；清空筛选是否清选择由 scene 定 |
| **command C3** | handler 调 filter context actions，不实现过滤算法 |
| **view** | 定义 filters ≠ 页即时 filter；run 结果仍可叠加页 filter |
| **切分** | Keep 小平台；不并 display |

### D.4 public 目标

**filter：** Provider、register、context、Controller 类型、ApplyInput、Kind。  
**task：** `useTaskPageFilterController` + 相关纯函数。  
过渡：filter index 可 re-export task controller 一窗再删。

---

## E. 最佳实践

**Do**

- 注册式：一页一 controller  
- capabilities 声明页支持哪些维  
- 与 display-options 管道分离  
- 大列表再评估服务端 filter  

**Don't**

- 把分组/排序塞进 filter state  
- 在 layout 写过滤算法  
- 为小而把 filter 并进 task 整包  

---

## F. 体量

全包 ~438 行，健康。迁 controller 后 filter 更瘦。

---

## G. 迁移刀序

| 序 | 刀 |
|----|-----|
| 1 | 文档钉死 filter vs display-options |
| 2 | 纯函数 + useTaskPageFilterController → task |
| 3 | filter 仅总线；index 收窄 |
| 4 | （可选）泛化 Controller 减少 task 类型泄漏进 filter 类型文件 |
| 5 | list-scene 注释：filter → display 顺序 |

---

## H. 方案小结

| 方案 | 荐 |
|------|-----|
| F1 巩固 | 过渡 |
| **F2 总线 + task 控制器回家** | **✅** |
| F3 并 display-options | ❌ |
| F4 整包并 task | ❌ |
| F5 并 command | ❌ |

---

## I. 决议

| # | 决议 |
|---|------|
| 1 | **Keep** `features/filter`（切分正确，虽小） |
| 2 | 目标 **F2**：平台总线；task 专用逻辑回 task |
| 3 | **永不**与 display-options 合并 |
| 4 | layout 只挂 Provider；命令走 context |
| 5 | decide-only |

### 开放问题

- [ ] 过滤是否下推到 list query（性能）；现网客户端滤保持直到有数据量问题  
- [ ] project 页「仅本项目」是否用 capabilities 关掉 project 维（现网已有能力位）  

---

## J. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：与 display 分界、F1–F5、推荐 F2 |
