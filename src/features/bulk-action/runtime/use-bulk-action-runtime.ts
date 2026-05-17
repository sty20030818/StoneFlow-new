import { useMemo } from 'react'

import {
	BulkActionRegistry,
	BulkActionRuntime,
	type BulkAction,
	type BulkActionConfirmationRequest,
	type BulkActionContext,
	type BulkActionResult,
} from '@/features/bulk-action/core'

type UseBulkActionRuntimeOptions = {
	actions: BulkAction[]
	context?: BulkActionContext
	requestConfirm?: (request: BulkActionConfirmationRequest) => Promise<boolean>
	onError?: (result: BulkActionResult) => void
}

export function useBulkActionRuntime({
	actions,
	context,
	onError,
	requestConfirm,
}: UseBulkActionRuntimeOptions) {
	const registry = useMemo(() => new BulkActionRegistry(actions), [actions])

	return useMemo(
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
}
