import type {
	BulkAction,
	BulkActionId,
	BulkSelectionSnapshot,
} from '@/features/bulk-action/core'
import {
	LIFECYCLE_BULK_ACTION_IDS,
	createBulkActionResult,
} from '@/features/bulk-action/core'
import type {
	LifecycleBulkAdapter,
	LifecycleBulkMutationReport,
} from '@/features/bulk-action/adapters'

type LifecycleBulkActionDefinition = Omit<BulkAction, 'run'>

export const lifecycleBulkActionDefinitions: LifecycleBulkActionDefinition[] = [
	{
		id: LIFECYCLE_BULK_ACTION_IDS.restoreSelected,
		entity: 'lifecycle',
		label: '恢复',
		description: '恢复选中的归档或回收站条目。',
		intent: 'restore',
	},
	{
		id: LIFECYCLE_BULK_ACTION_IDS.deletePermanentlySelected,
		entity: 'lifecycle',
		label: '永久删除',
		description: '永久删除选中的回收站条目。',
		intent: 'delete',
		tone: 'destructive',
		requiresConfirm: true,
		getConfirmCopy: (snapshot) => ({
			title: '永久删除选中条目？',
			description: `将永久删除 ${snapshot.ids.length} 个条目。此操作不可撤销。`,
			confirmLabel: '永久删除',
		}),
	},
]

export const lifecycleBulkActions: BulkAction[] = lifecycleBulkActionDefinitions.map(
	(definition) => ({
		...definition,
		run: async (snapshot, context) => {
			const adapter = getLifecycleBulkAdapter(context.adapter)
			if (!adapter) {
				return createBulkActionResult({
					status: 'failed',
					actionId: definition.id,
					snapshot,
					error: new Error('lifecycle bulk adapter is not available'),
				})
			}

			switch (definition.id) {
				case LIFECYCLE_BULK_ACTION_IDS.restoreSelected:
					return toBulkActionResult(
						definition.id,
						snapshot,
						await adapter.restore(snapshot.ids),
						{
							getMessage: (report) => `已恢复 ${report.succeededIds.length} 个条目`,
							shouldClearSelection: true,
						},
					)
				case LIFECYCLE_BULK_ACTION_IDS.deletePermanentlySelected:
					return toBulkActionResult(
						definition.id,
						snapshot,
						await adapter.deletePermanently(snapshot.ids),
						{
							getMessage: (report) => `已永久删除 ${report.succeededIds.length} 个条目`,
							shouldClearSelection: true,
						},
					)
				default:
					return createBulkActionResult({
						status: 'failed',
						actionId: definition.id,
						snapshot,
						error: new Error(`unsupported lifecycle bulk action: ${definition.id}`),
					})
			}
		},
	}),
)

export function getLifecycleBulkActionDefinition(actionId: BulkActionId) {
	return lifecycleBulkActionDefinitions.find((action) => action.id === actionId) ?? null
}

function getLifecycleBulkAdapter(adapter: unknown): LifecycleBulkAdapter | null {
	if (
		adapter &&
		typeof adapter === 'object' &&
		'restore' in adapter &&
		'deletePermanently' in adapter
	) {
		return adapter as LifecycleBulkAdapter
	}

	return null
}

function toBulkActionResult(
	actionId: BulkActionId,
	snapshot: BulkSelectionSnapshot,
	report: LifecycleBulkMutationReport,
	options: {
		getMessage?: (report: LifecycleBulkMutationReport) => string
		shouldClearSelection?: boolean
	} = {},
) {
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
		message: status === 'success' ? options.getMessage?.(report) : undefined,
		skippedIds: report.skippedIds,
		shouldClearSelection: status === 'success' ? options.shouldClearSelection : false,
	})
}
