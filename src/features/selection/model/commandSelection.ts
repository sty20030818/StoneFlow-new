import type { CommandSelectionContext } from '@/features/command/core'
import type { TaskListItem } from '@/shared/types'

type BuildTaskCommandSelectionInput = {
	selectedIds: string[]
	tasks: TaskListItem[]
	fallbackSubtitle: string | ((task: TaskListItem) => string)
	clearSelection?: () => void
}

export function buildTaskCommandSelection({
	selectedIds,
	tasks,
	fallbackSubtitle,
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
					task.projectName ??
					(typeof fallbackSubtitle === 'function' ? fallbackSubtitle(task) : fallbackSubtitle),
				status: task.status,
				priority: String(task.priority),
			},
		]
	})
	const ids = entities.map((entity) => entity.id)
	const count = ids.length

	return {
		type: count > 0 ? 'task' : undefined,
		ids,
		entities,
		primaryEntity: entities[0],
		clearSelection,
		source: count > 0 ? 'task-list' : 'none',
		hasSelection: count > 0,
		isSingleSelection: count === 1,
		isMultiSelection: count > 1,
	}
}
