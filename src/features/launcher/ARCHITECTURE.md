# launcher · 独立窗 Launcher

> 定稿最优架构。写法见 [`CONVENTIONS.md`](../../CONVENTIONS.md)。最后更新：2026-07-19

---

## 1. 心智

```txt
routes/launcher
  → LauncherPage（薄壳：半径 CSS + 挂载）
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
**禁止** deep-import；**禁止** `features/launcher` → `@/layout/**`。

---

## 2. 目录结构（定稿）

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

共享 pattern：`src/shared/components/patterns/launcher.ts`。
关闭：`SessionProvider.requestClose` → `launcher_close_session`。

---

## 3. UI/UX（冻结）

| 项 | 约定 |
|----|------|
| 壳尺寸 | **720 × 500** logical px |
| 空态 | 最近任务 ≤5 + 最近项目 ≤5；轻标题；无折叠 / sticky / 灰条 |
| Results 滚动 | `AppScrollArea` |
| 搜索 | flat 交错流；「搜索结果」轻标题钉在滚动区外 |
| 新建行 | 有标题时钉在 Results 上方；↑↓ 独立 focus lane |
| 圆角 | Win **8** / Mac **16** → `--launcher-panel-radius` |
| 复用 | 主站 sf token + RowShell 原样；禁止 RowShell/Board launcher variant |

---

## 4. Domain 列表契约

```txt
RECENT_TASK_LIMIT = 5
RECENT_PROJECT_LIMIT = 5
SEARCH_RESULT_LIMIT = 20

mode: 'recent' | 'search' | 'search-empty' | 'recent-empty'
flatItems: ResultItem[]
focusTarget: 'none' | 'create' | { kind: 'result', index }
```

Create **不在** `flatItems` 内。搜索混排：`interleaveTaskProjectResults`。

---

## 5. 窗 IPC / Session

| 命令 | 用途 |
|------|------|
| `launcher_get_initial_state` | 打开上下文快照 |
| `launcher_list_projects_by_space` | 归属选项 |
| `launcher_open_target` | 聚焦主窗并导航 |
| `launcher_prepare/present/close_session` | 会话显隐 |
| `launcher_frontend_ready/unready` | 前端监听器就绪 |

```txt
booting → hidden → preparing → presenting → visible → closing
                 ↘ error
```

平台：窗 label `launcher`，URL `index.html#/launcher`，capabilities `launcher.json`。

---

## 6. 变更纪律

改定稿目录或 public 时更新本文件。`bun run check`（或至少 tsc + boundaries + launcher vitest）。
