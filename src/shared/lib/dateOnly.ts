import { parseDate, type CalendarDate } from '@internationalized/date'

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** 将本地日历日期字符串转换为 Calendar 的视图值，不做时区转换。 */
export function toCalendarDate(value: string | null | undefined): CalendarDate | null {
	if (!value || !DATE_ONLY_PATTERN.test(value)) {
		return null
	}

	try {
		const calendarDate = parseDate(value)
		return calendarDate.toString() === value ? calendarDate : null
	} catch {
		return null
	}
}

/** 将 Calendar 的视图值还原为本地日历日期字符串，不经过 JavaScript Date。 */
export function toDateOnlyString(value: CalendarDate | null | undefined): string | null {
	return value?.toString() ?? null
}
