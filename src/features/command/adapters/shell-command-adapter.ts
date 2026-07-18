/**
 * adapter 对外兼容入口：类型 + bind + 工厂。
 * 实现已拆到 `shell-command-actions` / `bind-shell-command` / `bind-shell-command-helpers`。
 */
export {
	createDisabledCommand,
	createShellCommandAdapter,
	SHELL_CHROME_ACTION_KEYS,
	UNREGISTERED_HANDLER_REASON,
} from './shell-command-actions'
export type {
	ShellChromeCommandActions,
	ShellCommandActions,
	ShellCommandAdapter,
	ShellDomainCommandActions,
	ShellNavigationTarget,
} from './shell-command-actions'
export { bindShellCommand } from './bind-shell-command'
