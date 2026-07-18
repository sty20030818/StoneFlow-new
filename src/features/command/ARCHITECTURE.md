# command · 命令 / 快捷键 / 命令板

> 作用：描述 **当前已落地** 的 `src/features/command` 边界
> 最后更新：2026-07-18

---

## 1. 当前真实心智

```txt
Command 元数据（id / title / when）在 commands/
  → bindShellCommand(adapter) 把 run 绑到 handler
  → ShellCommandActions = compose(
       registerShellChromeCommands(host),   // layout：菜单/创建/关层/导航
       registerTaskCommands(host),
       registerProjectCommands(host),
       registerLifecycleCommands(host),
       registerFilterCommands(host),
       registerSubmitCommands(host),
     )
  → Runtime + ShortcutLayer + CommandMenu / ShortcutHelp
```

| 层 | 负责 |
|----|------|
| **command** | 元数据、Registry/Runtime、bind、Host 端口类型、菜单 UI |
| **domain** | `registerXxxCommands(host)` 业务 handlers |
| **layout** | 装配 Host 依赖 + 壳 chrome register；**不写** domain mutation |

`ShellCommandActions` 是 adapter 形状（供 bind 使用）；业务实现只来自各 register。

---

## 2. 目录结构

```txt
src/features/command/
├── ARCHITECTURE.md
├── index.ts                 # public：外模块已消费符号（已收窄）
├── api/                     # 外部唤起打开意图等 IPC
├── host/                    # CommandHostContext 端口类型
├── adapters/                # ShellCommandActions + bindShellCommand
├── commands/                # 元数据定义 + createShellCommandRegistry
├── core/
├── components/
│   ├── CommandMenu.tsx              # 壳：Dialog / input / mode 分流
│   ├── CommandMenuSelectionChips.tsx
│   ├── CommandMenuListPrimitives.tsx
│   ├── ScopedPickerCommandGroup.tsx
│   ├── FilterPickerCommandGroup.tsx
│   ├── command-menu-helpers.ts      # 占位/空态/meta/icon 纯函数
│   ├── ShortcutHelp · ChordHint · ShortcutTokens …
│   └── command-menu-model|types|metadata|option-visuals
├── keybinding/
├── runtime/
└── shortcuts/
```

---

## 3. 变更纪律

改 handlers 归属或 Host 端口时：更新本文件与 `layout/command-bridge/README.md`；`bun run check`。
