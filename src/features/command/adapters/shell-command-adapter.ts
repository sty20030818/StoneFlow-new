import type { Command, CommandContext, TaskPlacementTarget } from '@/features/command/core'
import { COMMAND_IDS } from '@/features/command/core'
import type { PageFilterKind } from '@/features/filter'
import type { ShellNavigationTarget } from '@/shared/types'

export type { ShellNavigationTarget }

/**
 * 壳铬架必填动作：菜单 / 创建 dialog / 关层 / 导航。
 * compose 只校验这组；加壳命令时才改这里 + registerShellChromeCommands。
 */
export type ShellChromeCommandActions = {
	openCommandMenu: () => void
	openShortcutHelp: () => void
	focusSearch: () => void
	openQuickTaskCreate: () => void
	openFullTaskCreate: () => void
	openInboxTaskCreate: () => void
	openProjectCreate: () => void
	openTaskPicker: () => void
	openProjectPicker: () => void
	navigateTo: (target: ShellNavigationTarget) => void
	closeCurrentLayer: (ctx: CommandContext) => void | Promise<void>
	toggleSidebar: () => void
	goBack: () => void
	goForward: () => void
}

/**
 * 各域 register 贡献的动作。装配时按 register 出现；缺则 bind 侧禁用对应命令。
 */
export type ShellDomainCommandActions = {
	openTaskPlacementPicker: (ctx: CommandContext) => void
	applyTaskPlacement: (target: TaskPlacementTarget, ctx: CommandContext) => void | Promise<void>
	openTaskPriorityPicker: (ctx: CommandContext) => void
	openTaskStatusPicker: (ctx: CommandContext) => void
	openTaskDatePicker: (ctx: CommandContext) => void
	completeSelectedTasks: (ctx: CommandContext) => void | Promise<void>
	requestArchiveSelectedTasks: (ctx: CommandContext) => void | Promise<void>
	requestDeleteSelectedTasks: (ctx: CommandContext) => void | Promise<void>
	requestArchiveSelectedProjects: (ctx: CommandContext) => void | Promise<void>
	requestDeleteSelectedProjects: (ctx: CommandContext) => void | Promise<void>
	restoreSelectedLifecycleEntries: (ctx: CommandContext) => void | Promise<void>
	requestDeleteSelectedLifecycleEntries: (ctx: CommandContext) => void | Promise<void>
	requestDeletePermanentlySelectedLifecycleEntries: (ctx: CommandContext) => void | Promise<void>
	submitActiveForm: (ctx: CommandContext) => void | Promise<void>
	submitAndContinue: (ctx: CommandContext) => void | Promise<void>
	submitAndOpen: (ctx: CommandContext) => void | Promise<void>
	togglePreview: (ctx: CommandContext) => void | Promise<void>
	openFilterPicker: (kind: PageFilterKind, ctx: CommandContext) => void
	toggleCompletedFilter: (ctx: CommandContext) => void
	clearAllFilters: (ctx: CommandContext) => void
}

/** 全量装配形状（chrome ∪ domain）；域 register 用 Pick 从此取键 */
export type ShellCommandActions = ShellChromeCommandActions & ShellDomainCommandActions

/** Registry / bind 输入：chrome 必填，域可缺 */
export type ShellCommandAdapter = ShellChromeCommandActions & Partial<ShellDomainCommandActions>

/** compose DEV 校验用；与 `registerShellChromeCommands` 返回键对齐 */
export const SHELL_CHROME_ACTION_KEYS = [
	'openCommandMenu',
	'openShortcutHelp',
	'focusSearch',
	'openQuickTaskCreate',
	'openFullTaskCreate',
	'openInboxTaskCreate',
	'openProjectCreate',
	'openTaskPicker',
	'openProjectPicker',
	'navigateTo',
	'closeCurrentLayer',
	'toggleSidebar',
	'goBack',
	'goForward',
] as const satisfies ReadonlyArray<keyof ShellChromeCommandActions>

const UNREGISTERED_HANDLER_REASON = '该命令处理器尚未注册'

