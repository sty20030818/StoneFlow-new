import { formatTaskPriorityLabel, TASK_PRIORITY_OPTIONS } from '@/features/task/model/taskPriority'

export const INBOX_PRIORITY_OPTIONS = TASK_PRIORITY_OPTIONS.filter(
	(option) => option.value !== '',
).map((option) => ({
	value: option.value,
	label: option.label,
}))

export function formatInboxPriorityLabel(priority: string | null | undefined) {
	return priority ? formatTaskPriorityLabel(priority) : '待补优先级'
}
