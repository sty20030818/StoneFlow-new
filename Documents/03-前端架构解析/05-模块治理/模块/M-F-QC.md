# M-F-QC · features/quick-create（快速创建窗）

> 日期：2026-07-17  
> 状态：**decided（重点 · 方案对比 · 复用主窗能力）** · **decide-only**  
> 路径：`src/features/quick-create` · 路由：`routes/quick-create.tsx`  
> 类型：**window**（独立窗完整栈）  
> 规范：[`05-模块设计规范`](../05-模块设计规范.md) · T2 · task T2a · command C3  

---

## A. 产品定位（为什么最重要）

| 维度 | 说明 |
|------|------|
| **入口** | 全局快捷键 / 系统级捕获 → **独立 Tauri 窗**，不是主壳里的一个 Dialog |
| **体验** | 极速记一条、可连续创建、可搜最近任务/项目并跳转、可扩展元数据 |
| **与主窗关系** | **数据与规则应同源**；**会话/几何/显隐时序**必须独立 |
| **现状** | 固定壳 Launcher 已落地：session + 固定壳 UI + 复用 task/global-search；无测高 |

**设计北极星：**

> QC = **窗专属壳（session + 固定 720×500 + 原生材质）** + **复用主产品能力（创建任务规则、搜索端口）**；  
> 禁止复制第二套 task 领域，禁止测高/commitLayout，禁止 QC import 主 layout。

---

## B. 现网事实

### B.1 分层（终态）

```txt
routes/quick-create → QuickCreatePage
  → SessionProvider（phase / bridge / 与 Rust 会话）
  → DomainProvider（draft / 搜索 / 提交 / 派生）
  → PresentSession（preparing → present）
  → Panel（固定壳：Composer / Advanced / Create / Results / Footer）
```

| 层 | 职责 | 纯度 |
|----|------|------|
| **api** | 窗 IPC（open context、list projects、open target、session）+ 适配 task/GS | 窗 IO 适配器 |
| **session** | session phase、外部事件、present | 窗专属 |
| **domain** | 编辑态、搜索 effect、提交动作 | 偏厚；创建/搜索走主产品端口 |
| **ui** | 固定壳表面 | UI |
| **model** | 类型 | 宜纯 |

### B.2 已与主产品有的弱复用

- 展示：`TaskStatusIndicator` / `PriorityIcon` / `TASK_PRIORITY_OPTIONS` / `formatTask*` / `getSpaceVisual`（经 public）  
- **未复用：** `TaskCreateContent` 表单 schema、`useCreateTaskMutation`、metadata-fields 主路径、submit registry、global-search feature、主窗 command 注册  

### B.3 主窗创建 vs QC（对照）

| 能力 | 主窗 | QC |
|------|------|-----|
| 宿主 | layout Overlay + Dialog | 独立窗 + session |
| 表单 UI | `TaskCreateContent` + rhf/zod | 自研 Composer + domain draft |
| 提交 | `useCreateTaskMutation` + submit intents | `quick_create` API / domain submit |
| 字段控件 | TaskCreateMetaActions + metadata-fields | `controls/*` 自研一套 |
| 搜索/跳转 | global-search / 导航 | `quick_create_search` + open target |
| 连续创建 | 部分（submit continue） | 一等公民 |
| 几何 | 固定 Dialog | **测高 + commitLayout + present**（不可省） |

### B.4 边界争议

| 候选 | 争议 | 倾向 |
|------|------|------|
| QC 是否应共用 TaskCreateContent | 一表单两宿主 vs 交互不同（搜索面板、连续创建、键盘流） | **抽共享「创建内核」**，两宿主各包一层（见方案） |
| 搜索 | 用 global-search 还是 QC api | **端口复用查询能力**；UI 与 limit/布局可不同 |
| 提交 | 主 mutation vs quick_create 命令 | **领域写入最终同一 usecase**；窗可走专用 command 但映射同一规则 |
| 是否进主 layout | 绝不 | **window 独立** |
| domain reducer 340 行 | 是否过大 | 拆 draft/search/submit 子域 |
| 未来功能往哪加 | 全堆 domain/UI | **先问：主窗是否已有端口可复用** |

