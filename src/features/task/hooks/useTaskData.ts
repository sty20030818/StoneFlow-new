import { useMemo } from 'react'

import type { ListTasksInput, TaskListItem } from '@/shared/types'
import type { QueryLoadStatus } from '@/shared/query/queryStatus'

import {
	flattenTaskListPages,
	useTaskDetailQuery,
	useTaskListInfiniteQuery,
} from './task.queries'

const EMPTY_TASK_LIST_ITEMS: TaskListItem[] = []

export function useTaskListData(input: ListTasksInput) {
	const query = useTaskListInfiniteQuery(input)
	const items = useMemo(
		() => flattenTaskListPages(query.data?.pages) ?? EMPTY_TASK_LIST_ITEMS,
		[query.data?.pages],
	)
	// 总数必须来自首屏服务端 totalCount（契约必填）
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
		totalCount: totalCount ?? 0,
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
