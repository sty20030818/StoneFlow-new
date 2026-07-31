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
	useSuspenseQuery,
} from '@tanstack/react-query'

import { getDefaultTaskViewKey, getTaskDetail, listTasks } from '@/features/task/api/tasks'
import { listTaskLinks } from '@/features/task/api/taskLinks'
import type { ListTasksInput, TaskListItem } from '@/shared/types'

import { taskKeys } from './task.keys'

function normalizeListTasksInput(input: ListTasksInput): ListTasksInput {
	return {
		...input,
		viewKey: input.viewKey ?? getDefaultTaskViewKey(),
	}
}

/** 列表 infinite query：key 不含 cursor，cursor 走 pageParam */
export function taskListInfiniteQueryOptions(input: ListTasksInput) {
	const base = normalizeListTasksInput(input)
	// key 用稳定字段，去掉 cursor/limit 避免每页新 key
	const keyInput: ListTasksInput = {
		scope: base.scope,
		viewKey: base.viewKey,
		placement: base.placement,
		...(base.statuses ? { statuses: base.statuses } : {}),
	}

	return infiniteQueryOptions({
		queryKey: taskKeys.list(keyInput),
		queryFn: ({ pageParam }) =>
			listTasks({
				...base,
				cursor: pageParam ?? null,
			}),
		initialPageParam: null as string | null,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
	})
}

/**
 * 列表查询配置（单页；兼容 ensureQueryData 等旧路径）。
 */
export function taskListQueryOptions(input: ListTasksInput) {
	const normalizedInput = normalizeListTasksInput(input)

	return queryOptions({
		queryKey: [...taskKeys.list(normalizedInput), 'page', normalizedInput.cursor ?? 'head'] as const,
		queryFn: () => listTasks(normalizedInput),
	})
}

/** 订阅无限列表 */
export function useTaskListInfiniteQuery(input: ListTasksInput) {
	return useInfiniteQuery(taskListInfiniteQueryOptions(input))
}

/** 订阅任务列表（单页）；优先使用 {@link useTaskListInfiniteQuery}。 */
export function useTaskListQuery(input: ListTasksInput) {
	return useQuery(taskListQueryOptions(input))
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
export function useSuspenseTaskDetailQuery(taskId: string) {
	return useSuspenseQuery(taskDetailQueryOptions(taskId))
}

/** 任务链接列表查询配置。 */
export function taskLinksQueryOptions(taskId: string) {
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
