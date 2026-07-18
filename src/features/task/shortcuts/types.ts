import type { ReactNode } from 'react'

import type { TaskListItem } from '@/shared/types'

export type TaskRowShortcutScopeProps = {
	children: (state: TaskRowShortcutState) => ReactNode
	tasks: TaskListItem[]
	activeTaskId: string | null
	focusedTaskId?: string | null
	selectedTaskIdSet: Set<string>
	onToggleTaskSelection: (taskId: string) => void
	onSetFocusedTask?: (taskId: string | null) => void
	onMoveTaskFocus?: (
		delta: number,
		options?: {
			preserveAnchor?: boolean
			selectRange?: boolean
			startFromId?: string | null
			resetAnchorToStart?: boolean
		},
	) => string | null
	onClearTaskSelection?: () => void
	onSelectAllTasks?: (taskIds: string[]) => void
	onOpenTask: (taskId: string) => void
	onPeekTask?: (taskId: string, source: 'keyboard' | 'pointer') => void
}

export type PointerPoint = {
	x: number
	y: number
}

export type HoverSource = 'keyboard' | 'pointer'
export type KeyboardNavigationDirection = -1 | 1

export type ShiftToggleSession = {
	active: boolean
	cursorId: string | null
	direction: KeyboardNavigationDirection | null
	lastToggledId: string | null
}

export type HoverUpdateOptions = {
	syncExternal?: boolean
	scrollIntoView?: boolean
	direction?: KeyboardNavigationDirection
	fromTaskId?: string | null
}

export type TaskRowInteractionState = {
	hoveredId: string | null
	hoverSource: HoverSource | null
	commandTargetId: string | null
}

export type TaskRowShortcutState = TaskRowInteractionState & {
	onRowHover: (taskId: string | null) => void
	onRowPointerMove: (taskId: string, point: PointerPoint) => void
}

export type TaskRowCommandActions = {
	complete: () => void | Promise<void>
	select: () => void
	peek: () => void
	openDetail: () => void
	archive: () => void | Promise<void>
	deleteTask: () => void | Promise<void>
	openPriorityMenu: () => void
	openStatusMenu: () => void
	openDateMenu: () => void
	openPlacementMenu: () => void
}

export const EMPTY_SHIFT_TOGGLE_SESSION: ShiftToggleSession = {
	active: false,
	cursorId: null,
	direction: null,
	lastToggledId: null,
}
