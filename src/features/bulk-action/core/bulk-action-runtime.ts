import type { BulkActionRegistry } from './bulk-action-registry'
import type {
	BulkAction,
	BulkActionConfirmationRequest,
	BulkActionContext,
	BulkActionId,
	BulkActionPayload,
	BulkActionResult,
	BulkSelectionSnapshot,
} from './bulk-action.types'

type BulkActionRuntimeOptions = {
	registry: BulkActionRegistry
	context?: BulkActionContext
	requestConfirm?: (request: BulkActionConfirmationRequest) => Promise<boolean>
	onError?: (error: unknown, action: BulkAction, snapshot: BulkSelectionSnapshot) => void
}

export class BulkActionRuntime {
	private readonly registry: BulkActionRegistry
	private readonly context: BulkActionContext
	private readonly requestConfirm?: (request: BulkActionConfirmationRequest) => Promise<boolean>
	private readonly onError?: (
		error: unknown,
		action: BulkAction,
		snapshot: BulkSelectionSnapshot,
	) => void

	constructor({ registry, context = {}, requestConfirm, onError }: BulkActionRuntimeOptions) {
		this.registry = registry
		this.context = context
		this.requestConfirm = requestConfirm
		this.onError = onError
	}

	getActions() {
		return this.registry.getAll()
	}

	getAction(actionId: BulkActionId) {
		return this.registry.get(actionId)
	}

	async execute(
		actionId: BulkActionId,
		snapshot: BulkSelectionSnapshot,
		payload?: BulkActionPayload,
	): Promise<BulkActionResult> {
		const action = this.registry.get(actionId)
		if (!action) {
			return createBulkActionResult({
				status: 'failed',
				actionId,
				snapshot,
				error: new Error(`Bulk action not found: ${actionId}`),
			})
		}

		if (snapshot.ids.length === 0) {
			return createBulkActionResult({
				status: 'disabled',
				actionId,
				snapshot,
				message: '需要先选择对象',
			})
		}

		if (action.isEnabled?.(snapshot, this.context) === false) {
			return createBulkActionResult({
				status: 'disabled',
				actionId,
				snapshot,
				message: action.getDisabledReason?.(snapshot, this.context),
			})
		}

		if (shouldConfirmAction(action, snapshot)) {
			const confirmed = await this.requestConfirm?.({
				action,
				snapshot,
			})
			if (!confirmed) {
				return createBulkActionResult({
					status: 'cancelled',
					actionId,
					snapshot,
				})
			}
		}

		try {
			return await action.run(snapshot, this.context, payload)
		} catch (error) {
			this.onError?.(error, action, snapshot)
			return createBulkActionResult({
				status: 'failed',
				actionId,
				snapshot,
				error,
			})
		}
	}
}

export function createBulkActionResult({
	status,
	actionId,
	snapshot,
	succeededIds = [],
	failedIds = [],
	skippedIds = [],
	message,
	error,
	shouldClearSelection,
}: Pick<BulkActionResult, 'status' | 'actionId'> & {
	snapshot: BulkSelectionSnapshot
	succeededIds?: string[]
	failedIds?: string[]
	skippedIds?: string[]
	message?: string
	error?: unknown
	shouldClearSelection?: boolean
}): BulkActionResult {
	return {
		status,
		actionId,
		entity: snapshot.entity,
		requestedIds: [...snapshot.ids],
		succeededIds: [...succeededIds],
		failedIds: [...failedIds],
		skippedIds: [...skippedIds],
		message,
		error,
		shouldClearSelection,
	}
}

type BulkMutationReport = Pick<BulkActionResult, 'succeededIds' | 'failedIds' | 'skippedIds'>

/**
 * 将实体 adapter 报告收敛为统一结果。
 * skipped 与 failed 都会阻止 success，且只有完整成功才允许清空选择。
 */
export function createBulkActionResultFromReport({
	actionId,
	snapshot,
	report,
	successMessage,
	clearSelectionOnSuccess = false,
}: {
	actionId: BulkActionId
	snapshot: BulkSelectionSnapshot
	report: BulkMutationReport
	successMessage?: string
	clearSelectionOnSuccess?: boolean
}): BulkActionResult {
	const status =
		report.failedIds.length === 0 && report.skippedIds.length === 0
			? 'success'
			: report.succeededIds.length > 0
				? 'partial'
				: 'failed'

	return createBulkActionResult({
		status,
		actionId,
		snapshot,
		succeededIds: report.succeededIds,
		failedIds: report.failedIds,
		skippedIds: report.skippedIds,
		message: status === 'success' ? successMessage : undefined,
		shouldClearSelection: status === 'success' && clearSelectionOnSuccess,
	})
}

export function shouldConfirmAction(action: BulkAction, snapshot: BulkSelectionSnapshot) {
	return typeof action.requiresConfirm === 'function'
		? action.requiresConfirm(snapshot)
		: Boolean(action.requiresConfirm)
}
