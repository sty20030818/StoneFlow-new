import type { KeyboardEvent, RefObject } from 'react'

import type {
	QuickCreateFocusTarget,
	QuickCreateInitialState,
	QuickCreatePanelState,
	QuickCreatePlacement,
	QuickCreatePopoverKey,
	QuickCreatePriority,
	QuickCreateProjectItem,
	QuickCreateProjectOption,
	QuickCreateResultItem,
	QuickCreateSearchResponse,
	QuickCreateStatus,
	QuickCreateSubmitAction,
	QuickCreateTaskItem,
} from '@/features/quick-create/model/types'

export type QuickCreateAction =
	| { type: 'sessionOpened'; payload: QuickCreateInitialState }
	| { type: 'recentDataRefreshed'; payload: QuickCreateInitialState }
	| { type: 'bootstrapFailed'; message: string }
	| { type: 'titleChanged'; title: string }
	| { type: 'priorityChanged'; priority: QuickCreatePriority }
	| { type: 'statusChanged'; status: QuickCreateStatus }
	| { type: 'spaceChanged'; spaceId: string }
	| { type: 'placementChanged'; placement: QuickCreatePlacement }
	| { type: 'dateChanged'; field: 'dueAt' | 'scheduledAt' | 'reminderAt'; value: string | null }
	| { type: 'advancedToggled' }
	| { type: 'activePopoverChanged'; key: QuickCreatePopoverKey | null }
	| { type: 'projectSearchChanged'; query: string }
	| { type: 'projectsLoadingStarted' }
	| { type: 'projectsLoadingSucceeded'; options: QuickCreateProjectOption[] }
	| { type: 'projectsLoadingFailed'; message: string }
	| { type: 'searchStarted' }
	| { type: 'searchSucceeded'; payload: QuickCreateSearchResponse }
	| { type: 'searchCleared' }
	| { type: 'searchFailed'; message: string }
	| { type: 'focusChanged'; focusTarget: QuickCreateFocusTarget }
	| { type: 'submitStarted'; message: string }
	| { type: 'submitFailed'; message: string }
	| { type: 'submitCompleted'; message: string }
	| { type: 'continuousCreateSucceeded'; message: string }
	| { type: 'titleCleared' }
	| { type: 'activePopoverClosed' }

export type QuickCreateDerivedState = {
	hasTitle: boolean
	isSearchingMode: boolean
	spaceName: string
	placementLabel: string
	flatItems: QuickCreateResultItem[]
	displayTasks: QuickCreateTaskItem[]
	displayProjects: QuickCreateProjectItem[]
	isShowingRecent: boolean
	isSearchEmpty: boolean
	isCreateFocused: boolean
	activeResultIndex: number
	projectOptions: QuickCreateProjectOption[]
	createMeta: string
	enterLabel: '创建' | '打开'
	continuousToastVisible: boolean
}

export type QuickCreateDomainActions = {
	setTitle: (title: string) => void
	setPriority: (priority: QuickCreatePriority) => void
	setStatus: (status: QuickCreateStatus) => void
	toggleAdvanced: () => void
	setPopover: (key: QuickCreatePopoverKey | null) => void
	setProjectSearch: (query: string) => void
	selectPlacement: (placement: QuickCreatePlacement) => void
	selectSpace: (spaceId: string) => void
	setDate: (field: 'dueAt' | 'scheduledAt' | 'reminderAt', value: string | null) => void
	moveFocus: (direction: 1 | -1) => void
	focusCreate: () => void
	focusResult: (index: number) => void
	handleEscape: () => void
	handleInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
	submit: (action: Exclude<QuickCreateSubmitAction, 'openResult'>) => Promise<void>
	openResult: (item: QuickCreateResultItem) => Promise<void>
	focusInput: () => void
}

export type QuickCreateContextValue = {
	state: QuickCreatePanelState
	derived: QuickCreateDerivedState
	refs: {
		titleInputRef: RefObject<HTMLInputElement | null>
		projectSearchRef: RefObject<HTMLInputElement | null>
	}
	actions: QuickCreateDomainActions
}
