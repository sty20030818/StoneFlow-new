import type { BulkActionId, BulkActionPayload } from '@/features/bulk-action'
import { TASK_BULK_ACTION_IDS } from '@/features/bulk-action'
import type { CommandContext, CommandInvocation, TaskPlacementTarget } from '@/features/command'
import type { TaskPriorityValue } from '@/features/task'
import type { TaskStatus } from '@/shared/types'

type RunEntityBulk = (
	ctx: CommandContext,
	invocation: CommandInvocation,
	entity: 'task',
	actionId: BulkActionId,
	labels: { successVerb: string; entityLabel: string },
	payload?: BulkActionPayload,
) => Promise<void>

/**
 * 命令板内任务元数据选择 → 批量 update handlers。
 * 从 useShellCommandSystem 拆出，避免宿主 hook 过长。
 */
export function createShellCommandTaskMetaHandlers(
	commandContext: CommandContext,
	runEntityBulkActionFromCommand: RunEntityBulk,
) {
	async function updateSelectedTasks(
		actionId: BulkActionId,
		payload?: {
			priority?: TaskPriorityValue
			status?: TaskStatus
			dueAt?: string | null
			target?: TaskPlacementTarget
		},
	) {
		if (commandContext.selection.type !== 'task' || commandContext.selection.ids.length === 0) {
			return
		}
		await runEntityBulkActionFromCommand(
			commandContext,
			{ source: 'command-menu' },
			'task',
			actionId,
			{ successVerb: '更新', entityLabel: '任务' },
			payload,
		)
	}

	return {
		onSelectTaskPriority: (priority: TaskPriorityValue) => {
			void updateSelectedTasks(TASK_BULK_ACTION_IDS.setPrioritySelected, { priority }).catch(
				() => undefined,
			)
		},
		onSelectTaskStatus: (status: TaskStatus) => {
			void updateSelectedTasks(TASK_BULK_ACTION_IDS.setStatusSelected, { status }).catch(
				() => undefined,
			)
		},
		onSelectTaskPlacement: (target: TaskPlacementTarget) => {
			void updateSelectedTasks(TASK_BULK_ACTION_IDS.setPlacementSelected, { target }).catch(
				() => undefined,
			)
		},
		onSelectTaskDate: (dueAt: string | null) => {
			void updateSelectedTasks(TASK_BULK_ACTION_IDS.setDateSelected, { dueAt }).catch(
				() => undefined,
			)
		},
	}
}
