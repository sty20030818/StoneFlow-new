import {
	PROJECT_BULK_ACTION_IDS,
	createBulkActionResult,
	createBulkActionResultFromReport,
	type BulkAction,
} from '@/features/bulk-action'

import type { ProjectBulkAdapter } from './project-bulk-adapter'

type ProjectBulkActionDefinition = Omit<BulkAction, 'run'>

const projectBulkActionDefinitions: ProjectBulkActionDefinition[] = [
	{
		id: PROJECT_BULK_ACTION_IDS.archiveSelected,
		entity: 'project',
		label: '归档项目',
		description: '将选中的项目移动到归档。',
		intent: 'archive',
		requiresConfirm: true,
	},
	{
		id: PROJECT_BULK_ACTION_IDS.deleteSelected,
		entity: 'project',
		label: '删除项目',
		description: '将选中的项目移动到回收站。',
		intent: 'delete',
		tone: 'destructive',
		requiresConfirm: true,
	},
]

export const projectBulkActions: BulkAction[] = projectBulkActionDefinitions.map((definition) => ({
	...definition,
	run: async (snapshot, context) => {
		const adapter = getProjectBulkAdapter(context.adapter)
		if (!adapter) {
			return createBulkActionResult({
				status: 'failed',
				actionId: definition.id,
				snapshot,
				error: new Error('project bulk adapter is not available'),
			})
		}

		switch (definition.id) {
			case PROJECT_BULK_ACTION_IDS.archiveSelected: {
				const report = await adapter.archiveProject(snapshot.ids)
				return createBulkActionResultFromReport({
					actionId: definition.id,
					snapshot,
					report,
					successMessage: `已归档 ${report.succeededIds.length} 个项目`,
					clearSelectionOnSuccess: true,
				})
			}
			case PROJECT_BULK_ACTION_IDS.deleteSelected: {
				const report = await adapter.deleteProject(snapshot.ids)
				return createBulkActionResultFromReport({
					actionId: definition.id,
					snapshot,
					report,
					successMessage: `已删除 ${report.succeededIds.length} 个项目`,
					clearSelectionOnSuccess: true,
				})
			}
			default:
				return createBulkActionResult({
					status: 'failed',
					actionId: definition.id,
					snapshot,
					error: new Error(`unsupported project bulk action: ${definition.id}`),
				})
		}
	},
}))

function getProjectBulkAdapter(adapter: unknown): ProjectBulkAdapter | null {
	if (
		adapter &&
		typeof adapter === 'object' &&
		'archiveProject' in adapter &&
		'deleteProject' in adapter
	) {
		return adapter as ProjectBulkAdapter
	}

	return null
}
