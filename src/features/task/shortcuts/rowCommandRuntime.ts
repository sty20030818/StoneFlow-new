import { useDialogStore } from '@/features/shell-dialogs'
import { useBulkActionContext } from '@/features/bulk-action'
import {
	COMMAND_IDS,
	createEmptyCommandContext,
	type Command,
	type CommandContext,
	type CommandId,
} from '@/features/command'
import type { TaskListItem } from '@/shared/types'

import { runTaskRowBulkCommand } from '../commands/taskBulkCommandHandlers'
import type { TaskRowCommandActions } from './types'

const ROW_COMMAND_DISABLED_REASON = 'Row 上下文尚未接入'

export function createTaskRowCommandContext(
	rowTarget: CommandContext['rowTarget'],
	selectedTaskIds: string[],
	focusedTaskId: string | null,
) {
	return {
		...createEmptyCommandContext(),
		rowTarget,
		selection: {
			type: selectedTaskIds.length > 0 ? ('task' as const) : undefined,
			ids: selectedTaskIds,
			entities: selectedTaskIds.map((taskId) => ({
				id: taskId,
				type: 'task' as const,
				title: taskId,
			})),
			primaryEntity: selectedTaskIds[0]
				? {
						id: selectedTaskIds[0],
						type: 'task' as const,
						title: selectedTaskIds[0],
					}
				: undefined,
			source: selectedTaskIds.length > 0 ? ('row' as const) : ('none' as const),
			hasSelection: selectedTaskIds.length > 0,
			isSingleSelection: selectedTaskIds.length === 1,
			isMultiSelection: selectedTaskIds.length > 1,
			focusedId: focusedTaskId ?? undefined,
			focusedType: focusedTaskId ? ('task' as const) : undefined,
		},
		focus: {
			isInputFocused: false,
			activePanel: 'main' as const,
		},
	}
}

export function createTaskRowCommands(actions: TaskRowCommandActions): Command[] {
	return [
		bindTaskRowCommand(COMMAND_IDS.taskComplete, actions.complete),
		bindTaskRowCommand(COMMAND_IDS.taskSelect, actions.select),
		bindTaskRowCommand(COMMAND_IDS.taskPeek, actions.peek, { allowMultiSelection: false }),
		bindTaskRowCommand(COMMAND_IDS.taskOpenDetail, actions.openDetail, {
			allowMultiSelection: false,
		}),
		bindTaskRowCommand(COMMAND_IDS.taskArchive, actions.archive),
		bindTaskRowCommand(COMMAND_IDS.taskDelete, actions.deleteTask),
		bindTaskRowCommand(COMMAND_IDS.taskSetPriority, actions.openPriorityMenu),
		bindTaskRowCommand(COMMAND_IDS.taskSetStatus, actions.openStatusMenu),
		bindTaskRowCommand(COMMAND_IDS.taskOpenDateMenu, actions.openDateMenu),
		bindTaskRowCommand(COMMAND_IDS.taskChangePlacement, actions.openPlacementMenu),
	]
}

function bindTaskRowCommand(
	id: CommandId,
	run: Command['run'],
	options: { allowMultiSelection?: boolean } = {},
): Command {
	return {
		id,
		title: id,
		category: 'task',
		scope: ['task-list'],
		isEnabled: (ctx) =>
			(ctx.rowTarget.hasTarget || ctx.selection.hasSelection) &&
			(options.allowMultiSelection !== false || !ctx.selection.isMultiSelection),
		getDisabledReason: () => ROW_COMMAND_DISABLED_REASON,
		run,
	}
}

/**
 * 行命令动作：complete/archive/delete 走 {@link runTaskRowBulkCommand}，与命令板同源。
 */
export function createTaskRowCommandActions({
	rowTarget,
	targetTask,
	selectedTasks,
	runBulkAction,
	onClearTaskSelection,
	onOpenTask,
	onPeekTask,
	onToggleTaskSelection,
}: {
	rowTarget: CommandContext['rowTarget']
	targetTask?: TaskListItem
	selectedTasks: TaskListItem[]
	runBulkAction: ReturnType<typeof useBulkActionContext>['runBulkAction']
	onClearTaskSelection?: () => void
	onToggleTaskSelection: (taskId: string) => void
	onOpenTask: (taskId: string) => void
	onPeekTask?: (taskId: string, source: 'keyboard' | 'pointer') => void
}): TaskRowCommandActions {
	const batchTasks = selectedTasks.length > 0 ? selectedTasks : targetTask ? [targetTask] : []

	async function runSharedBulk(kind: 'complete' | 'archive' | 'delete') {
		await runTaskRowBulkCommand({
			kind,
			tasks: batchTasks,
			runBulkAction,
			clearSelection: onClearTaskSelection,
		})
	}

	return {
		complete: async () => {
			await runSharedBulk('complete')
		},
		select: () => {
			if (rowTarget.targetId) {
				onToggleTaskSelection(rowTarget.targetId)
			}
		},
		peek: () => {
			if (targetTask && selectedTasks.length <= 1) {
				onPeekTask?.(targetTask.id, rowTarget.source === 'hover' ? 'pointer' : 'keyboard')
			}
		},
		openDetail: () => {
			if (targetTask && selectedTasks.length <= 1) {
				onOpenTask(targetTask.id)
			}
		},
		archive: async () => {
			await runSharedBulk('archive')
		},
		deleteTask: async () => {
			await runSharedBulk('delete')
		},
		openPriorityMenu: () => {
			openTaskPropertyPicker('task-priority-picker', batchTasks)
		},
		openStatusMenu: () => {
			openTaskPropertyPicker('task-status-picker', batchTasks)
		},
		openDateMenu: () => {
			openTaskPropertyPicker('task-date-picker', batchTasks)
		},
		openPlacementMenu: () => {
			openTaskPropertyPicker('task-placement-picker', batchTasks)
		},
	}
}

function openTaskPropertyPicker(
	mode:
		| 'task-priority-picker'
		| 'task-status-picker'
		| 'task-date-picker'
		| 'task-placement-picker',
	tasks: TaskListItem[],
) {
	if (tasks.length === 0) {
		return
	}

	useDialogStore.getState().openCommand(mode, {
		type: 'task',
		ids: tasks.map((task) => task.id),
		entities: tasks.map((task) => ({
			id: task.id,
			type: 'task' as const,
			title: task.title,
			subtitle: task.projectName ?? '独立事项',
			spaceId: task.spaceId,
			projectId: task.projectId,
			
			dueAt: task.dueAt,
			status: task.status,
			priority: String(task.priority),
		})),
		primaryEntity: {
			id: tasks[0].id,
			type: 'task',
			title: tasks[0].title,
			subtitle: tasks[0].projectName ?? '独立事项',
			spaceId: tasks[0].spaceId,
			projectId: tasks[0].projectId,
			
			dueAt: tasks[0].dueAt,
			status: tasks[0].status,
			priority: String(tasks[0].priority),
		},
		source: 'row',
		hasSelection: true,
		isSingleSelection: tasks.length === 1,
		isMultiSelection: tasks.length > 1,
	})
}
