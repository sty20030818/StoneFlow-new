# M-APP-NAV · app/navigation

> 日期：2026-07-17  
> 状态：**decided（讨论草案 · 含路径图 + 大文件拆分计划）** · 本阶段 **decide-only**（先谈后写）  
> 路径：`src/app/navigation/`  
> 类：composition · 导航语义（非 UI 壳）  
> 对照：[00-六边形与分层对照](../00-六边形与分层对照.md) · [品质标准](../../03-To-Be/08-Feature品质验收标准.md)

---

## 1. 身份（点到为止）

| 项 | 内容 |
|----|------|
| **一句话** | 把 URL 与产品语义对齐：解析、拼 path、意图、启动记忆、会话前进后退 |
| **负责** | shell/app route 解析 · scope · canonical path · intents · route memory 规则与 Store · 会话历史 · 面包屑解析规则 |
| **不负责** | 侧栏/顶栏绘制 · 业务 Query · 命令执行业务 · 第二套「当前路由」store 真相 |
| **六边形** | 核心 = 纯解析/拼 path/记忆规则；出站 = Tauri Store；入站 = route hook + 各处 navigate 调用方 |
| **主要消费者** | `routes`（remember/redirect）、`layout`（chrome/bridge）、`command`（跳转）、部分 feature |
| **依赖** | Router location（只读）、settings **contract**（分区 key）、shared types；**禁止**依赖 task/project 私有实现 |

### 状态三轨

| 真相 | 归谁 |
|------|------|
| 当前在哪 | **TanStack Router URL** |
| 结构化语义 | `parseShellRoute` 等（由 URL **推导**） |
| 跨启动记忆 | `routeMemory` 规则 + `routeMemoryStore` |
| 会话前进后退 | `sessionRouteHistory`（内存）+ `router.history.go` |
| 业务数据 | Query（与导航无关） |

---

## 2. 最佳实践（本模块）

1. URL 是当前位置唯一真相；禁止 Zustand/Query 镜像官方 currentRoute。  
2. **解析**（shellRoute）与 **生成**（routePaths）成对、尽量纯、好测。  
3. 业务/壳跳转走 **intent 或 path builder**，禁止满天飞手拼 path。  
4. `navigate` 副作用在调用方；path 函数不跳转。  
5. 持久记忆 ≠ 会话历史；Store 不参与前进后退。  
6. remember 写在 **scope route**，不在 layout 按钮里散落写盘。  
7. 不新增 barrel `index.ts`；直接 import 具体文件。  
8. 大文件按职责拆（见 §4），不按「技术类型」乱切。

既有短契约：`src/app/navigation/ARCHITECTURE.md`（路径描述若仍写 `app/layouts` 视为过时，现网为 `layout/`）。

---

## 3. 真实用户路径图（每一步谁上场）

### 路径 A · 侧栏点击「收件箱」

假设：当前在某 space 的项目页，用户点侧栏 Inbox。

```txt
[用户] 点击侧栏「收件箱」
   │
   ▼
[layout/sidebar] 处理 click
   │  不手拼 "/spaces/xxx/inbox"
   │  调用意图或 path：
   │    openSection(scope, 'inbox')     ← intents.ts
   │      └─ buildCanonicalSectionPath  ← routePaths.ts
   │         得到 path = "/spaces/{id}/inbox"
   ▼
[TanStack Router] navigate({ to: path })  （或 <Link>）
   │  URL 真相更新
   ▼
[routes/_shell/spaces/$spaceId/inbox] 匹配薄页
   │  可选：useRememberCurrentShellRoute(scope)
   │    └─ 读 location → routeMemory 规则 → routeMemoryStore 写盘
   ▼
[layout] 根据新 location 重渲
   │  parseShellRoute(location)         ← shellRoute.ts
   │  侧栏高亮、EntityScene 槽位随 section 变
   ▼
[features/task] TaskListSceneView variant=inbox
   │  只负责列表数据与 UI，不拥有「当前路由真相」
```

**要点：** UI 只发起意图；URL 变了以后，大家从 URL 再推导语义。

---

### 路径 B · 命令面板「打开某项目」

假设：命令选中「打开项目 X」。

