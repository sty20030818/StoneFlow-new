# M-LAYOUT · layout（产品铬架 · 多层装配）

> 日期：2026-07-17  
> 状态：**decided（经方案对比）** · 本阶段 **decide-only**  
> 路径：`src/layout/`  
> 类：chrome · **composition root（装配根）**  
> 清单：合并 `M-LAYOUT-*` 一场深谈  
> 上游：[M-APP-NAV](./M-APP-NAV.md) · [M-ROUTE](./M-ROUTE.md) · `src/layout/ARCHITECTURE.md` v4  
> **讨论格式**：边界争议 → 多方案优缺点 → 推荐 → 跨模块协作（见 §A–§E）

---

# 第一部分 · 方案讨论（本次补强）

## A. 边界争议：有什么可能不该在 layout？

先问「现网放在 layout 里的，是否错放？」——有争议才需要方案。

| 候选 | 现在在哪 | 争议 | 倾向 |
|------|----------|------|------|
| **CommandBridge slices** | `layout/command-bridge` | 算壳装配还是该进 `features/command`？ | **留 layout**：这是「壳上下文 → 命令动作」的适配层；command feature 应保持可被多种宿主装配 |
| **EntityScene + board adapters** | `layout/entity-scene` | 算页架子还是该进 shared / task？ | **留 layout（推荐）或 shared（备选）**：零业务槽位属壳页编排；adapter 可调 feature UI。进 task 会绑死「只有任务页」 |
| **useShellNavStore** | `layout/model` | 与 URL 双真相风险 | **可留但降级为纯衍生**；禁止当官方当前位置。更激进：删除 store，处处 parseShellRoute（见方案） |
| **useShellChromeData** | `layout/model` | 聚合 spaces/projects 像半个 feature | **留 layout 作壳 facade**；内部只调 public。禁止在此写业务规则 |
| **CreateDialogShell + 创建态** | layout | 创建是业务 | **宿主在 layout，内容在 feature**（TaskCreateContent…）——边界对；勿把表单逻辑塞进 Shell |
| **SettingsSidebar** | layout | 是否整个进 settings feature？ | **两可**：壳模式切换偏 chrome；设置导航内容偏 settings。推荐 **壳保留切换骨架，分区列表可逐步 settings public** |
| **Sidebar 项目树/徽章** | ShellSidebar 很厚 | 业务感强 | **UI 壳可留；数据/菜单动作必须 feature public**。厚文件是体量债，不全是边界错 |
| **config.ts 导航配置** | layout | 产品 IA 配置 | **壳导航 IA 可留 layout**；实体字段配置不进 |
| **taskOpenStrategy** | layout/model | 打开任务策略 | 边界灰：像产品规则。**中期可迁 task public**，layout 只调用 |
| **MainCard** | shared（正确） | — | **禁止**再在 layout 复制一套 |

### 可能「该进来却散落」的

| 能力 | 现状 | 建议 |
|------|------|------|
| 命令 Shortcut 层挂载 | 已在 Chrome | Keep |
| 全局危险确认 / 预览 Provider | ShellProviders | Keep 装配在 L2 |
| 会话前进后退 UI | Header + navigation | Keep：状态在 NAV，按钮在 layout |

---

## B. 分层怎么分？三种方案

### 方案 L-A · 现状精细分层（L1–L7 + Bridge）

**结构：** ShellRouteLayout → AppLayout/Providers → LayoutContent → Chrome → 零件 → Outlet → EntityScene；旁路 Bridge/Overlays。

| 优点 | 缺点 |
|------|------|
| 职责可命名；M-2 已按此拆过上帝 ShellLayout | 层数多，新人要先背地图 |
| 改侧栏不必碰 scope sync；改 bridge 不必碰 Header | 文件多，调用链长 |
| 与 routes/navigation 切割清晰 | 若纪律差，Content 仍会重新变胖 |

**成本：** 低（已是现网）。  
**适合：** 长期桌面壳、多 feature 装配。

---

### 方案 L-B · 合并为「三层壳」（激进简化）

**结构：**

```txt
ShellRoot（scope sync + providers 合一）
  → ShellFrame（header+sidebar+main+footer 单树或少数文件）
  → Outlet / 页内自理 EntityScene
```

