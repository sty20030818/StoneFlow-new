import { useCallback, useMemo } from 'react'
import { hashKey } from '@tanstack/react-query'

import type { CountTaskQueryInput, RunTaskQueryInput, TaskListItem } from '@/shared/types'
import type { QueryLoadStatus } from '@/shared/query/queryStatus'
import type { TaskBoardPagination } from '../components/TaskBoard'

import {
	flattenTaskListPages,
	taskQueryInfiniteQueryOptions,
	useTaskCountQuery,
	useTaskDetailQuery,
	useTaskQueryInfiniteQuery,
} from './task.queries'

const EMPTY_TASK_LIST_ITEMS: TaskListItem[] = []

export function useTaskBoardPagination({
	sourceKey,
	loadedPageCount,
	fetchNextPage: queryFetchNextPage,
	hasNextPage,
	isFetchingNextPage,
	isFetchNextPageError,
	error,
	totalCount,
}: {
	sourceKey: string
	loadedPageCount: number
	fetchNextPage: () => Promise<unknown>
	hasNextPage: boolean | undefined
	isFetchingNextPage: boolean
	isFetchNextPageError: boolean
	error: unknown
	totalCount: number | null | undefined
}): TaskBoardPagination {
	const fetchNextPage = useCallback(
		() => (hasNextPage && !isFetchingNextPage ? queryFetchNextPage() : Promise.resolve(undefined)),
		[hasNextPage, isFetchingNextPage, queryFetchNextPage],
	)
	const fetchNextPageError = isFetchNextPageError
		? error instanceof Error
			? error.message
			: '加载更多失败'
		: null

	return useMemo<TaskBoardPagination>(() => {
		const progress =
			typeof totalCount === 'number'
				? { sourceKey, loadedPageCount, totalCount }
				: { sourceKey, loadedPageCount }
		if (!hasNextPage) return { state: 'exhausted', ...progress }
		if (isFetchingNextPage) return { state: 'loading', fetchNextPage, ...progress }
		if (fetchNextPageError) {
			return { state: 'error', error: fetchNextPageError, fetchNextPage, ...progress }
		}
		return {
			state: 'idle',
			fetchNextPage,
			...progress,
		}
	}, [
		fetchNextPage,
		fetchNextPageError,
		hasNextPage,
		isFetchingNextPage,
		loadedPageCount,
		sourceKey,
		totalCount,
	])
}

export function useTaskQueryData(input: RunTaskQueryInput) {
	const query = useTaskQueryInfiniteQuery(input)
	const items = useMemo(
		() => flattenTaskListPages(query.data?.pages) ?? EMPTY_TASK_LIST_ITEMS,
		[query.data?.pages],
	)
	// 总数必须来自首屏服务端 totalCount；pages 未就绪时为 undefined（禁止 ?? 0 与「零条」混淆）
	const totalCount = query.data?.pages[0]?.totalCount
	const status: QueryLoadStatus = query.isLoadingError
		? 'error'
		: query.isLoading || query.isPending
			? 'loading'
			: 'ready'
	const pagination = useTaskBoardPagination({
		sourceKey: hashKey(taskQueryInfiniteQueryOptions(input).queryKey),
		loadedPageCount: query.data?.pages.length ?? 0,
		fetchNextPage: query.fetchNextPage,
		hasNextPage: query.hasNextPage,
		isFetchingNextPage: query.isFetchingNextPage,
		isFetchNextPageError: query.isFetchNextPageError,
		error: query.error,
		totalCount,
	})

	return {
		items,
		pagination,
		status,
		error: query.error instanceof Error ? query.error.message : null,
		input,
		refetch: query.refetch,
	}
}

export function useTaskQueryCount(input: CountTaskQueryInput) {
	return useTaskCountQuery(input).data
}

export function useTaskDetailData(taskId: string | null | undefined) {
	const query = useTaskDetailQuery(taskId)
	const status: QueryLoadStatus = query.isError
		? 'error'
		: query.isLoading || query.isPending
			? 'loading'
			: 'ready'

	return {
		item: query.data ?? null,
		status,
		error: query.error instanceof Error ? query.error.message : null,
		taskId: taskId ?? null,
		refetch: query.refetch,
	}
}
