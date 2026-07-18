# M-F-ENTITY-DETAIL · features/entity-detail

> 日期：2026-07-17  
> 状态：**decided（方案对比）** · **decide-only**  
> 路径：`src/features/entity-detail`  
> 类型：**platform（实体详情打开契约 / 抽屉宿主分发）**  
> 切分总览：**Keep**  
> 关联：navigation search · layout ShellDrawer · task/project 详情 UI · 禁全局 drawer store  

---

## A. 现网事实

### A.1 一句话

**「打开谁」的 URL 契约 + 控制器 + 壳抽屉内容分发**：  
用 search（`?task=` / `?project=`）表达抽屉目标；`useEntityDetailController` 负责 open/close/navigate；`EntityDetailDrawerHost` 按 kind 挂 `TaskDrawer` 等。

### A.2 结构（小而清晰）

```txt
entity-detail/
  model/
    entityDetailTypes.ts
    entityDetailRouteState.ts   parse/build/clear search
    entityDetailNavigation.ts   open/close drawer target；resolve 独立页 path
    useEntityDetailController.ts
  components/
    EntityDetailDrawerHost.tsx  kind → TaskDrawer / project 占位
  index.ts
```

约 10 文件 / &lt;700 行；测试覆盖 search 规则。

### A.3 真相源（正确）

| 事实 | 归谁 |
|------|------|
| 抽屉是否打开、打开哪个 id | **URL search** |
| 独立详情全页 | **path**（navigation `openTaskDetail` 等） |
| 详情业务 UI | **task/project** |
| 壳抽屉框 | **layout ShellDrawer** 包一层 |

**已删**全局 `useDrawerStore` 当真相——方向对。

### A.4 消费者

| 谁 | 用途 |
|----|------|
| list-scene / project / view / lifecycle | `openDrawer` / controller |
| layout ShellDrawer / Chrome / command host | activeDetail、Host、close |
| task create | 创建后可能打开详情 |

### A.5 已做对的

- **URL 单真相**；纯函数 parse/build 可测  
- 独立页 vs 抽屉模式分流  
- Host 只分发，不写 task 业务  
- 切分 **Keep**（不并进 task）  

### A.6 问题

| 问题 | 说明 |
|------|------|
| **navigation 与 open policy 交织** | `resolveEntityPageTarget` 调 getTaskDetail/getProjectDetail；layout 另有 `taskOpenStrategy` → **打开策略双处** |
| **Host 内 project 抽屉** | 测试显示项目可能仍是占位，与 TaskDrawer 成熟度不一 |
| **entity-detail → task/project** | Host 与 resolve 依赖域 public——可接受（platform 编排） |
| **search 校验** | 与 Router search 校验可进一步 zod 化（routes 侧） |
| **preview vs drawer** | task Preview 另一套；需文档：preview 浮层 ≠ entity-detail 抽屉 |

---

## B. 边界争议

| 候选 | 现在 | 目标 |
|------|------|------|
| search 契约 + controller | entity-detail | **Keep platform** |
| DrawerHost 分发 | entity-detail | Keep 或仅 layout 一行挂载 Host |
| TaskDrawer UI | task | **Keep task** |
| open 策略（抽屉 vs 全页） | 分散 layout + entity-detail | **收敛 task/project public policy**；entity-detail 只执行 path/search 变更 |
| 并进 navigation | — | **否**（navigation 不持 React Host） |
| 并进 task | — | **否**（多实体 + 壳契约） |
| 复活 drawer Zustand | — | **禁止** |

---

## C. 多方案对比

### 方案 E1 · 巩固现网

保持结构；补文档；project Host 补齐。

| 优点 | 缺点 |
|------|------|
| 小 | 打开策略仍可能分叉 |

**结论：** 基线。

---

### 方案 E2 · Keep 契约平台 + 策略回域（**推荐**）

```txt
entity-detail
  - search 协议（parse/build/clear）
  - useEntityDetailController（读写 URL）
  - DrawerHost 分发到 task/project public 组件

task / project
  - openEntityPolicy(target, preferredMode) → { drawer search } | { full page path }
  - 删除 layout/taskOpenStrategy 重复

navigation
  - 仅 path-only builders（openTaskDetail 等）

layout
  - ShellDrawer 只包 Host；不拥有打开业务
```

