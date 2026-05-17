import {
	BulkActionRegistry,
	BulkActionRuntime,
	createBulkActionResult,
	createBulkSelectionSnapshot,
	type BulkAction,
	type BulkActionResult,
	type BulkSelectionSnapshot,
} from '@/features/bulk-action/core'

const snapshot = createBulkSelectionSnapshot({
	entity: 'task',
	ids: ['task-a', 'task-b'],
	source: 'command-menu',
	createdAt: 1,
})

describe('BulkActionRegistry', () => {
	it('重复 bulk action id 会在注册阶段失败', () => {
		const action = createAction('task.duplicate')

		expect(() => new BulkActionRegistry([action, action])).toThrow(
			'Duplicate bulk action id: task.duplicate',
		)
	})

	it('支持 get、getAll 和 registerMany', () => {
		const first = createAction('task.first')
		const second = createAction('task.second')
		const registry = new BulkActionRegistry([first])

		registry.registerMany([second])

		expect(registry.get(first.id)).toBe(first)
		expect(registry.get(second.id)).toBe(second)
		expect(registry.get('task.missing')).toBeNull()
		expect(registry.getAll()).toEqual([first, second])
	})
})

describe('createBulkSelectionSnapshot', () => {
	it('复制 ids 和 entities，外部数组变化不会影响快照', () => {
		const ids = ['task-a']
		const entities = [{ id: 'task-a', title: '任务 A' }]
		const frozenSnapshot = createBulkSelectionSnapshot({
			entity: 'task',
			ids,
			entities,
			source: 'bulk-bar',
			createdAt: 2,
		})

		ids.push('task-b')
		entities[0].title = '已修改'

		expect(frozenSnapshot).toEqual({
			entity: 'task',
			ids: ['task-a'],
			entities: [{ id: 'task-a', title: '任务 A' }],
			source: 'bulk-bar',
			createdAt: 2,
		})
	})
})

describe('BulkActionRuntime', () => {
	it('empty ids 返回 disabled，且不执行 action', async () => {
		const run = vi.fn<BulkAction['run']>()
		const action = createAction('task.empty', { run })
		const runtime = createRuntime(action)
		const emptySnapshot = createBulkSelectionSnapshot({
			entity: 'task',
			ids: [],
			source: 'command-menu',
			createdAt: 3,
		})

		await expect(runtime.execute(action.id, emptySnapshot)).resolves.toMatchObject({
			status: 'disabled',
			actionId: action.id,
			entity: 'task',
			requestedIds: [],
			succeededIds: [],
			failedIds: [],
			skippedIds: [],
			message: '需要先选择对象',
		})
		expect(run).not.toHaveBeenCalled()
	})

	it('未知 action 返回 failed，不向调用方抛错', async () => {
		const runtime = new BulkActionRuntime({ registry: new BulkActionRegistry() })

		const result = await runtime.execute('task.missing', snapshot)

		expect(result).toMatchObject({
			status: 'failed',
			actionId: 'task.missing',
			entity: 'task',
			requestedIds: ['task-a', 'task-b'],
		})
		expect(result.error).toBeInstanceOf(Error)
	})

	it('不需要确认的 action 直接执行并返回 success', async () => {
		const run = vi.fn<(nextSnapshot: BulkSelectionSnapshot) => Promise<BulkActionResult>>(
			(nextSnapshot) =>
				Promise.resolve(
					createBulkActionResult({
						status: 'success',
						actionId: 'task.success',
						snapshot: nextSnapshot,
						succeededIds: nextSnapshot.ids,
					}),
				),
		)
		const action = createAction('task.success', { run })
		const runtime = createRuntime(action)

		await expect(runtime.execute(action.id, snapshot)).resolves.toMatchObject({
			status: 'success',
			actionId: action.id,
			succeededIds: ['task-a', 'task-b'],
		})
		expect(run).toHaveBeenCalledWith(snapshot, {})
	})

	it('requiresConfirm 的 action 在取消后返回 cancelled 且不执行', async () => {
		const run = vi.fn<BulkAction['run']>()
		const requestConfirm = vi.fn<() => Promise<boolean>>(() => Promise.resolve(false))
		const action = createAction('task.confirm', {
			requiresConfirm: true,
			run,
		})
		const runtime = new BulkActionRuntime({
			registry: new BulkActionRegistry([action]),
			requestConfirm,
		})

		await expect(runtime.execute(action.id, snapshot)).resolves.toMatchObject({
			status: 'cancelled',
			actionId: action.id,
		})
		expect(requestConfirm).toHaveBeenCalledWith({
			action,
			snapshot,
			copy: {
				title: action.label,
				description: '将对 2 个对象执行此操作。',
				confirmLabel: '确认',
			},
		})
		expect(run).not.toHaveBeenCalled()
	})

	it('action 抛错时返回 failed 并通知错误处理器', async () => {
		const error = new Error('boom')
		const onError =
			vi.fn<(error: unknown, action: BulkAction, snapshot: BulkSelectionSnapshot) => void>()
		const action = createAction('task.failed', {
			run: () => {
				throw error
			},
		})
		const runtime = new BulkActionRuntime({
			registry: new BulkActionRegistry([action]),
			onError,
		})

		await expect(runtime.execute(action.id, snapshot)).resolves.toMatchObject({
			status: 'failed',
			actionId: action.id,
			error,
		})
		expect(onError).toHaveBeenCalledWith(error, action, snapshot)
	})
})

function createRuntime(action: BulkAction) {
	return new BulkActionRuntime({
		registry: new BulkActionRegistry([action]),
	})
}

function createAction(id: string, overrides: Partial<BulkAction> = {}): BulkAction {
	return {
		id,
		entity: 'task',
		label: id,
		intent: 'update',
		run: (nextSnapshot) =>
			Promise.resolve(
				createBulkActionResult({
					status: 'success',
					actionId: id,
					snapshot: nextSnapshot,
					succeededIds: nextSnapshot.ids,
				}),
			),
		...overrides,
	}
}
