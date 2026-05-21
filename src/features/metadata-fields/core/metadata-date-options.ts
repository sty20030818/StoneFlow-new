import type { MetadataDateOption } from './metadata-field.types'

export function createMetadataDateOptions(currentValue?: string | null): MetadataDateOption[] {
	const today = startOfLocalDay(new Date())
	const tomorrow = addLocalDays(today, 1)
	const thisWeek = getEndOfLocalWeek(today)
	const oneWeek = addLocalDays(today, 7)
	const normalizedValue = normalizeMetadataDateValue(currentValue)

	return [
		{
			key: 'none',
			label: '未设置',
			value: null,
			isEmptyValue: true,
		},
		{
			key: 'today',
			label: '今天',
			value: formatLocalDate(today),
			meta: formatMetaDate(today),
		},
		{
			key: 'tomorrow',
			label: '明天',
			value: formatLocalDate(tomorrow),
			meta: formatMetaDate(tomorrow),
		},
		{
			key: 'this-week',
			label: '本周',
			value: formatLocalDate(thisWeek),
			meta: formatMetaDate(thisWeek),
		},
		{
			key: 'one-week',
			label: '一周后',
			value: formatLocalDate(oneWeek),
			meta: formatMetaDate(oneWeek),
		},
		{
			key: 'custom',
			label: '自定义日期',
			value: normalizedValue,
			trailing: '后续接入',
			disabled: true,
		},
	]
}

export function normalizeMetadataDateValue(value: string | null | undefined) {
	if (!value) {
		return null
	}

	return value.slice(0, 10)
}

export function formatLocalDate(value: Date) {
	const year = value.getFullYear()
	const month = String(value.getMonth() + 1).padStart(2, '0')
	const day = String(value.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

export function startOfLocalDay(value: Date) {
	return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

export function addLocalDays(value: Date, days: number) {
	const next = new Date(value)
	next.setDate(next.getDate() + days)
	return next
}

export function getEndOfLocalWeek(value: Date) {
	const day = value.getDay() === 0 ? 7 : value.getDay()
	return addLocalDays(value, 7 - day)
}

function formatMetaDate(value: Date) {
	return new Intl.DateTimeFormat('zh-CN', {
		month: 'numeric',
		day: 'numeric',
	}).format(value)
}
