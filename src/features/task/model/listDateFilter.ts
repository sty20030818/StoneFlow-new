/**
 * 将日期模式枚举编码为 list_tasks 下推载荷（本地日边界）。
 * 与 `adaptFilterQueryToListTasks` 的日期语义一致。
 */
import type { PageDateFilterValue } from '@/features/filter'
import type { ListTasksDateFilter } from '@/shared/types'

export function encodeListTasksDateFilter(
	dateValue: PageDateFilterValue,
): ListTasksDateFilter | null {
	if (dateValue === 'none') {
		return null
	}
	if (dateValue === 'hasDate') {
		return { mode: 'hasDate' }
	}
	if (dateValue === 'noDate') {
		return { mode: 'noDate' }
	}

	const today = startOfLocalDay(new Date())
	const tomorrow = addLocalDays(today, 1)
	const endOfWeek = getEndOfLocalWeek(today)

	switch (dateValue) {
		case 'today':
			return {
				mode: 'range',
				from: toStartIso(today),
				to: toEndIso(today),
			}
		case 'tomorrow':
			return {
				mode: 'range',
				from: toStartIso(tomorrow),
				to: toEndIso(tomorrow),
			}
		case 'thisWeek':
			return {
				mode: 'range',
				from: toStartIso(today),
				to: toEndIso(endOfWeek),
			}
		case 'overdue':
			return {
				mode: 'range',
				from: null,
				// 严格早于今天 00:00
				to: toEndIso(addLocalDays(today, -1)),
			}
		default:
			return null
	}
}

function startOfLocalDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addLocalDays(date: Date, days: number) {
	const next = new Date(date)
	next.setDate(next.getDate() + days)
	return next
}

function getEndOfLocalWeek(date: Date) {
	const day = date.getDay()
	const daysUntilSunday = (7 - day) % 7
	return addLocalDays(date, daysUntilSunday)
}

function toStartIso(day: Date) {
	return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0).toISOString()
}

function toEndIso(day: Date) {
	return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999).toISOString()
}
