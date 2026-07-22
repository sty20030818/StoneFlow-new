import type { TaskPriority, TaskStatus } from '@/shared/types'

export type LauncherStatus = Extract<TaskStatus, 'todo' | 'doing' | 'done'>
export type LauncherPriority = TaskPriority

export type LauncherScope =
	| {
			type: 'all'
			spaceId: null
	  }
	| {
			type: 'space'
			spaceId: string
	  }

export type LauncherPlacement =
	| {
			kind: 'inbox'
			projectId: null
	  }
	| {
			kind: 'noProject'
			projectId: null
	  }
	| {
			kind: 'project'
			projectId: string
	  }

export type LauncherSpaceSummary = {
	id: string
	name: string
	iconKey: string
	colorKey: string
	isDefault: boolean
}

export type LauncherProjectOption =
	| {
			kind: 'inbox'
			id: null
			spaceId: string
			name: string
	  }
	| {
			kind: 'noProject'
			id: null
			spaceId: string
			name: string
	  }
	| {
			kind: 'project'
			id: string
			spaceId: string
			name: string
	  }

export type LauncherTaskItem = {
	id: string
	spaceId: string
	spaceName: string
	projectId: string | null
	projectName: string | null
	inboxAt: string | null
	title: string
	note: string | null
	priority: LauncherPriority
	status: TaskStatus
	updatedAt: string
	completedAt: string | null
}

export type LauncherProjectItem = {
	id: string
	spaceId: string
	spaceName: string
	name: string
	note: string | null
	updatedAt: string
	completedAt: string | null
}

export type LauncherResultItem =
	| ({ kind: 'task' } & LauncherTaskItem)
	| ({ kind: 'project' } & LauncherProjectItem)

export type LauncherInitialState = {
	currentScope: LauncherScope
	defaultSpaceId: string
	defaultPlacement: LauncherPlacement
	spaces: LauncherSpaceSummary[]
	projects: LauncherProjectOption[]
	/** 全局最近任务，不随 Launcher 当前选中的 space 切换而变化。 */
	recentTasks: LauncherTaskItem[]
	/** 全局最近项目，不随 Launcher 当前选中的 space 切换而变化。 */
	recentProjects: LauncherProjectItem[]
}

export type LauncherProjectsBySpace = {
	spaceId: string
	inboxProject: Extract<LauncherProjectOption, { kind: 'inbox' }>
	noProjectOption: Extract<LauncherProjectOption, { kind: 'noProject' }>
	projects: Array<Extract<LauncherProjectOption, { kind: 'project' }>>
}

export type LauncherSearchResponse = {
	tasks: LauncherTaskItem[]
	projects: LauncherProjectItem[]
}

export type LauncherDraft = {
	title: string
	priority: LauncherPriority
	status: LauncherStatus
	spaceId: string | null
	placement: LauncherPlacement
	dueAt: string | null
	plannedAt: string | null
	remindAt: string | null
}

export type LauncherPopoverKey =
	| 'priority'
	| 'project'
	| 'status'
	| 'due'
	| 'scheduled'
	| 'reminder'
	| 'space'

export type LauncherFocusTarget = 'none' | 'create' | { kind: 'result'; index: number }

export type LauncherSubmitAction = 'create' | 'createAndOpen' | 'createAndContinue' | 'openResult'

export type LauncherSubmitState = 'idle' | 'submitting' | 'success' | 'error'

export type LauncherPanelState = {
	initialState: LauncherInitialState | null
	draft: LauncherDraft
	projectOptions: LauncherProjectOption[]
	projectSearch: string
	isProjectOptionsLoading: boolean
	activePopover: LauncherPopoverKey | null
	isAdvancedOpen: boolean
	searchResults: LauncherSearchResponse
	searchView: 'recent' | 'results' | 'empty'
	searchError: string | null
	isSearching: boolean
	focusTarget: LauncherFocusTarget
	submitState: LauncherSubmitState
	message: string
	continuousCreateCount: number
	errorMessage: string | null
}
