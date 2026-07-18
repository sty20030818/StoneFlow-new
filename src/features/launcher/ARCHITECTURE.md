# launcher · 架构契约

> 作用：描述 **当前已落地** 的 `src/features/launcher` 边界
> 最后更新：2026-07-18

独立窗 **Launcher**：快速记任务 + 打开已有任务/项目。
窗生命周期（session）+ 固定壳 UI + 适配主产品能力（task / global-search）。

---

## 1. 心智模型

```txt
routes/launcher
  → LauncherPage
      → SessionProvider          // phase / bridge / close
      → DomainProvider           // draft / search / submit / derived
      → PresentSession           // preparing → present_session
      → Panel                    // Composer → Advanced → Create? → Results → Footer
```

| 层 | 负责 | 禁止 |
|----|------|------|
| **session** | phase、bridge、present、close、becameKey focus 许可 | draft、搜索规则 |
| **domain** | draft / search / submit / derived（flatItems） | NSPanel、窗尺寸、Board |
| **chrome** | Surface / Panel / Footer；唯一 chrome class 真相 | domain 业务字段细节 |
| **composer / create / results** | 输入、新建行、列表 IA | 直接 invoke、platform |
| **api** | 窗 IPC + map*（create→task，search→global-search） | 第二套 create/search 规则 |

跨模块 **只** `import { LauncherPage } from '@/features/launcher'`。
禁止 deep-import。

---

## 2. 目录

```txt
src/features/launcher/
├── ARCHITECTURE.md
├── index.ts                 # 仅导出 LauncherPage
├── chrome/                  # Surface · Panel · Footer
├── composer/                # 输入与 meta / Advanced / controls
├── create/                  # 钉住的新建行
├── results/                 # 列表 IA（轻标题 / flat 流 / EmptyHint）
├── session/                 # phase · bridge · PresentSession
├── domain/                  # DomainProvider · reducer · hooks · derived
├── api/                     # launcher_* IPC + map*
└── model/                   # types · formatters · interleaveResults
```

共享 pattern：`src/shared/components/patterns/launcher.ts`（class 助手，非第二套设计 token）。

关闭：`SessionProvider.requestClose` → `launcher_close_session`。

---

## 3. UI/UX（冻结）

| 项 | 约定 |
|----|------|
| 壳尺寸 | **720 × 500** logical px |
| 空态 | 最近任务 ≤5 + 最近项目 ≤5（FE + Rust `DEFAULT_RECENT_LIMIT` 对齐）；轻标题；无折叠 / sticky / 灰条 |
| Results 滚动 | `AppScrollArea`（与 Command / GlobalSearch 同协议） |
| 搜索 | 统一 flat 交错流；「搜索结果」轻标题钉在滚动区外；无类型 filter |
| 新建行 | 有标题时钉在 Results 上方；↑↓ 独立 focus lane（`focusTarget: 'create' | result`） |
| 圆角 | Win **8** / Mac **16** → CSS `--launcher-panel-radius`；Surface 唯一消费 |
| 深度 | 原生 shadow；FE 只材质 / clip |
| 复用 | 主站 sf token + RowShell 原样；禁止 RowShell/Board launcher variant |

轻标题：`text-xs font-medium text-sf-text-tertiary` + `px-3 pt-2 pb-1`；数量 `tabular-nums`。

---

## 4. Domain 列表契约

```txt
RECENT_TASK_LIMIT = 5
RECENT_PROJECT_LIMIT = 5
SEARCH_RESULT_LIMIT = 20

mode: 'recent' | 'search' | 'search-empty' | 'recent-empty'
flatItems: ResultItem[]     # 搜索渲染与结果焦点主序列
focusTarget: 'none' | 'create' | { kind: 'result', index }
```

Create **不在** `flatItems` 内；有标题时与结果列表共用 ↑↓，Create 为独立 lane。

搜索混排：`interleaveTaskProjectResults` — 各自保序，task/project 交错；一侧耗尽则追加另一侧。

---

## 5. 窗 IPC

| 命令 | 用途 |
|------|------|
| `launcher_get_initial_state` | 打开上下文快照 |
| `launcher_list_projects_by_space` | 归属选项 |
| `launcher_open_target` | 聚焦主窗并导航 |
| `launcher_prepare/present/close_session` | 会话显隐 |
| `launcher_frontend_ready/unready` | 前端监听器就绪 |

事件：`launcher:session-prepared` · `launcher:session-presented` · `launcher:session-invalidated`

平台：窗 label `launcher`，URL `index.html#/launcher`，capabilities `launcher.json`。
设置种子：`app.launcher`。

---

## 6. Session

```txt
booting → hidden → preparing → presenting → visible → closing
                 ↘ error
```

`preparing` 后立即 `present_session`；`session-presented`（becameKey）后 `visible` 并允许 focus。
