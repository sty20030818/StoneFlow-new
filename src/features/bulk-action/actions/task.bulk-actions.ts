import {
	TASK_BULK_ACTION_IDS,
	type BulkAction,
	type BulkActionId,
} from '@/features/bulk-action/core'

type TaskBulkActionDefinition = Omit<BulkAction, 'run'>

export const taskBulkActionDefinitions: TaskBulkActionDefinition[] = [
	{
		id: TASK_BULK_ACTION_IDS.completeSelected,
		entity: 'task',
		label: '完成任务',
		description: '批量完成或取消完成选中的任务。',
		intent: 'complete',
	},
	{
		id: TASK_BULK_ACTION_IDS.archiveSelected,
		entity: 'task',
		label: '归档任务',
		description: '将选中的任务移动到归档。',
		intent: 'archive',
		requiresConfirm: true,
		getConfirmCopy: (snapshot) => ({
			title: '归档选中任务？',
			description: `将归档 ${snapshot.ids.length} 个任务。归档后可在归档页中恢复。`,
			confirmLabel: '确认归档',
		}),
	},
	{
		id: TASK_BULK_ACTION_IDS.deleteSelected,
		entity: 'task',
		label: '删除任务',
		description: '将选中的任务移动到回收站。',
		intent: 'delete',
		tone: 'destructive',
		requiresConfirm: true,
		getConfirmCopy: (snapshot) => ({
			title: '删除选中任务？',
			description: `将删除 ${snapshot.ids.length} 个任务。删除后可在回收站中恢复。`,
			confirmLabel: '确认删除',
		}),
	},
	{
		id: TASK_BULK_ACTION_IDS.setPrioritySelected,
		entity: 'task',
		label: '设置任务优先级',
		description: '批量更新选中任务的优先级。',
		intent: 'update',
	},
	{
		id: TASK_BULK_ACTION_IDS.setStatusSelected,
		entity: 'task',
		label: '设置任务状态',
		description: '批量更新选中任务的状态。',
		intent: 'update',
	},
	{
		id: TASK_BULK_ACTION_IDS.setDateSelected,
		entity: 'task',
		label: '设置任务日期',
		description: '批量更新选中任务的日期。',
		intent: 'update',
	},
]

export function getTaskBulkActionDefinition(actionId: BulkActionId) {
	return taskBulkActionDefinitions.find((action) => action.id === actionId) ?? null
}
