import type { TaskListItem, TaskLink } from '@/shared/types'

export type TaskPreviewAnchorReason = 'keyboard' | 'pointer'
export type TaskPreviewCloseDelayState = 'idle' | 'pending'

export type TaskPreviewSource = {
	tasks: TaskListItem[]
	focusedTaskId: string | null
	activeTaskId: string | null
}

export type TaskPreviewLinkSummary = {
	items: Array<Pick<TaskLink, 'id' | 'title'>>
	remainingCount: number
}

export type TaskPreviewState = {
	open: boolean
	targetTaskId: string | null
	closeDelayState: TaskPreviewCloseDelayState
	lastAnchorReason: TaskPreviewAnchorReason | null
	hoveredTaskId: string | null
	hoverSource: TaskPreviewAnchorReason | null
	isPointerInsidePreview: boolean
	linkSummary: TaskPreviewLinkSummary | null
}

export type TaskPreviewContextValue = {
	state: TaskPreviewState
	source: TaskPreviewSource | null
	sourceSnapshot: TaskPreviewSource | null
	openPreview: (taskId: string, source: TaskPreviewAnchorReason) => void
	closePreview: () => void
	scheduleClosePreview: () => void
	cancelScheduledClose: () => void
	syncPreviewTarget: (taskId: string, source: TaskPreviewAnchorReason) => void
	setHoveredTask: (taskId: string | null, source: TaskPreviewAnchorReason | null) => void
	setPreviewPointerInside: (inside: boolean) => void
	registerSource: (token: symbol, source: TaskPreviewSource) => void
	clearSourceRegistration: (token: symbol) => void
}

export const TASK_PREVIEW_CLOSE_DELAY_MS = 180
export const TASK_PREVIEW_LINK_SUMMARY_LIMIT = 3

export const INITIAL_TASK_PREVIEW_STATE: TaskPreviewState = {
	open: false,
	targetTaskId: null,
	closeDelayState: 'idle',
	lastAnchorReason: null,
	hoveredTaskId: null,
	hoverSource: null,
	isPointerInsidePreview: false,
	linkSummary: null,
}
