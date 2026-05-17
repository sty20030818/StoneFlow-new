import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type PropsWithChildren,
} from 'react'

import {
	BulkActionRegistry,
	BulkActionRuntime,
	type BulkAction,
	type BulkActionConfirmationRequest,
	type BulkActionContext as BulkActionRuntimeContextValue,
	type BulkActionId,
	type BulkActionPayload,
	type BulkActionResult,
	type BulkSelectionSnapshot,
} from '@/features/bulk-action/core'

type PendingConfirmation = BulkActionConfirmationRequest

type BulkActionContextValue = {
	runtime: BulkActionRuntime
	runBulkAction: (
		actionId: BulkActionId,
		snapshot: BulkSelectionSnapshot,
		payload?: BulkActionPayload,
	) => Promise<BulkActionResult>
	pendingConfirmation: PendingConfirmation | null
	isExecuting: boolean
	confirmPendingAction: () => void
	cancelPendingAction: () => void
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
	const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null)
	const [isExecuting, setIsExecuting] = useState(false)
	const confirmResolverRef = useRef<((confirmed: boolean) => void) | null>(null)

	const requestConfirm = useCallback((request: BulkActionConfirmationRequest) => {
		confirmResolverRef.current?.(false)
		setPendingConfirmation(request)

		return new Promise<boolean>((resolve) => {
			confirmResolverRef.current = resolve
		})
	}, [])

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

	const resolvePendingConfirmation = useCallback((confirmed: boolean) => {
		const resolve = confirmResolverRef.current
		confirmResolverRef.current = null
		setPendingConfirmation(null)
		resolve?.(confirmed)
	}, [])

	const confirmPendingAction = useCallback(() => {
		resolvePendingConfirmation(true)
	}, [resolvePendingConfirmation])

	const cancelPendingAction = useCallback(() => {
		resolvePendingConfirmation(false)
	}, [resolvePendingConfirmation])

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

	useEffect(
		() => () => {
			confirmResolverRef.current?.(false)
			confirmResolverRef.current = null
		},
		[],
	)

	const value = useMemo<BulkActionContextValue>(
		() => ({
			runtime,
			runBulkAction,
			pendingConfirmation,
			isExecuting,
			confirmPendingAction,
			cancelPendingAction,
		}),
		[
			cancelPendingAction,
			confirmPendingAction,
			isExecuting,
			pendingConfirmation,
			runBulkAction,
			runtime,
		],
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
