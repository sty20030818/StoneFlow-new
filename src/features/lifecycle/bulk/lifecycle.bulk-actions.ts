import {
	LIFECYCLE_BULK_ACTION_IDS,
	createBulkActionResult,
	createBulkActionResultFromReport,
	type BulkAction,
} from '@/features/bulk-action'

import type { LifecycleBulkAdapter } from './lifecycle-bulk-adapter'

type LifecycleBulkActionDefinition = Omit<BulkAction, 'run'>

const lifecycleBulkActionDefinitions: LifecycleBulkActionDefinition[] = [
	{
		id: LIFECYCLE_BULK_ACTION_IDS.restoreSelected,
		entity: 'lifecycle',
		label: '恢复',
		description: '恢复选中的归档或回收站条目。',
		intent: 'restore',
	},
	{
		id: LIFECYCLE_BULK_ACTION_IDS.deleteSelected,
		entity: 'lifecycle',
		label: '删除',
		description: '将选中的归档条目移入回收站。',
		intent: 'delete',
		tone: 'destructive',
		requiresConfirm: true,
	},
	{
		id: LIFECYCLE_BULK_ACTION_IDS.deletePermanentlySelected,
		entity: 'lifecycle',
		label: '永久删除',
		description: '永久删除选中的回收站条目。',
		intent: 'delete',
		tone: 'destructive',
		requiresConfirm: true,
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
				case LIFECYCLE_BULK_ACTION_IDS.restoreSelected: {
					const report = await adapter.restore(snapshot.ids)
					return createBulkActionResultFromReport({
						actionId: definition.id,
						snapshot,
						report,
						successMessage: `已恢复 ${report.succeededIds.length} 个条目`,
						clearSelectionOnSuccess: true,
					})
				}
				case LIFECYCLE_BULK_ACTION_IDS.deleteSelected: {
					const report = await adapter.deleteLifecycle(snapshot.ids)
					return createBulkActionResultFromReport({
						actionId: definition.id,
						snapshot,
						report,
						successMessage: `已删除 ${report.succeededIds.length} 个条目`,
						clearSelectionOnSuccess: true,
					})
				}
				case LIFECYCLE_BULK_ACTION_IDS.deletePermanentlySelected: {
					const report = await adapter.deletePermanently(snapshot.ids)
					return createBulkActionResultFromReport({
						actionId: definition.id,
						snapshot,
						report,
						successMessage: `已永久删除 ${report.succeededIds.length} 个条目`,
						clearSelectionOnSuccess: true,
					})
				}
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

function getLifecycleBulkAdapter(adapter: unknown): LifecycleBulkAdapter | null {
	if (
		adapter &&
		typeof adapter === 'object' &&
		'restore' in adapter &&
		'deleteLifecycle' in adapter &&
		'deletePermanently' in adapter
	) {
		return adapter as LifecycleBulkAdapter
	}

	return null
}
