# launcher · 独立窗 Launcher

> 定稿最优架构。写法见 [`CONVENTIONS.md`](../../CONVENTIONS.md)。最后更新：2026-08-25

---

## 1. 心智

```txt
src/launcher.tsx
  → LauncherPage（薄壳：独立 renderer 挂载）
      → SessionProvider          // phase / bridge / close
      → DomainProvider           // draft / search / submit / derived
      → PresentSession           // preparing → present_session
      → Panel                    // Composer → Advanced → Create? → Results → Footer
```

Launcher 不经过主应用 Router 或 Shell Provider。`launcher:session-prepared` 先从 appearance public 重读本机 Accent，再进入呈现状态；事件只携带创建所必需的 Open context。最近任务和项目由 `launcher_get_recent_data` 在该事件后异步补齐，不能阻塞输入聚焦或 `present_session`。

| 层 | 负责 | 禁止 |
|----|------|------|
| **session** | phase、bridge、present、close、becameKey focus 许可 | draft、搜索规则 |
| **domain** | draft / search / submit / derived（flatItems） | NSPanel、窗尺寸、Board |
| **chrome** | HeroUI Surface / ScrollShadow / Spinner 与 Panel / Footer 组合 | domain 业务字段细节 |
| **composer / create / results** | 输入、新建行、列表 IA | 直接 invoke、platform |
| **api** | 窗 IPC + map*（create→task，search→global-search） | 第二套 create/search 规则 |

独立入口 **只** `import { LauncherPage } from '@/features/launcher'`。
**禁止** deep-import；**禁止** `features/launcher` → `@/layout/**`。

---

## 2. 目录结构（定稿）

```txt
src/features/launcher/
├── ARCHITECTURE.md
├── index.ts                 # 仅导出 LauncherPage 给独立入口
├── chrome/                  # Surface · Panel · Footer
├── composer/                # 输入与 meta / Advanced / controls
├── create/                  # 钉住的新建行
├── results/                 # 列表 IA（轻标题 / flat 流 / EmptyHint）
├── session/                 # phase · bridge · PresentSession
├── domain/                  # DomainProvider · reducer · hooks · derived
├── api/                     # launcher_* IPC + map*
└── model/                   # types · formatters · interleaveResults
```

界面直接组合 HeroUI；Launcher 不维护第二套 base / pattern 表面。
关闭：`SessionProvider.requestClose` → `launcher_close_session`。

---

## 3. UI/UX（冻结）

| 项 | 约定 |
|----|------|
| 壳尺寸 | **720 × 500** logical px |
| 空态 | 最近任务 ≤5 + 最近项目 ≤5；轻标题；无折叠 / sticky / 灰条 |
| Results 滚动 | HeroUI `ScrollShadow`；collection 状态仍由 selection feature 提供 |
| 搜索 | flat 交错流；「搜索结果」轻标题钉在滚动区外 |
| 新建行 | 有标题时钉在 Results 上方；↑↓ 独立 focus lane |
| 圆角 | Win **8** / Mac **16** → `--launcher-panel-radius` |
| 复用 | HeroUI 组件 + 全局 semantic theme；禁止 Launcher 专属兼容 facade |
| 快捷键 | Launcher 独占本地 binding / 匹配；键帽与读屏语义复用 shared |
| 日期 | 既有日期 Popover 保留预设与清除；自定义值用 HeroUI `Calendar` 选择，离开视图边界后仍是 `YYYY-MM-DD` |

---

## 4. Domain 列表契约

```txt
RECENT_TASK_LIMIT = 5
RECENT_PROJECT_LIMIT = 5
SEARCH_RESULT_LIMIT = 20

mode: 'recent' | 'search' | 'search-empty' | 'recent-empty'
flatItems: ResultItem[]
focusTarget: 'none' | 'create'
resultCollection.focusedKey: `${kind}:${id}` | null
```

Create **不在** `flatItems` 内。结果导航复用 selection feature 的 collection 合同，
不再在 Launcher reducer 内保存第二份 result index。搜索混排：`interleaveTaskProjectResults`。

---

## 5. 窗 IPC / Session

| 命令 | 用途 |
|------|------|
| `launcher_get_recent_data` | 窗口可见后异步读取最近任务与项目 |
| `launcher_list_projects_by_space` | 归属选项 |
| `launcher_open_target` | 聚焦主窗并导航 |
| `launcher_prepare/present/close_session` | 会话显隐 |
| `launcher_frontend_ready` | 前端监听器就绪 |

```txt
booting → hidden → preparing → presenting → visible → closing
                 ↘ error
```

平台：窗 label `launcher`，URL `launcher.html`，capabilities `launcher.json`。

Launcher 原生窗口半径与透明裁切属于 platform/host geometry；组件状态与动效使用 HeroUI 上游 recipe，Launcher 不写第一方动画或第二套全局皮肤。

预热失败后保留原生窗，但下一轮预热会重载其 WebView，再等待前端重新注册 listener；不保留旧轮询或第二套入口。

---

## 6. 变更纪律

改定稿目录或 public 时更新本文件。`bun run check`（或至少 tsc + boundaries + launcher vitest）。
