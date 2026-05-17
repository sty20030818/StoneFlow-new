import type { CommandSelectionContext } from '@/features/command/core'
import type { TaskListItem } from '@/shared/types'

import type { BulkSelectionSource } from './bulk-action.types'
import { createBulkSelectionSnapshot } from './bulk-selection-snapshot'

export function createTaskBulkSelectionSnapshot(
	selection: CommandSelectionContext,
	source: BulkSelectionSource,
) {
	const taskEntities = selection.entities.filter((entity) => entity.type === 'task')

	return createBulkSelectionSnapshot({
		entity: 'task',
		ids: taskEntities.map((entity) => entity.id),
		entities: taskEntities.map((entity) => ({
			id: entity.id,
			title: entity.title,
			subtitle: entity.subtitle,
			status: entity.status,
			priority: entity.priority,
		})),
		source,
	})
}

export function createTaskBulkSelectionSnapshotFromTasks(
	tasks: TaskListItem[],
	source: BulkSelectionSource,
) {
	return createBulkSelectionSnapshot({
		entity: 'task',
		ids: tasks.map((task) => task.id),
		entities: tasks.map((task) => ({
			id: task.id,
			title: task.title,
			subtitle: task.projectName ?? (task.inboxAt ? 'Inbox' : '独立事项'),
			status: task.status,
			priority: String(task.priority),
		})),
		source,
	})
}
