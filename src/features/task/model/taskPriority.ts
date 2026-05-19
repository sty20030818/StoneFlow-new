import type { TaskPriority } from '@/shared/types'

export type TaskPriorityValue = TaskPriority

type TaskPriorityOption = {
	value: TaskPriorityValue
	label: string
}

export const TASK_PRIORITY_OPTIONS: TaskPriorityOption[] = [
	{
		value: 0,
		label: '无优先级',
	},
	{
		value: 4,
		label: '紧急',
	},
	{
		value: 3,
		label: '高',
	},
	{
		value: 2,
		label: '中',
	},
	{
		value: 1,
		label: '低',
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
