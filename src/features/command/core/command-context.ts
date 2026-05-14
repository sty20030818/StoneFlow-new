import type { CommandContext } from './command.types'

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
			isLeftSidebarOpen: true,
			isRightPreviewOpen: false,
		},
		space: {},
		project: {},
		view: {
			hasActiveFilters: false,
		},
	}
}
