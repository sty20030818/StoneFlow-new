import { describe, expect, it } from 'vitest'

import { resolveTaskDisplayOptions } from '@/features/display-options/core'
import type { TaskQueryItem } from '@/shared/types'

import { applyTaskDisplayOptionsToTasks } from './index'

function createTask(
	overrides: Partial<TaskQueryItem> & Pick<TaskQueryItem, 'id' | 'title'>,
): TaskQueryItem {
	return {
		group: overrides.group ?? { kind: 'none' },
		subGroup: overrides.subGroup ?? { kind: 'none' },
		id: overrides.id,
		title: overrides.title,
		spaceId: overrides.spaceId ?? 'space-1',
		spaceName: overrides.spaceName ?? 'Workspace',
		spaceSlug: overrides.spaceSlug ?? 'workspace',
		projectId: overrides.projectId ?? null,
		projectName: overrides.projectName ?? null,
		status: overrides.status ?? 'todo',
		statusChangedAt: overrides.statusChangedAt ?? '2026-06-28T10:00:00.000Z',
		priority: overrides.priority ?? 0,
		dueAt: overrides.dueAt ?? null,
		plannedAt: overrides.plannedAt ?? null,
		remindAt: overrides.remindAt ?? null,
		completedAt: overrides.completedAt ?? null,
		canceledAt: overrides.canceledAt ?? null,
		archivedAt: overrides.archivedAt ?? null,
		createdAt: overrides.createdAt ?? '2026-06-28T09:00:00.000Z',
		updatedAt: overrides.updatedAt ?? '2026-06-28T11:00:00.000Z',
	}
}

