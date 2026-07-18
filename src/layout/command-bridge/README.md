# Shell Command Bridge（命令宿主装配）

把壳上可用的端口组装成 `ShellCommandActions`，交给 `useCommandRuntime` 绑定命令元数据。

**只做 compose，不写领域 mutation。**

| 文件 | 职责 |
|------|------|
| `useShellCommandActions.ts` | compose：壳 chrome + 各域 `registerXxxCommands` |
| `registerShellChromeCommands.ts` | 菜单 / 创建 dialog / 关层 / 导航（壳侧） |
| `composeShellCommandActions.ts` | 合并 `Partial<ShellCommandActions>` 并校验必填方法 |
| `types.ts` | Host 依赖袋（与 `CommandHostContext` 对齐） |

Host 编排在 `layout/model/useShellCommandSystem.ts`（打开路由 / Context / Runtime 接线）。

## 新增命令动作

1. 在对应 **domain** 的 `register*Commands` 增加 handler
2. 若需新 Host 端口：同时扩 `CommandHostContext` 与 `ShellCommandBridgeDeps`
3. 在 `useShellCommandActions` 的 compose 列表挂上
4. 同步 `features/command/adapters` 的 `ShellCommandActions` 与 `bindShellCommand`
