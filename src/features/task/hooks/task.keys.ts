import type { ListTasksInput } from '@/shared/types'

export const taskKeys = {
	all: ['tasks'] as const,
	lists: () => [...taskKeys.all, 'list'] as const,
	list: (input: ListTasksInput) => [...taskKeys.lists(), input] as const,
	details: () => [...taskKeys.all, 'detail'] as const,
	detail: (taskId: string) => [...taskKeys.details(), taskId] as const,
	links: (taskId: string) => [...taskKeys.detail(taskId), 'links'] as const,
}
