import { QueryClient, hashKey } from '@tanstack/react-query'
import type { RunTaskViewInput } from '@/shared/types'
import { taskViewRunInfiniteQueryOptions } from './view.queries'
const { runMock } = vi.hoisted(() => ({ runMock: vi.fn() }))
vi.mock('@/features/view/api/views', () => ({ listViews: vi.fn(), runTaskView: runMock }))

const input: RunTaskViewInput = {
	scope: { type: 'all' },
	viewId: 'view-1',
	filters: { clauses: [{ id: 'a', field: 'status', op: 'is_not', values: ['done', 'canceled'] }] },
	order: {
		groupBy: 'priority',
		subGroupBy: 'project',
		orderBy: 'priority',
		orderDirection: 'desc',
		completedOrder: 'natural',
	},
	dateBasis: '2026-09-13',
}

it('Saved View key 只含成员、有效排序和日期，排除编辑 ID、显隐和折叠', () => {
	const key = (value: RunTaskViewInput) => hashKey(taskViewRunInfiniteQueryOptions(value).queryKey)
	const renamed = {
		...input,
		filters: {
			clauses: [{ ...input.filters!.clauses[0], id: 'other', values: ['canceled', 'done'] }],
		},
		order: { ...input.order, showEmptyGroups: true },
		visibleProperties: [],
		collapsedGroups: ['status:todo'],
	}
	expect(key(renamed)).toBe(key(input))
	expect(key({ ...input, order: { ...input.order, groupBy: 'status' } })).not.toBe(key(input))
	expect(key({ ...input, order: { ...input.order, subGroupBy: 'status' } })).not.toBe(key(input))
	for (const groupBy of ['none', 'project'] as const) {
		const invalid = { ...input, order: { ...input.order, groupBy } }
		expect(key(invalid)).toBe(key({ ...invalid, order: { ...invalid.order, subGroupBy: 'none' } }))
	}
	expect(key({ ...input, dateBasis: '2026-09-14' })).not.toBe(key(input))
	expect(key({ ...input, order: { ...input.order, orderDirection: 'asc' } })).not.toBe(key(input))
	expect(key({ ...input, order: { ...input.order, completedOrder: 'recency' } })).not.toBe(
		key(input),
	)
	for (const orderBy of ['manual', 'smart'] as const) {
		const fixed = { ...input, order: { ...input.order, orderBy, orderDirection: 'desc' as const } }
		expect(key(fixed)).toBe(key({ ...fixed, order: { ...fixed.order, orderDirection: 'asc' } }))
	}
})

it('Saved View 首屏与续页发送同一排序和日期', async () => {
	runMock.mockReset().mockImplementation(({ cursor }: { cursor: string | null }) =>
		Promise.resolve({
			items: [],
			totalCount: cursor ? null : 2,
			groupSummary: cursor ? null : [],
			nextCursor: cursor ? null : 'next',
		}),
	)
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	await client.fetchInfiniteQuery({ ...taskViewRunInfiniteQueryOptions(input), pages: 2 })
	expect(
		runMock.mock.calls.map(([value]) => ({
			order: value.order,
			dateBasis: value.dateBasis,
			cursor: value.cursor,
		})),
	).toEqual([
		{ order: input.order, dateBasis: input.dateBasis, cursor: null },
		{ order: input.order, dateBasis: input.dateBasis, cursor: 'next' },
	])
	client.clear()
})

it('Saved View 没有 Draft 与显式空 Draft 保持不同身份', () => {
	const key = (value: RunTaskViewInput) => hashKey(taskViewRunInfiniteQueryOptions(value).queryKey)
	expect(key({ ...input, filters: undefined })).not.toBe(
		key({ ...input, filters: { clauses: [] } }),
	)
})
