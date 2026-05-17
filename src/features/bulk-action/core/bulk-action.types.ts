export const TASK_BULK_ACTION_IDS = {
	completeSelected: 'task.completeSelected',
	archiveSelected: 'task.archiveSelected',
	deleteSelected: 'task.deleteSelected',
	setPrioritySelected: 'task.setPrioritySelected',
	setStatusSelected: 'task.setStatusSelected',
	setDateSelected: 'task.setDateSelected',
} as const

export type KnownBulkActionId = (typeof TASK_BULK_ACTION_IDS)[keyof typeof TASK_BULK_ACTION_IDS]
export type BulkActionId = KnownBulkActionId | (string & {})

export type BulkEntityType = 'task' | 'project' | 'lifecycle'

export type BulkSelectionSource =
	| 'bulk-bar'
	| 'command-menu'
	| 'row-shortcut'
	| 'section-menu'
	| 'page'

export type BulkSelectionEntity = {
	id: string
	title: string
	subtitle?: string
	status?: string
	priority?: string
}

export type BulkSelectionSnapshot = {
	entity: BulkEntityType
	ids: string[]
	entities?: BulkSelectionEntity[]
	source: BulkSelectionSource
	createdAt: number
}

export type BulkActionStatus = 'success' | 'partial' | 'failed' | 'cancelled' | 'disabled'

export type BulkActionResult = {
	status: BulkActionStatus
	actionId: BulkActionId
	entity: BulkEntityType
	requestedIds: string[]
	succeededIds: string[]
	failedIds: string[]
	skippedIds: string[]
	message?: string
	error?: unknown
	shouldClearSelection?: boolean
}

export type BulkActionConfirmCopy = {
	title: string
	description: string
	confirmLabel: string
	cancelLabel?: string
}

export type BulkActionContext = {
	adapter?: BulkActionAdapter
	meta?: Record<string, unknown>
}

export type BulkActionAdapter = unknown
export type BulkActionPayload = unknown

export type BulkAction = {
	id: BulkActionId
	entity: BulkEntityType
	label: string
	description?: string
	intent: 'complete' | 'archive' | 'delete' | 'restore' | 'update' | 'move'
	tone?: 'default' | 'destructive'
	requiresConfirm?: boolean | ((snapshot: BulkSelectionSnapshot) => boolean)
	getConfirmCopy?: (snapshot: BulkSelectionSnapshot) => BulkActionConfirmCopy
	isEnabled?: (snapshot: BulkSelectionSnapshot, context: BulkActionContext) => boolean
	getDisabledReason?: (
		snapshot: BulkSelectionSnapshot,
		context: BulkActionContext,
	) => string | undefined
	run: (
		snapshot: BulkSelectionSnapshot,
		context: BulkActionContext,
		payload?: BulkActionPayload,
	) => Promise<BulkActionResult>
}

export type BulkActionConfirmationRequest = {
	action: BulkAction
	snapshot: BulkSelectionSnapshot
	copy: BulkActionConfirmCopy
}
