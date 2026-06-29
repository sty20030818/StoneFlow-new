import { describe, expect, it } from 'vitest'

import { resolveTaskDisplayOptions } from '@/features/display-options/core'
import type { TaskListItem } from '@/shared/types'

import {
	applyTaskDisplayOptionsToTasks,
	createTaskDisplayApplyContext,
	getTaskUrgencyBucket,
	resolveTaskDateBucket,
} from './index'

function createTask(
	overrides: Partial<TaskListItem> & Pick<TaskListItem, 'id' | 'title'>,
): TaskListItem {
	return {
		id: overrides.id,
		title: overrides.title,
		spaceId: overrides.spaceId ?? 'space-1',
		spaceName: overrides.spaceName ?? 'Workspace',
		spaceSlug: overrides.spaceSlug ?? 'workspace',
		projectId: overrides.projectId ?? null,
		projectName: overrides.projectName ?? null,
		inboxAt: overrides.inboxAt ?? null,
		note: overrides.note ?? null,
		status: overrides.status ?? 'todo',
		statusChangedAt: overrides.statusChangedAt ?? '2026-06-28T10:00:00.000Z',
		priority: overrides.priority ?? 0,
		dueAt: overrides.dueAt ?? null,
		scheduledAt: overrides.scheduledAt ?? null,
		reminderAt: overrides.reminderAt ?? null,
		completedAt: overrides.completedAt ?? null,
		canceledAt: overrides.canceledAt ?? null,
		archivedAt: overrides.archivedAt ?? null,
		createdAt: overrides.createdAt ?? '2026-06-28T09:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-28T11:00:00.000Z',
	}
}

describe('task-display adapters', () => {
	it('smart 排序优先 doing，再比较紧迫度和优先级', () => {
		const tasks = [
			createTask({
				id: 'todo-later',
				title: 'Todo later',
				status: 'todo',
				dueAt: '2026-07-02T09:00:00.000Z',
				priority: 1,
			}),
			createTask({
				id: 'doing-today',
				title: 'Doing today',
				status: 'doing',
				dueAt: '2026-06-28T09:00:00.000Z',
				priority: 0,
			}),
			createTask({
				id: 'todo-overdue',
				title: 'Todo overdue',
				status: 'todo',
				dueAt: '2026-06-20T09:00:00.000Z',
				priority: 4,
			}),
		]

		const result = applyTaskDisplayOptionsToTasks({
			items: tasks,
			options: resolveTaskDisplayOptions({ pageKey: 'task:all' }),
			context: createTaskDisplayApplyContext('task:all'),
		})

		expect(result.orderedItems.map((task) => task.id)).toEqual([
			'doing-today',
			'todo-overdue',
			'todo-later',
		])
	})

	it('project-detail 的 manual 模式会保留 updatedAt 倒序兜底', () => {
		const tasks = [
			createTask({
				id: 'older',
				title: 'Older',
				updatedAt: '2026-06-25T09:00:00.000Z',
			}),
			createTask({
				id: 'newer',
				title: 'Newer',
				updatedAt: '2026-06-28T09:00:00.000Z',
			}),
		]

		const result = applyTaskDisplayOptionsToTasks({
			items: tasks,
			options: resolveTaskDisplayOptions({ pageKey: 'task:project-detail' }),
			context: createTaskDisplayApplyContext('task:project-detail'),
		})

		expect(result.orderedItems.map((task) => task.id)).toEqual(['newer', 'older'])
	})

	it('priority 分组会输出 customSections，并保持组内排序', () => {
		const tasks = [
			createTask({
				id: 'p4',
				title: 'P4',
				priority: 4,
				updatedAt: '2026-06-28T12:00:00.000Z',
			}),
			createTask({
				id: 'p2',
				title: 'P2',
				priority: 2,
			}),
		]

		const options = resolveTaskDisplayOptions({
			pageKey: 'task:all',
			personalOverride: {
				groupBy: 'priority',
				orderBy: 'updatedAt',
				orderDirection: 'desc',
			},
		})
		const result = applyTaskDisplayOptionsToTasks({
			items: tasks,
			options,
			context: createTaskDisplayApplyContext('task:all'),
		})

		expect(result.sections.map((section) => section.key)).toEqual(['priority:4', 'priority:2'])
		expect(result.boardPatch.customSections?.map((section) => section.key)).toEqual([
			'priority:4',
			'priority:2',
		])
	})

	it('status 分组不会生成 customSections，而是复用 board 的 statusOrder', () => {
		const tasks = [createTask({ id: 'a', title: 'A', status: 'doing' })]
		const result = applyTaskDisplayOptionsToTasks({
			items: tasks,
			options: resolveTaskDisplayOptions({ pageKey: 'task:all' }),
			context: createTaskDisplayApplyContext('task:all'),
		})

		expect(result.boardPatch.customSections).toBeUndefined()
		expect(result.boardPatch.statusOrder).toEqual(['doing', 'todo', 'waiting', 'done', 'canceled'])
	})

	it('completed 页面按 completedAt 倒序', () => {
		const tasks = [
			createTask({
				id: 'old-completed',
				title: 'Old completed',
				status: 'done',
				completedAt: '2026-06-26T10:00:00.000Z',
			}),
			createTask({
				id: 'new-completed',
				title: 'New completed',
				status: 'done',
				completedAt: '2026-06-28T10:00:00.000Z',
			}),
		]

		const result = applyTaskDisplayOptionsToTasks({
			items: tasks,
			options: resolveTaskDisplayOptions({ pageKey: 'task:completed' }),
			context: createTaskDisplayApplyContext('task:completed'),
		})

		expect(result.orderedItems.map((task) => task.id)).toEqual(['new-completed', 'old-completed'])
	})

	it('日期 bucket 能区分 none 与 later', () => {
		expect(resolveTaskDateBucket(null)).toBe('none')
		expect(resolveTaskDateBucket('2099-06-30T10:00:00.000Z')).toBe('later')
	})

	it('smart urgency bucket 会识别无日期任务', () => {
		expect(
			getTaskUrgencyBucket(
				createTask({
					id: 'none',
					title: 'No date',
				}),
			),
		).toBe('none')
	})
})
