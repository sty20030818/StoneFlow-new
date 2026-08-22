import { useMemo } from 'react'

import type { CountTaskQueryInput, RunTaskQueryInput, TaskListItem } from '@/shared/types'
import type { QueryLoadStatus } from '@/shared/query/queryStatus'

import {
	flattenTaskListPages,
	useTaskCountQuery,
	useTaskDetailQuery,
	useTaskQueryInfiniteQuery,
} from './task.queries'

const EMPTY_TASK_LIST_ITEMS: TaskListItem[] = []

export function useTaskQueryData(input: RunTaskQueryInput) {
	const query = useTaskQueryInfiniteQuery(input)
	const items = useMemo(
		() => flattenTaskListPages(query.data?.pages) ?? EMPTY_TASK_LIST_ITEMS,
		[query.data?.pages],
	)
	// 总数必须来自首屏服务端 totalCount；pages 未就绪时为 undefined（禁止 ?? 0 与「零条」混淆）
	const totalCount = query.data?.pages[0]?.totalCount
	const status: QueryLoadStatus = query.isError
		? 'error'
		: query.isLoading || query.isPending
			? 'loading'
			: 'ready'

	return {
		items,
		/** 已拉取条数（各页合计），供 Board 算未加载占位 */
		loadedCount: items.length,
		/** 未就绪时 undefined；就绪后为 number（可为 0） */
		totalCount: typeof totalCount === 'number' ? totalCount : undefined,
		status,
		error: query.error instanceof Error ? query.error.message : null,
		input,
		refetch: query.refetch,
		hasNextPage: Boolean(query.hasNextPage),
		isFetchingNextPage: query.isFetchingNextPage,
		fetchNextPage: () => {
			if (query.hasNextPage && !query.isFetchingNextPage) {
				void query.fetchNextPage()
			}
		},
		fetchNextPageError: query.isFetchNextPageError
			? query.error instanceof Error
				? query.error.message
				: '加载更多失败'
			: null,
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
