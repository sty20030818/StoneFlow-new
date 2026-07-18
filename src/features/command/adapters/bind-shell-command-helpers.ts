import type { Command, CommandContext } from '@/features/command/core'
import type { PageFilterKind } from '@/features/filter'

import {
	createDisabledCommand,
	UNREGISTERED_HANDLER_REASON,
	type ShellCommandAdapter,
} from './shell-command-actions'

export function bindSelectionTaskCommand(
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

export function hasTaskSelection(ctx: CommandContext) {
	return ctx.selection.type === 'task' && ctx.selection.ids.length > 0
}

export function bindSelectionTaskPlacementCommand(
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

export function bindSelectionLifecycleCommand(
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

export function bindSelectionProjectCommand(
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

export function bindFilterPickerCommand(
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
