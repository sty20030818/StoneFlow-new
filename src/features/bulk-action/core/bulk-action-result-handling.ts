import type { BulkActionResult } from './bulk-action.types'

export type BulkActionResultMessageLabels = {
	successVerb: string
	entityLabel: string
	partialVerb?: string
}

export type BulkActionResultFeedback =
	| {
			type: 'success' | 'error'
			message: string
			shouldThrow?: boolean
	  }
	| {
			type: 'none'
			message?: undefined
			shouldThrow?: boolean
	  }

export function shouldClearBulkSelection(result: BulkActionResult) {
	return result.status === 'success' && Boolean(result.shouldClearSelection)
}

export function getBulkActionResultFeedback(
	result: BulkActionResult,
	labels: BulkActionResultMessageLabels,
): BulkActionResultFeedback {
	if (result.status === 'success') {
		return {
			type: 'success',
			message:
				result.message ??
				`已${labels.successVerb} ${result.succeededIds.length} 个${labels.entityLabel}`,
		}
	}

	if (result.status === 'partial') {
		const failedCount = result.failedIds.length + result.skippedIds.length
		return {
			type: 'error',
			message:
				result.message ??
				`已${labels.partialVerb ?? labels.successVerb} ${result.succeededIds.length} 个${labels.entityLabel}，${failedCount} 个失败`,
		}
	}

	if (result.status === 'disabled') {
		return {
			type: 'error',
			message: result.message ?? '批量操作不可用',
		}
	}

	if (result.status === 'failed') {
		return {
			type: 'error',
			message: result.message ?? '批量操作失败',
			shouldThrow: true,
		}
	}

	return { type: 'none' }
}