```txt
[用户] 命令面板确认「打开项目」
   │
   ▼
[features/command] 执行 command action
   │  不在 command 核心里写死 URL 结构
   │
   ├─ 经 layout/command-bridge 的 nav 切片（装配）
   │    或 command 直接调 navigation intent：
   │
   │    openProject(scope, projectId)   ← intents.ts
   │      └─ buildCanonicalProjectPath ← routePaths.ts
   │         → "/spaces/{id}/projects/{projectId}"
   ▼
[Router] navigate(path)
   ▼
[routes/.../projects/$projectId] 薄页
   │  remember 当前 path（若在 shell scope 内）
   ▼
[features/project] 详情 UI + hooks 拉数据
   │  Query 管项目数据，不管「怎么来到这页」
```

**要点：** command =「要打开项目」的业务动作；**怎么变成合法 URL** 仍归 navigation。

---

### 路径 C · 顶栏后退

```txt
[用户] 点 Header 后退
   │
   ▼
[layout/header] NavBackForward
   │  问 sessionRouteHistory：canGoBack？
   │  是 → 调 router.history.go(-1)   （或封装 API）
   │  sessionRouteHistory **不**自己发明第二套浏览器历史真相
   ▼
[Router] URL 回到上一页
   ▼
[各订阅 location 的层] 自动跟上
   parseShellRoute · 侧栏高亮 · 薄页 · feature
```

**要点：** 会话历史是 **UI 能力 + 调用 Router**，不是第三套路由引擎。

---

### 路径 D · 重启 App 恢复

```txt
[用户] 上次停在 /spaces/abc/tasks ，退出后重开
   │
   ▼
[main → App → Router] 挂上，location 可能是 "/" 或默认
   ▼
[routes/index 或恢复逻辑]
   │  resolveStartupPathFromMemory(...)  ← routeMemory.ts（规则）
   │    └─ 读 routeMemoryStore          ← Store 适配
   │    └─ validate / normalize / fallback
   │  得到可恢复 path 或 fallback（如 /all/tasks）
   ▼
[Router] redirect → 恢复 path
   ▼
[进入 shell 薄页] 与路径 A 后半相同
```

**要点：** 启动恢复是 **读记忆 → 合法则去、不合法 fallback**；记忆不能压过「当前 URL」成为运行中真相。

---

### 路径 E · 面包屑展示（穿插）

```txt
[layout Header 面包屑]
   │  输入：parseShellRoute(location) + 可选「标题数据」
   │        （项目名/任务名来自 feature query 或已解析 props）
   ▼
[breadcrumbResolver.resolveBreadcrumb(...)]
   │  只根据 route 形状 + 喂入的标签生成 crumbs
   │  不在这里 useQuery 拉整棵项目树（避免 navigation 变业务）
   ▼
[渲染链接] 每项 to= canonical path（path builder）
```

---

### 一张总图（三路径合流）

```txt
                    ┌──────────────────┐
                    │  用户手势 / 命令   │
                    └────────┬─────────┘
           intent/path        │         history.go
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
   intents/routePaths    sessionRouteHistory    (仅 C)
         │                    │
         └────────┬───────────┘
                  ▼
           TanStack Router  ←── URL 唯一真相
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
  parseShell  remember   薄页→feature
  Route       memory     UI/Query
```

---

## 4. 大文件拆分计划（decide · 改代码时按此执行）

> 品质标准：单文件建议 ≤300，硬顶 400。  
> 现状超标：`shellRoute.ts` ~479 · `routeMemory.ts` ~429 · `sessionRouteHistory.ts` ~318（临界）· `breadcrumbResolver.ts` ~221（可暂缓）。

### 4.1 原则

- **按职责切**，不按「types 一个文件、functions 一个文件」机械切。  
- 拆完后 **import 路径可变**；对外仍允许从原文件 re-export 过渡一期（若改代码时需要兼容），但讨论阶段倾向 **直接迁调用方**（无 barrel 神教）。  
- 纯函数与 IO、与 React hook **分开文件**。  
- 测试随职责拆：`shellRoute.parse.test.ts` 等，或保持同名大测再逐步拆。

### 4.2 `shellRoute.ts`（~479）→ 建议 3～4 文件

| 新文件（建议名） | 放入内容 | 行数目标 |
|------------------|----------|----------|
| `shellRouteTypes.ts` | `ShellRoute` / `AppRoute` / section key / memory 相关 **仅类型** | ~80–120 |
| `shellRouteParse.ts` | `parseShellRoute` · `parseAppRoute` · `parseShellScopePath` · `resolveShellSection` | ~150–200 |
| `shellRouteGuards.ts` | `isShellPath` · `isProjectShellPath` · `buildShellScopeKey` 等谓词/小工具 | ~40–60 |
| `shellRoute.ts` | **薄入口**：re-export 上述（可选；若坚持无 barrel，可删入口、调用方直达 parse/types） | ~20 |

