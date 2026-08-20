import { toast } from '@heroui/react'

import {
	getBulkActionResultFeedback,
	type BulkActionResult,
	type BulkActionResultMessageLabels,
} from '@/features/bulk-action/core'

export function showBulkActionResultToast(
	result: BulkActionResult,
	labels: BulkActionResultMessageLabels,
) {
	const feedback = getBulkActionResultFeedback(result, labels)

	if (feedback.type === 'success') {
		toast.success(feedback.message)
	}

	if (feedback.type === 'error') {
		toast.danger(feedback.message)
	}

	return feedback
}
