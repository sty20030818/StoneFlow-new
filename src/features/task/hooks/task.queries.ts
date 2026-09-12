/**
 * 任务列表 / 详情 / 链接的 queryOptions 与 hooks。
 *
 * Route loader 与组件必须共用同一份 `*QueryOptions`，禁止第二套 fetch。
 */

import {
	infiniteQueryOptions,
	queryOptions,
	useInfiniteQuery,
	useQuery,
} from '@tanstack/react-query'

import { countTaskQuery, getTaskDetail, runTaskQuery } from '@/features/task/api/tasks'
import { listTaskLinks } from '@/features/task/api/taskLinks'
import type { CountTaskQueryInput, RunTaskQueryInput, TaskListItem } from '@/shared/types'

import { taskKeys } from './task.keys'

/** Default View 查询：key 不含 cursor/limit，分页参数只走 pageParam。 */
export function taskQueryInfiniteQueryOptions(input: RunTaskQueryInput) {
	const keyInput: RunTaskQueryInput = {
		scope: input.scope,
		context: input.context,
		baseViewKey: input.baseViewKey,
		filters: input.filters,
	}
	return infiniteQueryOptions({
		queryKey: taskKeys.query(keyInput),
		queryFn: ({ pageParam }) =>
			runTaskQuery({
				...keyInput,
				cursor: pageParam ?? null,
			}),
		initialPageParam: null as string | null,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
	})
}

export function useTaskQueryInfiniteQuery(input: RunTaskQueryInput) {
	return useInfiniteQuery(taskQueryInfiniteQueryOptions(input))
}

export function useTaskCountQuery(input: CountTaskQueryInput) {
	return useQuery({
		queryKey: taskKeys.count(input),
		queryFn: () => countTaskQuery(input),
	})
}

/** 详情查询配置（route loader `ensureQueryData` 与页内 query 共用）。 */
export function taskDetailQueryOptions(taskId: string) {
	return queryOptions({
		queryKey: taskKeys.detail(taskId),
		queryFn: () => getTaskDetail(taskId),
	})
}

/** 订阅单个任务详情；无 id 时不发起请求。 */
export function useTaskDetailQuery(taskId: string | null | undefined) {
	return useQuery({
		...taskDetailQueryOptions(taskId ?? ''),
		enabled: Boolean(taskId),
	})
}

/** Suspense 详情；调用方须保证 taskId 有效。 */
/** 任务链接列表查询配置。 */
function taskLinksQueryOptions(taskId: string) {
	return queryOptions({
		queryKey: taskKeys.links(taskId),
		queryFn: () => listTaskLinks({ taskId }),
	})
}

/** 订阅任务链接；无 id 时不发起请求。 */
export function useTaskLinksQuery(taskId: string | null | undefined) {
	return useQuery({
		...taskLinksQueryOptions(taskId ?? ''),
		enabled: Boolean(taskId),
	})
}

/** 展平 infinite pages 为列表项 */
export function flattenTaskListPages(
	pages: Array<{ items: TaskListItem[] }> | undefined,
): TaskListItem[] {
	if (!pages) {
		return []
	}
	const items: TaskListItem[] = []
	for (const page of pages) {
		items.push(...page.items)
	}
	return items
}
