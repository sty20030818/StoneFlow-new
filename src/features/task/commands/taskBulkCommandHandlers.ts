import {
	TASK_BULK_ACTION_IDS,
	createTaskBulkSelectionSnapshotFromTasks,
	showBulkActionResultToast,
	type BulkActionId,
	type BulkActionResult,
	type BulkActionResultMessageLabels,
} from '@/features/bulk-action'
import type { CommandContext, CommandHostContext, ShellCommandActions } from '@/features/command'
import { useDialogStore } from '@/features/shell-dialogs'
import type { TaskListItem } from '@/shared/types'

export type TaskBulkCommandKind = 'complete' | 'archive' | 'delete'

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
		| 'taskPreviewController'
	>,
): TaskCommandActions {
	const run = host.runEntityBulkActionFromCommand
	return {
		completeSelectedTasks: (ctx) =>
			run(
				ctx,
				'task',
				TASK_BULK_COMMAND_SPEC.complete.actionId,
				TASK_BULK_COMMAND_SPEC.complete.labels,
			),
		requestArchiveSelectedTasks: (ctx) =>
			run(
				ctx,
				'task',
				TASK_BULK_COMMAND_SPEC.archive.actionId,
				TASK_BULK_COMMAND_SPEC.archive.labels,
			),
		requestDeleteSelectedTasks: (ctx) =>
			run(
				ctx,
				'task',
				TASK_BULK_COMMAND_SPEC.delete.actionId,
				TASK_BULK_COMMAND_SPEC.delete.labels,
			),
		openTaskPlacementPicker: (ctx) => {
			useDialogStore.getState().openCommand('task-placement-picker', ctx.selection)
		},
		applyTaskPlacement: (target, ctx) =>
			run(
				ctx,
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

function resolveTaskDetailTargetId(ctx: CommandContext) {
	if (ctx.rowTarget.isTaskTarget && ctx.rowTarget.targetId) {
		return ctx.rowTarget.targetId
	}
	if (ctx.selection.focusedType === 'task' && ctx.selection.focusedId) {
		return ctx.selection.focusedId
	}
	if (ctx.selection.primaryEntity?.type === 'task') {
		return ctx.selection.primaryEntity.id
	}
	if (
		ctx.selection.type === 'task' &&
		ctx.selection.isSingleSelection &&
		ctx.selection.ids.length === 1
	) {
		return ctx.selection.ids[0]
	}
	return null
}

type RunTaskRowBulkInput = {
	kind: TaskBulkCommandKind
	tasks: TaskListItem[]
	runBulkAction: (
		actionId: BulkActionId,
		snapshot: ReturnType<typeof createTaskBulkSelectionSnapshotFromTasks>,
	) => Promise<BulkActionResult>
	clearSelection?: () => void
	/** 行快捷键默认不 toast（与现网一致）；命令菜单由 host 侧 toast */
	showToast?: boolean
}

/**
 * 行快捷键 / 多选：从任务列表构造 snapshot 后跑同一套 bulk action id。
 */
export async function runTaskRowBulkCommand({
	kind,
	tasks,
	runBulkAction,
	clearSelection,
	showToast = false,
}: RunTaskRowBulkInput): Promise<BulkActionResult | null> {
	if (tasks.length === 0) {
		return null
	}

	const spec = TASK_BULK_COMMAND_SPEC[kind]
	const snapshot = createTaskBulkSelectionSnapshotFromTasks(tasks, 'row-shortcut')
	const result = await runBulkAction(spec.actionId, snapshot)

	if (result.status === 'success' && result.shouldClearSelection) {
		clearSelection?.()
	}
	if (showToast) {
		showBulkActionResultToast(result, spec.labels)
	}

	return result
}

/** 供测试 / 文档：命令菜单与行快捷键共用的 action id */
export function getTaskBulkCommandActionId(kind: TaskBulkCommandKind): BulkActionId {
	return TASK_BULK_COMMAND_SPEC[kind].actionId
}
