import { createBulkSelectionSnapshot, TASK_BULK_ACTION_IDS } from '@/features/bulk-action'
import type { TaskPlacementTarget } from '@/features/metadata-fields'

import type { TaskBulkAdapter } from './task-bulk-adapter'
import { taskBulkActions } from './task.bulk-actions'

const snapshot = createBulkSelectionSnapshot({
	entity: 'task',
	ids: ['task-a', 'task-b'],
	source: 'command-menu',
	entities: [
		{ id: 'task-a', title: '任务 A', status: 'todo' },
		{ id: 'task-b', title: '任务 B', status: 'done' },
	],
})

describe('taskBulkActions', () => {
	it('setPriority/setStatus/setDate 缺 payload 时不执行 adapter', async () => {
		const adapter = createAdapter()

		for (const actionId of [
			TASK_BULK_ACTION_IDS.setPrioritySelected,
			TASK_BULK_ACTION_IDS.setStatusSelected,
			TASK_BULK_ACTION_IDS.setDateSelected,
		]) {
			const result = await getAction(actionId).run(snapshot, { adapter })
			expect(result).toMatchObject({
				status: 'disabled',
				actionId,
			})
		}

		expect(adapter.updatePriority).not.toHaveBeenCalled()
		expect(adapter.updateStatus).not.toHaveBeenCalled()
		expect(adapter.updateDate).not.toHaveBeenCalled()
	})

	it('setPriority/setStatus/setDate 使用 payload 调用 adapter', async () => {
		const adapter = createAdapter()

		await getAction(TASK_BULK_ACTION_IDS.setPrioritySelected).run(
			snapshot,
			{ adapter },
			{ priority: 3 },
		)
		await getAction(TASK_BULK_ACTION_IDS.setStatusSelected).run(
			snapshot,
			{ adapter },
			{ status: 'doing' },
		)
		await getAction(TASK_BULK_ACTION_IDS.setDateSelected).run(
			snapshot,
			{ adapter },
			{ dueAt: null },
		)

		expect(adapter.updatePriority).toHaveBeenCalledWith(['task-a', 'task-b'], 3)
		expect(adapter.updateStatus).toHaveBeenCalledWith(['task-a', 'task-b'], 'doing')
		expect(adapter.updateDate).toHaveBeenCalledWith(['task-a', 'task-b'], null)
	})

	it('setPlacement 缺 payload 时不执行 adapter', async () => {
		const adapter = createAdapter()

		const result = await getAction(TASK_BULK_ACTION_IDS.setPlacementSelected).run(snapshot, {
			adapter,
		})

		expect(result).toMatchObject({
			status: 'disabled',
			actionId: TASK_BULK_ACTION_IDS.setPlacementSelected,
		})
		expect(adapter.updatePlacement).not.toHaveBeenCalled()
	})

	it('setPlacement 使用最终 target 调用 adapter', async () => {
		const adapter = createAdapter()
		const standaloneTarget: TaskPlacementTarget = { kind: 'standalone', spaceId: 'space-a' }
		const projectTarget: TaskPlacementTarget = {
			kind: 'project',
			spaceId: 'space-a',
			projectId: 'project-a',
		}

		await getAction(TASK_BULK_ACTION_IDS.setPlacementSelected).run(
			snapshot,
			{ adapter },
			{
				target: standaloneTarget,
			},
		)
		await getAction(TASK_BULK_ACTION_IDS.setPlacementSelected).run(
			snapshot,
			{ adapter },
			{
				target: projectTarget,
			},
		)

		expect(adapter.updatePlacement).toHaveBeenNthCalledWith(
			1,
			['task-a', 'task-b'],
			standaloneTarget,
		)
		expect(adapter.updatePlacement).toHaveBeenNthCalledWith(2, ['task-a', 'task-b'], projectTarget)
	})

	it('archive/delete 成功时标记 shouldClearSelection', async () => {
		const adapter = createAdapter()

		await expect(
			getAction(TASK_BULK_ACTION_IDS.archiveSelected).run(snapshot, { adapter }),
		).resolves.toMatchObject({
			status: 'success',
			shouldClearSelection: true,
		})
		await expect(
			getAction(TASK_BULK_ACTION_IDS.deleteSelected).run(snapshot, { adapter }),
		).resolves.toMatchObject({
			status: 'success',
			shouldClearSelection: true,
		})
	})

	it('部分失败时返回 partial 且不清空 selection', async () => {
		const adapter = createAdapter({
			archive: vi.fn<TaskBulkAdapter['archive']>(() =>
				Promise.resolve({
					requestedIds: ['task-a', 'task-b'],
					succeededIds: ['task-a'],
					failedIds: ['task-b'],
					skippedIds: [],
				}),
			),
		})

		await expect(
			getAction(TASK_BULK_ACTION_IDS.archiveSelected).run(snapshot, { adapter }),
		).resolves.toMatchObject({
			status: 'partial',
			shouldClearSelection: false,
			succeededIds: ['task-a'],
			failedIds: ['task-b'],
		})
	})
})

function getAction(actionId: string) {
	const action = taskBulkActions.find((item) => item.id === actionId)
	if (!action) {
		throw new Error(`missing test action: ${actionId}`)
	}
	return action
}

function createAdapter(overrides: Partial<TaskBulkAdapter> = {}): TaskBulkAdapter {
	const report = {
		requestedIds: ['task-a', 'task-b'],
		succeededIds: ['task-a', 'task-b'],
		failedIds: [],
		skippedIds: [],
	}

	return {
		complete: vi.fn<TaskBulkAdapter['complete']>(() => Promise.resolve(report)),
		archive: vi.fn<TaskBulkAdapter['archive']>(() => Promise.resolve(report)),
		delete: vi.fn<TaskBulkAdapter['delete']>(() => Promise.resolve(report)),
		updatePriority: vi.fn<TaskBulkAdapter['updatePriority']>(() => Promise.resolve(report)),
		updateStatus: vi.fn<TaskBulkAdapter['updateStatus']>(() => Promise.resolve(report)),
		updateDate: vi.fn<TaskBulkAdapter['updateDate']>(() => Promise.resolve(report)),
		updatePlacement: vi.fn<TaskBulkAdapter['updatePlacement']>(() => Promise.resolve(report)),
		...overrides,
	}
}
