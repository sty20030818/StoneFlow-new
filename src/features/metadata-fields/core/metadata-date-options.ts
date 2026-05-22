import type { MetadataDateOption } from './metadata-field.types'

export function createMetadataDateOptions(currentValue?: string | null): MetadataDateOption[] {
	return createMetadataDateOptionsConfig({
		currentValue,
		showClearOption: Boolean(normalizeMetadataDateValue(currentValue)),
	})
}

export function createMetadataDateOptionsConfig({
	currentValue,
	showClearOption,
}: {
	currentValue?: string | null
	showClearOption: boolean
}): MetadataDateOption[] {
	const today = startOfLocalDay(new Date())
	const tomorrow = addLocalDays(today, 1)
	const thisWeek = getEndOfLocalWeek(today)
	const oneWeek = addLocalDays(today, 7)
	const normalizedValue = normalizeMetadataDateValue(currentValue)

	return [
		...(showClearOption
			? [
					{
						key: 'none',
						label: '移除当前日期',
						value: null,
						isEmptyValue: true,
					} satisfies MetadataDateOption,
				]
			: []),
		{
			key: 'today',
			label: '今天',
			value: formatLocalDate(today),
			matchesValue: formatLocalDate(today),
			meta: formatMetaDate(today),
		},
		{
			key: 'tomorrow',
			label: '明天',
			value: formatLocalDate(tomorrow),
			matchesValue: formatLocalDate(tomorrow),
			meta: formatMetaDate(tomorrow),
		},
		{
			key: 'this-week',
			label: '本周',
			value: formatLocalDate(thisWeek),
			matchesValue: formatLocalDate(thisWeek),
			meta: formatMetaDate(thisWeek),
		},
		{
			key: 'one-week',
			label: '一周后',
			value: formatLocalDate(oneWeek),
			matchesValue: formatLocalDate(oneWeek),
			meta: formatMetaDate(oneWeek),
		},
		{
			key: 'custom',
			label: normalizedValue ? '自定义日期' : '自定义日期',
			value: '__custom__',
			matchesValue:
				normalizedValue &&
				normalizedValue !== formatLocalDate(today) &&
				normalizedValue !== formatLocalDate(tomorrow) &&
				normalizedValue !== formatLocalDate(thisWeek) &&
				normalizedValue !== formatLocalDate(oneWeek)
					? normalizedValue
					: null,
			trailing: normalizedValue ? formatMetadataDisplayDate(normalizedValue) : undefined,
		},
	]
}

export function normalizeMetadataDateValue(value: string | null | undefined) {
	if (!value) {
		return null
	}

	return value.slice(0, 10)
}

export function formatMetadataDisplayDate(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}

	if (date.getFullYear() === new Date().getFullYear()) {
		return new Intl.DateTimeFormat('zh-CN', {
			month: 'numeric',
			day: 'numeric',
		}).format(date)
	}

	return new Intl.DateTimeFormat('zh-CN', {
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
	}).format(date)
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
