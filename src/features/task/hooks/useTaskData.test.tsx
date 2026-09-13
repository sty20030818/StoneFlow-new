import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

import type {
	RunTaskQueryInput,
	RunTaskQueryResult,
	TaskQueryItem,
	TaskViewBaseKey,
} from '@/shared/types'

import { useTaskBoardPagination, useTaskQueryData } from './useTaskData'

const windowInput = {
	order: {
		groupBy: 'priority' as const,
		subGroupBy: 'none' as const,
		orderBy: 'priority' as const,
		orderDirection: 'desc' as const,
		completedOrder: 'natural' as const,
	},
	dateBasis: '2026-09-13',
}

const runTaskQueryMock = vi.hoisted(() => vi.fn())

vi.mock('@/features/task/api/tasks', () => ({
	countTaskQuery: vi.fn(),
	getTaskDetail: vi.fn(),
	runTaskQuery: runTaskQueryMock,
}))

type PaginationProbeProps = Parameters<typeof useTaskBoardPagination>[0]

describe('useTaskBoardPagination', () => {
	it('把 Query 状态收口为唯一分页状态机并阻止重复请求', async () => {
		const fetchNextPage = vi.fn(async () => undefined)
		const initialProps: PaginationProbeProps = {
			sourceKey: 'query-a',
			loadedPageCount: 0,
			fetchNextPage,
			hasNextPage: false,
			isFetchingNextPage: false,
			isFetchNextPageError: false,
			error: null,
			totalCount: null,
		}
		const { result, rerender } = renderHook(
			(props: PaginationProbeProps) => useTaskBoardPagination(props),
			{ initialProps },
		)

		expect(result.current).toEqual({
			sourceKey: 'query-a',
			loadedPageCount: 0,
			state: 'exhausted',
		})

		rerender({ ...initialProps, hasNextPage: true, totalCount: 10 })
		expect(result.current.state).toBe('idle')
		if (!('fetchNextPage' in result.current)) throw new Error('预期可续页状态')
		const fetchIdlePage = result.current.fetchNextPage
		await act(() => fetchIdlePage())
		expect(fetchNextPage).toHaveBeenCalledOnce()

		rerender({ ...initialProps, hasNextPage: true, isFetchingNextPage: true })
		expect(result.current.state).toBe('loading')
		if (!('fetchNextPage' in result.current)) throw new Error('预期可续页状态')
		const fetchLoadingPage = result.current.fetchNextPage
		await act(() => fetchLoadingPage())
		expect(fetchNextPage).toHaveBeenCalledOnce()

		rerender({
			...initialProps,
			hasNextPage: true,
			isFetchingNextPage: true,
			isFetchNextPageError: true,
			error: new Error('重试中保留的旧错误'),
		})
		expect(result.current.state).toBe('loading')

		rerender({
			...initialProps,
			hasNextPage: true,
			isFetchNextPageError: true,
			error: new Error('下一页失败'),
		})
		expect(result.current).toMatchObject({ state: 'error', error: '下一页失败' })
	})
})

