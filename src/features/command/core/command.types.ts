export const COMMAND_IDS = {
	openCommandMenu: 'general.openCommandMenu',
	openSearch: 'general.openSearch',
	newTask: 'new.task',
	newTaskFullscreen: 'new.taskFullscreen',
	newProject: 'new.project',
	goInbox: 'navigation.goInbox',
	goAllTasks: 'navigation.goAllTasks',
	goViews: 'navigation.goViews',
	goProjects: 'navigation.goProjects',
	goArchive: 'navigation.goArchive',
	goTrash: 'navigation.goTrash',
	goSettings: 'navigation.goSettings',
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
	| 'project'
	| 'view'
	| 'filter'
	| 'inbox'
	| 'layout'
	| 'system'

export type CommandScope =
	| 'global'
	| 'task-list'
	| 'project-list'
	| 'project-page'
	| 'inbox-page'
	| 'views-page'
	| 'trash-page'
	| 'preview-drawer'
	| 'detail-drawer'
	| 'modal'

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
	type?: 'task' | 'project' | 'view'
	ids: string[]
	focusedId?: string
	focusedType?: 'task' | 'project' | 'view'
	hasSelection: boolean
	isSingleSelection: boolean
	isMultiSelection: boolean
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
	activePanel: 'main' | 'sidebar' | 'preview' | 'detail' | 'modal' | 'command-menu'
}

export type CommandUiContext = {
	isCommandMenuOpen: boolean
	isPreviewOpen: boolean
	isDetailOpen: boolean
	isModalOpen: boolean
	isDropdownOpen: boolean
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
}

export type CommandContext = {
	route: CommandRouteContext
	selection: CommandSelectionContext
	focus: CommandFocusContext
	ui: CommandUiContext
	space: CommandSpaceContext
	project: CommandProjectContext
	view: CommandViewContext
}

export type Command = {
	id: CommandId
	title: string
	category: CommandCategory
	scope: CommandScope[]
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
