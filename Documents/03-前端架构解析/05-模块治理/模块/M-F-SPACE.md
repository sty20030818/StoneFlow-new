# M-F-SPACE · features/space

> 日期：2026-07-17  
> 状态：**decided（方案对比）** · **decide-only**  
> 路径：`src/features/space`  
> 类型：**domain**（工作区/空间实体 + 与 Rust 的 active scope 同步端口）  
> 规范：T2 · navigation · layout · task/project  

---

## A. 现网事实

### A.1 一句话

**Space 实体**：可见列表、CRUD/默认空间、视觉（图标色）、编辑对话框；以及 **`setActiveScope` / 待消费打开意图** 等与运行时协作的薄 IO。

### A.2 结构（小而清晰）

```txt
features/space/
  model/spaceVisuals.ts     图标色 options + getSpaceVisual
  api/spaces.ts             list/CRUD + setActiveScope + takePendingCommandOpenIntent
  hooks/                    keys · queries · mutations · useSpaces facade
  components/               SpaceEditorDialog（~263 行）
  index.ts                  public
```

约 11 文件 / &lt;900 行业务量级——**体量健康**。

### A.3 消费者（广但不深）

| 消费者 | 用途 |
|--------|------|
| layout ShellRouteLayout | `setActiveScope` + `useSpaces`（非法 space 时也要用列表） |
| layout chrome | `useSpaces`、视觉、`SpaceEditorDialog` |
| layout command host | `takePendingCommandOpenIntent`、spaces |
| routes | 启动 restore ensure 可见 spaces；详情 loader |
| task / project / view / settings / lifecycle / QC / metadata | 列表、默认、视觉、删档联动 |

### A.4 已做对的

- 四夹齐全、**几乎无 → layout 倒依赖**（编辑对话框被壳挂载，实现在 space）  
- public 面相对紧：hooks + api + visuals + 一个 Dialog  
- Query facade `useSpaces` 简单清晰  
- 视觉单源 `getSpaceVisual`（侧栏/历史/metadata/QC 共用）  

### A.5 问题 / 灰区

| 问题 | 说明 |
|------|------|
| **`takePendingCommandOpenIntent` 放在 space api** | 语义是「主窗待打开意图」，**不是 Space 实体** → 归属怪 |
| **`setActiveScope` 与 URL scope** | URL 是前端真相；此 API 是 **同步 Rust 运行时**——正确但要文档钉死，避免当第二套导航 |
| **hooks/index `export *`** | 与「显式 export」规范略冲 |
| **无 space 列表「页」** | 管理主要在侧栏 Dialog + settings 默认空间——产品如此则 OK |
| **归档/删除与 lifecycle** | lifecycle 调 `deleteSpace/restoreSpace` public——方向对 |
| **命令** | 无 registerSpaceCommands；侧栏操作为 UI 直调 mutation——可接受，C3 时可补 |

---

## B. 边界争议

| 候选 | 现在 | 目标倾向 |
|------|------|----------|
| Space 实体 CRUD + 列表 | space | **Keep domain 核心** |
| spaceVisuals | space model | **Keep**（属空间展示规则） |
| SpaceEditorDialog | space components | **Keep**；壳只开关 |
| setActiveScope | space api | **Keep 在 space 或 `workspace` 运行时端口**（见方案）；**调用方仅 L1 ShellRouteLayout** |
| takePendingCommandOpenIntent | space api | **迁出**：command / shared 事件 / 小 `app` 端口（见方案） |
| 默认空间 | space mutation + settings UI | 规则 space；设置面板只调 public |
| Scope 类型 | shared/types | Keep shared（跨模块值对象） |

---

## C. 多方案对比

### 方案 S1 · 巩固现网

仅收紧 public、修 export *；意图 API 仍放 space。

| 优点 | 缺点 |
|------|------|
| 零成本 | 灰区永远怪；新人会以为「打开意图属于 Space」 |

**结论：** 过渡。

---

### 方案 S2 · 纯化 domain + 迁出「非实体」IO（**推荐**）

```txt
features/space
  = Space 实体 + 视觉 + 编辑 UI +（可选）setActiveScope 若视为「空间运行时绑定」

迁出 takePendingCommandOpenIntent
  → features/command 或 app 级 runtime port
    （与「谁打开主窗目标」同一上下文）

setActiveScope
  → 方案 S2a：仍 space public「同步当前工作 scope 到后端」
  → 方案 S2b：迁 features/workspace（与 invalidate 并列的运行时）
```

| 优点 | 缺点 |
|------|------|
| 实体边界干净 | 要改 import（takePending*） |
| 与 T2「一模块一类事」一致 | 需选 active scope 最终归属 |

**结论：推荐 S2；active scope 默认 S2a（暂留 space）。**

---

### 方案 S3 · Space 降级为「仅数据」，UI 全进 layout

| 优点 | 缺点 |
|------|------|
| 壳改编辑 UI 方便 | 领域 UI 被壳吞；可删除性差 |

**结论：否**（与纯化相反）。

---

### 方案 S4 · 与 workspace 合并

`features/workspace` 目前极薄（事件→invalidate）。合并 space+workspace 成「工作区」大包。