---

## C. 多方案 · 整体架构

### 方案 Q1 · 双轨平行（现网巩固）

QC 继续自研表单+控件+提交；只复用图标/label。

| 优点 | 缺点 |
|------|------|
| 互不影响、窗时序稳 | **每加字段改两处**；规则易漂移 |
| | 与「复用主页面能力」相悖 |

**结论：** 不可作长期终点。

---

### 方案 Q2 · QC 直接嵌 TaskCreateContent（硬复用）

窗里塞主窗创建表单组件。

| 优点 | 缺点 |
|------|------|
| 代码少 | 主窗表单绑 Dialog/submit registry/关窗逻辑；**键盘与搜索面板难融** |
| | 易把主 layout 概念拖进 QC |

**结论：** 否（整页硬嵌）。允许 **抽出来的无壳内核** 被 QC 用。

---

### 方案 Q3 · 共享「任务创建内核」+ 双适配器（**推荐**）

```txt
features/task（或 task/create 内核）
  model:  create schema / default values / toCreateInput / 校验规则
  hooks:  useCreateTask（统一 mutation + invalidate）
  components: TaskCreateFields（纯字段区，无 Dialog）
  ports:  CreateTaskHost 接口（onSubmit intents, focus, optional）

features/quick-create
  runtime + layout（窗专属）  ✅ 不动原则
  domain:  会话级 draft 编排、连续创建、与 search 结果焦点合并
  ui:      Composer 可组合 TaskCreateFields + QC 结果板
  api:     窗生命周期 +（可选）search；create 调 task 统一写入

主窗
  CreateDialogShell + TaskCreateContent 改为「Dialog 适配器 + 同一 Fields/内核」
```

| 优点 | 缺点 |
|------|------|
| **规则/mutation/字段一处**；两宿主体验可不同 | 要抽一层内核，有一次性重构 |
| 符合高内聚：创建属 task 域 | QC domain 仍要编排搜索+焦点 |
| 扩展新字段：主窗+QC 同步 | |
| 不破坏窗 session/几何 | |

**结论：长期最优。**

---

### 方案 Q4 · QC 变「主窗无边框模式」（极端）

同一 SPA 路由，系统快捷键只聚焦/弹出主窗区域。

| 优点 | 缺点 |
|------|------|
| 复用最大 | **丢掉独立窗测高/置顶/失焦关闭** 等产品形态；大改 Tauri 方案 |

**结论：** 除非产品放弃独立窗，否则否。

---

## D. 推荐目标 = **Q3 + 窗专属层保留**

### D.1 职责纯化

| 层/模块 | 负责 | 不负责 |
|---------|------|--------|
| **QC runtime/layout/api(窗)** | session、present、resize、close 原因、open context 拉取 | 任务字段业务规则副本 |
| **QC domain/ui** | 焦点在「创建 vs 结果」、连续创建、QC 键盘流、组合 UI | 第二套 priority/status 语义 |
| **task 创建内核** | schema、mutation、字段组件、create 校验 | 窗几何 |
| **project/space** | options、视觉 public | QC 私有复制 |
| **metadata-fields** | 日期等控件 public | QC 自研平行 DateControl（长期收敛） |
| **global-search / QC search** | 查询端口可共用后端或 facade | 强绑主窗 Header UI |
| **主 layout** | 不出现在 QC 依赖里 | — |
| **command** | 可「打开 QC 窗」；窗内快捷键可用 QC 本地或瘦注册 | 主壳 Bridge 上帝 |

### D.2 复用矩阵（主窗能力 → QC）