| 优点 | 缺点 |
|------|------|
| 好懂、文件少 | 容易回到 **上帝组件**（历史痛点） |
| 少跳转 | Bridge/Overlays/EntityScene 难再干净插入 |
| | Header/Sidebar 巨石更难拆责任 |

**成本：** 高（反向合并 + 回归风险）。  
**适合：** 极小产品；**不适合** StoneFlow 当前复杂度。

---

### 方案 L-C · 按「域文件夹」切 chrome（中道变体）

**结构：** 保留装配链，但物理目录改为：

```txt
layout/
  shell-route/   # L1
  providers/     # L2
  chrome/        # L4–L5 Header Sidebar…
  bridge/
  overlays/
  entity-scene/
  model/
```

少「逻辑层名」，多「文件夹域」。

| 优点 | 缺点 |
|------|------|
| 目录即地图，比散落 Shell*.tsx 好找 | 仍要遵守调用顺序，否则假整齐 |
| 与 L-A 兼容，可渐进搬家 | 一次搬目录有 PR 噪音 |

**成本：** 中（rename + import）。  
**适合：** 大文件拆分时顺带做。

---

### 方案 L-D · EntityScene 迁 shared（边界变体）

**只动 L7：** EntityScene + 通用槽位 → `shared/components`；board adapter 留 layout 或各 feature。

| 优点 | 缺点 |
|------|------|
| 页架子更「无业务」 | shared 防火墙压力：adapter 易把 feature 知识渗进 shared |
| 非壳页也能复用场景架子 | 多数页只在壳内用，收益有限 |

**成本：** 中。  
**推荐：** **暂不**；EntityScene 留 layout，MainCard 已在 shared 足够。

---

## C. 推荐方案（最优）

| 维度 | 推荐 |
|------|------|
| **分层模型** | **L-A（现网 L1–L7）** 作为心智与依赖方向 |
| **目录** | 短期保持；治理巨石时 **可选靠拢 L-C**（chrome/ 等夹） |
| **EntityScene** | **留 layout**（不选 L-D） |
| **简化合并** | **明确拒绝 L-B** |
| **灰区** | `taskOpenStrategy` → 中期 **迁 task public**；Settings 分区内容 → 可逐步 settings |
| **nav store** | 保留但文档钉死「仅衍生」；不选「全删 store」除非 Header/Sidebar 实测可承受处处 parse |

**一句话：**  
**保持精细装配分层 + 严守「壳不拥有领域」+ 用拆文件而不是砍层来治理复杂度。**

---

## D. 跨模块怎么协作（联动图）

```txt
                    ┌─────────────┐
                    │   routes    │  匹配 URL · 薄页 · remember 调用点
                    └──────┬──────┘
                           │ scope + parse 后的 shellRoute
                           ▼
┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│ navigation   │◄──►│   layout    │───►│  features/*  │
│ path/intent  │    │  装配与铬架  │    │  public only │
│ memory 规则  │    │  bridge     │    │  UI/hooks    │
└──────────────┘    └──────┬──────┘    └──────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   shared    │  MainCard · base 零件
                    └─────────────┘
```

| 协作 | 方向 | 契约 |
|------|------|------|
| routes → layout | routes 调 `ShellRouteLayout(scope, shellRoute)` | scope 由 route 定；shellRoute 由 NAV parse |
| layout → navigation | 跳转/历史 | 只调 intent、path、sessionHistory API |
| layout → features | 装配 | **仅 public**；Provider、Bridge、Overlays、Chrome 数据 |
| features → layout | **原则上不依赖** | feature 不 import layout（避免环）。页只要 slot，用 EntityScene 在页内或由页组合 shared MainCard |
| layout → shared | 零件 | 单向 |
| command feature ↔ bridge | runtime 在 feature；**actions 实现切片在 layout** | feature 定义「要什么动作形状」；layout 提供「壳能做什么」 |

### 典型联动（谁有问题找谁）

| 现象 | 先查 |
|------|------|
| 侧栏高亮错 | URL？parse？nav store 没跟上 L1？ |
| 点了没跳对页 | intent/path（NAV）还是 Sidebar 手拼？ |
| 命令能显示不能执行 | Bridge deps 是否注入？feature public 是否挂了？ |
| 列表架子乱 | EntityScene 槽 vs feature list-scene wiring |
| 创建弹窗有壳无逻辑 | Overlays 宿主 vs feature CreateContent |

