import { CircleAlert, Minus, Wifi, WifiHigh, WifiLow, type LucideIcon } from 'lucide-react'

export type TaskPriorityValue = '' | 'low' | 'medium' | 'high' | 'urgent'

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
		value: '',
		label: '无优先级',
		icon: Minus,
		iconClassName: 'text-white',
		surfaceClassName: 'bg-(--sf-color-priority-none)',
	},
	{
		value: 'low',
		label: '低',
		icon: WifiLow,
		iconClassName: 'text-white',
		surfaceClassName: 'bg-(--sf-color-priority-low)',
	},
	{
		value: 'medium',
		label: '中',
		icon: WifiHigh,
		iconClassName: 'text-white',
		surfaceClassName: 'bg-(--sf-color-priority-medium)',
	},
	{
		value: 'high',
		label: '高',
		icon: Wifi,
		iconClassName: 'text-white',
		surfaceClassName: 'bg-(--sf-color-priority-high)',
	},
	{
		value: 'urgent',
		label: '紧急',
		icon: CircleAlert,
		iconClassName: 'text-white',
		surfaceClassName: 'bg-(--sf-color-priority-urgent)',
	},
]

/**
 * 将后端值收口到前端任务优先级枚举，避免各页面重复兜底。
 */
export function normalizeTaskPriorityValue(priority: string | null | undefined): TaskPriorityValue {
	switch (priority) {
		case 'low':
		case 'medium':
		case 'high':
		case 'urgent':
			return priority
		default:
			return ''
	}
}

export function getTaskPriorityOption(priority: string | null | undefined) {
	const normalizedPriority = normalizeTaskPriorityValue(priority)

	return (
		TASK_PRIORITY_OPTIONS.find((option) => option.value === normalizedPriority) ??
		TASK_PRIORITY_OPTIONS[0]
	)
}

export function formatTaskPriorityLabel(priority: string | null | undefined) {
	return getTaskPriorityOption(priority).label
}