describe('useTaskQueryData', () => {
	afterEach(() => runTaskQueryMock.mockReset())

	it('切换查询时进入加载态，旧任务和总数不能成为新来源的就绪结果', async () => {
		let resolveNext: ((page: RunTaskQueryResult) => void) | undefined
		const nextPage = new Promise<RunTaskQueryResult>((resolve) => {
			resolveNext = resolve
		})
		runTaskQueryMock.mockImplementation(({ baseViewKey }: { baseViewKey: TaskViewBaseKey }) =>
			baseViewKey === 'active'
				? Promise.resolve(page(createTask('task-a', '任务 A'), 'cursor-a'))
				: nextPage,
		)

		const { result, rerender } = renderHook(
			({ baseViewKey }: { baseViewKey: TaskViewBaseKey }) =>
				useTaskQueryData({
					...windowInput,
					scope: { type: 'all' },
					context: { kind: 'all' },
					baseViewKey,
					filters: { clauses: [] },
				}),
			{ initialProps: { baseViewKey: 'active' }, wrapper: createQueryWrapper() },
		)

		await waitFor(() => expect(result.current.items[0]?.id).toBe('task-a'))
		rerender({ baseViewKey: 'all' })
		await waitFor(() => expect(runTaskQueryMock).toHaveBeenCalledTimes(2))

		expect(result.current.status).toBe('loading')
		expect(result.current.items).toEqual([])
		expect(result.current.pagination.state).toBe('exhausted')
		expect(result.current.pagination).not.toHaveProperty('totalCount')

		await act(async () => {
			resolveNext?.(page(createTask('task-b', '任务 B')))
		})
		await waitFor(() => expect(result.current.items[0]?.id).toBe('task-b'))
	})

	it('旧请求晚于新来源返回时不能覆盖新结果', async () => {
		let resolvePrevious!: (page: RunTaskQueryResult) => void
		const previousPage = new Promise<RunTaskQueryResult>((resolve) => {
			resolvePrevious = resolve
		})
		runTaskQueryMock.mockImplementation(({ baseViewKey }: { baseViewKey: TaskViewBaseKey }) =>
			baseViewKey === 'active' ? previousPage : Promise.resolve(page(createTask('new', '新来源'))),
		)
		const { result, rerender } = renderHook(
			({ baseViewKey }: { baseViewKey: TaskViewBaseKey }) =>
				useTaskQueryData({
					...windowInput,
					scope: { type: 'all' },
					context: { kind: 'all' },
					baseViewKey,
					filters: { clauses: [] },
				}),
			{ initialProps: { baseViewKey: 'active' }, wrapper: createQueryWrapper() },
		)
		await waitFor(() => expect(runTaskQueryMock).toHaveBeenCalledOnce())
		rerender({ baseViewKey: 'all' })
		await waitFor(() => expect(result.current.items[0]?.id).toBe('new'))

		await act(async () => {
			resolvePrevious(page(createTask('old', '旧来源')))
		})

		expect(result.current.items.map((item) => item.id)).toEqual(['new'])
		expect(result.current.input.baseViewKey).toBe('all')
		expect(result.current.status).toBe('ready')
	})

	it.each(['order', 'dateBasis', 'groupBy', 'subGroupBy'] as const)(
		'切换 %s 从新首屏开始，慢旧续页不能拼入新结果',
		async (change) => {
			let resolvePrevious!: (page: RunTaskQueryResult) => void
			const pending = new Promise<RunTaskQueryResult>((resolve) => {
				resolvePrevious = resolve
			})
			runTaskQueryMock.mockImplementation(({ cursor, order, dateBasis }) => {
				if (cursor) return pending
				return Promise.resolve(
					page(
						createTask(
							order.orderDirection === 'asc' ||
								dateBasis === '2026-09-14' ||
								order.groupBy === 'status' ||
								order.subGroupBy === 'status'
								? 'new'
								: 'old',
							'任务',
						),
						'cursor',
					),
				)
			})
			const input: RunTaskQueryInput = {
				...windowInput,
				scope: { type: 'all' as const },
				context: { kind: 'all' as const },
				baseViewKey: 'all' as const,
				filters: { clauses: [] },
			}
			const { result, rerender } = renderHook((window) => useTaskQueryData(window), {
				initialProps: input,
				wrapper: createQueryWrapper(),
			})
			await waitFor(() => expect(result.current.items[0]?.id).toBe('old'))
			act(() => {
				if ('fetchNextPage' in result.current.pagination)
					void result.current.pagination.fetchNextPage()
			})
			await waitFor(() => expect(runTaskQueryMock).toHaveBeenCalledTimes(2))
			rerender(
				change === 'order'
					? { ...input, order: { ...input.order, orderDirection: 'asc' } }
					: change === 'groupBy'
						? { ...input, order: { ...input.order, groupBy: 'status' } }
						: change === 'subGroupBy'
							? { ...input, order: { ...input.order, subGroupBy: 'status' } }
							: { ...input, dateBasis: '2026-09-14' },
			)
			await waitFor(() => expect(result.current.items[0]?.id).toBe('new'))
			await act(async () => resolvePrevious(page(createTask('old-more', '旧续页'))))
			expect(result.current.items.map(({ id }) => id)).toEqual(['new'])
			expect(runTaskQueryMock.mock.calls.map(([value]) => value.cursor)).toEqual([
				null,
				'cursor',
				null,
			])
		},
	)

	it('同一查询后台刷新保留已有结果', async () => {
		let resolveRefetch!: (page: RunTaskQueryResult) => void
		const refresh = new Promise<RunTaskQueryResult>((resolve) => {
			resolveRefetch = resolve
		})
		runTaskQueryMock
			.mockResolvedValueOnce(page(createTask('previous', '当前结果')))
			.mockReturnValueOnce(refresh)
		const { result } = renderHook(
			() =>
				useTaskQueryData({
					...windowInput,
					scope: { type: 'all' },
					context: { kind: 'all' },
					baseViewKey: 'active',
					filters: { clauses: [] },
				}),
			{ wrapper: createQueryWrapper() },
		)
		await waitFor(() => expect(result.current.items[0]?.id).toBe('previous'))
		let refetch!: Promise<unknown>
		act(() => {
			refetch = result.current.refetch()
		})
		await waitFor(() => expect(runTaskQueryMock).toHaveBeenCalledTimes(2))
		expect(result.current.status).toBe('ready')
		expect(result.current.items[0]?.id).toBe('previous')
		await act(async () => {
			resolveRefetch(page(createTask('refreshed', '刷新结果')))
			await refetch
		})
		await waitFor(() => expect(result.current.items[0]?.id).toBe('refreshed'))
	})
})

function createQueryWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } },
	})
	return function QueryWrapper({ children }: { children: ReactNode }) {
		return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	}
}

function page(item: TaskQueryItem, nextCursor: string | null = null): RunTaskQueryResult {
	return { items: [item], nextCursor, totalCount: nextCursor ? 2 : 1 }
}

function createTask(id: string, title: string): TaskQueryItem {
	return {
		group: { kind: 'none' },
		subGroup: { kind: 'none' },
		id,
		title,
		spaceId: 'space-1',
		spaceName: '工作',
		spaceSlug: 'work',
		projectId: null,
		projectName: null,
		status: 'todo',
		statusChangedAt: '2026-09-08T00:00:00.000Z',
		priority: 0,
		plannedAt: null,
		dueAt: null,
		remindAt: null,
		completedAt: null,
		canceledAt: null,
		archivedAt: null,
		createdAt: '2026-09-08T00:00:00.000Z',
		updatedAt: '2026-09-08T00:00:00.000Z',
	}
}
