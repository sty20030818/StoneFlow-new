export type ShortcutMenuItem<TValue> = {
	label: string
	value: TValue
	isEmptyValue?: boolean
	disabled?: boolean
}

export type DigitShortcutMapItem<TValue> = {
	digit: string
	item: ShortcutMenuItem<TValue>
}

/**
 * 统一 dropdown 数字映射：
 * - 有显式空态时从 0 开始；
 * - 否则从 1 开始。
 * 映射顺序严格遵循传入菜单项顺序，不重排业务语义。
 */
export function buildDigitShortcutMap<TValue>(items: ShortcutMenuItem<TValue>[]): DigitShortcutMapItem<TValue>[] {
	const hasEmptyValue = items.some((item) => item.isEmptyValue)
	const start = hasEmptyValue ? 0 : 1

	return items.map((item, index) => ({
		digit: String(start + index),
		item,
	}))
}
