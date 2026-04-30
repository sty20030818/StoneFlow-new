import {
	CircleAlert,
	Minus,
	SignalHigh,
	SignalLow,
	SignalMedium,
	type LucideIcon,
} from 'lucide-react'

import type { TaskPriority } from '@/shared/types'

export type TaskPriorityValue = TaskPriority

type TaskPriorityOption = {
	value: TaskPriorityValue
	label: string
	icon: LucideIcon
	iconClassName: string
	surfaceClassName: string
}

export const EMPTY_TASK_PRIORITY_VALUE = '__task-priority-empty__'

export const TASK_PRIORITY_OPTIONS: TaskPriorityOption[] = [
	{
		value: 0,
		label: '无优先级',
		icon: Minus,
		iconClassName: 'text-white',
		surfaceClassName: 'bg-(--sf-color-priority-none)',
	},
	{
		value: 1,
		label: '低',
		icon: SignalLow,
		iconClassName: 'text-white',
		surfaceClassName: 'bg-(--sf-color-priority-low)',
	},
	{
		value: 2,
		label: '中',
		icon: SignalMedium,
		iconClassName: 'text-white',
		surfaceClassName: 'bg-(--sf-color-priority-medium)',
	},
	{
		value: 3,
		label: '高',
		icon: SignalHigh,
		iconClassName: 'text-white',
		surfaceClassName: 'bg-(--sf-color-priority-high)',
	},
	{
		value: 4,
		label: '紧急',
		icon: CircleAlert,
		iconClassName: 'text-white',
		surfaceClassName: 'bg-(--sf-color-priority-urgent)',
	},
]

/**
 * 将任意来源的值收口到前端任务优先级枚举，避免各页面重复兜底。
 */
export function normalizeTaskPriorityValue(priority: number | null | undefined): TaskPriorityValue {
	if (priority === 1 || priority === 2 || priority === 3 || priority === 4) {
		return priority
	}

	return 0
}

export function getTaskPriorityOption(priority: number | null | undefined) {
	const normalizedPriority = normalizeTaskPriorityValue(priority)

	return (
		TASK_PRIORITY_OPTIONS.find((option) => option.value === normalizedPriority) ??
		TASK_PRIORITY_OPTIONS[0]
	)
}

export function formatTaskPriorityLabel(priority: number | null | undefined) {
	return getTaskPriorityOption(priority).label
}
