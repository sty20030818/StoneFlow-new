import type {
	MetadataFieldIndicator,
	MetadataFieldOption,
	MetadataValueComparator,
} from './metadata-field.types'
import type { ShortcutMenuItem } from '@/shared/components/shortcut-menu'

export type MetadataShortcutMode = 'default' | 'clear-only'

export function defaultMetadataValueComparator<TValue>(left: TValue, right: TValue) {
	return Object.is(left, right)
}

export function getMetadataFieldIndicator<TValue>({
	optionValue,
	selectedValues,
	isValueEqual = defaultMetadataValueComparator,
}: {
	optionValue: TValue
	selectedValues: TValue[]
	isValueEqual?: MetadataValueComparator<TValue>
}): MetadataFieldIndicator {
	if (!selectedValues.some((value) => isValueEqual(value, optionValue))) {
		return null
	}

	return getDistinctMetadataValues(selectedValues, isValueEqual).length === 1 ? 'checked' : 'mixed'
}

export function buildMetadataShortcutItems<TValue>(
	options: Array<MetadataFieldOption<TValue>>,
	mode: MetadataShortcutMode = 'default',
): Array<ShortcutMenuItem<TValue>> {
	if (mode === 'clear-only') {
		return options
			.filter((option) => option.isEmptyValue)
			.map((option) => ({
				label: option.label,
				value: option.value,
				disabled: option.disabled,
				isEmptyValue: true,
			}))
	}

	return options.map((option) => ({
		label: option.label,
		value: option.value,
		disabled: option.disabled,
		isEmptyValue: option.isEmptyValue,
	}))
}

function getDistinctMetadataValues<TValue>(
	values: TValue[],
	isValueEqual: MetadataValueComparator<TValue>,
) {
	return values.reduce<TValue[]>((result, value) => {
		if (!result.some((existing) => isValueEqual(existing, value))) {
			result.push(value)
		}

		return result
	}, [])
}
