import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type PropsWithChildren,
} from 'react'

import { useDangerConfirm } from '@/features/danger-confirm'
import {
	BulkActionRegistry,
	BulkActionRuntime,
	type BulkAction,
	type BulkActionContext as BulkActionRuntimeContextValue,
	type BulkActionId,
	type BulkActionPayload,
	type BulkActionResult,
	type BulkSelectionSnapshot,
} from '@/features/bulk-action/core'
import { LIFECYCLE_BULK_ACTION_IDS } from '@/features/bulk-action/core'

type BulkActionContextValue = {
	runtime: BulkActionRuntime
	runBulkAction: (
		actionId: BulkActionId,
		snapshot: BulkSelectionSnapshot,
		payload?: BulkActionPayload,
	) => Promise<BulkActionResult>
	isExecuting: boolean
}

type BulkActionProviderProps = PropsWithChildren<{
	actions: BulkAction[]
	context?: BulkActionRuntimeContextValue
	onResult?: (result: BulkActionResult) => void
	onError?: (result: BulkActionResult) => void
}>

const BulkActionContext = createContext<BulkActionContextValue | null>(null)

export function BulkActionProvider({
	actions,
	children,
	context,
	onError,
	onResult,
}: BulkActionProviderProps) {
	const [isExecuting, setIsExecuting] = useState(false)
	const { requestDangerConfirm } = useDangerConfirm()

	const requestConfirm = useCallback(
		(request: { action: BulkAction; snapshot: BulkSelectionSnapshot }) =>
			requestDangerConfirm({
				intent: toDangerConfirmIntent(request.action),
				entityType: toDangerConfirmEntityType(request.snapshot.entity),
				count: request.snapshot.ids.length,
				entityLabel:
					request.snapshot.ids.length === 1 ? request.snapshot.entities?.[0]?.title : undefined,
			}),
		[requestDangerConfirm],
	)

	const registry = useMemo(() => new BulkActionRegistry(actions), [actions])
	const runtime = useMemo(
		() =>
			new BulkActionRuntime({
				registry,
				context,
				requestConfirm,
				onError: (error, action, snapshot) => {
					onError?.({
						status: 'failed',
						actionId: action.id,
						entity: snapshot.entity,
						requestedIds: [...snapshot.ids],
						succeededIds: [],
						failedIds: [],
						skippedIds: [],
						error,
					})
				},
			}),
		[context, onError, registry, requestConfirm],
	)

	const runBulkAction = useCallback(
		async (
			actionId: BulkActionId,
			snapshot: BulkSelectionSnapshot,
			payload?: BulkActionPayload,
		) => {
			setIsExecuting(true)
			try {
				const result = await runtime.execute(actionId, snapshot, payload)
				onResult?.(result)
				return result
			} finally {
				setIsExecuting(false)
			}
		},
		[onResult, runtime],
	)

	const value = useMemo<BulkActionContextValue>(
		() => ({
			runtime,
			runBulkAction,
			isExecuting,
		}),
		[isExecuting, runBulkAction, runtime],
	)

	return <BulkActionContext.Provider value={value}>{children}</BulkActionContext.Provider>
}

export function useBulkActionContext() {
	const context = useContext(BulkActionContext)
	if (!context) {
		throw new Error('useBulkActionContext must be used inside BulkActionProvider')
	}
	return context
}

function toDangerConfirmIntent(action: BulkAction) {
	if (action.id === LIFECYCLE_BULK_ACTION_IDS.deletePermanentlySelected) {
		return 'permanent-delete' as const
	}

	switch (action.intent) {
		case 'archive':
			return 'archive' as const
		case 'delete':
			return 'trash' as const
		case 'restore':
		case 'complete':
		case 'move':
		case 'update':
			throw new Error(`unsupported bulk danger confirm intent: ${action.intent}`)
	}
}

function toDangerConfirmEntityType(entity: BulkSelectionSnapshot['entity']) {
	switch (entity) {
		case 'task':
			return 'task' as const
		case 'project':
			return 'project' as const
		case 'lifecycle':
			return 'lifecycle-entry' as const
	}
}
