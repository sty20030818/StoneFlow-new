import { addDays, endOfWeek, format } from 'date-fns'

import type { QuickCreateStatus } from '@/features/quick-create/model/types'

export function getQuickDatePreset(
	preset: 'today' | 'tomorrow' | 'week',
	referenceDate = new Date(),
) {
	if (preset === 'today') {
		return formatDateValue(referenceDate)
	}

	if (preset === 'tomorrow') {
		return formatDateValue(addDays(referenceDate, 1))
	}

	return formatDateValue(endOfWeek(referenceDate, { weekStartsOn: 1 }))
}

export function formatDateValue(date: Date) {
	return format(date, 'yyyy-MM-dd')
}

export function formatDateLabel(value: string) {
	try {
		const [year, month, day] = value.split('-').map(Number)
		if (!year || !month || !day) {
			return value
		}

		return format(new Date(year, month - 1, day), 'M/d')
	} catch {
		return value
	}
}

export function formatStatusLabel(status: QuickCreateStatus) {
	switch (status) {
		case 'doing':
			return '进行中'
		case 'done':
			return '已完成'
		default:
			return '待执行'
	}
}
