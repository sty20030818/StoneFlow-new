# M-F-SEARCH · features/global-search

> 日期：2026-07-17  
> 状态：**decided（方案对比 · 与 QC 搜索）** · **decide-only**  
> 路径：`src/features/global-search`  
> 类型：**platform（全局实体搜索）**  
> 切分总览：**Keep**；与 QC **共享查询端口、不并包**  
> 关联：layout Header · command 面板搜 · QC Q3/S2 · navigation path  

---

## A. 现网事实

### A.1 一句话

**主窗全局搜索**：`search_entities` 查 task/project（含完成分区）→ Header 输入框 + 结果列表 → 导航到目标；并提供 **focus intent store** 供命令「聚焦搜索框」。

### A.2 结构

```txt
global-search/
  api/searchEntities.ts          invoke search_entities
  hooks/                         keys + useSearchEntitiesQuery
  model/
    useGlobalSearch.ts           查询态封装
    useSearchFocusIntentStore.ts 命令聚焦搜索
    searchNavigation.ts          结果 → path（任务/项目）
  components/
    GlobalSearchInput / Results
  index.ts
```

约 14 文件；Input/Results 各 ~250 行。

### A.3 消费者

| 谁 | 用途 |
|----|------|
| layout ShellHeader | GlobalSearchInput + resolveProject path |
| command | useGlobalSearch / focus intent |
| QC | **另一套** `quick_create_search`（未复用本 api） |

### A.4 已做对的

- api / query / UI 分层清楚  
- Query `enabled` 随非空 query；keepPreviousData  
- focus 用轻量 store 而非污染 URL  
- 切分 Keep；不并 QC 窗  

### A.5 问题

| 问题 | 说明 |
|------|------|
| **与 QC 双搜索后端** | `search_entities` vs `quick_create_search` — 结果/排序易漂（QC 卡 S2） |
| **searchNavigation 手拼 path** | 应 **navigation path-only / open policy**（T2a/E2） |
| **Input 偏厚** | 可拆 debounce/键盘/结果弹出 |
| **hooks export \*** | 显式化 |
| **command 内嵌搜索体验** | 可继续用 useGlobalSearch；避免复制 query |

---

## B. 边界争议

| 候选 | 现在 | 目标 |
|------|------|------|
| search api + query + Header UI | global-search | **Keep feature** |
| 查询端口抽 shared 或「search 内核」 | 无 | **可抽 `searchEntities` 为唯一 invoke 面**；QC 也调它（limit 不同） |
| 结果导航 | 本包 resolve*Path | **navigation / entity open policy** |
| focus intent store | 本包 | Keep 或归 command「focus 搜索」能力 |
| 并 command | — | **否**（Header 主入口） |
| 并 QC | — | **否** |

---

## C. 多方案对比

### 方案 G1 · 巩固现网

双搜索命令并存；小修 path。

| 优点 | 缺点 |
|------|------|
| 稳 | QC/主窗结果可能不一致 |

**结论：** 过渡。

---

### 方案 G2 · Keep UI feature + **统一 search 端口**（**推荐**）

```txt
唯一查询：
  searchEntities({ query, limitPerSection, … })  // 可留在 global-search/api
  或抽到更中性位置但 public 从一处 re-export

global-search
  = Header UI + useGlobalSearch + focus store
  + 导航走 navigation/entity policy

quick-create
  = 调用同一 searchEntities（limit=3）
  = 自有结果板 UI / 键盘
  = 废弃或委托 quick_create_search（后端可合并命令后议）
```

| 优点 | 缺点 |
|------|------|
| 与 QC S2 / 纯化一致 | 需对齐两 invoke 的结果形状 |
| Keep 独立 feature | 后端可能仍两命令，前端先适配层统一 |

**结论：最优。**

---

### 方案 G3 · 搜索能力并进 command

| 优点 | 缺点 |
|------|------|
| 命令板也搜 | Header 依赖 command；过重 |

**结论：否。** command **消费** search public。

---

### 方案 G4 · 取消 feature，Header 内联

| 优点 | 缺点 |
|------|------|
| 少包 | 命令/QC 难复用 query |

**结论：否。**

---

### 方案 G5 · 抽 `features/search-core` 仅 api

| 优点 | 缺点 |
|------|------|
| 名字中性 | 过拆；G2 在 global-search/api 当单端口即可 |

**结论：不优先新 feature。**

---

## D. 推荐 = **G2**

### D.1 职责

| 负责 | 不负责 |
|------|--------|
| 全局实体搜索查询与缓存 | 任务字段编辑 |
| Header 搜索 UI | 主壳布局 |
| 聚焦搜索 intent | 打开策略业务（交给 task policy） |
| （目标）对 QC 暴露同一 search API | QC 窗几何 |

### D.2 协作

```txt
Header → GlobalSearchInput → searchEntities → 结果
  → open：navigation path / entity-detail / task policy

Command「聚焦搜索」→ useSearchFocusIntentStore
Command 内搜索 → useGlobalSearch（可选）

QC → searchEntities({ limit: 3 })  // 同一端口
  → 自有结果 UI → open policy
```

### D.3 与已定模块

| 模块 | 关系 |
|------|------|
| **QC Q3/S2** | 共享查询；UI 分离 |
| **navigation** | path-only；删手拼 |
| **entity-detail / task** | 打开抽屉/全页 |
| **command** | focus + 可选复用 query |

### D.4 public 目标

**宜：** `searchEntities`、query hooks、`useGlobalSearch`、Input/Results、focus store、（过渡）resolve path 或改为 intent。  
**收窄：** 内部 debounce 细节不导出。

---

## E. 最佳实践

**Do**

- 空 query 不请求  
- debounce 在 UI/hook  
- 打开走统一导航端口  
- QC/主窗同一 search facade  

**Don't**

- 第二套 search invoke 无适配层  
- 在 search 里写 bulk/mutation  
- 结果页复制整 TaskBoard 业务  

---

## F. 体量

Input/Results ~250 行级 — 可拆；非切分问题。

---

## G. 迁移刀序

| 序 | 刀 |
|----|-----|
| 1 | 文档：唯一 `searchEntities` 端口 |
| 2 | path 改为 navigation intent / open policy |
| 3 | QC 改调同一端口（映射结果 DTO） |
| 4 | 后端合并 search 命令（可选后置） |
| 5 | 拆 Input 组件 |

---

## H. 方案小结

| 方案 | 荐 |
|------|-----|
| G1 双轨 | 过渡 |
| **G2 统一端口 + Keep UI feature** | **✅** |
| G3 并 command | ❌ |
| G4 取消 | ❌ |
| G5 新 search-core 包 | 不优先 |

---

## I. 决议

| # | 决议 |
|---|------|
| 1 | **Keep** global-search |
| 2 | 目标 **G2**：与 QC **共享查询端口** |
| 3 | 导航走 navigation/entity policy |
| 4 | 不并 command/QC |
| 5 | decide-only |

### 开放问题

- [ ] `search_entities` 与 `quick_create_search` 结果字段是否已同构（需对照 DTO）  
- [ ] 搜索是否含 space/view（产品扩展）  

---

## J. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-17 | 初版：与 QC 双搜、G1–G5、推荐 G2 |
