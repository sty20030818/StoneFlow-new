import type { KeyboardEvent, RefObject } from 'react'

import type {
	QuickCreatePanelState,
	QuickCreatePlacement,
	QuickCreatePopoverKey,
	QuickCreatePriority,
	QuickCreateProjectItem,
	QuickCreateProjectOption,
	QuickCreateResultItem,
	QuickCreateStatus,
	QuickCreateSubmitAction,
	QuickCreateTaskItem,
} from '@/features/quick-create/model/types'

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
