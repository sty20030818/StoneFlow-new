import type { RunTaskViewInput, ViewEntityType } from '@/shared/types'

export const viewKeys = {
	all: ['views'] as const,
	lists: () => [...viewKeys.all, 'list'] as const,
	list: (entityType: ViewEntityType, visibleOnly = false) =>
		[...viewKeys.lists(), entityType, visibleOnly] as const,
	taskRuns: () => [...viewKeys.all, 'task-run'] as const,
	disabledTaskRun: () => [...viewKeys.taskRuns(), 'disabled'] as const,
	taskRun: (input: RunTaskViewInput) => [...viewKeys.taskRuns(), input] as const,
}
