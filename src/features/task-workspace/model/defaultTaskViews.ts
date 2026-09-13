import { TASK_VIEW_BASE_LABELS } from '@/features/task/presentation'
import type { TaskViewBaseKey, TaskViewContext } from '@/shared/types'

export type DefaultTaskViewKey = 'incomplete' | 'today' | 'upcoming' | 'completed' | 'all'

export type DefaultTaskView = {
	key: DefaultTaskViewKey
	label: string
	baseViewKey: TaskViewBaseKey
}

const INCOMPLETE = {
	key: 'incomplete',
	label: TASK_VIEW_BASE_LABELS.active,
	baseViewKey: 'active',
} as const
const TODAY = { key: 'today', label: TASK_VIEW_BASE_LABELS.today, baseViewKey: 'today' } as const
const UPCOMING = {
	key: 'upcoming',
	label: TASK_VIEW_BASE_LABELS.upcoming,
	baseViewKey: 'upcoming',
} as const
const COMPLETED = {
	key: 'completed',
	label: TASK_VIEW_BASE_LABELS.completed,
	baseViewKey: 'completed',
} as const
const ALL = { key: 'all', label: TASK_VIEW_BASE_LABELS.all, baseViewKey: 'all' } as const

export function getDefaultTaskViews(input: {
	context: TaskViewContext
	projectCompleted: boolean
}): { options: DefaultTaskView[]; defaultKey: DefaultTaskViewKey } {
	if (input.context.kind === 'project') {
		return input.projectCompleted
			? { options: [ALL, COMPLETED, INCOMPLETE], defaultKey: 'all' }
			: {
					options: [INCOMPLETE, TODAY, UPCOMING, COMPLETED, ALL],
					defaultKey: 'incomplete',
				}
	}

	return input.context.kind === 'standalone'
		? { options: [INCOMPLETE, TODAY, ALL], defaultKey: 'incomplete' }
		: { options: [INCOMPLETE, TODAY, UPCOMING, ALL], defaultKey: 'incomplete' }
}