| 主窗能力 | 复用方式 | 优先级 |
|----------|----------|--------|
| 创建校验 / DTO 映射 | **task create model** 单源 | P0 |
| 创建 mutation + 缓存失效 | **useCreateTask** 单源（QC api 仅委托或废弃重复 invoke） | P0 |
| 状态/优先级/placement 选项与图标 | **已有 public 指示器/options**；控件壳可 QC 自有 | P0 |
| 日期/提醒字段 | **metadata-fields** 控件，QC 换 trigger 样式 | P1 |
| 提交 intents（create / continue / open） | 语义对齐 submit feature；QC 用同名动作不必挂主 Shell SubmitRegistry | P1 |
| 项目/空间列表 | space/project **public hooks 或 open context 快照** | P0 已有快照；实时刷新走 public |
| 全局搜索 | 抽 `searchTasksProjects(q)` 端口；QC limit=3 UI 自管 | P1 |
| 打开任务/项目 | **task/project open policy + navigation path**；QC 只调 public（可 IPC 回主窗） | P0 |
| 列表 Board/Row | **不整板搬进 QC**；结果行可用轻量 adapter + 同指示器 | P1 |
| 主壳 EntityScene / Sidebar | **不复用** | — |
| Command 菜单全家桶 | **不整菜单搬进 QC**；可选最少快捷键表 | P2 |

### D.3 与主窗协作（跨进程/跨窗）

```txt
[主窗] 全局快捷键 / 命令 “打开 QC”
    → Tauri 显示 quick-create 窗

[QC 窗] 创建成功
    → 写库（与主窗同一 usecase）
    → 事件/invalidate（主窗 Query 更新）
    → 可选：createAndOpen → 主窗 navigate（IPC / deep link）

[QC 窗] 选中搜索结果打开
    → openTarget 端口 → 主窗聚焦并 navigate
    → QC close
```

**禁止：** QC import `@/layout/**`；主窗与 QC 共享 React 树或壳 store。

### D.4 未来加功能时的决策树

```txt
新功能要上 QC？
  ├─ 是「窗生命周期/几何/present」？ → 只动 QC runtime/layout
  ├─ 是「任务字段/校验/写入」？ → 先落 task 内核，再两边宿主接线
  ├─ 是「搜索索引」？ → 共享 search 端口，QC 只改编排
  ├─ 是「仅 QC 的连续创建/焦点板」？ → QC domain
  └─ 是「主壳导航/侧栏」？ → 不做进 QC
```

### D.5 扩展功能清单（规划用 · 非实现承诺）

| 方向 | 建议归属 |
|------|----------|
| 更多元数据（标签、预估…） | task model + 共享 Fields |
| 模板/剪贴板增强 | QC domain 或 task 规则 |
| AI 标题建议 | 独立 port，QC/主窗都可调 |
| 附件 | task api + 共享上传 |
| 创建项目 | project 创建内核对称复用 |
| 主题跟随 | styles/token，勿复制 |

---

## E. 其它方案（局部）

### 搜索

| 方案 | 优 | 劣 | 荐 |
|------|----|----|-----|
| S1 仅 quick_create_search | 窗专用快 | 与主搜双后端易漂 | 过渡 |
| **S2 共享 search facade**（主搜+QC 参数不同） | 一处索引逻辑 | 要抽 API | **✅** |
| S3 QC 直接用 global-search UI | 复用 UI | 交互过重 | ❌ |

### 提交

| 方案 | 优 | 劣 | 荐 |
|------|----|----|-----|
| C1 仅 Rust quick_create_create | 窗专用 | 与主 mutation 双路径 | 过渡 |
| **C2 统一 task 创建 usecase**（前端 mutation 或同一 command） | 规则一致 | 要理清 invalidate/事件 | **✅** |
| C3 QC 调主窗 execute | 单进程逻辑 | 延迟/耦合窗通信 | 备选 |

---

## F. 最佳实践

**Do**

- 守住 **runtime ≠ domain ≠ 主 layout**  
- 新字段先 task 内核再两边接  
- 指示器/options/metadata **只走 public**  
- 打开实体走 **policy + navigation**，不手拼 path  
- 窗关闭原因、测高、present 单测/文档化  

**Don't**

- 复制第二套 TaskCreate schema  
- QC 依赖主壳 Provider 树  
- 把搜索结果做成完整 TaskBoard 业务页  
- 在 QC 里实现 bulk/command 上帝表  

