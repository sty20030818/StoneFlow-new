import type { ListTasksInput, TaskListItem } from '@/shared/types'
import type { QueryLoadStatus } from '@/shared/query/queryStatus'

import { useTaskDetailQuery, useTaskListQuery } from './task.queries'

const EMPTY_TASK_LIST_ITEMS: TaskListItem[] = []

export function useTaskListData(input: ListTasksInput) {
	const query = useTaskListQuery(input)
	const status: QueryLoadStatus = query.isError
		? 'error'
		: query.isLoading || query.isPending
			? 'loading'
			: 'ready'

	return {
		items: query.data ?? EMPTY_TASK_LIST_ITEMS,
		status,
		error: query.error instanceof Error ? query.error.message : null,
		input,
		refetch: query.refetch,
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
