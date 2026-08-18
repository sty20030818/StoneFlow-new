import { createEmptyCommandContext } from '@/features/command'
import type { TaskListItem } from '@/shared/types'

import { buildTaskCommandContext } from './buildTaskCommandContext'

describe('buildTaskCommandContext', () => {
	it('只替换任务目标切片，并保留壳层其余 context', () => {
		const baseContext = {
			...createEmptyCommandContext(),
			route: { page: 'tasks' as const },
		}
		const clearSelection = vi.fn()
		const target = buildTaskCommandContext({
			baseContext,
			tasks: [createTask('task-a'), createTask('task-b')],
			targetTaskIds: ['task-b', 'task-a'],
			focusedTaskId: 'task-a',
			rowTargetId: 'task-a',
			rowTargetSource: 'context-menu',
			clearSelection,
		})

		expect(target.route).toBe(baseContext.route)
		expect(target.selection).toMatchObject({
			type: 'task',
			ids: ['task-b', 'task-a'],
			focusedId: 'task-a',
			clearSelection,
		})
		expect(target.rowTarget).toEqual({
			targetId: 'task-a',
			targetType: 'task',
			source: 'context-menu',
			hasTarget: true,
			isTaskTarget: true,
			isProjectTarget: false,
		})
	})

	it('过滤不可见目标，不伪造 row target', () => {
		const target = buildTaskCommandContext({
			baseContext: createEmptyCommandContext(),
			tasks: [createTask('task-a')],
			targetTaskIds: ['missing'],
			rowTargetId: 'missing',
			rowTargetSource: 'focus',
		})

		expect(target.selection.ids).toEqual([])
		expect(target.rowTarget).toMatchObject({
			source: 'none',
			hasTarget: false,
			isTaskTarget: false,
		})
	})
})

function createTask(id: string): TaskListItem {
	return {
		id,
		spaceId: 'space-a',
		spaceName: '工作',
		spaceSlug: 'work',
		projectId: null,
		projectName: null,
		title: id,
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
	}
}
