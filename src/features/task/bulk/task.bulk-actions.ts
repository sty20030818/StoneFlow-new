import {
	TASK_BULK_ACTION_IDS,
	type BulkAction,
	type BulkActionId,
	type BulkActionPayload,
	createBulkActionResult,
	createBulkActionResultFromReport,
} from '@/features/bulk-action'
import type { TaskPlacementTarget } from '@/features/metadata-fields'
import type { TaskStatus } from '@/shared/types'

import type { TaskPriorityValue } from '../model/taskPriority'
import type { TaskBulkAdapter } from './task-bulk-adapter'

type TaskBulkActionDefinition = Omit<BulkAction, 'run'>

export type TaskBulkActionPayload =
	| { priority: TaskPriorityValue }
	| { status: TaskStatus }
	| { dueAt: string | null }
	| { target: TaskPlacementTarget }

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
	},
	{
		id: TASK_BULK_ACTION_IDS.deleteSelected,
		entity: 'task',
		label: '删除任务',
		description: '将选中的任务移动到回收站。',
		intent: 'delete',
		tone: 'destructive',
		requiresConfirm: true,
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
		id: TASK_BULK_ACTION_IDS.setPlacementSelected,
		entity: 'task',
		label: '设置任务归属',
		description: '批量更新选中任务的归属。',
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
			case TASK_BULK_ACTION_IDS.completeSelected: {
				const report = await adapter.complete(snapshot)
				return createBulkActionResultFromReport({
					actionId: definition.id,
					snapshot,
					report,
					successMessage: `已更新 ${report.succeededIds.length} 个任务`,
				})
			}
			case TASK_BULK_ACTION_IDS.archiveSelected: {
				const report = await adapter.archive(snapshot.ids)
				return createBulkActionResultFromReport({
					actionId: definition.id,
					snapshot,
					report,
					successMessage: `已归档 ${report.succeededIds.length} 个任务`,
					clearSelectionOnSuccess: true,
				})
			}
			case TASK_BULK_ACTION_IDS.deleteSelected: {
				const report = await adapter.delete(snapshot.ids)
				return createBulkActionResultFromReport({
					actionId: definition.id,
					snapshot,
					report,
					successMessage: `已删除 ${report.succeededIds.length} 个任务`,
					clearSelectionOnSuccess: true,
				})
			}
			case TASK_BULK_ACTION_IDS.setPrioritySelected: {
				if (!isPriorityPayload(payload)) {
					return createMissingPayloadResult(definition.id, snapshot, 'priority')
				}
				const report = await adapter.updatePriority(snapshot.ids, payload.priority)
				return createBulkActionResultFromReport({
					actionId: definition.id,
					snapshot,
					report,
					successMessage: `已更新 ${report.succeededIds.length} 个任务`,
				})
			}
			case TASK_BULK_ACTION_IDS.setStatusSelected: {
				if (!isStatusPayload(payload)) {
					return createMissingPayloadResult(definition.id, snapshot, 'status')
				}
				const report = await adapter.updateStatus(snapshot.ids, payload.status)
				return createBulkActionResultFromReport({
					actionId: definition.id,
					snapshot,
					report,
					successMessage: `已更新 ${report.succeededIds.length} 个任务`,
				})
			}
			case TASK_BULK_ACTION_IDS.setDateSelected: {
				if (!isDatePayload(payload)) {
					return createMissingPayloadResult(definition.id, snapshot, 'dueAt')
				}
				const report = await adapter.updateDate(snapshot.ids, payload.dueAt)
				return createBulkActionResultFromReport({
					actionId: definition.id,
					snapshot,
					report,
					successMessage: `已更新 ${report.succeededIds.length} 个任务`,
				})
			}
			case TASK_BULK_ACTION_IDS.setPlacementSelected: {
				if (!isPlacementPayload(payload)) {
					return createMissingPayloadResult(definition.id, snapshot, 'target')
				}
				const report = await adapter.updatePlacement(snapshot.ids, payload.target)
				return createBulkActionResultFromReport({
					actionId: definition.id,
					snapshot,
					report,
					successMessage: `已整理 ${report.succeededIds.length} 个任务`,
				})
			}
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

function isPlacementPayload(
	payload: BulkActionPayload,
): payload is { target: TaskPlacementTarget } {
	return Boolean(
		payload &&
		typeof payload === 'object' &&
		'target' in payload &&
		payload.target &&
		typeof payload.target === 'object' &&
		'kind' in payload.target,
	)
}
