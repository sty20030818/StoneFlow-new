import type { CommandContext, CommandRowTargetContext } from './command.types'

export function createEmptyCommandRowTargetContext(): CommandRowTargetContext {
	return {
		source: 'none',
		hasTarget: false,
		isTaskTarget: false,
		isProjectTarget: false,
	}
}

export function createEmptyCommandContext(): CommandContext {
	return {
		route: {
			page: 'unknown',
		},
		selection: {
			ids: [],
			hasSelection: false,
			isSingleSelection: false,
			isMultiSelection: false,
		},
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
