export const COMMAND_IDS = {
	openCommandMenu: 'general.openCommandMenu',
	openSearch: 'general.openSearch',
	close: 'general.close',
	selectionDeleteByRoute: 'selection.deleteByRoute',
	selectionClear: 'selection.clear',
	selectionSelectAll: 'selection.selectAll',
	selectionFocusPrevious: 'selection.focusPrevious',
	selectionFocusNext: 'selection.focusNext',
	selectionExtendPrevious: 'selection.extendPrevious',
	selectionExtendNext: 'selection.extendNext',
	saveOrSubmit: 'general.saveOrSubmit',
	submitAndContinue: 'general.submitAndContinue',
	submitAndOpen: 'general.submitAndOpen',
	openShortcutHelp: 'general.openShortcutHelp',
	openSettings: 'general.openSettings',
	goBack: 'general.goBack',
	goForward: 'general.goForward',
	openTask: 'open.task',
	openProject: 'open.project',
	openView: 'open.view',
	openSpace: 'open.space',
	openRecent: 'open.recent',
	newQuickTask: 'new.quickTask',
	newFullTask: 'new.fullTask',
	newStandaloneTask: 'new.standaloneTask',
	newProject: 'new.project',
	newView: 'new.view',
	goStandalone: 'navigation.goStandalone',
	goAllTasks: 'navigation.goAllTasks',
	goToday: 'navigation.goToday',
	goUpcoming: 'navigation.goUpcoming',
	goFocus: 'navigation.goFocus',
	goViews: 'navigation.goViews',
	goProjects: 'navigation.goProjects',
	goArchive: 'navigation.goArchive',
	goTrash: 'navigation.goTrash',
	goRecent: 'navigation.goRecent',
	taskComplete: 'task.complete',
	taskSelect: 'task.select',
	taskPeek: 'task.peek',
	taskOpenDetail: 'task.openDetail',
	taskRename: 'task.rename',
	taskSetPriority: 'task.setPriority',
	taskSetStatus: 'task.setStatus',
	taskOpenDateMenu: 'task.openDateMenu',
	taskArchive: 'task.archive',
	taskDelete: 'task.delete',
	taskConvertToProject: 'task.convertToProject',
	taskCreateProjectFromTask: 'task.createProjectFromTask',
	taskChangePlacement: 'task.changePlacement',
	projectRename: 'project.rename',
	projectArchive: 'project.archive',
	projectDelete: 'project.delete',
	filterAdd: 'filter.add',
	filterToggleCompleted: 'filter.toggleCompleted',
	filterClearAll: 'filter.clearAll',
	displayOpenOptions: 'display.openOptions',
	layoutToggleSidebar: 'layout.toggleSidebar',
	layoutTogglePreview: 'layout.togglePreview',
	systemOpenDataFolder: 'system.openDataFolder',
	viewSuggestFilters: 'view.suggestFilters',
	lifecycleRestore: 'lifecycle.restore',
	lifecycleDelete: 'lifecycle.delete',
	lifecycleDeletePermanently: 'lifecycle.deletePermanently',
} as const

export type KnownCommandId = (typeof COMMAND_IDS)[keyof typeof COMMAND_IDS]
export type CommandId = KnownCommandId | (string & {})

export type CommandCategory =
	| 'general'
	| 'navigation'
	| 'open'
	| 'new'
	| 'list'
	| 'task'
	| 'move'
	| 'project'
	| 'view'
	| 'filter'
	| 'layout'
	| 'system'
	| 'lifecycle'

export type CommandScope =
	| 'global'
	| 'app'
	| 'task-list'
	| 'project-list'
	| 'project-page'
	| 'views-page'
	| 'trash-page'
	| 'preview-drawer'
	| 'detail-drawer'
	| 'modal'
	| 'dropdown'

export type CommandRouteContext = {
	page: 'standalone' | 'tasks' | 'views' | 'projects' | 'archive' | 'trash' | 'settings' | 'unknown'
	projectId?: string
	viewId?: string
}

