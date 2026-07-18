import type { ListTasksInput } from '@/shared/types'

/**
 * 任务 Query key 工厂。
 *
 * 前缀：`['tasks']` 为根；`invalidateQueries({ queryKey: taskKeys.all })` 可清全部任务缓存。
 * 组件与 hooks 禁止手写散落 key，一律经本工厂。
 */
export const taskKeys = {
	all: ['tasks'] as const,
	lists: () => [...taskKeys.all, 'list'] as const,
	list: (input: ListTasksInput) => [...taskKeys.lists(), input] as const,
	details: () => [...taskKeys.all, 'detail'] as const,
	detail: (taskId: string) => [...taskKeys.details(), taskId] as const,
	links: (taskId: string) => [...taskKeys.detail(taskId), 'links'] as const,
}
