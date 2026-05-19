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
			hasActiveFilters: false,
			showCompleted: true,
			priorityFilterValues: [],
			statusFilterValues: [],
			dateFilterValue: 'none',
			projectFilterId: null,
			projectlessOnly: false,
			filterCapabilities: {
				supportsPriority: false,
				supportsStatus: false,
				supportsDate: false,
				supportsProject: false,
				supportsToggleCompleted: false,
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
