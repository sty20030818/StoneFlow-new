import { createView, listViews, runTaskView, updateView } from './views'

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }))

const windowInput = {
	order: {
		groupBy: 'priority' as const,
		subGroupBy: 'due' as const,
		orderBy: 'priority' as const,
		orderDirection: 'desc' as const,
		completedOrder: 'natural' as const,
	},
	dateBasis: '2026-09-13',
}

const definition = {
	scope: { type: 'all' as const },
	context: { kind: 'all' as const },
	baseViewKey: 'active' as const,
	filters: { clauses: [] },
}
const record = {
	...definition,
	id: 'view-1',
	name: '保存视图',
	position: 0,
	createdAt: '2026-09-13T00:00:00Z',
	updatedAt: '2026-09-13T00:00:00Z',
}

beforeEach(() => invokeMock.mockReset())

it('保存视图返回查询产生的分组身份，不在 IPC 适配时丢失', async () => {
	const group = { kind: 'due', bucket: 'today' }
	const subGroup = { kind: 'status', status: 'todo' }
	invokeMock.mockResolvedValue({
		view: record,
		items: [{ id: 'task-1', group, subGroup }],
		totalCount: 1,
	})
	const result = await runTaskView({ scope: definition.scope, viewId: record.id, ...windowInput })
	expect(result.items[0].group).toEqual(group)
	expect(result.items[0].subGroup).toEqual(subGroup)
})

it('没有可信身份的列表响应报读取失败，不生成无法清理的记录', async () => {
	invokeMock.mockResolvedValue([{ ...record, id: undefined }])
	await expect(listViews({ type: 'all' })).rejects.toThrow('身份或元数据')
})

it('写入和运行响应不得把不可用定义当成功或空筛选', async () => {
	const unavailable = { ...record, definitionError: '项目范围已变化', filters: undefined }
	invokeMock.mockResolvedValue(unavailable)
	await expect(createView({ name: record.name, ...definition })).rejects.toThrow('项目范围已变化')
	await expect(updateView({ viewId: record.id, name: '新名称' })).rejects.toThrow('项目范围已变化')
	invokeMock.mockResolvedValue({
		view: { ...record, filters: undefined },
		items: [],
		totalCount: 0,
	})
	await expect(
		runTaskView({ scope: definition.scope, viewId: record.id, ...windowInput }),
	).rejects.toThrow('无效 filters')
})

it('非法筛选沿用逐条不可用恢复，正常记录保留，非法写入不发 IPC', async () => {
	const filters = {
		clauses: [{ id: 'bad', field: 'status', op: 'is', values: ['todo', 'unknown'] }],
	}
	invokeMock.mockResolvedValue([record, { ...record, id: 'invalid-view', filters }])
	const items = await listViews({ type: 'all' })
	expect(items[0]).toMatchObject({ id: record.id, filters: definition.filters })
	expect(items[1]).toMatchObject({
		id: 'invalid-view',
		definitionError: expect.stringContaining('筛选条件无效'),
	})
	expect(items[1]).not.toHaveProperty('filters')
	invokeMock.mockClear()
	await expect(
		createView({ name: '无效', ...definition, filters: filters as never }),
	).rejects.toThrow('筛选条件无效')
	expect(invokeMock).not.toHaveBeenCalled()
})

it('运行保存视图将当前窗口排序与日期透传 IPC，不写入 View 定义', async () => {
	invokeMock.mockResolvedValue({ view: record, items: [], totalCount: 0 })
	await runTaskView({ scope: definition.scope, viewId: record.id, ...windowInput })
	expect(invokeMock).toHaveBeenCalledWith('run_task_view', {
		input: {
			scope: definition.scope,
			viewId: record.id,
			filters: undefined,
			cursor: null,
			...windowInput,
		},
	})
})
