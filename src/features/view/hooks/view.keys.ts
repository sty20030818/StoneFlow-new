import { getFilterQueryKey } from '@/features/filter'
import { normalizeTaskWindowOrder } from '@/features/display-options'
import type { RunTaskViewInput, Scope } from '@/shared/types'

export const viewKeys = {
	all: ['views'] as const,
	lists: () => [...viewKeys.all, 'list'] as const,
	list: (scope: Scope) => [...viewKeys.lists(), 'task', scope] as const,
	taskRuns: () => [...viewKeys.all, 'task-run'] as const,
	taskRun: (input: RunTaskViewInput) =>
		[
			...viewKeys.taskRuns(),
			{
				scope: input.scope,
				viewId: input.viewId,
				...(input.filters ? { filters: getFilterQueryKey(input.filters) } : {}),
				order: normalizeTaskWindowOrder(input.order),
				dateBasis: input.dateBasis,
			},
		] as const,
}
