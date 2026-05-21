import type { ReactNode } from 'react'

import {
	createMetadataDateOptions,
	createMetadataDateOptionsConfig,
	formatMetadataDisplayDate,
	normalizeMetadataDateValue,
} from '@/features/metadata-fields/core'

import { MetadataFieldDropdown } from './MetadataFieldDropdown'

export type MetadataDateDropdownProps = {
	label: string
	value: string | null | undefined
	icon: ReactNode
	ariaLabel?: string
	buttonLabel?: string
	compact?: boolean
	buttonAppearance?: 'default' | 'row-icon'
	disabled?: boolean
	drawerOwnedOverlay?: boolean
	stopPropagation?: boolean
	shortcutMode?: 'default' | 'clear-only'
	hideWhenEmpty?: boolean
	onChange: (value: string | null) => void
}

export function MetadataDateDropdown({
	label,
	value,
	icon,
	ariaLabel,
	buttonLabel,
	compact,
	buttonAppearance = 'default',
	disabled,
	drawerOwnedOverlay,
	stopPropagation,
	shortcutMode = 'clear-only',
	hideWhenEmpty = false,
	onChange,
}: MetadataDateDropdownProps) {
	const normalizedValue = normalizeMetadataDateValue(value)
	if (hideWhenEmpty && !normalizedValue) {
		return null
	}
	const options = (
		hideWhenEmpty
			? createMetadataDateOptionsConfig({
					currentValue: normalizedValue,
					showClearOption: Boolean(normalizedValue),
				})
			: createMetadataDateOptions(normalizedValue)
	).map((option) => ({
		...option,
		icon,
		trailing: option.trailing ?? option.meta,
	}))
	const currentOption = options.find((option) => option.value === normalizedValue)
	const resolvedButtonLabel =
		buttonLabel ??
		(normalizedValue
			? `${label} ${formatMetadataDisplayDate(normalizedValue)}`
			: (currentOption?.label ?? '未设置'))

	return (
		<MetadataFieldDropdown
			ariaLabel={ariaLabel}
			buttonIcon={icon}
			buttonLabel={resolvedButtonLabel}
			buttonAppearance={buttonAppearance}
			compact={compact}
			disabled={disabled}
			drawerOwnedOverlay={drawerOwnedOverlay}
			isValueEqual={(left, right) => left === right}
			label={label}
			options={options}
			shortcutMode={shortcutMode}
			stopPropagation={stopPropagation}
			value={normalizedValue}
			onChange={onChange}
		/>
	)
}
