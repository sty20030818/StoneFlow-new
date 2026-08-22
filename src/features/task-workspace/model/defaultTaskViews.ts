import type { TaskViewBaseKey, TaskViewContext } from '@/shared/types'

export type DefaultTaskViewKey = 'incomplete' | 'today' | 'upcoming' | 'completed' | 'all'

export type DefaultTaskView = {
	key: DefaultTaskViewKey
	label: string
	baseViewKey: TaskViewBaseKey
}

const INCOMPLETE = { key: 'incomplete', label: '未完成', baseViewKey: 'active' } as const
const TODAY = { key: 'today', label: '今天', baseViewKey: 'today' } as const
const UPCOMING = { key: 'upcoming', label: '即将到期', baseViewKey: 'upcoming' } as const
const COMPLETED = { key: 'completed', label: '已完成', baseViewKey: 'completed' } as const
const ALL = { key: 'all', label: '全部', baseViewKey: 'all' } as const

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
