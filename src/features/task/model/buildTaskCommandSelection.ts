import type { CommandSelectionContext } from '@/features/command'
import type { TaskListItem } from '@/shared/types'

type BuildTaskCommandSelectionInput = {
	selectedIds: readonly string[]
	tasks: readonly TaskListItem[]
	fallbackSubtitle: string | ((task: TaskListItem) => string)
	focusedTaskId?: string | null
	clearSelection?: () => void
}

/** 将列表多选映射为命令菜单消费的 selection 上下文。 */
export function buildTaskCommandSelection({
	selectedIds,
	tasks,
	fallbackSubtitle,
	focusedTaskId = null,
	clearSelection,
}: BuildTaskCommandSelectionInput): CommandSelectionContext {
	const taskById = new Map(tasks.map((task) => [task.id, task]))
	const entities = selectedIds.flatMap((taskId) => {
		const task = taskById.get(taskId)
		if (!task) {
			return []
		}

		return [
			{
				id: task.id,
				type: 'task' as const,
				title: task.title,
				subtitle:
					typeof fallbackSubtitle === 'function'
						? fallbackSubtitle(task)
						: (task.projectName ?? fallbackSubtitle),
				spaceId: task.spaceId,
				projectId: task.projectId,

				dueAt: task.dueAt,
				status: task.status,
				priority: String(task.priority),
			},
		]
	})
	const ids = entities.map((entity) => entity.id)
	const count = ids.length
	const focusedTask = focusedTaskId ? (taskById.get(focusedTaskId) ?? null) : null

	return {
		type: count > 0 ? 'task' : undefined,
		ids,
		entities,
		primaryEntity: entities[0],
		focusedId: focusedTask?.id,
		focusedType: focusedTask ? 'task' : undefined,
		clearSelection,
		source: count > 0 ? 'task-list' : 'none',
		hasSelection: count > 0,
		isSingleSelection: count === 1,
		isMultiSelection: count > 1,
	}
}
