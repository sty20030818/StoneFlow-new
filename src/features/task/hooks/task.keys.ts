import type { CountTaskQueryInput, RunTaskQueryInput } from '@/shared/types'

/**
 * 任务 Query key 工厂。
 *
 * 前缀：`['tasks']` 为根；`invalidateQueries({ queryKey: taskKeys.all })` 可清全部任务缓存。
 * 组件与 hooks 禁止手写散落 key，一律经本工厂。
 */
export const taskKeys = {
	all: ['tasks'] as const,
	queries: () => [...taskKeys.all, 'query'] as const,
	query: (input: RunTaskQueryInput) => [...taskKeys.queries(), input] as const,
	counts: () => [...taskKeys.all, 'count'] as const,
	count: (input: CountTaskQueryInput) => [...taskKeys.counts(), input] as const,
	details: () => [...taskKeys.all, 'detail'] as const,
	detail: (taskId: string) => [...taskKeys.details(), taskId] as const,
	links: (taskId: string) => [...taskKeys.detail(taskId), 'links'] as const,
}
