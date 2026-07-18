# Shell Command Bridge（命令宿主装配）

把壳上可用的端口组装成 `ShellCommandAdapter`，交给 `useCommandRuntime` 绑定命令元数据。

**只做 compose，不写领域 mutation。**

| 文件 | 职责 |
|------|------|
| `useShellCommandActions.ts` | compose：壳 chrome + 各域 `registerXxxCommands` |
| `registerShellChromeCommands.ts` | 菜单 / 创建 dialog / 关层 / 导航（壳侧） |
| `composeShellCommandActions.ts` | 合并 Partial；**只校验 chrome 最小集** |
| `types.ts` | Host 依赖袋（与 `CommandHostContext` 对齐） |

Host 编排在 `layout/model/useShellCommandSystem.ts`（打开路由 / Context / Runtime 接线）。

## 新增命令动作

### 域命令（task / project / lifecycle / filter / submit）

1. 元数据：`features/command/commands` + `COMMAND_IDS`（若新 id）
2. 对应 **domain** 的 `register*Commands` 增加 handler
3. `ShellDomainCommandActions` + `bindShellCommand` 绑 id → handler
   **不必**改 `composeShellCommandActions` 必填表

### 壳 chrome 命令

1. 元数据 + id
2. `registerShellChromeCommands` + `ShellChromeCommandActions` / `SHELL_CHROME_ACTION_KEYS`
3. `bindShellCommand`

缺域 handler 时，对应命令在 Runtime 中为 **disabled**（「该命令处理器尚未注册」）。
