export const COMMAND_IDS = {
	openCommandMenu: 'general.openCommandMenu',
	openSearch: 'general.openSearch',
	close: 'general.close',
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
	newTaskInInbox: 'new.taskInInbox',
	newProject: 'new.project',
	newView: 'new.view',
	goInbox: 'navigation.goInbox',
	goAllTasks: 'navigation.goAllTasks',
	goToday: 'navigation.goToday',
	goUpcoming: 'navigation.goUpcoming',
	goFocus: 'navigation.goFocus',
	goViews: 'navigation.goViews',
	goProjects: 'navigation.goProjects',
	goArchive: 'navigation.goArchive',
	goTrash: 'navigation.goTrash',
	goSettings: 'navigation.goSettings',
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
	filterByPriority: 'filter.byPriority',
	filterByStatus: 'filter.byStatus',
	filterByDate: 'filter.byDate',
	filterByProject: 'filter.byProject',
	filterToggleCompleted: 'filter.toggleCompleted',
	filterClearAll: 'filter.clearAll',
	layoutToggleSidebar: 'layout.toggleSidebar',
	layoutTogglePreview: 'layout.togglePreview',
	systemOpenDataFolder: 'system.openDataFolder',
	inboxClean: 'inbox.clean',
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
	| 'inbox'
	| 'layout'
	| 'system'
	| 'lifecycle'

export type CommandScope =
	| 'global'
	| 'app'
	| 'task-list'
	| 'project-list'
	| 'project-page'
	| 'inbox-page'
	| 'views-page'
	| 'trash-page'
	| 'preview-drawer'
	| 'detail-drawer'
	| 'modal'
	| 'dropdown'

export type CommandRouteContext = {
	page:
		| 'inbox'
		| 'allTasks'
		| 'today'
		| 'upcoming'
		| 'focus'
		| 'views'
		| 'projects'
		| 'project'
		| 'archive'
		| 'trash'
		| 'settings'
		| 'unknown'
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
	inboxAt?: string | null
	status?: string
	priority?: string
	lifecycleMode?: 'archive' | 'trash'
	lifecycleEntityType?: 'space' | 'project' | 'task'
	projectStatus?: 'active' | 'completed' | 'archived'
}

export type TaskPlacementTarget =
	| {
			kind: 'no_project'
			spaceId: string
	  }
	| {
			kind: 'project'
			projectId: string
			spaceId: string
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

export type CommandViewContext = {
	currentViewId?: string
	hasActiveFilters: boolean
	showCompleted: boolean
	priorityFilterValues: number[]
	statusFilterValues: string[]
	dateFilterValue: string
	projectFilterId: string | null
	projectlessOnly: boolean
	filterCapabilities: {
		supportsPriority: boolean
		supportsStatus: boolean
		supportsDate: boolean
		supportsProject: boolean
		supportsToggleCompleted: boolean
		supportsClearAll: boolean
	}
	filterKind?: 'root' | 'priority' | 'status' | 'date' | 'project'
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
