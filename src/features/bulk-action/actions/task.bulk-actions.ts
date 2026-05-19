import {
	TASK_BULK_ACTION_IDS,
	type BulkAction,
	type BulkActionId,
	type BulkActionPayload,
	createBulkActionResult,
} from '@/features/bulk-action/core'
import type { TaskBulkAdapter, TaskBulkMutationReport } from '@/features/bulk-action/adapters'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import type { TaskStatus } from '@/shared/types'

type TaskBulkActionDefinition = Omit<BulkAction, 'run'>

export type TaskBulkActionPayload =
	| { priority: TaskPriorityValue }
	| { status: TaskStatus }
	| { dueAt: string | null }
	| { projectId: string }

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
	{
		id: TASK_BULK_ACTION_IDS.moveToProjectSelected,
		entity: 'task',
		label: '移动任务到项目',
		description: '批量将选中任务移动到指定项目。',
		intent: 'move',
	},
	{
		id: TASK_BULK_ACTION_IDS.moveToInboxSelected,
		entity: 'task',
		label: '移动任务到收件箱',
		description: '批量将选中任务移动到 Inbox。',
		intent: 'move',
	},
	{
		id: TASK_BULK_ACTION_IDS.moveToNoProjectSelected,
		entity: 'task',
		label: '移动任务到独立事项',
		description: '批量将选中任务移出项目，设为独立事项。',
		intent: 'move',
	},
]

export const taskBulkActions: BulkAction[] = taskBulkActionDefinitions.map((definition) => ({
	...definition,
	run: async (snapshot, context, payload) => {
		const adapter = getTaskBulkAdapter(context.adapter)
		if (!adapter) {
			return createBulkActionResult({
				status: 'failed',
				actionId: definition.id,
				snapshot,
				error: new Error('task bulk adapter is not available'),
			})
		}

		switch (definition.id) {
			case TASK_BULK_ACTION_IDS.completeSelected:
				return toBulkActionResult(definition.id, snapshot, await adapter.complete(snapshot), {
					getMessage: (report) => `已更新 ${report.succeededIds.length} 个任务`,
				})
			case TASK_BULK_ACTION_IDS.archiveSelected:
				return toBulkActionResult(definition.id, snapshot, await adapter.archive(snapshot.ids), {
					getMessage: (report) => `已归档 ${report.succeededIds.length} 个任务`,
					shouldClearSelection: true,
				})
			case TASK_BULK_ACTION_IDS.deleteSelected:
				return toBulkActionResult(definition.id, snapshot, await adapter.delete(snapshot.ids), {
					getMessage: (report) => `已删除 ${report.succeededIds.length} 个任务`,
					shouldClearSelection: true,
				})
			case TASK_BULK_ACTION_IDS.setPrioritySelected: {
				if (!isPriorityPayload(payload)) {
					return createMissingPayloadResult(definition.id, snapshot, 'priority')
				}
				return toBulkActionResult(
					definition.id,
					snapshot,
					await adapter.updatePriority(snapshot.ids, payload.priority),
					{ getMessage: (report) => `已更新 ${report.succeededIds.length} 个任务` },
				)
			}
			case TASK_BULK_ACTION_IDS.setStatusSelected: {
				if (!isStatusPayload(payload)) {
					return createMissingPayloadResult(definition.id, snapshot, 'status')
				}
				return toBulkActionResult(
					definition.id,
					snapshot,
					await adapter.updateStatus(snapshot.ids, payload.status),
					{ getMessage: (report) => `已更新 ${report.succeededIds.length} 个任务` },
				)
			}
			case TASK_BULK_ACTION_IDS.setDateSelected: {
				if (!isDatePayload(payload)) {
					return createMissingPayloadResult(definition.id, snapshot, 'dueAt')
				}
				return toBulkActionResult(
					definition.id,
					snapshot,
					await adapter.updateDate(snapshot.ids, payload.dueAt),
					{ getMessage: (report) => `已更新 ${report.succeededIds.length} 个任务` },
				)
			}
			case TASK_BULK_ACTION_IDS.moveToProjectSelected: {
				if (!isProjectPayload(payload)) {
					return createMissingPayloadResult(definition.id, snapshot, 'projectId')
				}
				return toBulkActionResult(
					definition.id,
					snapshot,
					await adapter.moveToProject(snapshot.ids, payload.projectId),
					{ getMessage: (report) => `已整理 ${report.succeededIds.length} 个任务` },
				)
			}
			case TASK_BULK_ACTION_IDS.moveToInboxSelected:
				return toBulkActionResult(
					definition.id,
					snapshot,
					await adapter.moveToInbox(snapshot.ids),
					{ getMessage: (report) => `已整理 ${report.succeededIds.length} 个任务` },
				)
			case TASK_BULK_ACTION_IDS.moveToNoProjectSelected:
				return toBulkActionResult(
					definition.id,
					snapshot,
					await adapter.moveToNoProject(snapshot.ids),
					{ getMessage: (report) => `已整理 ${report.succeededIds.length} 个任务` },
				)
			default:
				return createBulkActionResult({
					status: 'failed',
					actionId: definition.id,
					snapshot,
					error: new Error(`unsupported task bulk action: ${definition.id}`),
				})
		}
	},
}))

export function getTaskBulkActionDefinition(actionId: BulkActionId) {
	return taskBulkActionDefinitions.find((action) => action.id === actionId) ?? null
}

function getTaskBulkAdapter(adapter: unknown): TaskBulkAdapter | null {
	if (
		adapter &&
		typeof adapter === 'object' &&
		'complete' in adapter &&
		'archive' in adapter &&
		'delete' in adapter &&
		'updatePriority' in adapter &&
		'updateStatus' in adapter &&
		'updateDate' in adapter
	) {
		return adapter as TaskBulkAdapter
	}

	return null
}

function toBulkActionResult(
	actionId: BulkActionId,
	snapshot: Parameters<BulkAction['run']>[0],
	report: TaskBulkMutationReport,
	options: {
		getMessage?: (report: TaskBulkMutationReport) => string
		shouldClearSelection?: boolean
	} = {},
) {
	const status =
		report.failedIds.length === 0
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

function createMissingPayloadResult(
	actionId: BulkActionId,
	snapshot: Parameters<BulkAction['run']>[0],
	fieldName: string,
) {
	return createBulkActionResult({
		status: 'disabled',
		actionId,
		snapshot,
		message: `缺少批量任务参数：${fieldName}`,
	})
}

function isPriorityPayload(payload: BulkActionPayload): payload is { priority: TaskPriorityValue } {
	return Boolean(payload && typeof payload === 'object' && 'priority' in payload)
}

function isStatusPayload(payload: BulkActionPayload): payload is { status: TaskStatus } {
	return Boolean(payload && typeof payload === 'object' && 'status' in payload)
}

function isDatePayload(payload: BulkActionPayload): payload is { dueAt: string | null } {
	return Boolean(payload && typeof payload === 'object' && 'dueAt' in payload)
}

function isProjectPayload(payload: BulkActionPayload): payload is { projectId: string } {
	return Boolean(
		payload &&
		typeof payload === 'object' &&
		'projectId' in payload &&
		typeof payload.projectId === 'string' &&
		payload.projectId.length > 0,
	)
}
