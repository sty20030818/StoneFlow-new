import { emitEvent } from '@/shared/events'
import type { TaskDetail } from '@/shared/types'
import { createBulkSelectionSnapshot } from '@/features/bulk-action'
import type { TaskPlacementTarget } from '@/features/metadata-fields'

import { createTaskBulkAdapter, resolveBulkCompleteStatus } from './task-bulk-adapter'

vi.mock('@/shared/events', () => ({
	emitEvent: vi.fn<(event: unknown) => void>(),
}))

describe('TaskBulkAdapter', () => {
	it('complete 混合状态时整体置 done，全部完成/取消时整体置 todo', () => {
		const mixedSnapshot = createBulkSelectionSnapshot({
			entity: 'task',
			ids: ['task-a', 'task-b'],
			source: 'command-menu',
			entities: [
				{ id: 'task-a', title: '任务 A', status: 'todo' },
				{ id: 'task-b', title: '任务 B', status: 'done' },
			],
		})
		const completedSnapshot = createBulkSelectionSnapshot({
			entity: 'task',
			ids: ['task-a', 'task-b'],
			source: 'command-menu',
			entities: [
				{ id: 'task-a', title: '任务 A', status: 'done' },
				{ id: 'task-b', title: '任务 B', status: 'canceled' },
			],
		})

		expect(resolveBulkCompleteStatus(mixedSnapshot)).toBe('done')
		expect(resolveBulkCompleteStatus(completedSnapshot)).toBe('todo')
	})

	it('多 id mutation 后只刷新一次', async () => {
		const refreshLoadedSlices = vi.fn<() => Promise<void>>(() => Promise.resolve())
		const updateTask = vi.fn<(input: { taskId: string }) => Promise<TaskDetail>>((input) =>
			Promise.resolve(createTaskDetail(input.taskId)),
		)
		const adapter = createTaskBulkAdapter({
			refreshLoadedSlices,
			updateTask: updateTask as never,
		})

		const result = await adapter.updateStatus(['task-a', 'task-b'], 'doing')

		expect(result).toMatchObject({
			succeededIds: ['task-a', 'task-b'],
			failedIds: [],
		})
		expect(updateTask).toHaveBeenCalledTimes(2)
		expect(refreshLoadedSlices).toHaveBeenCalledTimes(1)
	})

	it('单个 id 失败时返回 partial 所需的 failedIds，且不中断其余 id', async () => {
		const refreshLoadedSlices = vi.fn<() => Promise<void>>(() => Promise.resolve())
		const updateTask = vi.fn<(input: { taskId: string }) => Promise<TaskDetail>>((input) => {
			if (input.taskId === 'task-b') {
				return Promise.reject(new Error('boom'))
			}
			return Promise.resolve(createTaskDetail(input.taskId))
		})
		const adapter = createTaskBulkAdapter({
			refreshLoadedSlices,
			updateTask: updateTask as never,
		})

		const result = await adapter.updatePriority(['task-a', 'task-b', 'task-c'], 3)

		expect(result).toEqual({
			requestedIds: ['task-a', 'task-b', 'task-c'],
			succeededIds: ['task-a', 'task-c'],
			failedIds: ['task-b'],
			skippedIds: [],
		})
		expect(updateTask).toHaveBeenCalledTimes(3)
		expect(refreshLoadedSlices).toHaveBeenCalledTimes(1)
	})

	it('archive/delete 触发 task 与 lifecycle 事件', async () => {
		const refreshLoadedSlices = vi.fn<() => Promise<void>>(() => Promise.resolve())
		const archiveTask = vi.fn<(taskId: string) => Promise<TaskDetail>>((taskId) =>
			Promise.resolve(createTaskDetail(taskId)),
		)
		const deleteTask = vi.fn<(taskId: string) => Promise<TaskDetail>>((taskId) =>
			Promise.resolve(createTaskDetail(taskId)),
		)
		const adapter = createTaskBulkAdapter({
			archiveTask: archiveTask as never,
			deleteTask: deleteTask as never,
			refreshLoadedSlices,
		})

		await adapter.archive(['task-a'])
		await adapter.delete(['task-b'])

		expect(emitEvent).toHaveBeenCalledWith({
			type: 'task:updated',
			payload: { taskId: 'task-a' },
		})
		expect(emitEvent).toHaveBeenCalledWith({
			type: 'lifecycle:changed',
			payload: { entityType: 'task', entityId: 'task-a', operation: 'archive' },
		})
		expect(emitEvent).toHaveBeenCalledWith({
			type: 'task:deleted',
			payload: { taskId: 'task-b' },
		})
		expect(emitEvent).toHaveBeenCalledWith({
			type: 'lifecycle:changed',
			payload: { entityType: 'task', entityId: 'task-b', operation: 'delete' },
		})
	})

	it('updatePlacement 走统一 placement mutation 路径', async () => {
		const refreshLoadedSlices = vi.fn<() => Promise<void>>(() => Promise.resolve())
		const updateTask = vi.fn<
			(input: {
				taskId: string
				placement?: {
					kind: 'inbox' | 'noProject' | 'project'
					spaceId: string
					projectId?: string | null
				}
			}) => Promise<TaskDetail>
		>((input) => Promise.resolve(createTaskDetail(input.taskId)))
		const adapter = createTaskBulkAdapter({
			refreshLoadedSlices,
			updateTask: updateTask as never,
		})
		const inboxTarget: TaskPlacementTarget = { kind: 'inbox', spaceId: 'space-a' }
		const projectTarget: TaskPlacementTarget = {
			kind: 'project',
			spaceId: 'space-a',
			projectId: 'project-a',
		}
		const noProjectTarget: TaskPlacementTarget = { kind: 'no_project', spaceId: 'space-a' }

		await adapter.updatePlacement(['task-a'], projectTarget)
		await adapter.updatePlacement(['task-b'], inboxTarget)
		await adapter.updatePlacement(['task-c'], noProjectTarget)

		expect(updateTask).toHaveBeenCalledWith({
			taskId: 'task-a',
			placement: { kind: 'project', spaceId: 'space-a', projectId: 'project-a' },
		})
		expect(updateTask).toHaveBeenCalledWith({
			taskId: 'task-b',
			placement: { kind: 'inbox', spaceId: 'space-a' },
		})
		expect(updateTask).toHaveBeenCalledWith({
			taskId: 'task-c',
			placement: { kind: 'noProject', spaceId: 'space-a' },
		})
		expect(refreshLoadedSlices).toHaveBeenCalledTimes(3)
	})
})

function createTaskDetail(taskId: string): TaskDetail {
	return {
		id: taskId,
		spaceId: 'space-a',
		spaceName: 'Space A',
		spaceSlug: 'space-a',
		projectId: null,
		projectName: null,
		inboxAt: null,
		title: taskId,
		note: null,
		status: 'todo',
		statusChangedAt: '2026-05-17T00:00:00.000Z',
		priority: 0,
		dueAt: null,
		scheduledAt: null,
		reminderAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-05-17T00:00:00.000Z',
		updatedAt: '2026-05-17T00:00:00.000Z',
		sortOrder: 0,
		deletedAt: null,
	}
}
