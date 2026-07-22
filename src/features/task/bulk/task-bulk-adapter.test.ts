import { emitEvent } from '@/shared/events'
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

	it('多 id mutation 使用一次原子 command 并只刷新一次', async () => {
		const refreshLoadedSlices = vi.fn<() => Promise<void>>(() => Promise.resolve())
		const bulkUpdateTasks = vi.fn(() =>
			Promise.resolve({ taskIds: ['task-a', 'task-b'], operationId: 'operation-1' }),
		)
		const adapter = createTaskBulkAdapter({
			refreshLoadedSlices,
			bulkUpdateTasks,
		})

		const result = await adapter.updateStatus(['task-a', 'task-b'], 'doing')

		expect(result).toMatchObject({
			succeededIds: ['task-a', 'task-b'],
			failedIds: [],
		})
		expect(bulkUpdateTasks).toHaveBeenCalledWith(['task-a', 'task-b'], {
			kind: 'setStatus',
			status: 'doing',
		})
		expect(refreshLoadedSlices).toHaveBeenCalledTimes(1)
	})

	it('原子 command 失败时全部失败且不刷新', async () => {
		const refreshLoadedSlices = vi.fn<() => Promise<void>>(() => Promise.resolve())
		const bulkUpdateTasks = vi.fn(() => Promise.reject(new Error('boom')))
		const adapter = createTaskBulkAdapter({
			refreshLoadedSlices,
			bulkUpdateTasks,
		})

		const result = await adapter.updatePriority(['task-a', 'task-b', 'task-c'], 3)

		expect(result).toEqual({
			requestedIds: ['task-a', 'task-b', 'task-c'],
			succeededIds: [],
			failedIds: ['task-a', 'task-b', 'task-c'],
			skippedIds: [],
		})
		expect(refreshLoadedSlices).not.toHaveBeenCalled()
	})

	it('archive/delete 触发 task 与 lifecycle 事件', async () => {
		const refreshLoadedSlices = vi.fn<() => Promise<void>>(() => Promise.resolve())
		const bulkUpdateTasks = vi.fn((ids: string[]) =>
			Promise.resolve({ taskIds: ids, operationId: 'operation-1' }),
		)
		const adapter = createTaskBulkAdapter({
			bulkUpdateTasks,
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
		const bulkUpdateTasks = vi.fn((ids: string[]) =>
			Promise.resolve({ taskIds: ids, operationId: 'operation-1' }),
		)
		const adapter = createTaskBulkAdapter({
			refreshLoadedSlices,
			bulkUpdateTasks,
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

		expect(bulkUpdateTasks).toHaveBeenNthCalledWith(1, ['task-a'], {
			kind: 'setPlacement',
			placement: { kind: 'project', spaceId: 'space-a', projectId: 'project-a' },
		})
		expect(bulkUpdateTasks).toHaveBeenNthCalledWith(2, ['task-b'], {
			kind: 'setPlacement',
			placement: { kind: 'noProject', spaceId: 'space-a' },
		})
		expect(refreshLoadedSlices).toHaveBeenCalledTimes(3)
	})
})
