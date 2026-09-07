import type { CommandContext, CommandRowTargetContext } from '@/features/command'
import { buildTaskCommandSelection } from '@/features/task/model/buildTaskCommandSelection'
import type { TaskListItem } from '@/shared/types'

type TaskRowTargetSource = Exclude<CommandRowTargetContext['source'], 'none'>

type BuildTaskCommandContextInput = {
	baseContext: CommandContext
	taskById: ReadonlyMap<string, TaskListItem>
	targetTaskIds: readonly string[]
	focusedTaskId?: string | null
	rowTargetId?: string | null
	rowTargetSource: TaskRowTargetSource
	clearSelection?: () => void
}

/** 在壳命令 context 上只投影本次任务目标，不创建第二 Runtime。 */
export function buildTaskCommandContext({
	baseContext,
	taskById,
	targetTaskIds,
	focusedTaskId = null,
	rowTargetId = null,
	rowTargetSource,
	clearSelection,
}: BuildTaskCommandContextInput): CommandContext {
	const resolvedRowTargetId = rowTargetId && taskById.has(rowTargetId) ? rowTargetId : null

	return {
		...baseContext,
		selection: buildTaskCommandSelection({
			selectedIds: targetTaskIds,
			taskById,
			fallbackSubtitle: '独立事项',
			focusedTaskId,
			clearSelection,
		}),
		rowTarget: resolvedRowTargetId
			? {
					targetId: resolvedRowTargetId,
					targetType: 'task',
					source: rowTargetSource,
					hasTarget: true,
					isTaskTarget: true,
					isProjectTarget: false,
				}
			: {
					source: 'none',
					hasTarget: false,
					isTaskTarget: false,
					isProjectTarget: false,
				},
	}
}
