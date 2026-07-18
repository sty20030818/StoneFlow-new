# command · 命令 / 快捷键 / 命令板

> 定稿最优架构。写法见 [`CONVENTIONS.md`](../../CONVENTIONS.md)。最后更新：2026-07-19

---

## 1. 心智

```txt
commands/ 元数据（id / title / when）
  → bindShellCommand(adapter) 把 run 绑到 handler
  → ShellCommandAdapter = compose(
       registerShellChromeCommands(host),   // layout：菜单/创建/关层/导航（必填）
       registerTaskCommands(host),          // 域：可缺 → 命令 disabled
       registerProjectCommands(host),
       registerLifecycleCommands(host),
       registerFilterCommands(host),
       registerSubmitCommands(host),
     )
  → Runtime + ShortcutLayer + CommandMenu / ShortcutHelp
```

| 层 | 负责 |
|----|------|
| **command** | 元数据、Registry/Runtime、bind 协议、Host **端口类型**、keybinding、菜单 UI |
| **domain / 其它 platform** | `registerXxxCommands(host)` 业务 handlers |
| **layout** | 装配 Host 依赖 + 壳 chrome register；**不写** domain mutation |

换页只走 navigation intent；写数据只走各域 mutation / bulk。

| 类型 | 含义 |
|------|------|
| `ShellChromeCommandActions` | 壳必填；`SHELL_CHROME_ACTION_KEYS` 供 compose DEV 校验 |
| `ShellDomainCommandActions` | 各域 register 贡献 |
| `ShellCommandActions` | chrome ∪ domain（全量形状，供 `Pick`） |
| `ShellCommandAdapter` | chrome ∪ Partial domain（Registry 输入） |

跨模块 **只** `import { … } from '@/features/command'`。
**禁止** `features/command` → `@/layout/**`。

---

## 2. 目录结构（定稿）

```txt
src/features/command/
├── ARCHITECTURE.md
├── index.ts                 # 主 public
├── api/                     # 外部唤起打开意图等
├── host/                    # CommandHostContext 端口类型
├── adapters/                # chrome/domain 形状 + bind（actions / bind / helpers）
├── commands/                # 元数据 + createShellCommandRegistry
├── core/                    # Registry / Runtime / Context
├── components/              # Menu 壳 + 分段 / Help / Hint
├── keybinding/              # 默认表 + 匹配
├── runtime/                 # React hooks
└── shortcuts/               # ShortcutLayer / chord
```

layout 侧装配（非本夹，但契约相关）：

```txt
layout/command-bridge/       # chrome register + compose 各域 register
layout/model/useShellCommandSystem.ts  # Host：组 Context + Runtime + 挂 UI
```

adapters 内拆（体积）：

```txt
shell-command-actions.ts       # 类型 + chrome keys + disabled 工厂
bind-shell-command.ts          # id → handler 主开关
bind-shell-command-helpers.ts  # selection / filter / delete 绑定
shell-command-adapter.ts       # 兼容再导出
```

---

## 3. Public 要点

| 类 | 示例 |
|----|------|
| 运行时 | `CommandRegistry` · `CommandRuntime` · `useCommandRuntime` / Context / Runner |
| 快捷键 | `DEFAULT_KEYBINDINGS` · `matchKeybindingEvent` · `CommandShortcutLayer` |
| UI | `CommandMenu` · `ShortcutHelp` · `ChordHint` · `ShortcutTokens` |
| 标识 / 上下文 | `COMMAND_IDS` · `CommandContext` · `CommandSelectionContext` · `CommandHostContext` |
| 壳适配形状 | `ShellCommandActions` / `ShellCommandAdapter` / `SHELL_CHROME_ACTION_KEYS` |
| IPC | `takePendingCommandOpenIntent` |

新增导出前确认已有外消费者。导出符合 CONVENTIONS TSDoc L1。
keybinding 底层工具、Menu 内部分组类型、adapter 工厂默认不外放。

---

## 4. 与其它模块

| 协作 | 方向 |
|------|------|
| layout | Host 装配；只挂 Menu/Shortcut；chrome register |
| task / project / lifecycle / filter / submit | 各自 `register*Commands` |
| selection | 提供 CommandSelection 快照 |
| navigation | 换页命令只调 path-only intent |
| shell-dialogs | 命令板 mode / selection override |
| bulk-action | 域 handler 内可调 bulk 引擎 |

---

## 5. 变更纪律

改 Host 端口、register 协议或 public 时更新本文件。`bun run check`（或至少 tsc + boundaries + command vitest）。