---

## G. 体量债

| 区域 | 说明 |
|------|------|
| domain reducer ~340 | 拆 draft/search/submit |
| LayoutPresenter / useLayout | 保持窗专属；可再拆 measure |
| 多套 controls | 长期收敛到共享 Fields + QC chrome |
| Page 大测 ~1279 | 可按层拆测 |

---

## H. 迁移刀序（功能扩张前建议先还结构债）

| 序 | 刀 | 价值 |
|----|-----|------|
| 1 | 抽出 **task create 内核**（schema/defaults/toInput/mutation） | 防双轨 |
| 2 | 主窗 TaskCreateContent 改用内核；行为不变 | 验证 |
| 3 | QC draft 提交改走同一 mutation/usecase | 写入一致 |
| 4 | 字段控件：priority/status/date 接 public/metadata | UI 一致 |
| 5 | 搜索 facade 共用 | 结果一致 |
| 6 | openTarget 接 task/project open policy | 与 T2a 对齐 |
| 7 | 再开新功能（标签/附件…）走决策树 | 扩展 |

---

## I. 方案总表

| 方案 | 长期 | 荐 |
|------|------|-----|
| Q1 双轨平行 | 否 | ❌ 终点 |
| Q2 硬嵌 TaskCreateContent | 否 | ❌ |
| **Q3 共享创建内核 + 双宿主** | **是** | **✅** |
| Q4 取消独立窗 | 产品级否 | ❌ |

搜索 **S2**、提交 **C2** 与 Q3 配套。

---

## J. 决议

| # | 决议 |
|---|------|
| 1 | QC **保持 window feature** + session/几何独立 |
| 2 | 长期 **Q3**：与主窗共享 **task 创建内核** 与字段/mutation，不共享主 layout |
| 3 | 搜索/打开走 **共享端口**；UI 编排留 QC |
| 4 | 加功能先走 **§D.4 决策树** |
| 5 | 与 command C3：仅「打开 QC」与可选窗内瘦快捷键；不搬主壳 Bridge |
| 6 | decide-only；扩张功能前优先 §H 1–4 |

### 开放问题（产品+技术）

- [ ] createAndOpen：主窗未启动时是否拉起主窗（Tauri 生命周期）  
- [ ] QC 是否需要登录态/同步态提示（复用 sync public 芯片？）  
- [ ] 连续创建是否写回主窗「上次创建草稿默认值」  
- [ ] 高级区字段清单与主窗 Dialog 是否 **字段集强制一致**（推荐：核心字段一致，QC 可少不可两套语义）  

### 开放问题 · 窗技术架构（**已定稿 · 2026-07-17**）

> 专题方案已落盘：[`Docs/02-重构方案/04-QuickCreate面板重构/QuickCreate-Launcher面板技术文档.md`](../../../02-重构方案/04-QuickCreate面板重构/QuickCreate-Launcher面板技术文档.md)  
> 对应 T2 史诗 11（QC-GEO → Launcher 固定壳）。

| # | 原开放项 | 决议 |
|---|----------|------|
| 1 | 是否必须 DOM 测高再 commit | **否**；固定 **720×500**，废弃测高链路 |
| 2 | present 状态机简化 | **是**；session 只管显隐；删 measuring / readyToPresent |
| 3 | 阴影 / 材质 | **原生 vibrancy + 系统阴影**；禁 CSS 大阴影主深度 |
| 4 | Advanced | **壳内折叠**（单行）；不做 overlay |
| 5 | 暗色 | **本期不做** |

---

---

## K. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：定位、Q1–Q4、复用矩阵、搜索/提交子方案、决策树、刀序 |
| 2026-07-17 | 几何后议定稿：链到 `02-重构方案/04-QuickCreate面板重构` Launcher 技术文档 |
| 2026-07-17 | 史诗 11 落地：固定 720×500、去测高、vibrancy+系统阴影；见 `ARCHITECTURE.md` |
| 2026-07-17 | 整洁架构收口：`session/` + `ui/`；删 layout/shell/Frame；删死 IPC search/create |