export function createShellCommandAdapter(actions: ShellCommandAdapter): ShellCommandAdapter {
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
			return withDomainHandler(command, adapter.openFilterPicker, () =>
				bindFilterPickerCommand(command, adapter, 'root'),
			)
		case COMMAND_IDS.filterByPriority:
			return withDomainHandler(command, adapter.openFilterPicker, () =>
				bindFilterPickerCommand(command, adapter, 'priority'),
			)
		case COMMAND_IDS.filterByStatus:
			return withDomainHandler(command, adapter.openFilterPicker, () =>
				bindFilterPickerCommand(command, adapter, 'status'),
			)
		case COMMAND_IDS.filterByDate:
			return withDomainHandler(command, adapter.openFilterPicker, () =>
				bindFilterPickerCommand(command, adapter, 'date'),
			)
		case COMMAND_IDS.filterByProject:
			return withDomainHandler(command, adapter.openFilterPicker, () =>
				bindFilterPickerCommand(command, adapter, 'project'),
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
		case COMMAND_IDS.newTaskInInbox:
			return { ...command, run: adapter.openInboxTaskCreate }
		case COMMAND_IDS.newProject:
			return { ...command, run: adapter.openProjectCreate }
		case COMMAND_IDS.newView:
			return createDisabledCommand(command, '视图创建入口尚未接入')
		case COMMAND_IDS.goInbox:
			return { ...command, run: () => adapter.navigateTo('inbox') }
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

function bindSelectionTaskPlacementCommand(
	command: Command,
	run: (ctx: CommandContext) => void | Promise<void>,
): Command {
	return {
		...command,
		isEnabled: (ctx) => getTaskPlacementDisabledReason(ctx) === undefined,
		getDisabledReason: getTaskPlacementDisabledReason,
		getPriority: (ctx) => (ctx.selection.isMultiSelection ? 120 : 90),
		run,
	}
}

function getTaskPlacementDisabledReason(ctx: CommandContext) {
	if (!hasTaskSelection(ctx)) {
		return '需要先选择任务'
	}

	if (!hasResolvedTaskPlacementSpaceId(ctx)) {
		return '跨 Space 批量移动暂不支持'
	}

	return undefined
}

function hasResolvedTaskPlacementSpaceId(ctx: CommandContext) {
	if (ctx.space.currentSpaceId) {
		return true
	}

	const selectionSpaceIds = new Set(
		ctx.selection.entities
			.filter((entity) => entity.type === 'task')
			.map((entity) => entity.spaceId ?? null),
	)

	selectionSpaceIds.delete(null)
	return selectionSpaceIds.size === 1
}

function bindSelectionLifecycleCommand(
	command: Command,
	run: (ctx: CommandContext) => void | Promise<void>,
): Command {
	return {
		...command,
		isEnabled: (ctx) => hasLifecycleSelection(ctx),
		getDisabledReason: (ctx) => (hasLifecycleSelection(ctx) ? undefined : '需要先选择条目'),
		getPriority: (ctx) => (ctx.selection.isMultiSelection ? 120 : 90),
		run,
	}
}

function hasLifecycleSelection(ctx: CommandContext) {
	return ctx.selection.type === 'lifecycle' && ctx.selection.ids.length > 0
}

function bindDeleteSelectionCommand(command: Command, adapter: ShellCommandAdapter): Command {
	const hasDeleteHandlers =
		typeof adapter.requestDeleteSelectedTasks === 'function' &&
		typeof adapter.requestDeleteSelectedProjects === 'function' &&
		typeof adapter.requestDeleteSelectedLifecycleEntries === 'function' &&
		typeof adapter.requestDeletePermanentlySelectedLifecycleEntries === 'function'

	if (!hasDeleteHandlers) {
		return createDisabledCommand(command, UNREGISTERED_HANDLER_REASON)
	}

	return {
		...command,
		isEnabled: (ctx) => getDeleteSelectionDisabledReason(ctx) === undefined,
		getDisabledReason: getDeleteSelectionDisabledReason,
		getPriority: (ctx) => (ctx.selection.isMultiSelection ? 120 : 90),
		run: (ctx) => {
			if (hasTaskSelection(ctx)) {
				return adapter.requestDeleteSelectedTasks?.(ctx)
			}

			if (hasProjectSelection(ctx)) {
				return adapter.requestDeleteSelectedProjects?.(ctx)
			}

			if (!hasLifecycleSelection(ctx)) {
				return
			}

			if (ctx.route.page === 'archive') {
				return adapter.requestDeleteSelectedLifecycleEntries?.(ctx)
			}

			if (ctx.route.page === 'trash') {
				return adapter.requestDeletePermanentlySelectedLifecycleEntries?.(ctx)
			}
		},
	}
}

function getDeleteSelectionDisabledReason(ctx: CommandContext) {
	if (hasTaskSelection(ctx)) {
		return undefined
	}

	if (hasProjectSelection(ctx)) {
		return undefined
	}

	if (!hasLifecycleSelection(ctx)) {
		return '需要先选择任务、项目或归档/回收站条目'
	}

	return ctx.route.page === 'archive' || ctx.route.page === 'trash'
		? undefined
		: '当前页面不支持删除选中条目'
}

function bindSelectionProjectCommand(
	command: Command,
	run: (ctx: CommandContext) => void | Promise<void>,
): Command {
	return {
		...command,
		isEnabled: (ctx) => hasProjectSelection(ctx),
		getDisabledReason: (ctx) => (hasProjectSelection(ctx) ? undefined : '需要先选择项目'),
		getPriority: (ctx) => (ctx.selection.isMultiSelection ? 120 : 90),
		run,
	}
}

function hasProjectSelection(ctx: CommandContext) {
	return ctx.selection.type === 'project' && ctx.selection.ids.length > 0
}

function bindFilterPickerCommand(
	command: Command,
	adapter: ShellCommandAdapter,
	kind: PageFilterKind,
): Command {
	const openFilterPicker = adapter.openFilterPicker
	if (typeof openFilterPicker !== 'function') {
		return createDisabledCommand(command, UNREGISTERED_HANDLER_REASON)
	}

	return {
		...command,
		isEnabled: (ctx) => getFilterPickerDisabledReason(ctx, kind) === undefined,
		getDisabledReason: (ctx) => getFilterPickerDisabledReason(ctx, kind),
		run: (ctx) => openFilterPicker(kind, ctx),
	}
}

function getFilterPickerDisabledReason(ctx: CommandContext, kind: PageFilterKind) {
	const capabilities = ctx.view.filterCapabilities

	switch (kind) {
		case 'root':
			return capabilities.supportsClearAll ||
				capabilities.supportsDate ||
				capabilities.supportsPriority ||
				capabilities.supportsProject ||
				capabilities.supportsStatus ||
				capabilities.supportsToggleCompleted
				? undefined
				: '当前页面暂未接入筛选'
		case 'priority':
			return capabilities.supportsPriority ? undefined : '当前页面不支持优先级筛选'
		case 'status':
			return capabilities.supportsStatus ? undefined : '当前页面不支持状态筛选'
		case 'date':
			return capabilities.supportsDate ? undefined : '当前页面不支持日期筛选'
		case 'project':
			return capabilities.supportsProject ? undefined : '当前页面不支持项目筛选'
		default:
			return '当前页面暂未接入筛选'
	}
}

function bindTogglePreviewCommand(
	command: Command,
	run: (ctx: CommandContext) => void | Promise<void>,
): Command {
	return {
		...command,
		isEnabled: (ctx) => getTogglePreviewDisabledReason(ctx) === undefined,
		getDisabledReason: getTogglePreviewDisabledReason,
		run,
	}
}

function getTogglePreviewDisabledReason(ctx: CommandContext) {
	if (ctx.ui.detailEntityType === 'task') {
		return undefined
	}

	return resolveTaskDetailTargetId(ctx) ? undefined : '当前没有可打开的任务预览'
}

function resolveTaskDetailTargetId(ctx: CommandContext) {
	if (ctx.rowTarget.isTaskTarget && ctx.rowTarget.targetId) {
		return ctx.rowTarget.targetId
	}

	if (ctx.selection.focusedType === 'task' && ctx.selection.focusedId) {
		return ctx.selection.focusedId
	}

	if (ctx.selection.primaryEntity?.type === 'task') {
		return ctx.selection.primaryEntity.id
	}

	if (
		ctx.selection.type === 'task' &&
		ctx.selection.isSingleSelection &&
		ctx.selection.ids.length === 1
	) {
		return ctx.selection.ids[0]
	}

	return null
}
