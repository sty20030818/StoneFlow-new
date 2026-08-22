import type {
	CommandContext,
	CommandRowTargetContext,
	CommandSelectionContext,
} from './command.types'

export function createEmptyCommandRowTargetContext(): CommandRowTargetContext {
	return {
		source: 'none',
		hasTarget: false,
		isTaskTarget: false,
		isProjectTarget: false,
	}
}

export function createEmptyCommandSelectionContext(): CommandSelectionContext {
	return {
		ids: [],
		entities: [],
		source: 'none',
		hasSelection: false,
		isSingleSelection: false,
		isMultiSelection: false,
	}
}

export function createEmptyCommandContext(): CommandContext {
	return {
		route: {
			page: 'unknown',
		},
		selection: createEmptyCommandSelectionContext(),
		focus: {
			isInputFocused: false,
			activePanel: 'main',
		},
		ui: {
			isCommandMenuOpen: false,
			isPreviewOpen: false,
			isDetailOpen: false,
			detailEntityType: undefined,
			isModalOpen: false,
			isDropdownOpen: false,
			isContextMenuOpen: false,
			isLeftSidebarOpen: true,
			isRightPreviewOpen: false,
		},
		space: {},
		project: {},
		view: {
			filterCapabilities: {
				supportsClearAll: false,
			},
		},
		submit: {
			hasActiveTarget: false,
			canSubmitDefault: false,
			canSubmitContinue: false,
			canSubmitOpen: false,
			submitContinueDisabledReason: '当前没有可提交内容',
			submitOpenDisabledReason: '当前没有可提交内容',
		},
		rowTarget: createEmptyCommandRowTargetContext(),
	}
}

/** 任务详情类命令的唯一目标优先级。 */
export function resolveTaskDetailTargetId(ctx: CommandContext) {
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
