import type { Command } from '@/features/command/core'
import { COMMAND_IDS } from '@/features/command/core'

import {
	bindDeleteSelectionCommand,
	bindOpenFilterMenuCommand,
	bindSelectionLifecycleCommand,
	bindSelectionProjectCommand,
	bindSelectionTaskCommand,
	bindSelectionTaskPlacementCommand,
	bindTaskPeekCommand,
	bindTaskTargetCommand,
	bindTogglePreviewCommand,
} from './bind-shell-command-helpers'
import {
	createDisabledCommand,
	UNREGISTERED_HANDLER_REASON,
	type ShellCommandAdapter,
} from './shell-command-actions'

/**
 * 把命令元数据的 run 绑到 ShellCommandAdapter 对应方法。
 * 域 handler 缺失时返回 disabled 命令。
 */
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
		case COMMAND_IDS.close:
			return { ...command, run: adapter.closeCurrentLayer }
		case COMMAND_IDS.selectionDeleteByRoute:
			return bindDeleteSelectionCommand(command, adapter)
		case COMMAND_IDS.saveOrSubmit:
			return withDomainHandler(command, adapter.submitActiveForm, (run) => ({
				...command,
				isEnabled: (ctx) => ctx.submit.canSubmitDefault,
				getDisabledReason: (ctx) =>
					ctx.submit.canSubmitDefault ? undefined : '当前没有可提交内容',
				run,
			}))
		case COMMAND_IDS.submitAndContinue:
			return withDomainHandler(command, adapter.submitAndContinue, (run) => ({
				...command,
				isEnabled: (ctx) => ctx.submit.canSubmitContinue,
				getDisabledReason: (ctx) => ctx.submit.submitContinueDisabledReason,
				run,
			}))
		case COMMAND_IDS.submitAndOpen:
			return withDomainHandler(command, adapter.submitAndOpen, (run) => ({
				...command,
				isEnabled: (ctx) => ctx.submit.canSubmitOpen,
				getDisabledReason: (ctx) => ctx.submit.submitOpenDisabledReason,
				run,
			}))
		case COMMAND_IDS.goBack:
			return { ...command, run: adapter.goBack }
		case COMMAND_IDS.goForward:
			return { ...command, run: adapter.goForward }
		case COMMAND_IDS.openTask:
			return { ...command, run: adapter.openTaskPicker }
		case COMMAND_IDS.openProject:
			return { ...command, run: adapter.openProjectPicker }
		case COMMAND_IDS.taskPeek:
			return withDomainHandler(command, adapter.peekTask, (run) =>
				bindTaskPeekCommand(command, run),
			)
		case COMMAND_IDS.taskOpenDetail:
			return withDomainHandler(command, adapter.openTaskDetail, (run) =>
				bindTaskTargetCommand(command, run),
			)
		case COMMAND_IDS.taskComplete:
			return withDomainHandler(command, adapter.completeSelectedTasks, (run) =>
				bindSelectionTaskCommand(command, run),
			)
		case COMMAND_IDS.taskSetPriority:
			return withDomainHandler(command, adapter.openTaskPriorityPicker, (run) =>
				bindSelectionTaskCommand(command, run),
			)
		case COMMAND_IDS.taskSetStatus:
			return withDomainHandler(command, adapter.openTaskStatusPicker, (run) =>
				bindSelectionTaskCommand(command, run),
			)
		case COMMAND_IDS.taskOpenDateMenu:
			return withDomainHandler(command, adapter.openTaskDatePicker, (run) =>
				bindSelectionTaskCommand(command, run),
			)
		case COMMAND_IDS.taskChangePlacement:
			return withDomainHandler(command, adapter.openTaskPlacementPicker, (run) =>
				bindSelectionTaskPlacementCommand(command, run),
			)
		case COMMAND_IDS.taskArchive:
			return withDomainHandler(command, adapter.requestArchiveSelectedTasks, (run) =>
				bindSelectionTaskCommand(command, run),
			)
		case COMMAND_IDS.taskDelete:
			return withDomainHandler(command, adapter.requestDeleteSelectedTasks, (run) =>
				bindSelectionTaskCommand(command, run),
			)
		case COMMAND_IDS.projectArchive:
			return withDomainHandler(command, adapter.requestArchiveSelectedProjects, (run) =>
				bindSelectionProjectCommand(command, run),
			)
		case COMMAND_IDS.projectDelete:
			return withDomainHandler(command, adapter.requestDeleteSelectedProjects, (run) =>
				bindSelectionProjectCommand(command, run),
			)
		case COMMAND_IDS.lifecycleRestore:
			return withDomainHandler(command, adapter.restoreSelectedLifecycleEntries, (run) =>
				bindSelectionLifecycleCommand(command, run),
			)
		case COMMAND_IDS.lifecycleDelete:
			return withDomainHandler(command, adapter.requestDeleteSelectedLifecycleEntries, (run) =>
				bindSelectionLifecycleCommand(command, run),
			)
		case COMMAND_IDS.lifecycleDeletePermanently:
			return withDomainHandler(
				command,
				adapter.requestDeletePermanentlySelectedLifecycleEntries,
				(run) => bindSelectionLifecycleCommand(command, run),
			)
		case COMMAND_IDS.filterAdd:
			return withDomainHandler(command, adapter.openFilterMenu, () =>
				bindOpenFilterMenuCommand(command, adapter),
			)
		case COMMAND_IDS.filterToggleCompleted:
			return withDomainHandler(command, adapter.toggleCompletedFilter, (run) => ({
				...command,
				isEnabled: (ctx) => ctx.view.filterCapabilities.supportsToggleCompleted,
				getDisabledReason: (ctx) =>
					ctx.view.filterCapabilities.supportsToggleCompleted
						? undefined
						: '当前页面不支持完成筛选',
				run,
			}))
		case COMMAND_IDS.filterClearAll:
			return withDomainHandler(command, adapter.clearAllFilters, (run) => ({
				...command,
				isEnabled: (ctx) => ctx.view.filterCapabilities.supportsClearAll,
				getDisabledReason: (ctx) =>
					ctx.view.filterCapabilities.supportsClearAll ? undefined : '当前页面没有可清除的筛选',
				run,
			}))
		case COMMAND_IDS.displayOpenOptions:
			return withDomainHandler(command, adapter.openDisplayOptions, (run) => ({
				...command,
				run,
			}))
		case COMMAND_IDS.layoutToggleSidebar:
			return { ...command, run: adapter.toggleSidebar }
		case COMMAND_IDS.layoutTogglePreview:
			return withDomainHandler(command, adapter.togglePreview, (run) =>
				bindTogglePreviewCommand(command, run),
			)
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
		case COMMAND_IDS.newStandaloneTask:
			return { ...command, run: adapter.openStandaloneTaskCreate }
		case COMMAND_IDS.newProject:
			return { ...command, run: adapter.openProjectCreate }
		case COMMAND_IDS.newView:
			return createDisabledCommand(command, '视图创建入口尚未接入')
		case COMMAND_IDS.goStandalone:
			return { ...command, run: () => adapter.navigateTo('standalone') }
		case COMMAND_IDS.goAllTasks:
			return { ...command, run: () => adapter.navigateTo('tasks') }
		case COMMAND_IDS.goFocus:
			return { ...command, run: () => adapter.navigateTo('views/focus') }
		case COMMAND_IDS.goViews:
			return { ...command, run: () => adapter.navigateTo('views') }
		case COMMAND_IDS.goProjects:
			return { ...command, run: () => adapter.navigateTo('projects') }
		case COMMAND_IDS.goArchive:
			return { ...command, run: () => adapter.navigateTo('archive') }
		case COMMAND_IDS.goTrash:
			return { ...command, run: () => adapter.navigateTo('trash') }
		case COMMAND_IDS.goToday:
		case COMMAND_IDS.goUpcoming:
		case COMMAND_IDS.goRecent:
			return createDisabledCommand(command, '目标页面尚未接入')
		default:
			return command
	}
}

function withDomainHandler<T>(
	command: Command,
	handler: T | undefined,
	bind: (handler: NonNullable<T>) => Command,
): Command {
	if (typeof handler !== 'function') {
		return createDisabledCommand(command, UNREGISTERED_HANDLER_REASON)
	}
	return bind(handler)
}
