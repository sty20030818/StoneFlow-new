export type CustomDateFieldKey = 'dueDate' | 'scheduledDate' | 'reminderDate'

export function getCustomDateDialogTitle(label: string) {
	return `编辑${label}`
}

export function getCustomDateDialogDescription(label: string) {
	switch (label) {
		case '计划时间':
			return '此日期用于安排任务应该开始推进的时间。'
		case '提醒时间':
			return '此日期用于提醒你关注这项任务。'
		default:
			return '此日期用于标记任务应该完成的时间。'
	}
}

export function getCustomDateDialogSubmitLabel(label: string) {
	return `保存${label}`
}

export function getCustomDateDialogRemoveLabel(label: string) {
	return `移除${label}`
}
