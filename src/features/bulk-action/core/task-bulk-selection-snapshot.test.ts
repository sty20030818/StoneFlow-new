import { describe, expect, it } from 'vitest'

import type { TaskListItem } from '@/shared/types'

import { createTaskBulkSelectionSnapshotFromTasks } from './task-bulk-selection-snapshot'

describe('createTaskBulkSelectionSnapshotFromTasks', () => {
	it('从任务列表创建 row shortcut 快照', () => {
		const tasks = [
			createTask({ id: 'task-a', title: '任务 A', priority: 2 }),
			createTask({ id: 'task-b', title: '任务 B', priority: 3 }),
		]

		const snapshot = createTaskBulkSelectionSnapshotFromTasks(tasks, 'row-shortcut')

		expect(snapshot.entity).toBe('task')
		expect(snapshot.source).toBe('row-shortcut')
		expect(snapshot.ids).toEqual(['task-a', 'task-b'])
		expect(snapshot.entities).toEqual([
			expect.objectContaining({
				id: 'task-a',
				title: '任务 A',
				subtitle: '独立事项',
				status: 'todo',
				priority: '2',
			}),
			expect.objectContaining({
				id: 'task-b',
				title: '任务 B',
				subtitle: '独立事项',
				status: 'todo',
				priority: '3',
			}),
		])
	})
})

function createTask(overrides: Partial<TaskListItem> = {}): TaskListItem {
	return {
		id: 'task-a',
		spaceId: 'space-a',
		spaceName: '工作',
		spaceSlug: 'work',
		projectId: null,
		projectName: null,
		title: '任务 A',
		status: 'todo',
		statusChangedAt: '2026-05-15T00:00:00Z',
		priority: 2,
		dueAt: null,
		plannedAt: null,
		remindAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-05-15T00:00:00Z',
		updatedAt: '2026-05-15T00:00:00Z',
		...overrides,
	}
}
