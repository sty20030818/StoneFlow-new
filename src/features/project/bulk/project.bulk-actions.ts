import {
	PROJECT_BULK_ACTION_IDS,
	createBulkActionResult,
	type BulkAction,
	type BulkActionId,
	type BulkSelectionSnapshot,
} from '@/features/bulk-action'

import type { ProjectBulkAdapter, ProjectBulkMutationReport } from './project-bulk-adapter'

type ProjectBulkActionDefinition = Omit<BulkAction, 'run'>

const projectBulkActionDefinitions: ProjectBulkActionDefinition[] = [
	{
		id: PROJECT_BULK_ACTION_IDS.archiveSelected,
		entity: 'project',
		label: '归档项目',
		description: '将选中的项目移动到归档。',
		intent: 'archive',
		requiresConfirm: true,
		getConfirmCopy: (snapshot) => ({
			title: '归档选中项目？',
			description: `将归档 ${snapshot.ids.length} 个项目。归档后可在归档页中恢复。`,
			confirmLabel: '确认归档',
		}),
	},
	{
		id: PROJECT_BULK_ACTION_IDS.deleteSelected,
		entity: 'project',
		label: '删除项目',
		description: '将选中的项目移动到回收站。',
		intent: 'delete',
		tone: 'destructive',
		requiresConfirm: true,
		getConfirmCopy: (snapshot) => ({
			title: '删除选中项目？',
			description: `将删除 ${snapshot.ids.length} 个项目。删除后可在回收站中恢复。`,
			confirmLabel: '确认删除',
		}),
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
			case PROJECT_BULK_ACTION_IDS.archiveSelected:
				return toBulkActionResult(
					definition.id,
					snapshot,
					await adapter.archiveProject(snapshot.ids),
					{
						getMessage: (report) => `已归档 ${report.succeededIds.length} 个项目`,
						shouldClearSelection: true,
					},
				)
			case PROJECT_BULK_ACTION_IDS.deleteSelected:
				return toBulkActionResult(
					definition.id,
					snapshot,
					await adapter.deleteProject(snapshot.ids),
					{
						getMessage: (report) => `已删除 ${report.succeededIds.length} 个项目`,
						shouldClearSelection: true,
					},
				)
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

function toBulkActionResult(
	actionId: BulkActionId,
	snapshot: BulkSelectionSnapshot,
	report: ProjectBulkMutationReport,
	options: {
		getMessage?: (report: ProjectBulkMutationReport) => string
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
