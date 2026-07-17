import {
	TASK_BULK_ACTION_IDS,
	createTaskBulkSelectionSnapshotFromTasks,
	showBulkActionResultToast,
	type BulkActionId,
	type BulkActionResult,
	type BulkActionResultMessageLabels,
} from '@/features/bulk-action'
import type { CommandContext, CommandHostContext, ShellCommandActions } from '@/features/command'
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

/**
 * 命令菜单 / 快捷键：从 CommandContext.selection 跑任务 bulk。
 * 实现归 task，layout bulkSlice 只转发。
 */
export function registerTaskCommands(
	host: Pick<CommandHostContext, 'runEntityBulkActionFromCommand'>,
): Pick<
	ShellCommandActions,
	'completeSelectedTasks' | 'requestArchiveSelectedTasks' | 'requestDeleteSelectedTasks'
> {
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
	}
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

/** 从 CommandContext 取任务选中（无选中则 no-op 由 host 判断） */
export function hasTaskCommandSelection(ctx: CommandContext): boolean {
	return ctx.selection.type === 'task' && ctx.selection.ids.length > 0
}
