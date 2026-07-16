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

export function taskListQueryOptions(input: ListTasksInput) {
	const normalizedInput = normalizeListTasksInput(input)

	return queryOptions({
		queryKey: taskKeys.list(normalizedInput),
		queryFn: () => listTasks(normalizedInput),
	})
}

export function useTaskListQuery(input: ListTasksInput) {
	return useQuery(taskListQueryOptions(input))
}

export function taskDetailQueryOptions(taskId: string) {
	return queryOptions({
		queryKey: taskKeys.detail(taskId),
		queryFn: () => getTaskDetail(taskId),
	})
}

export function useTaskDetailQuery(taskId: string | null | undefined) {
	return useQuery({
		...(taskId ? taskDetailQueryOptions(taskId) : taskDetailQueryOptions('')),
		enabled: Boolean(taskId),
	})
}

export function useSuspenseTaskDetailQuery(taskId: string) {
	return useSuspenseQuery(taskDetailQueryOptions(taskId))
}

export function useTaskLinksQuery(taskId: string | null | undefined) {
	return useQuery({
		queryKey: taskKeys.links(taskId ?? ''),
		queryFn: () => listTaskLinks({ taskId: taskId ?? '' }),
		enabled: Boolean(taskId),
	})
}
