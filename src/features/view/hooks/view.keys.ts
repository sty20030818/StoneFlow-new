import type { RunTaskViewInput } from '@/shared/types'

export const viewKeys = {
	all: ['views'] as const,
	lists: () => [...viewKeys.all, 'list'] as const,
	list: () => [...viewKeys.lists(), 'task'] as const,
	taskRuns: () => [...viewKeys.all, 'task-run'] as const,
	disabledTaskRun: () => [...viewKeys.taskRuns(), 'disabled'] as const,
	taskRun: (input: RunTaskViewInput) => [...viewKeys.taskRuns(), input] as const,
}
