import type { RunTaskViewInput, Scope } from '@/shared/types'

export const viewKeys = {
	all: ['views'] as const,
	lists: () => [...viewKeys.all, 'list'] as const,
	list: (scope: Scope) => [...viewKeys.lists(), 'task', scope] as const,
	taskRuns: () => [...viewKeys.all, 'task-run'] as const,
	taskRun: (input: RunTaskViewInput) => [...viewKeys.taskRuns(), input] as const,
}
