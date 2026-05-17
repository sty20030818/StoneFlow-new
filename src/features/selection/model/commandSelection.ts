import type { CommandSelectionContext } from '@/features/command/core'
import type { LifecycleEntry, LifecycleMode, TaskListItem } from '@/shared/types'

type BuildTaskCommandSelectionInput = {
	selectedIds: string[]
	tasks: TaskListItem[]
	fallbackSubtitle: string | ((task: TaskListItem) => string)
	clearSelection?: () => void
}

type BuildLifecycleCommandSelectionInput = {
	selectedIds: string[]
	entries: LifecycleEntry[]
	mode: LifecycleMode
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

export function buildLifecycleCommandSelection({
	selectedIds,
	entries,
	mode,
	clearSelection,
}: BuildLifecycleCommandSelectionInput): CommandSelectionContext {
	const entryById = new Map(entries.map((entry) => [entry.id, entry]))
	const entities = selectedIds.flatMap((entryId) => {
		const entry = entryById.get(entryId)
		if (!entry) {
			return []
		}

		return [
			{
				id: entry.id,
				type: 'lifecycle' as const,
				title: entry.title,
				subtitle: getLifecycleEntrySubtitle(entry),
				lifecycleMode: mode,
				lifecycleEntityType: entry.entityType,
			},
		]
	})
	const ids = entities.map((entity) => entity.id)
	const count = ids.length

	return {
		type: count > 0 ? 'lifecycle' : undefined,
		ids,
		entities,
		primaryEntity: entities[0],
		clearSelection,
		source: count > 0 ? 'lifecycle-list' : 'none',
		hasSelection: count > 0,
		isSingleSelection: count === 1,
		isMultiSelection: count > 1,
	}
}

function getLifecycleEntrySubtitle(entry: LifecycleEntry) {
	if (entry.entityType === 'space') {
		return '空间'
	}

	if (entry.entityType === 'project') {
		return entry.spaceName ? `项目 · ${entry.spaceName}` : '项目'
	}

	return entry.projectName ?? entry.spaceName ?? '任务'
}
