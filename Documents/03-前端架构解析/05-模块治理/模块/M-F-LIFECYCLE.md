# M-F-LIFECYCLE · features/lifecycle

> 日期：2026-07-17 · **落地对照更新 2026-07-19**
> 状态：**archived-decision（Y2 · P0–P1 done；余 SCENE 见 [14](../14-Lifecycle样板重构执行计划.md)）**
> 路径：`src/features/lifecycle`
> **日常契约：** [`src/features/lifecycle/ARCHITECTURE.md`](../../../src/features/lifecycle/ARCHITECTURE.md)
> 类型：**domain 编排（跨实体）** — 不是 task 子集

---

## 0. 落地对照（2026-07-19）

| 卡上目标（Y2） | 现网 | 说明 |
|----------------|------|------|
| Keep 独立 feature | **done** | 不并 task |
| 禁 → layout | **done** | 0 引用 |
| bulk 在 `lifecycle/bulk` | **done** | B3 已迁 |
| `registerLifecycleCommands` | **done** | C3 已挂 |
| 写路径委托 t/p/s public | **done** | api 已委托 |
| `useLifecycleScene` / List 薄壳 | **未完** | List ~356 · 计划 SCENE |
| ARCHITECTURE + public/TSDoc | **done** | DOC + NORM |

**改码请读：** `src/features/lifecycle/ARCHITECTURE.md` + `src/CONVENTIONS.md`。
与 src 冲突时：**以 src 为准**，并回写本节。

---

## A. 现网事实

### A.1 定位（为何独立 feature 正确）

```txt
归档 / 回收站
  = 跨 task · project · space 的「生命期末态」统一入口
  ≠ 某一个实体的列表页变体
```

- **列表 IO**：`list_archive_entries` / `list_trash_entries`（专用聚合查询）
- **写操作**：按 `entityType` **委托** `deleteTask/restoreTask`、project、space public
- **页**：`LifecycleList` 一份组件，`mode: archive | trash`
- **路由**：极薄 `archive.tsx` / `trash.tsx` 只传 mode/title/icon —— **标杆薄页**

### A.2 结构

```txt
lifecycle/
  api/lifecycle.ts      list + delete/restore/permanent（分发到域 api）
  hooks/                keys · queries · mutations
  components/
    LifecycleList.tsx   ~375  厚页 + layout 依赖
    LifecycleBoard.tsx  ~302
    LifecycleRowAdapter · ContextMenu
  index.ts
```

无独立 `model/`（类型多在 `shared/types` 的 LifecycleEntry）。

### A.3 消费者

| 谁 | 用途 |
|----|------|
| routes archive/trash | LifecycleList |
| layout badges | useLifecycleEntriesQuery |
| layout EntityScene adapter | LifecycleBoard |
| bulk-action | list + lifecycle bulk adapter（B3 后应回 lifecycle） |
| 侧栏导航 | section 路径，不直接依赖实现 |

### A.4 已做对的

- **切分正确**：不并进 task（总览已 Keep）
- 路由薄；mode 参数化 archive/trash **DRY**
- 写路径委托实体 public，不在 lifecycle 复制业务规则
- 与 selection/bulk 协作清晰

### A.5 问题

| 问题 | 说明 |
|------|------|
| **LifecycleList → layout** | EntityScene、ShellRouteContext — 同其它厚页 |
| **页内 wiring 偏厚** | 选择/bulk bar/打开抽屉/过滤 entity 类型堆在 List |
| **bulk 定义在 bulk-action 包** | B3：迁 lifecycle |
| **api 直接 import task/project/space api** | 跨 domain 依赖；宜经 **public**（现部分已是 public 函数）并保持单向 |
| **无 model** | 过滤器「all/space/project/task」、entry 展示规则可纯函数化 |
| **永久删除 vs 进回收站** | 语义在 api switch；要文档钉死 |

---

## B. 边界争议

| 候选 | 现在 | 目标 |
|------|------|------|
| 独立 feature | Keep | **Keep**（切分总览） |
| 并进 task | — | **否** |
| 拆 archive + trash 两 feature | — | **否**（mode 足够） |
| 列表聚合 query | lifecycle | Keep |
| 实体真正删除/恢复实现 | task/project/space | Keep 在实体；lifecycle 只编排 |
| 页 facade | List 内联 | **useLifecycleScene(mode)** |
| layout 依赖 | 有 | **去掉** |

---

## C. 多方案对比

### 方案 Y1 · 巩固 + 去 layout

小修倒依赖；结构不动。

| 优点 | 缺点 |
|------|------|
| 快 | 页仍厚；bulk 所有权仍歪 |

**结论：** 过渡。

---

### 方案 Y2 · Keep 包 + scene facade + bulk/命令归位（**推荐**）

