const shortDateFormatter = new Intl.DateTimeFormat('zh-CN', {
	month: 'numeric',
	day: 'numeric',
})

/**
 * 格式化为「月/日」短日期，无效日期返回原值。
 */
export function formatShortDate(value: string): string {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}
	return shortDateFormatter.format(date)
}