describe('task-display adapters', () => {
	it('跨页子组按完整父路径合并，保留每个叶组的输入顺序与唯一选择顺序', () => {
		const groupA = { kind: 'project', projectId: 'a', projectName: '同名项目' } as const
		const groupB = { kind: 'project', projectId: 'b', projectName: '同名项目' } as const
		const today = { kind: 'due', bucket: 'today' } as const
		const later = { kind: 'due', bucket: 'later' } as const
		const page1 = [
			createTask({
				id: 'a-open',
				title: 'A',
				group: groupA,
				subGroup: today,
				dueAt: '2000-01-01T00:00:00Z',
			}),
		]
		const page2 = [
			createTask({ id: 'a-done', title: 'B', group: groupA, subGroup: today, status: 'done' }),
			createTask({ id: 'a-later', title: 'C', group: groupA, subGroup: later }),
			createTask({ id: 'b-today', title: 'D', group: groupB, subGroup: today }),
		]
		const result = applyTaskDisplayOptionsToTasks({
			items: [...page1, ...page2],
			options: resolveTaskDisplayOptions({
				pageKey: 'task:all',
				personalOverride: { groupBy: 'project', subGroupBy: 'due' },
			}),
		})
		expect(
			result.sections.map(({ key, label, tasks, children }) => ({
				key,
				label,
				ids: tasks.map(({ id }) => id),
				children: children?.map(({ key, label, tasks }) => ({
					key,
					label,
					ids: tasks.map(({ id }) => id),
				})),
			})),
		).toEqual([
			{
				key: 'project:id:a',
				label: '同名项目',
				ids: ['a-open', 'a-done', 'a-later'],
				children: [
					{
						key: JSON.stringify(['project:id:a', 'due:today']),
						label: '今天',
						ids: ['a-open', 'a-done'],
					},
					{ key: JSON.stringify(['project:id:a', 'due:later']), label: '更晚', ids: ['a-later'] },
				],
			},
			{
				key: 'project:id:b',
				label: '同名项目',
				ids: ['b-today'],
				children: [
					{ key: JSON.stringify(['project:id:b', 'due:today']), label: '今天', ids: ['b-today'] },
				],
			},
		])
		expect(result.selectionOrderIds).toEqual(['a-open', 'a-done', 'a-later', 'b-today'])
	})

	it('状态动作元数据只属于自身为状态的层级', () => {
		const tasks = [
			createTask({
				id: 'a',
				title: 'A',
				group: { kind: 'priority', priority: 4 },
				subGroup: { kind: 'status', status: 'doing' },
			}),
		]
		const result = applyTaskDisplayOptionsToTasks({
			items: tasks,
			options: resolveTaskDisplayOptions({
				pageKey: 'task:all',
				personalOverride: { groupBy: 'priority', subGroupBy: 'status' },
			}),
		})
		expect(result.sections[0].status).toBeUndefined()
		expect(result.sections[0].children?.[0]).toMatchObject({
			status: 'doing',
			label: '进行中',
			tasks,
		})
	})
	it('smart 投影保留统一查询返回顺序，不对已加载窗口再排序', () => {
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
		})

		expect(result.orderedItems.map((task) => task.id)).toEqual([
			'todo-later',
			'doing-today',
			'todo-overdue',
		])
	})

	it('manual 投影不因元数据更新时间改变仓储位置顺序', () => {
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
		})

		expect(result.orderedItems.map((task) => task.id)).toEqual(['older', 'newer'])
	})

	it('priority 分组与状态组共用 sections，并保持组内排序', () => {
		const tasks = [
			createTask({
				id: 'p4',
				title: 'P4',
				priority: 4,
				group: { kind: 'priority', priority: 4 },
				updatedAt: '2026-06-28T12:00:00.000Z',
			}),
			createTask({
				id: 'p2',
				title: 'P2',
				priority: 2,
				group: { kind: 'priority', priority: 2 },
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
		})

		expect(result.sections.map((section) => section.key)).toEqual(['priority:4', 'priority:2'])
		expect(result.sections.every((section) => section.status === undefined)).toBe(true)
	})

	it('status 分组提供统一身份和动作元数据', () => {
		const tasks = [
			createTask({
				id: 'a',
				title: 'A',
				status: 'doing',
				group: { kind: 'status', status: 'doing' },
			}),
		]
		const result = applyTaskDisplayOptionsToTasks({
			items: tasks,
			options: resolveTaskDisplayOptions({ pageKey: 'task:all' }),
		})

		expect(result.sections).toEqual([
			{ key: 'status:doing', label: '进行中', status: 'doing', tasks },
		])
	})

	it('完成项投影同样只保留统一查询返回顺序', () => {
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
		})

		expect(result.orderedItems.map((task) => task.id)).toEqual(['old-completed', 'new-completed'])
	})

	it('日期身份来自查询冻结的 bucket，不按当前时钟重新分类', () => {
		const tasks = [
			createTask({
				id: 'today',
				title: 'Today',
				dueAt: '2000-01-01T00:00:00Z',
				group: { kind: 'due', bucket: 'today' },
			}),
		]
		const result = applyTaskDisplayOptionsToTasks({
			items: tasks,
			options: resolveTaskDisplayOptions({
				pageKey: 'task:all',
				personalOverride: { groupBy: 'due' },
			}),
		})
		expect(result.sections).toEqual([{ key: 'due:today', label: '今天', tasks }])
	})

	it('同一主组跨页合并，项目 key 不依赖标签且不再按 locale 重排', () => {
		const tasks = [
			createTask({
				id: 'p1-a',
				title: 'A',
				group: { kind: 'project', projectId: 'p1', projectName: 'Z 项目' },
			}),
			createTask({
				id: 'p1-b',
				title: 'B',
				group: { kind: 'project', projectId: 'p1', projectName: 'Z 项目' },
			}),
			createTask({
				id: 'p2-a',
				title: 'C',
				group: { kind: 'project', projectId: 'p2', projectName: 'a 项目' },
			}),
			createTask({
				id: 'standalone',
				title: 'D',
				group: { kind: 'project', projectId: null, projectName: null },
			}),
		]
		const result = applyTaskDisplayOptionsToTasks({
			items: tasks,
			options: resolveTaskDisplayOptions({
				pageKey: 'task:all',
				personalOverride: { groupBy: 'project' },
			}),
		})
		expect(
			result.sections.map(({ key, label, tasks: members }) => ({
				key,
				label,
				ids: members.map(({ id }) => id),
			})),
		).toEqual([
			{ key: 'project:id:p1', label: 'Z 项目', ids: ['p1-a', 'p1-b'] },
			{ key: 'project:id:p2', label: 'a 项目', ids: ['p2-a'] },
			{ key: 'project:none', label: '独立事项', ids: ['standalone'] },
		])
	})
})