---

## E. 最佳实践清单（do / don't）

**Do**

- 新代码能回答「在 L几 / Bridge / Overlays / model？」  
- 跳转走 NAV intent；数据走 feature public  
- 命令扩展走 **bridge slice**  
- Provider 只放跨页真正共享的能力  
- 巨石按 **UI 区块**拆，不砍层合并回上帝文件  

**Don't**

- Sidebar/Header 里写领域规则或 invoke  
- nav store 当 URL 真相  
- EntityScene 内拉全域业务 Query  
- feature import layout（环）  
- 为「简单」合并 L-B  

---

# 第二部分 · 现网地图与拆分（前文保留）

## 0. 先建立心智

layout **不是**「又一个业务 feature」，而是：

> **主窗工作区的装配车间**：把 URL 语义、跨页 Provider、命令桥、侧栏顶栏、主区出口、弹层挂载 **按层叠好**；业务实现仍在 `features/*`。

层多是为了 **单一职责**，不是为了炫技。

---

## 1. 身份

| 项 | 内容 |
|----|------|
| **一句话** | 工作区铬架 + 跨 feature **装配** + 页级槽位（EntityScene）；不拥有实体业务规则 |
| **六边形** | 最外圈 **composition / UI 壳适配**；通过 feature **public** 调入用例 |
| **负责** | Provider 嵌套 · 命令/批量接线 · Header/Sidebar/Main/Footer/Drawer · Overlays 挂载点 · EntityScene 槽位与 board adapter 选择 · 壳级 dialog 宿主 |
| **不负责** | task/project 领域规则 · Query key 真相 · 导航 path 规则（→ navigation）· 路由匹配（→ routes）· shadcn 原子与 MainCard 结构零件（→ shared） |
| **禁止** | 组件内裸 `invoke` · 跨 feature 深路径 · 恢复 SpaceLayout / 全局 drawer store 当打开真相 |

---

## 2. 分层全景（由外到内 · 必读）

### 2.1 运行时装配链（现网事实）

```txt
routes/_shell/{all|spaces}/route
  │  useRememberCurrentShellRoute(scope)     ← navigation
  ▼
ScopedShellRouteLayout                       ← routes（极薄）
  │  parseShellRoute(location)               ← navigation
  ▼
┌─ L1  ShellRouteLayout ─────────────────────────────────────┐
│  工作区边界：workspace sync · 非法 space redirect            │
│  nav store 衍生同步 · setActiveScope · ShellRouteProvider    │
│  挂 L2 AppLayout + children(Outlet)                          │
└────────────────────────────────────────────────────────────┘
  ▼
┌─ L2  AppLayout ────────────────────────────────────────────┐
│  ShellProviders（selection/submit/filter/danger/preview）   │
│  ShellBulkActionBoundary                                     │
│  → children                                                  │
└────────────────────────────────────────────────────────────┘
  ▼
┌─ L3  ShellLayoutContent ───────────────────────────────────┐
│  壳「主体编排」：拉 chrome 数据 / 创建弹窗态 / 命令系统        │
│  → ShellChrome + ShellOverlays                               │
│  （SyncStatusProvider · useUpdateEvents 等壳级副作用）        │
└────────────────────────────────────────────────────────────┘
  ▼
┌─ L4  ShellChrome ──────────────────────────────────────────┐
│  可见骨架拼装：Header + Sidebar|SettingsSidebar + Main        │
│  + Footer + Drawer + CommandShortcutLayer                    │
└────────────────────────────────────────────────────────────┘
  ▼
┌─ L5  Chrome 零件 ──────────────────────────────────────────┐
│  ShellHeader / ShellSidebar / ShellMain / ShellFooter /      │
│  ShellDrawer · header/* · sidebar/*                          │
└────────────────────────────────────────────────────────────┘
  ▼
┌─ L6  Outlet 薄页（routes）→ feature page ───────────────────┐
│  其内常用：MainCard(shared) + EntityScene(layout) + board    │
└────────────────────────────────────────────────────────────┘
  ▼
┌─ L7  EntityScene + board adapters ─────────────────────────┐
│  槽位编排（header/toolbar/board/footer…）· 选 Task/Project/  │
│  Lifecycle adapter → 调用 feature 看板 UI                    │
└────────────────────────────────────────────────────────────┘
```

