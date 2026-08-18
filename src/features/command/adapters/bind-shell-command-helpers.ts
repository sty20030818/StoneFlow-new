import {
	resolveTaskDetailTargetId,
	type Command,
	type CommandContext,
} from '@/features/command/core'

import {
	createDisabledCommand,
	UNREGISTERED_HANDLER_REASON,
	type ShellCommandAdapter,
} from './shell-command-actions'

export function bindSelectionTaskCommand(command: Command, run: Command['run']): Command {
	return {
		...command,
		isEnabled: (ctx) => hasTaskSelection(ctx),
		getDisabledReason: (ctx) => (hasTaskSelection(ctx) ? undefined : '需要先选择任务'),
		getPriority: (ctx) => (ctx.selection.isMultiSelection ? 120 : 90),
		run,
	}
}

export function hasTaskSelection(ctx: CommandContext) {
	return ctx.selection.type === 'task' && ctx.selection.ids.length > 0
}

export function bindTaskTargetCommand(command: Command, run: Command['run']): Command {
	return {
		...command,
		isEnabled: (ctx) => resolveTaskDetailTargetId(ctx) !== null,
		getDisabledReason: (ctx) =>
			resolveTaskDetailTargetId(ctx) === null ? '当前没有可操作的任务' : undefined,
		run,
	}
}

export function bindTaskPeekCommand(command: Command, run: Command['run']): Command {
	const bound = bindTaskTargetCommand(command, run)
	return {
		...bound,
		isEnabled: (ctx) => ctx.ui.detailEntityType !== 'task' && bound.isEnabled!(ctx),
		getDisabledReason: (ctx) =>
			ctx.ui.detailEntityType === 'task' ? '任务详情已打开' : bound.getDisabledReason?.(ctx),
	}
}

export function bindSelectionTaskPlacementCommand(command: Command, run: Command['run']): Command {
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

	// 合并 filter + map 为单次遍历，直接跳过 null spaceId（等价于原先 delete(null)）
	const selectionSpaceIds = new Set<string>()
	for (const entity of ctx.selection.entities) {
		if (entity.type === 'task' && entity.spaceId) {
			selectionSpaceIds.add(entity.spaceId)
		}
	}

	return selectionSpaceIds.size === 1
}

export function bindSelectionLifecycleCommand(command: Command, run: Command['run']): Command {
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

export function bindDeleteSelectionCommand(
	command: Command,
	adapter: ShellCommandAdapter,
): Command {
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
		run: (ctx, invocation) => {
			if (hasTaskSelection(ctx)) {
				return adapter.requestDeleteSelectedTasks?.(ctx, invocation)
			}

			if (hasProjectSelection(ctx)) {
				return adapter.requestDeleteSelectedProjects?.(ctx, invocation)
			}

			if (!hasLifecycleSelection(ctx)) {
				return
			}

			if (ctx.route.page === 'archive') {
				return adapter.requestDeleteSelectedLifecycleEntries?.(ctx, invocation)
			}

			if (ctx.route.page === 'trash') {
				return adapter.requestDeletePermanentlySelectedLifecycleEntries?.(ctx, invocation)
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

export function bindSelectionProjectCommand(command: Command, run: Command['run']): Command {
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

/** F：打开锚定筛选菜单 */
export function bindOpenFilterMenuCommand(command: Command, adapter: ShellCommandAdapter): Command {
	const openFilterMenu = adapter.openFilterMenu
	if (typeof openFilterMenu !== 'function') {
		return createDisabledCommand(command, UNREGISTERED_HANDLER_REASON)
	}

	return {
		...command,
		run: (ctx) => openFilterMenu(ctx),
	}
}

export function bindTogglePreviewCommand(
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
