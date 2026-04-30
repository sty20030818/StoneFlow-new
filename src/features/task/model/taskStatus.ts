import type { TaskStatus } from '@/shared/types'

type TaskStatusOption = {
	value: TaskStatus
	label: string
}

export const TASK_STATUS_OPTIONS: TaskStatusOption[] = [
	{ value: 'todo', label: '待执行' },
	{ value: 'doing', label: '进行中' },
	{ value: 'waiting', label: '等待中' },
	{ value: 'done', label: '已完成' },
	{ value: 'canceled', label: '已取消' },
]

export function getTaskStatusOption(status: TaskStatus) {
	return TASK_STATUS_OPTIONS.find((option) => option.value === status) ?? TASK_STATUS_OPTIONS[0]
}

export function formatTaskStatusLabel(status: TaskStatus) {
	return getTaskStatusOption(status).label
}
