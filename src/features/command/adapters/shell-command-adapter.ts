import type { Command, CommandContext } from '@/features/command/core'
import { COMMAND_IDS } from '@/features/command/core'

export type ShellNavigationTarget =
	| 'inbox'
	| 'all-tasks'
	| 'focus'
	| 'views'
	| 'projects'
	| 'archive'
	| 'trash'
	| 'settings'

export type ShellCommandActions = {
	openCommandMenu: () => void
	openShortcutHelp: () => void
	focusSearch: () => void
	openQuickTaskCreate: () => void
	openFullTaskCreate: () => void
	openInboxTaskCreate: () => void
	openProjectCreate: () => void
	openTaskPicker: () => void
	openProjectPicker: () => void
	completeSelectedTasks: (ctx: CommandContext) => void | Promise<void>
	requestArchiveSelectedTasks: (ctx: CommandContext) => void | Promise<void>
	requestDeleteSelectedTasks: (ctx: CommandContext) => void | Promise<void>
	navigateTo: (target: ShellNavigationTarget) => void
	goBack: () => void
	goForward: () => void
}

export type ShellCommandAdapter = ShellCommandActions

export function createShellCommandAdapter(actions: ShellCommandActions): ShellCommandAdapter {
	return actions
}

export function createDisabledCommand(command: Command, reason: string): Command {
	return {
		...command,
		isEnabled: () => false,
		getDisabledReason: () => reason,
		run: () => {},
	}
}

export function bindShellCommand(command: Command, adapter: ShellCommandAdapter): Command {
	switch (command.id) {
		case COMMAND_IDS.openCommandMenu:
			return { ...command, run: adapter.openCommandMenu }
		case COMMAND_IDS.openShortcutHelp:
			return { ...command, run: adapter.openShortcutHelp }
		case COMMAND_IDS.openSearch:
			return { ...command, run: adapter.focusSearch }
		case COMMAND_IDS.openSettings:
			return { ...command, run: () => adapter.navigateTo('settings') }
		case COMMAND_IDS.goBack:
			return { ...command, run: adapter.goBack }
		case COMMAND_IDS.goForward:
			return { ...command, run: adapter.goForward }
		case COMMAND_IDS.openTask:
			return { ...command, run: adapter.openTaskPicker }
		case COMMAND_IDS.openProject:
			return { ...command, run: adapter.openProjectPicker }
		case COMMAND_IDS.taskComplete:
			return bindSelectionTaskCommand(command, adapter.completeSelectedTasks)
		case COMMAND_IDS.taskArchive:
			return bindSelectionTaskCommand(command, adapter.requestArchiveSelectedTasks)
		case COMMAND_IDS.taskDelete:
			return bindSelectionTaskCommand(command, adapter.requestDeleteSelectedTasks)
		case COMMAND_IDS.openView:
			return createDisabledCommand(command, '视图搜索尚未接入')
		case COMMAND_IDS.openSpace:
			return createDisabledCommand(command, 'Space 搜索尚未接入')
		case COMMAND_IDS.openRecent:
			return createDisabledCommand(command, '最近访问选择尚未接入')
		case COMMAND_IDS.newQuickTask:
			return { ...command, run: adapter.openQuickTaskCreate }
		case COMMAND_IDS.newFullTask:
			return { ...command, run: adapter.openFullTaskCreate }
		case COMMAND_IDS.newTaskInInbox:
			return { ...command, run: adapter.openInboxTaskCreate }
		case COMMAND_IDS.newProject:
			return { ...command, run: adapter.openProjectCreate }
		case COMMAND_IDS.newView:
			return createDisabledCommand(command, '视图创建入口尚未接入')
		case COMMAND_IDS.goInbox:
			return { ...command, run: () => adapter.navigateTo('inbox') }
		case COMMAND_IDS.goAllTasks:
			return { ...command, run: () => adapter.navigateTo('all-tasks') }
		case COMMAND_IDS.goFocus:
			return { ...command, run: () => adapter.navigateTo('focus') }
		case COMMAND_IDS.goViews:
			return { ...command, run: () => adapter.navigateTo('views') }
		case COMMAND_IDS.goProjects:
			return { ...command, run: () => adapter.navigateTo('projects') }
		case COMMAND_IDS.goArchive:
			return { ...command, run: () => adapter.navigateTo('archive') }
		case COMMAND_IDS.goTrash:
			return { ...command, run: () => adapter.navigateTo('trash') }
		case COMMAND_IDS.goSettings:
			return { ...command, run: () => adapter.navigateTo('settings') }
		case COMMAND_IDS.goToday:
		case COMMAND_IDS.goUpcoming:
		case COMMAND_IDS.goRecent:
			return createDisabledCommand(command, '目标页面尚未接入')
		default:
			return command
	}
}

function bindSelectionTaskCommand(
	command: Command,
	run: (ctx: CommandContext) => void | Promise<void>,
): Command {
	return {
		...command,
		isEnabled: (ctx) => hasTaskSelection(ctx),
		getDisabledReason: (ctx) => (hasTaskSelection(ctx) ? undefined : '需要先选择任务'),
		getPriority: (ctx) => (ctx.selection.isMultiSelection ? 120 : 90),
		run,
	}
}

function hasTaskSelection(ctx: CommandContext) {
	return ctx.selection.type === 'task' && ctx.selection.ids.length > 0
}
