import type { TaskPriority, TaskStatus } from '@/shared/types'

export type QuickCreateStatus = Extract<TaskStatus, 'todo' | 'doing' | 'done'>
export type QuickCreatePriority = TaskPriority

export type QuickCreateScope =
	| {
			type: 'all'
			spaceId: null
	  }
	| {
			type: 'space'
			spaceId: string
	  }

export type QuickCreatePlacement =
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

export type QuickCreateSpaceSummary = {
	id: string
	name: string
	iconKey: string
	colorKey: string
	isDefault: boolean
}

export type QuickCreateProjectOption =
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

export type QuickCreateTaskItem = {
	id: string
	spaceId: string
	spaceName: string
	projectId: string | null
	projectName: string | null
	inboxAt: string | null
	title: string
	note: string | null
	priority: QuickCreatePriority
	status: TaskStatus
	updatedAt: string
	completedAt: string | null
}

export type QuickCreateProjectItem = {
	id: string
	spaceId: string
	spaceName: string
	name: string
	note: string | null
	updatedAt: string
	completedAt: string | null
}

export type QuickCreateResultItem =
	| ({ kind: 'task' } & QuickCreateTaskItem)
	| ({ kind: 'project' } & QuickCreateProjectItem)

export type QuickCreateInitialState = {
	currentScope: QuickCreateScope
	defaultSpaceId: string
	defaultPlacement: QuickCreatePlacement
	spaces: QuickCreateSpaceSummary[]
	projects: QuickCreateProjectOption[]
	/** 全局最近任务，不随 Quick Create 当前选中的 space 切换而变化。 */
	recentTasks: QuickCreateTaskItem[]
	/** 全局最近项目，不随 Quick Create 当前选中的 space 切换而变化。 */
	recentProjects: QuickCreateProjectItem[]
}

export type QuickCreateProjectsBySpace = {
	spaceId: string
	inboxProject: Extract<QuickCreateProjectOption, { kind: 'inbox' }>
	noProjectOption: Extract<QuickCreateProjectOption, { kind: 'noProject' }>
	projects: Array<Extract<QuickCreateProjectOption, { kind: 'project' }>>
}

export type QuickCreateSearchResponse = {
	tasks: QuickCreateTaskItem[]
	projects: QuickCreateProjectItem[]
}

export type QuickCreateDraft = {
	title: string
	priority: QuickCreatePriority
	status: QuickCreateStatus
	spaceId: string | null
	placement: QuickCreatePlacement
	dueAt: string | null
	scheduledAt: string | null
	reminderAt: string | null
}

export type QuickCreatePopoverKey =
	| 'priority'
	| 'project'
	| 'status'
	| 'due'
	| 'scheduled'
	| 'reminder'
	| 'space'

export type QuickCreateFocusTarget = 'none' | 'create' | { kind: 'result'; index: number }

export type QuickCreateSubmitAction =
	| 'create'
	| 'createAndOpen'
	| 'createAndContinue'
	| 'openResult'

export type QuickCreateSubmitState = 'idle' | 'submitting' | 'success' | 'error'

export type QuickCreatePanelState = {
	isBootstrapping: boolean
	initialState: QuickCreateInitialState | null
	draft: QuickCreateDraft
	projectOptions: QuickCreateProjectOption[]
	projectSearch: string
	isProjectOptionsLoading: boolean
	activePopover: QuickCreatePopoverKey | null
	isAdvancedOpen: boolean
	searchResults: QuickCreateSearchResponse
	isSearching: boolean
	focusTarget: QuickCreateFocusTarget
	submitState: QuickCreateSubmitState
	message: string
	continuousCreateCount: number
	errorMessage: string | null
}
