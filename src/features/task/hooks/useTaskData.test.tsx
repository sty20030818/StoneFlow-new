import { act, renderHook } from '@testing-library/react'

import { useTaskBoardPagination } from './useTaskData'

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