**不要**把 path **生成**塞回 shellRoute（生成已在 `routePaths.ts`）。

### 4.3 `routeMemory.ts`（~429）→ 建议 3 文件

| 新文件 | 放入内容 | 行数目标 |
|--------|----------|----------|
| `routeMemoryNormalize.ts` | `normalizeShellRouteMemory` · `normalizeShellMemoryPath` · `normalizeRememberedShellPath` · `stripShellDetailSearch` · `isRememberableShellPath` | ~120–160 |
| `routeMemoryResolve.ts` | `resolveRememberedPathForScope` · `resolveStartupPathFromMemory` · `validateShellRouteMemoryPaths` · `createNextShellRouteMemory` · `defaultShellRouteMemory` | ~150–180 |
| `routeMemory.ts` | 薄 re-export **或**只留编排注释 + re-export（过渡） | ~30 |

IO 继续只在 `routeMemoryStore.ts`；**不要**把 Store 读进 normalize 纯函数文件。

### 4.4 `sessionRouteHistory.ts`（~318）→ 建议 2 文件

| 新文件 | 放入内容 | 行数目标 |
|--------|----------|----------|
| `sessionRouteHistoryModel.ts` | `ShellRouteHistoryEntry` · `buildShellRouteHistoryEntry` · 纯列表/栈规则 | ~100–140 |
| `sessionRouteHistory.ts` | `useShellSessionRouteHistory` 等 React 绑定 + 调 `router.history` | ~120–160 |

### 4.5 `breadcrumbResolver.ts`（~221）

- **暂不强制拆**；若再涨：拆 `breadcrumbLabels.ts`（文案/图标映射）+ `breadcrumbResolver.ts`（组装）。  
- 治理方向：标题数据 **注入**，resolver 不变胖成数据层。

### 4.6 已达标、保持

| 文件 | ~行 | 动作 |
|------|-----|------|
| `scope.ts` | 19 | Keep |
| `useRememberCurrentShellRoute.ts` | 25 | Keep 极薄 |
| `routePaths.ts` | 103 | Keep；意图继续在 `intents.ts` |
| `intents.ts` | 98 | Keep |
| `routeMemoryStore.ts` | 82 | Keep（唯一 Store 适配） |

### 4.7 拆分后的目标树（示意）

```txt
src/app/navigation/
  shellRouteTypes.ts
  shellRouteParse.ts
  shellRouteGuards.ts
  routePaths.ts
  intents.ts
  scope.ts
  routeMemoryNormalize.ts
  routeMemoryResolve.ts
  routeMemoryStore.ts
  useRememberCurrentShellRoute.ts
  sessionRouteHistoryModel.ts
  sessionRouteHistory.ts
  breadcrumbResolver.ts
  ARCHITECTURE.md
  *.test.ts
```

### 4.8 改代码时验收（到 govern-now 再用）

- [ ] 上述大文件均 &lt; 300 行（或有例外说明）  
- [ ] 行为：路径 A/B/C/D 冒烟通过  
- [ ] 现有 navigation 单测绿  
- [ ] 无新增「当前路由」第二真相  
- [ ] `bun run check`  

---

## 5. 治理决议

| 项 | 决议 |
|----|------|
| 边界 | 上表 §1 · 与现网 ARCHITECTURE 一致（layout 路径以现网为准） |
| 最佳实践 | §2 · 路径图 §3 为团队共同心智 |
| 大文件 | §4 拆分计划 **已定方向**；**本阶段不改代码** |
| 面包屑 | 规则留 navigation；标题数据注入 |
| intent | 跨页产品动作集中 `intents.ts`；禁止 feature 再造平行 openXxx URL 体系 |
| 下一动作 | 讨论下一模块（建议 **M-LAYOUT** 或 **M-ROUTE-SCENES**）；导航 govern-now 等「先谈后写」结束线 |

### 开放问题（可 park）

- [ ] 拆分时是否保留 `shellRoute.ts` 薄 re-export 做兼容窗（建议：短窗 1 个 PR 内删掉）  
- [ ] `breadcrumbResolver` 是否迁移到更靠近 layout（当前：**保留 navigation**）  

---

## 6. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：身份、最佳实践、路径 A–E、大文件拆分表 |
