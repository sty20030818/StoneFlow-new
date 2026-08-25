import { toCalendarDate, toDateOnlyString } from './dateOnly'

describe('dateOnly view adapter', () => {
	it.each([null, undefined, '', '2026/05/10', '2026-5-10', '2026-05-10T00:00:00'])(
		'拒绝非 YYYY-MM-DD 值：%s',
		(value) => {
			expect(toCalendarDate(value)).toBeNull()
		},
	)

	it.each(['0000-01-01', '2025-02-29', '2026-04-31'])(
		'拒绝不存在或会被静默规范化的日历日期：%s',
		(value) => {
			expect(toCalendarDate(value)).toBeNull()
		},
	)

	it.each(['2026-05-10', '2026-01-31', '2024-02-29'])(
		'普通日期、月末和闰日双向 round trip：%s',
		(value) => {
			const calendarDate = toCalendarDate(value)

			expect(calendarDate?.toString()).toBe(value)
			expect(toDateOnlyString(calendarDate)).toBe(value)
		},
	)

	it('空 Calendar 值保持为空', () => {
		expect(toDateOnlyString(null)).toBeNull()
		expect(toDateOnlyString(undefined)).toBeNull()
	})
})