export type CommandSelectionContext = {
	type?: 'task' | 'project' | 'view' | 'lifecycle'
	ids: string[]
	entities: CommandSelectedEntity[]
	primaryEntity?: CommandSelectedEntity
	clearSelection?: () => void
	focusedId?: string
	focusedType?: 'task' | 'project' | 'view' | 'lifecycle'
	source: 'none' | 'task-list' | 'project-list' | 'lifecycle-list' | 'bulk-bar' | 'row' | 'drawer'
	hasSelection: boolean
	isSingleSelection: boolean
	isMultiSelection: boolean
}

export type CommandSelectedEntity = {
	id: string
	type: 'task' | 'project' | 'view' | 'lifecycle'
	title: string
	subtitle?: string
	spaceId?: string
	projectId?: string | null
	dueAt?: string | null
	status?: string
	priority?: string
	lifecycleMode?: 'archive' | 'trash'
	lifecycleEntityType?: 'space' | 'project' | 'task'
	projectStatus?: 'active' | 'completed' | 'archived'
}

export type CommandFocusContext = {
	isInputFocused: boolean
	activeElementType?:
		| 'input'
		| 'textarea'
		| 'contenteditable'
		| 'button'
		| 'list'
		| 'menu'
		| 'dropdown-item'
		| 'row'
	activePanel: 'main' | 'sidebar' | 'preview' | 'detail' | 'modal' | 'command-menu' | 'dropdown'
}

export type CommandUiContext = {
	isCommandMenuOpen: boolean
	isPreviewOpen: boolean
	isDetailOpen: boolean
	detailEntityType?: 'task' | 'project'
	isModalOpen: boolean
	isDropdownOpen: boolean
	isContextMenuOpen: boolean
	isLeftSidebarOpen: boolean
	isRightPreviewOpen: boolean
}

export type CommandSpaceContext = {
	currentSpaceId?: string
}

export type CommandProjectContext = {
	currentProjectId?: string
}

/** 列表页筛选/显示投影（命令启用态用）；公式真源在 FilterQuery */
export type CommandViewContext = {
	currentViewId?: string
	hasActiveFilters: boolean
	showCompleted: boolean
	filterCapabilities: {
		supportsToggleCompleted: boolean
		supportsClearAll: boolean
	}
}

export type CommandSubmitContext = {
	hasActiveTarget: boolean
	canSubmitDefault: boolean
	canSubmitContinue: boolean
	canSubmitOpen: boolean
	submitContinueDisabledReason?: string
	submitOpenDisabledReason?: string
}

export type CommandRowTargetContext = {
	targetId?: string
	targetType?: 'task' | 'project' | 'view'
	source: 'none' | 'selection' | 'hover' | 'focus' | 'context-menu' | 'drawer'
	hasTarget: boolean
	isTaskTarget: boolean
	isProjectTarget: boolean
}

export type CommandContext = {
	route: CommandRouteContext
	selection: CommandSelectionContext
	focus: CommandFocusContext
	ui: CommandUiContext
	space: CommandSpaceContext
	project: CommandProjectContext
	view: CommandViewContext
	submit: CommandSubmitContext
	rowTarget: CommandRowTargetContext
}

export type Command = {
	id: CommandId
	title: string
	category: CommandCategory
	scope: CommandScope[]
	icon?: string
	description?: string
	keywords?: string[]
	isVisible?: (ctx: CommandContext) => boolean
	isEnabled?: (ctx: CommandContext) => boolean
	getDisabledReason?: (ctx: CommandContext) => string | undefined
	getPriority?: (ctx: CommandContext) => number
	run: (ctx: CommandContext) => void | Promise<void>
}

export type CommandExecutionResult =
	| { status: 'success'; commandId: CommandId }
	| { status: 'not-found'; commandId: CommandId }
	| { status: 'hidden'; commandId: CommandId }
	| { status: 'disabled'; commandId: CommandId; reason?: string }
	| { status: 'failed'; commandId: CommandId; error: unknown }
