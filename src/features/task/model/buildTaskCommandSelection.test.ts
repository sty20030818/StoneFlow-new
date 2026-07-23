import type { TaskListItem } from '@/shared/types'

import { buildTaskCommandSelection } from './buildTaskCommandSelection'

describe('buildTaskCommandSelection', () => {
	it('按 selectedIds 顺序构建纯数据 selection，并剔除不可见任务', () => {
		const selection = buildTaskCommandSelection({
			selectedIds: ['task-b', 'missing', 'task-a'],
			tasks: [
				createTask({ id: 'task-a', title: '任务 A', projectName: null }),
				createTask({ id: 'task-b', title: '任务 B', projectName: '项目 B' }),
			],
			fallbackSubtitle: '独立事项',
			focusedTaskId: 'task-a',
		})

		expect(selection).toMatchObject({
			type: 'task',
			ids: ['task-b', 'task-a'],
			source: 'task-list',
			hasSelection: true,
			isSingleSelection: false,
			isMultiSelection: true,
		})
		expect(selection.entities).toMatchObject([
			{
				id: 'task-b',
				type: 'task',
				title: '任务 B',
				subtitle: '项目 B',
				status: 'todo',
				priority: '2',
			},
			{
				id: 'task-a',
				type: 'task',
				title: '任务 A',
				subtitle: '独立事项',
				status: 'todo',
				priority: '2',
			},
		])
		expect(selection.primaryEntity).toEqual(selection.entities[0])
		expect(selection.focusedId).toBe('task-a')
		expect(selection.focusedType).toBe('task')
	})

	it('没有有效任务时返回空 selection', () => {
		const selection = buildTaskCommandSelection({
			selectedIds: ['missing'],
			tasks: [createTask({ id: 'task-a' })],
			fallbackSubtitle: '独立事项',
			focusedTaskId: 'task-a',
		})

		expect(selection).toMatchObject({
			ids: [],
			entities: [],
			focusedId: 'task-a',
			focusedType: 'task',
			source: 'none',
			hasSelection: false,
			isSingleSelection: false,
			isMultiSelection: false,
		})
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
		note: null,
		status: 'todo',
		statusChangedAt: '2026-05-16T00:00:00Z',
		priority: 2,
		dueAt: null,
		plannedAt: null,
		remindAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-05-16T00:00:00Z',
		updatedAt: '2026-05-16T00:00:00Z',
		...overrides,
	}
}
