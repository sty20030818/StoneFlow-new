import { useQuery } from '@tanstack/react-query'

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

export function useTaskListQuery(input: ListTasksInput) {
	const normalizedInput = normalizeListTasksInput(input)

	return useQuery({
		queryKey: taskKeys.list(normalizedInput),
		queryFn: () => listTasks(normalizedInput),
	})
}

export function useTaskDetailQuery(taskId: string | null | undefined) {
	return useQuery({
		queryKey: taskKeys.detail(taskId ?? ''),
		queryFn: () => getTaskDetail(taskId ?? ''),
		enabled: Boolean(taskId),
	})
}

export function useTaskLinksQuery(taskId: string | null | undefined) {
	return useQuery({
		queryKey: taskKeys.links(taskId ?? ''),
		queryFn: () => listTaskLinks({ taskId: taskId ?? '' }),
		enabled: Boolean(taskId),
	})
}