| 优点 | 缺点 |
|------|------|
| URL 契约单点；策略与实体同在 | 要收拢 open 调用点 |
| 与 T2a / navigation 纯化一致 | |

**结论：最优。**

---

### 方案 E3 · 契约并进 navigation

search 规则进 app/navigation。

| 优点 | 缺点 |
|------|------|
| 导航相关集中 | navigation 出现 DrawerHost/React；职责膨胀 |

**结论：否**（path 方言 vs 详情 search 契约可分模块）。

---

### 方案 E4 · 取消 feature，各页手写 `?task=`

| 优点 | 缺点 |
|------|------|
| 少包 | 规则复制；易回抽屉 store |

**结论：否。**

---

### 方案 E5 · Host 拆到 layout，entity-detail 只剩纯 search

| 优点 | 缺点 |
|------|------|
| platform 更纯 | Host 仍要 import TaskDrawer；layout 变厚 |

**结论：次选**；Host 留 entity-detail 更内聚「打开详情体验」。

---

## D. 推荐 = **E2**

### D.1 职责

| 负责 | 不负责 |
|------|--------|
| 详情 search 协议与 controller | 任务字段编辑规则 |
| 抽屉/关抽屉/切实体时的 URL 变换 | 全局第二真相 store |
| Host 按 kind 挂载域 Drawer | 命令业务 handlers |
| 与 path-only intent 协作打开全页 | 实现 getTaskDetail 业务 |

### D.2 协作

```txt
列表 open
  → task.openPolicy 或直接 controller.openDrawer({kind,id})
  → URL search 更新
  → ShellDrawer + EntityDetailDrawerHost
  → TaskDrawer / ProjectDrawer（域）

全页 open
  → policy → navigation path → routes 详情叶

command / QC createAndOpen
  → 同一 policy 端口
```

### D.3 与 preview

| | entity-detail 抽屉 | task preview |
|--|-------------------|--------------|
| 形态 | 侧栏抽屉 | 浮层预览 |
| 真相 | URL search | task PreviewProvider 状态（可不同） |
| 勿混 | 两套 API 文档写清 | |

### D.4 public 目标

**宜：** types、parse/build/clear、controller、Host、open/close helpers。  
**策略：** 逐步从 entity-detailNavigation 的 getDetail 迁到域 policy，本模块只消费 path/search 结果。

---

## E. 最佳实践

**Do**

- 打开/关闭只改 URL（search/path）  
- push vs replace 规则单测锁死（现有测试很好）  
- 全页 canonical path 走 navigation  
- Host 零业务  

**Don't**

- Zustand 镜像 activeDetail 当真相  
- 各页 `navigate({search: '?task='+id})` 手拼  
- layout 再实现一套 open 策略  

---

## F. 体量

整体健康。Controller ~108、Host ~55——OK。

---

## G. 迁移刀序

| 序 | 刀 |
|----|-----|
| 1 | 文档：drawer vs preview vs 全页 |
| 2 | 删除/合并 layout taskOpenStrategy → task(+project) policy |
| 3 | 统一全仓 open 入口走 controller 或 policy |
| 4 | ProjectDrawer 与 TaskDrawer 体验对齐（产品） |
| 5 | （可选）search zod 与 Router 集成 |

---

## H. 方案小结

| 方案 | 荐 |
|------|-----|
| E1 巩固 | 基线 |
| **E2 契约平台 + 策略回域** | **✅** |
| E3 并 navigation | ❌ |
| E4 取消 | ❌ |
| E5 Host 仅 layout | 次选 |

---

## I. 决议

| # | 决议 |
|---|------|
| 1 | **Keep** entity-detail |
| 2 | 目标 **E2**；URL 契约单点；策略回 task/project |
| 3 | **禁止** drawer 全局 store 真相 |
| 4 | Host 可留本包；layout 只壳 |
| 5 | decide-only |

### 开放问题

- [ ] preview 是否也要 URL 化（产品）；现可不强制  
- [ ] 是否支持 `?space=` 抽屉（现 task/project）  

---

## J. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：URL 契约、E1–E5、推荐 E2、vs preview |
