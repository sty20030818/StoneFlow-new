import type { TaskListItem } from '@/shared/types'

import { getTaskBoardVisualOrderIds } from './taskBoardOrder'

function createTask(id: string, status: TaskListItem['status']): TaskListItem {
	return {
		id,
		spaceId: 'space-1',
		spaceName: '默认空间',
		spaceSlug: 'default',
		title: id,
		note: null,
		status,
		statusChangedAt: '2026-05-17T00:00:00.000Z',
		priority: 0,
		dueAt: null,
		plannedAt: null,
		remindAt: null,
		completedAt: null,
		canceledAt: null,
		projectId: null,
		projectName: null,
		inboxAt: null,
		archivedAt: null,
		createdAt: '2026-05-17T00:00:00.000Z',
		updatedAt: '2026-05-17T00:00:00.000Z',
	}
}

describe('taskBoardOrder', () => {
	it('按 TaskBoard 状态分组的视觉顺序输出任务 id', () => {
		const tasks = [
			createTask('todo-1', 'todo'),
			createTask('doing-1', 'doing'),
			createTask('waiting-1', 'waiting'),
			createTask('todo-2', 'todo'),
		]

		expect(
			getTaskBoardVisualOrderIds(tasks, {
				statusOrder: ['doing', 'todo', 'waiting', 'done', 'canceled'],
			}),
		).toEqual(['doing-1', 'todo-1', 'todo-2', 'waiting-1'])
	})

	it('customSections 存在时按 section 渲染顺序输出任务 id', () => {
		const todo = createTask('todo-1', 'todo')
		const doing = createTask('doing-1', 'doing')

		expect(
			getTaskBoardVisualOrderIds([todo, doing], {
				customSections: [{ tasks: [doing] }, { tasks: [todo] }],
			}),
		).toEqual(['doing-1', 'todo-1'])
	})
})