```txt
lifecycle/
  model/     entry 展示、filter 纯函数（可选）
  api/hooks  list + 编排型 mutations（内部调 t/p/s public）
  bulk/      从 bulk-action 迁入的 lifecycle 定义+adapter
  components/
    LifecycleList 薄：mode 壳 + facade
    LifecycleBoard / Row
  registerLifecycleCommands? 可选

routes: 仍 <LifecycleList mode=… />
```

| 优点 | 缺点 |
|------|------|
| 切分不变、与 B3/C3/T2 一致 | List 要重构接线 |
| archive/trash 仍 DRY | |
| 不制造假 domain | |

**结论：最优。**

---

### 方案 Y3 · 拆成 archive + trash 两 feature

| 优点 | 缺点 |
|------|------|
| 名字贴 URL | 双倍复制；mode 已消除重复 |

**结论：否。**

---

### 方案 Y4 · 删 lifecycle，archive 页直接调 task/project/space

| 优点 | 缺点 |
|------|------|
| 少包 | 列表聚合 API、统一板、徽章、bulk **散落三域**；产品「归档中心」无主 |

**结论：否。** 编排域有存在价值。

---

### 方案 Y5 · lifecycle 只做 api/hooks，UI 并 layout

| 优点 | 缺点 |
|------|------|
| 无 | 壳拥业务页 |

**结论：否。**

---

## D. 推荐 = **Y2**

### D.1 职责

| 负责 | 不负责 |
|------|--------|
| 归档/回收站 **列表聚合** 与 Query | task/project 字段规则 |
| 恢复/删除/永久删除的 **编排入口**（分发实体 public） | URL 方言、壳 chrome |
| Lifecycle 列表/看板 UI | EntityScene 框架 |
| lifecycle bulk 贡献（B3） | 实现 setActiveScope 等 |

### D.2 协作

```txt
routes archive|trash → LifecycleList(mode)
LifecycleList
  ├─ useLifecycleEntriesQuery(mode, scope)
  ├─ selection register (lifecycle build → L2 后域自建)
  ├─ runBulk / restore/delete mutations
  └─ openDrawer(entity) → entity-detail + 各域详情

api delete/restore
  → task/project/space public only

badges → useLifecycleEntriesQuery
bulk B3 → lifecycle 贡献 adapter
command C3 → 可选 register；或仅 bulk 路径
layout adapter → LifecycleBoard 薄适配
lifecycle ──×──► layout
```

### D.3 与切分总览

| 误判 | 决议 |
|------|------|
| 并进 task | **否** |
| 拆 archive/trash 包 | **否** |
| Keep 编排 domain | **是** |

### D.4 public 目标

**宜：** list/mutations/keys、LifecycleList、LifecycleBoard、（迁入后）bulk ids/adapter。
**api：** 继续只暴露编排函数；内部只调实体 **public**。

---

## E. 最佳实践

**Do**

- 一组件两 mode；路由薄
- 写操作委托实体；list 用聚合命令
- 选择/bulk 走平台，不在 Board 私写删除
- 打开实体走 entity-detail + 域详情

**Don't**

- lifecycle import layout
- 在 lifecycle 复制 updateTask 字段逻辑
- 为 archive/trash 再建两个 feature
- 列表用客户端硬滤「所有任务」冒充归档库（应用专用 list API）

---

## F. 体量

| 文件 | ~行 | 动作 |
|------|-----|------|
| LifecycleList | 375 | P0 抽 useLifecycleScene + 去 layout |
| LifecycleBoard | 302 | 临界可拆 |
| RowAdapter | 168 | OK |
| api | 79 | OK；依赖只 public |

---

## G. 迁移刀序

| 序 | 刀 |
|----|-----|
| 1 | List 去 layout 依赖 |
| 2 | useLifecycleScene(mode) facade |
| 3 | bulk lifecycle.* → lifecycle（B3） |
| 4 | （可选）model 纯函数 + registerCommands |
| 5 | 确认 api 仅 public 调 t/p/s |

---

## H. 方案小结

| 方案 | 荐 |
|------|-----|
| Y1 小修 | 过渡 |
| **Y2 Keep+facade+所有权** | **✅** |
| Y3 拆两 feature | ❌ |
| Y4 删包 | ❌ |
| Y5 UI 进 layout | ❌ |

---

## I. 决议

| # | 决议 |
|---|------|
| 1 | **Keep** lifecycle feature（切分正确） |
| 2 | 目标 **Y2**：编排域 + 薄 scene facade |
| 3 | archive/trash **mode 参数化**，不拆包 |
| 4 | 禁止 → layout；bulk 贡献回本域 |
| 5 | 写路径只委托 task/project/space public |
| 6 | decide-only → **执行见 [14](../14-Lifecycle样板重构执行计划.md)** |

### 开放问题

- [ ] 徽章是否应用专用 count API 减轻 list 全量（性能后议）
- [ ] 永久删除确认是否统一走 danger-confirm（现若有则保持）

---

## J. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：Keep 切分、Y1–Y5、推荐 Y2 |
