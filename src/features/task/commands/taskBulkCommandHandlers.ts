import {
	TASK_BULK_ACTION_IDS,
	type BulkActionId,
	type BulkActionResultMessageLabels,
} from '@/features/bulk-action'
import {
	resolveTaskDetailTargetId,
	type CommandHostContext,
	type ShellCommandActions,
} from '@/features/command'
import { useDialogStore } from '@/features/shell-dialogs'

type TaskBulkCommandKind = 'complete' | 'archive' | 'delete'

const TASK_BULK_COMMAND_SPEC: Record<
	TaskBulkCommandKind,
	{ actionId: BulkActionId; labels: BulkActionResultMessageLabels }
> = {
	complete: {
		actionId: TASK_BULK_ACTION_IDS.completeSelected,
		labels: { successVerb: '更新', entityLabel: '任务' },
	},
	archive: {
		actionId: TASK_BULK_ACTION_IDS.archiveSelected,
		labels: { successVerb: '更新', entityLabel: '任务' },
	},
	delete: {
		actionId: TASK_BULK_ACTION_IDS.deleteSelected,
		labels: { successVerb: '更新', entityLabel: '任务' },
	},
}

type TaskCommandActions = Pick<
	ShellCommandActions,
	| 'completeSelectedTasks'
	| 'requestArchiveSelectedTasks'
	| 'requestDeleteSelectedTasks'
	| 'openTaskPlacementPicker'
	| 'applyTaskPlacement'
	| 'openTaskPriorityPicker'
	| 'openTaskStatusPicker'
	| 'openTaskDatePicker'
	| 'peekTask'
	| 'openTaskDetail'
	| 'togglePreview'
>

/**
 * 向壳命令宿主注册本域 handlers：
 * - 多选 bulk（完成 / 归档 / 删除）
 * - 命令板内的归属 / 优先级 / 状态 / 日期 picker
 * - 右侧任务预览开关
 *
 * 调用方只应传入 Host 端口；不要在 layout 再写一份同名业务逻辑。
 */
export function registerTaskCommands(
	host: Pick<
		CommandHostContext,
		| 'runEntityBulkActionFromCommand'
		| 'activeDetail'
		| 'closeEntityDrawer'
		| 'openTaskDetail'
		| 'taskPreviewController'
	>,
): TaskCommandActions {
	const run = host.runEntityBulkActionFromCommand
	return {
		completeSelectedTasks: (ctx, invocation) =>
			run(
				ctx,
				invocation,
				'task',
				TASK_BULK_COMMAND_SPEC.complete.actionId,
				TASK_BULK_COMMAND_SPEC.complete.labels,
			),
		requestArchiveSelectedTasks: (ctx, invocation) =>
			run(
				ctx,
				invocation,
				'task',
				TASK_BULK_COMMAND_SPEC.archive.actionId,
				TASK_BULK_COMMAND_SPEC.archive.labels,
			),
		requestDeleteSelectedTasks: (ctx, invocation) =>
			run(
				ctx,
				invocation,
				'task',
				TASK_BULK_COMMAND_SPEC.delete.actionId,
				TASK_BULK_COMMAND_SPEC.delete.labels,
			),
		peekTask: (ctx) => {
			if (host.activeDetail?.kind === 'task') {
				return
			}
			const targetTaskId = resolveTaskDetailTargetId(ctx)
			if (targetTaskId) {
				host.taskPreviewController.openPreview(targetTaskId, 'keyboard')
			}
		},
		openTaskDetail: (ctx) => {
			const targetTaskId = resolveTaskDetailTargetId(ctx)
			if (!targetTaskId) {
				return
			}
			host.taskPreviewController.closePreview()
			host.openTaskDetail(targetTaskId)
		},
		openTaskPlacementPicker: (ctx) => {
			useDialogStore.getState().openCommand('task-placement-picker', ctx.selection)
		},
		applyTaskPlacement: (target, ctx) =>
			run(
				ctx,
				{ source: 'command-menu' },
				'task',
				TASK_BULK_ACTION_IDS.setPlacementSelected,
				{ successVerb: '整理', entityLabel: '任务' },
				{ target },
			),
		openTaskPriorityPicker: (ctx) => {
			useDialogStore.getState().openCommand('task-priority-picker', ctx.selection)
		},
		openTaskStatusPicker: (ctx) => {
			useDialogStore.getState().openCommand('task-status-picker', ctx.selection)
		},
		openTaskDatePicker: (ctx) => {
			useDialogStore.getState().openCommand('task-date-picker', ctx.selection)
		},
		togglePreview: (ctx) => {
			if (host.activeDetail?.kind === 'task') {
				host.closeEntityDrawer()
				host.taskPreviewController.openPreview(host.activeDetail.id, 'keyboard')
				return
			}
			if (host.taskPreviewController.previewState.open) {
				host.taskPreviewController.closePreview()
				return
			}
			const targetTaskId = resolveTaskDetailTargetId(ctx)
			if (!targetTaskId) {
				return
			}
			host.taskPreviewController.openPreview(targetTaskId, 'keyboard')
		},
	}
}
