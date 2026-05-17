import { useCallback } from 'react'

import type {
	BulkActionId,
	BulkActionResult,
	BulkActionRuntime,
	BulkSelectionSnapshot,
} from '@/features/bulk-action/core'

type UseBulkActionRunnerOptions = {
	runtime: BulkActionRuntime
	onResult?: (result: BulkActionResult) => void
}

export function useBulkActionRunner({ runtime, onResult }: UseBulkActionRunnerOptions) {
	return useCallback(
		async (actionId: BulkActionId, snapshot: BulkSelectionSnapshot) => {
			const result = await runtime.execute(actionId, snapshot)
			onResult?.(result)
			return result
		},
		[onResult, runtime],
	)
}
