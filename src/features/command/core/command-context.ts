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
			showCompleted: false,
		},
		rowTarget: createEmptyCommandRowTargetContext(),
	}
}