| 优点 | 缺点 |
|------|------|
| 运行时概念集中 | workspace 变成杂物袋；实体与同步失效搅在一起 |

**结论：否。** workspace 继续 **只做失效总线**；space 做实体。

---

### 方案 S5 · Scope 导航语义并进 space

把 navigation 的 scope/path 与 space 合并。

| 优点 | 缺点 |
|------|------|
| 无 | 毁掉 navigation 路径方言单点；space 膨胀 |

**结论：否。** URL/path ∈ navigation；Space 实体 ∈ space。

---

## D. 推荐 = **S2 + setActiveScope 暂留 space（S2a）**

### D.1 职责（纯化后）

| 负责 | 不负责 |
|------|--------|
| Space CRUD、默认、可见列表 Query | URL 解析、拼 path |
| 视觉 tokens / getSpaceVisual | 主壳侧栏布局 |
| SpaceEditorDialog | 全局命令打开意图队列（迁出） |
| setActiveScope（后端同步） | 当「当前页」真相（真相仍是 URL） |
| | bulk 引擎、task 规则 |

### D.2 协作

```txt
URL scope（navigation parse / routes）
    │
    ▼
layout ShellRouteLayout
    ├─ setActiveScope(scope)     → space api → Rust
    └─ useSpaces()               → 校验 space 是否仍可见

layout Sidebar
    ├─ getSpaceVisual / 列表数据
    └─ SpaceEditorDialog + mutations

settings
    └─ setDefaultSpace mutation

task/project/QC/metadata
    └─ useSpaces / visuals / options only

command host（目标）
    └─ takePendingOpenIntent（迁出后不再从 space import）

lifecycle
    └─ deleteSpace / restoreSpace public
```

### D.3 与装配三角

| 模块 | 关系 |
|------|------|
| **navigation** | scope 值对象一致；**不**在 space 里 build path |
| **routes** | ensure 可见 spaces；动态 `$spaceId` |
| **layout** | **唯一常客**调用 setActiveScope；挂编辑 Dialog |
| **T2 单树** | scope 进 route context 后，space 仍只提供实体与同步端口 |

### D.4 public 目标

**宜：** `useSpaces` / visible query / mutations / keys、list+CRUD api、`setActiveScope`、visuals、`SpaceEditorDialog`。  
**迁出后不宜：** `takePendingCommandOpenIntent`。  
**hooks：** 去掉 `export *`，显式列出。

### D.5 命令（可选，非阻塞）

C3 时可 `registerSpaceCommands`：新建/编辑焦点、设默认——**非必须**；侧栏直调 mutation 对小域可接受。

---

## E. 最佳实践

**Do**

- Space 变更只走 hooks/api；视觉只走 getSpaceVisual  
- URL 变 → L1 调 setActiveScope；**不要**用 activeScopeId 反推路由  
- 编辑 UI 在 space，开关状态可在壳  

**Don't**

- 在 space 实现导航 intent 表  
- 侧栏复制图标色映射  
- 把 workspace invalidate 写进 space mutations 乱调（走统一事件/invalidate 策略）  

---

## F. 体量

| 文件 | ~行 | 动作 |
|------|-----|------|
| SpaceEditorDialog | 263 | 可接受；再涨拆 form/sections |
| api/spaces | 142 | 迁出 takePending 后更纯 |
| spaceVisuals | 116 | OK |

---

## G. 迁移刀序

| 序 | 刀 |
|----|-----|
| 1 | 文档钉死：URL 真相 vs setActiveScope 同步 |
| 2 | `takePendingCommandOpenIntent` → command 或 app runtime port；改 command host import |
| 3 | hooks 显式 export；收紧 index 注释 |
| 4 | （可选）registerSpaceCommands |
| 5 | 单树路由时：确认 L1 仍是 setActiveScope 唯一调用点 |

---

## H. 方案小结

| 方案 | 荐 |
|------|-----|
| S1 巩固 | 过渡 |
| **S2 纯化 + 迁出意图 IO** | **✅** |
| S2a setActiveScope 留 space | **✅ 默认** |
| S2b setActiveScope → workspace | 备选（若 workspace 升级为「运行时」包） |
| S3 UI 进 layout | ❌ |
| S4 合并 workspace | ❌ |
| S5 吞 navigation | ❌ |

---

## I. 决议

| # | 决议 |
|---|------|
| 1 | space = **小而纯的 domain**；结构基本 Keep |
| 2 | **迁出** `takePendingCommandOpenIntent`（非实体） |
| 3 | **setActiveScope 暂留 space**；仅壳 L1 在路由变化时调用 |
| 4 | 视觉/Dialog/CRUD 保持 space public |
| 5 | 不与 workspace/navigation 合并 |
| 6 | decide-only |

### 开放问题

- [ ] takePending 最终落 **command** 还是 **app/navigation 旁路 runtime**（推荐：**command 或 app/ipc 小模块**，贴近「打开意图」）  
- [ ] 是否要 space 设置页（多空间管理）独立 scene——产品未定时不建 feature  

---

## J. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：灰区、S1–S5、推荐 S2/S2a |