**旁路（与 L3/L4 平行、由 Content 挂上）：**

| 旁路 | 路径 | 职责 |
|------|------|------|
| **CommandBridge** | `command-bridge/` | 把壳上下文 **切片** 成 `ShellCommandActions`，注入 command runtime |
| **Overlays** | `overlays/ShellOverlays` | 创建任务/项目 dialog、更新日期等 **挂载点**（内容来自 feature） |
| **model/** | `layout/model/*` | 壳用 store/context/hooks（nav 衍生、dialog、chrome 数据、命令宿主） |

### 2.2 两层「layout」勿混（再钉一次）

| 名称 | 路径 | 是什么 |
|------|------|--------|
| **产品铬架** | `src/layout/**` | 本模块：侧栏顶栏主区… |
| **路由 layout** | `routes/_shell/**/route.tsx` | 尽量薄：remember + 挂 ShellRouteLayout |

### 2.3 各层职责表（最佳实践核心）

| 层 | 允许 | 禁止 |
|----|------|------|
| **L1 ShellRouteLayout** | sync、scope IPC、nav store **跟随 URL**、非法 space redirect、提供 ShellRoute context | 画侧栏细节、写业务 mutation、堆命令菜单 UI |
| **L2 AppLayout / Providers** | 稳定 Provider 树、Bulk 边界 | 业务判断、读一堆 query 拼 UI |
| **L3 ShellLayoutContent** | **组合** data hooks → 传给 Chrome/Overlays；壳级事件订阅 | 再长成上帝文件：业务分支、大 JSX 树 |
| **L4 ShellChrome** | 区域拼装、settings 模式切换骨架 | 自己 fetch 列表、实现命令 actions |
| **L5 Header/Sidebar/…** | 展示与交互；调用 **intent** / public hooks | 手拼 path、深路径 feature、invoke |
| **CommandBridge** | 纯切片 compose；依赖袋由上层注入 | 切片里写厚业务（应调 feature public） |
| **Overlays** | 开关与宿主；children 用 feature 内容组件 | 在 overlay 文件实现完整创建表单逻辑 |
| **EntityScene** | 槽位 + 选 adapter | 直接 invoke；EntityScene 变第二个 feature |
| **model/** | 壳 UI 态、chrome 聚合 hook、命令宿主胶水 | 服务端列表真相（应用 Query）；URL 第二真相 |

---

## 3. 最佳实践（点到为止 · 可多想一层）

### 3.1 装配根原则

1. **layout 只装配，不拥有领域。**  
2. **只依赖 feature public**（及 settings contract）。  
3. **URL 真相在 Router**；`useShellNavStore` 仅是 **衍生缓存**（高亮、方便传参），URL 变了必须跟上（L1 同步）。  
4. **抽屉打开谁** = URL search + entity-detail，禁止全局 drawer store 复活。  
5. **新壳能力落点：**  
   - 只要全壳都能用 → Provider 进 L2 或 Content 明确挂载  
   - 只要命令能调 → **bridge slice**，勿堆进 Sidebar  
   - 只要弹层 → Overlays 挂载 + feature 内容  
   - 只要列表页架子 → EntityScene 槽，业务在 feature  

### 3.2 组合优于布尔丛林

- Header/Sidebar 已偏厚：新模式优先 **拆子组件 / 显式 variant**（设置模式已用 SettingsSidebar 切换，方向对）。  
- 避免 `ShellSidebar({ isX, isY, isZ })` 继续膨胀。  
- Provider 对外给 feature 的是 **稳定能力**；壳内 model 知道怎么存。

### 3.3 数据从哪来

| 数据 | 从哪来 |
|------|--------|
| 当前 section/scope | URL → parse →（可选）nav store 衍生 |
| 侧栏 spaces/projects | **feature public hooks**（经 `useShellChromeData` 聚合） |
| badges | feature/settings Query 路径（已收口方向） |
| 命令能否执行 | command runtime + bridge 注入的上下文 |
| 列表 board 数据 | **页面 feature** 配好 props 给 EntityScene，不是 EntityScene 自己拉全域 |

`useShellChromeData` = **壳用聚合 facade**（允许），但内部应继续调 public，不复制业务规则。

### 3.4 CommandBridge 纪律

```txt
deps（稳定引用袋）
  → slices/*（小函数，调 public / intent）
  → composeShellCommandActions
  → command runtime
```

- 新增命令动作：优先 **新 slice 或扩现有 slice**，改 `useShellCommandSystem` 只做接线。  
- slice **禁止**变成第二个 task feature（复杂规则下放 task public）。

### 3.5 EntityScene 纪律

- 槽位：breadcrumb / actions / toolbar / notices / board / footer / bulk…  
- `boardKind` 选 adapter；adapter 可依赖 feature 看板 UI。  
- **列表 wiring**（filter/selection/preview 注册）在 feature hooks（如 `useTaskListScene`），不在 EntityScene。

### 3.6 与 NAV / ROUTE 协作（已谈模块）

| 场景 | layout 做什么 |
|------|----------------|
| 侧栏点收件箱 | L5 调 `openSection` → navigate；**不**自己记 memory |
| 命令打开项目 | bridge nav slice → intent；command UI 在 feature |
| 顶栏后退 | Header 用 sessionRouteHistory + history.go |
| 渲染主区 | L4 Main 的 children = Outlet 已由 routes 填好 |
| 高亮侧栏 | 读 shellRoute / activeSection（来自 URL 衍生） |

---

## 4. 目录 ↔ 层映射

```txt
src/layout/
├── ShellRouteLayout.tsx          L1
├── AppLayout.tsx                 L2 入口
├── ShellProviders.tsx            L2
├── ShellBulkActionBoundary.tsx   L2
├── ShellLayoutContent.tsx        L3
├── ShellChrome.tsx               L4
├── ShellHeader.tsx · ShellSidebar.tsx · ShellMain.tsx · ShellFooter.tsx · ShellDrawer.tsx  L5
├── header/ · sidebar/            L5 零件
├── SettingsSidebar.tsx · CreateDialogShell.tsx
├── command-bridge/               旁路 Bridge
├── overlays/                     旁路 Overlays
├── entity-scene/                 L7
├── model/                        壳 model / 胶水 hooks
├── config.ts                     壳配置（偏厚，见拆分）
└── ARCHITECTURE.md
```

MainCard 结构体在 **`shared/components/main-card`**，layout **消费**不重复造轮子。

---

## 5. 大文件拆分计划（decide · 后写）

> 全目录约 **73 文件 / 7500+ 行**（含测）。真·巨石在 **L5 与命令胶水**。

| 文件 | ~行 | 优先级 | 建议 |
|------|-----|--------|------|
| **ShellSidebar.tsx** | **651** | P0 | 拆：`SidebarNavSections`（主列表）· `SidebarProjectsBlock` · `SidebarFooterBlock` · 容器只拼装；上下文菜单已部分在 `sidebar/` |
| **config.ts** | **561** | P0 | 按域拆：`navConfig` · `settingsNav`（已有 settingsNav.ts 可归并）· `keyboard/chrome 常量`；避免单文件配置天堂 |
| **useShellCommandSystem.ts** | **492** | P0 | 拆：`useShellCommandContext`（上下文袋）· `useShellCommandRuntimeHost`（挂 runtime/menu）· bridge 调用保留薄编排 |
| **ShellHeader.tsx** | **445** | P0 | 拆：`HeaderSpaceSwitcher` · `HeaderSearchEntry` · `HeaderActions`；后退已有 `header/NavBackForward` 方向 |
| useSidebarSettingsStore | 240 | P1 | 可接受；再涨再拆 read/write |
| useDialogStore | 228 | P1 | 创建/自定义日期等按域拆 store 或模块 |
| EntityScene.tsx | 183 | P1 | compound 已拆函数组件；可文件级拆 Header/Toolbar/Board 子文件 |
| ShellMain / Chrome / Content | 159–201 | P1 | Content 禁止再塞业务；维持编排 |
| ShellRouteLayout | 123 | OK | 保持工作区边界清晰 |

### 拆分原则（layout 专用）

1. **先按 UI 区块 / 用例切**，不要按「所有 hooks 一个夹」。  
2. 拆完后 **ShellSidebar 应是 &lt;200 行的装配文件**。  
3. 配置与渲染分离：config 不 import React 组件树。  
4. `useShellCommandSystem` 的 deps 袋继续 **上层稳定化**，避免 fresh-deps 回流。  
5. **不**为拆而把业务迁进 layout；拆的是壳 UI 与胶水。

### 改代码时验收（govern-now 再用）

- [ ] 上表 P0 均 &lt; 300 行或有例外说明  
- [ ] 装配链 L1→L7 仍清晰  
- [ ] 侧栏/顶栏/命令板/创建弹窗/抽屉 URL 冒烟  
- [ ] 无新深路径、无第二路由真相  
- [ ] `bun run check`  

---

## 6. 反模式（layout 高发）

| 反模式 | 后果 |
|--------|------|
| 业务 if/else 堆进 Sidebar/Header | 壳无法删、feature 无法测 |
| 新命令写在 Sidebar onClick 而非 bridge | 命令板/快捷键双轨 |
| nav store 当 URL 真相 | 刷新/分享链接错乱 |
| EntityScene 内 useQuery 拉全局业务 | 第二 data 层 |
| Overlays 实现完整表单 | 与 feature 创建页分叉 |
| 恢复 SpaceLayout 上帝入口 | 历史倒车 |
| shared 反向依赖 layout | 防火墙破裂 |

---

## 7. 路径串联（layout 视角）

### 7.1 侧栏 → 收件箱

```txt
L5 ShellSidebar click
  → openSection(scope,'inbox')     # navigation intent
  → navigate
  →（route 薄页 + remember 在 routes，layout 不写盘）
  → L1 跟 URL 同步 nav store
  → L5 高亮 inbox
  → Outlet = TaskListSceneView     # feature
```

### 7.2 命令面板打开

```txt
L3 useShellCommandSystem
  → bridge slices compose actions
  → feature/command Runtime + Menu UI
  → 用户选命令 → slice 调 intent 或 feature public mutation
```

### 7.3 设置模式

```txt
URL …/settings
  → L4 ShellChrome 切 SettingsSidebar（非主侧栏）
  → Outlet = settings page feature
  → 「返回应用」用进入设置前记录的工作 path（Content 内 ref）
```

---

## 8. 治理决议（含方案对比结论）

| 项 | 决议 |
|----|------|
| 层模型 | **采用方案 L-A（L1–L7）**；拒绝 L-B 合并上帝壳；目录可渐进 L-C |
| EntityScene | **留 layout**（不选 L-D 迁 shared） |
| 角色 | 装配根；非 domain feature |
| 灰区迁出 | `taskOpenStrategy` 中期 → task public；Settings 内容可逐步 settings |
| 数据 | chrome 聚合允许；领域规则在 feature |
| 命令 | **只经 Bridge slices 扩展** |
| 双 layout | 产品铬架 vs 路由 layout 勿混 |
| 大文件 | 拆文件不砍层；P0 见 §5；**先谈后写** |
| 与 NAV/ROUTE | 跳转/记忆归 NAV；匹配归 ROUTE；壳只消费 |
| 讨论方法 | 以后每场必须有多方案优缺点（见计划 §2.2） |

### 开放问题（park）

- [ ] `config.ts` 561 行是否部分迁 settings/feature 配置（倾向：壳导航配置留 layout，实体配置不进）  
- [ ] `ShellLayoutContent` 是否再拆「CommandHost 子组件」仅编排（可随 command system 拆分一起做）  
- [ ] MainCard 是否全部只从 shared 引用（现状是；禁止 layout 再复制一套）  

---

## 9. 讨论达标清单

- [x] 多层职责可讲清  
- [x] 新能力落点规则  
- [x] 与 navigation/routes 边界  
- [x] CommandBridge / EntityScene / Overlays 纪律  
- [x] 大文件拆分优先级  
- [x] 反模式列表  

---

## 10. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：L1–L7 层模型、实践、路径、P0 拆分 |
