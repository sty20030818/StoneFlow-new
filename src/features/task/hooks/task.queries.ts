/**
 * 任务列表 / 详情 / 链接的 queryOptions 与 hooks。
 *
 * Route loader 与组件必须共用同一份 `*QueryOptions`，禁止第二套 fetch。
 */

import { queryOptions, useQuery, useSuspenseQuery } from '@tanstack/react-query'

import { getDefaultTaskViewKey, getTaskDetail, listTasks } from '@/features/task/api/tasks'
import { listTaskLinks } from '@/features/task/api/taskLinks'
import type { ListTasksInput } from '@/shared/types'

import { taskKeys } from './task.keys'

function normalizeListTasksInput(input: ListTasksInput): ListTasksInput {
	return {
		...input,
		viewKey: input.viewKey ?? getDefaultTaskViewKey(),
	}
}

/**
 * 列表查询配置（与 `useTaskListQuery` / ensureQueryData 共用）。
 */
export function taskListQueryOptions(input: ListTasksInput) {
	const normalizedInput = normalizeListTasksInput(input)

	return queryOptions({
		queryKey: taskKeys.list(normalizedInput),
		queryFn: () => listTasks(normalizedInput),
	})
}

/** 订阅任务列表；key 与 {@link taskListQueryOptions} 一致。 */
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
