import type { TaskListItem } from '@/shared/types'

import type { BulkSelectionSource } from './bulk-action.types'
import { createBulkSelectionSnapshot } from './bulk-selection-snapshot'

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
			subtitle: task.projectName ?? '独立事项',
			status: task.status,
			priority: String(task.priority),
		})),
		source,
	})
}
