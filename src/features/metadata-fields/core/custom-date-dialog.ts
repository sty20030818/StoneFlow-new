export type CustomDateFieldKey = 'dueDate' | 'scheduledDate' | 'reminderDate'

export function formatCustomDateInputValue(value: string | null | undefined) {
	if (!value) {
		return ''
	}

	return value.slice(0, 10).replaceAll('-', '/')
}

export function normalizeCustomDateInputValue(value: string) {
	return value.trim().replaceAll('-', '/')
}

export function parseCustomDateInputValue(value: string) {
	const normalized = normalizeCustomDateInputValue(value)
	if (!normalized) {
		return null
	}

	const match = normalized.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)
	if (!match) {
		return null
	}

	const [, yearText, monthText, dayText] = match
	const year = Number(yearText)
	const month = Number(monthText)
	const day = Number(dayText)
	if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
		return null
	}

	const date = new Date(year, month - 1, day)
	if (
		Number.isNaN(date.getTime()) ||
		date.getFullYear() !== year ||
		date.getMonth() !== month - 1 ||
		date.getDate() !== day
	) {
		return null
	}

	return date
}

export function formatCustomDateStorageValue(date: Date) {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

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
