import type { KeyboardEvent, RefObject } from 'react'

import type {
	LauncherFocusTarget,
	LauncherInitialState,
	LauncherPanelState,
	LauncherPlacement,
	LauncherPopoverKey,
	LauncherPriority,
	LauncherProjectItem,
	LauncherProjectOption,
	LauncherResultItem,
	LauncherSearchResponse,
	LauncherStatus,
	LauncherSubmitAction,
	LauncherTaskItem,
} from '../model/types'

export type LauncherAction =
	| { type: 'sessionOpened'; payload: LauncherInitialState }
	| { type: 'recentDataRefreshed'; payload: LauncherInitialState }
	| { type: 'bootstrapFailed'; message: string }
	| { type: 'titleChanged'; title: string }
	| { type: 'priorityChanged'; priority: LauncherPriority }
	| { type: 'statusChanged'; status: LauncherStatus }
	| { type: 'spaceChanged'; spaceId: string }
	| { type: 'placementChanged'; placement: LauncherPlacement }
	| { type: 'dateChanged'; field: 'dueAt' | 'scheduledAt' | 'reminderAt'; value: string | null }
	| { type: 'advancedToggled' }
	| { type: 'activePopoverChanged'; key: LauncherPopoverKey | null }
	| { type: 'projectSearchChanged'; query: string }
	| { type: 'projectsLoadingStarted' }
	| { type: 'projectsLoadingSucceeded'; options: LauncherProjectOption[] }
	| { type: 'projectsLoadingFailed'; message: string }
	| { type: 'searchStarted' }
	| { type: 'searchSucceeded'; payload: LauncherSearchResponse }
	| { type: 'searchCleared' }
	| { type: 'searchFailed'; message: string }
	| { type: 'focusChanged'; focusTarget: LauncherFocusTarget }
	| { type: 'submitStarted'; message: string }
	| { type: 'submitFailed'; message: string }
	| { type: 'submitCompleted'; message: string }
	| { type: 'continuousCreateSucceeded'; message: string }
	| { type: 'titleCleared' }
	| { type: 'activePopoverClosed' }

export type LauncherResultsMode = 'recent' | 'search' | 'search-empty' | 'recent-empty'

export type LauncherDerivedState = {
	hasTitle: boolean
	isSearchingMode: boolean
	mode: LauncherResultsMode
	spaceName: string
	placementLabel: string
	flatItems: LauncherResultItem[]
	displayTasks: LauncherTaskItem[]
	displayProjects: LauncherProjectItem[]
	isShowingRecent: boolean
	isSearchEmpty: boolean
	isCreateFocused: boolean
	activeResultIndex: number
	projectOptions: LauncherProjectOption[]
	createMeta: string
	enterLabel: '创建' | '打开'
	continuousToastVisible: boolean
}

export type LauncherDomainActions = {
	setTitle: (title: string) => void
	setPriority: (priority: LauncherPriority) => void
	setStatus: (status: LauncherStatus) => void
	toggleAdvanced: () => void
	setPopover: (key: LauncherPopoverKey | null) => void
	setProjectSearch: (query: string) => void
	selectPlacement: (placement: LauncherPlacement) => void
	selectSpace: (spaceId: string) => void
	setDate: (field: 'dueAt' | 'scheduledAt' | 'reminderAt', value: string | null) => void
	moveFocus: (direction: 1 | -1) => void
	focusCreate: () => void
	focusResult: (index: number) => void
	handleEscape: () => void
	handleInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
	submit: (action: Exclude<LauncherSubmitAction, 'openResult'>) => Promise<void>
	openResult: (item: LauncherResultItem) => Promise<void>
	focusInput: () => void
}

export type LauncherContextValue = {
	state: LauncherPanelState
	derived: LauncherDerivedState
	refs: {
		titleInputRef: RefObject<HTMLInputElement | null>
		projectSearchRef: RefObject<HTMLInputElement | null>
	}
	actions: LauncherDomainActions
}
