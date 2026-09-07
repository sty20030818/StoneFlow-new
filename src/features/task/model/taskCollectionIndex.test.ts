import type { TaskListItem } from '@/shared/types'

import { indexTasksById } from './taskCollectionIndex'

describe('indexTasksById', () => {
	it('对日常任务集合只消费一次输入，并提供常量级身份查找', () => {
		const count = 24
		let visited = 0
		const tasks = {
			*[Symbol.iterator](): Iterator<TaskListItem> {
				for (let index = 0; index < count; index += 1) {
					visited += 1
					yield { id: `task-${index}` } as TaskListItem
				}
			},
		}

		const taskById = indexTasksById(tasks)
		expect(visited).toBe(count)
		expect(taskById.size).toBe(count)

		for (const taskId of ['task-0', `task-${count - 1}`, 'missing']) {
			taskById.get(taskId)
		}
		expect(visited).toBe(count)
	})
})
