import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

import type { RunTaskQueryResult, TaskListItem, TaskViewBaseKey } from '@/shared/types'

import { useTaskBoardPagination, useTaskQueryData } from './useTaskData'

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

	it('切换视图时保留上一份成功结果，直到新结果就绪', async () => {
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

		expect(result.current.status).toBe('ready')
		expect(result.current.items[0]?.id).toBe('task-a')
		expect(result.current.pagination.state).toBe('exhausted')

		await act(async () => {
			resolveNext?.(page(createTask('task-b', '任务 B')))
		})
		await waitFor(() => expect(result.current.items[0]?.id).toBe('task-b'))
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

function page(item: TaskListItem, nextCursor: string | null = null): RunTaskQueryResult {
	return { items: [item], nextCursor, totalCount: nextCursor ? 2 : 1 }
}

function createTask(id: string, title: string): TaskListItem {
	return {
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
