import type { ReactNode } from 'react'

import {
	createDueDateActionSpec,
	formatMetadataDisplayDate,
	normalizeMetadataDateValue,
	renderMetadataActionIcon,
} from '@/features/metadata-fields/core'

import { MetadataFieldDropdown } from './MetadataFieldDropdown'
import type { MetadataFieldKey } from './MetadataFieldDropdown'

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
	const spec = createDueDateActionSpec({
		currentValue: normalizedValue,
		showClearOption: Boolean(normalizedValue),
	})
	const options = spec.options.map((option) => ({
		key: option.key,
		value: option.value,
		label: option.label,
		icon: renderMetadataActionIcon(option.iconKey),
		trailing: option.disabledReason ?? option.meta,
		disabled: option.disabled,
		isEmptyValue: option.isEmptyValue,
	}))
	const buttonLabelPrefix = getMetadataDateButtonLabelPrefix(label)
	const resolvedButtonLabel =
		buttonLabel ??
		(normalizedValue
			? `${buttonLabelPrefix} ${formatMetadataDisplayDate(normalizedValue)}`
			: buttonLabelPrefix)

	return (
		<MetadataFieldDropdown
			ariaLabel={ariaLabel}
			buttonIcon={icon}
			buttonLabel={resolvedButtonLabel}
			buttonAppearance={buttonAppearance}
			compact={compact}
			disabled={disabled}
			drawerOwnedOverlay={drawerOwnedOverlay}
			fieldKey={getMetadataDateFieldKey(label)}
			headerShortcut={spec.headerShortcut}
			isValueEqual={(left, right) => left === right}
			label={label}
			menuLabel={spec.headerLabel}
			options={options}
			shortcutMode={shortcutMode}
			stopPropagation={stopPropagation}
			value={normalizedValue}
			onChange={onChange}
		/>
	)
}

function getMetadataDateButtonLabelPrefix(label: string) {
	switch (label) {
		case '计划时间':
			return '计划'
		case '提醒时间':
			return '提醒'
		default:
			return '截止'
	}
}

function getMetadataDateFieldKey(label: string): MetadataFieldKey {
	switch (label) {
		case '计划时间':
			return 'scheduledDate'
		case '提醒时间':
			return 'reminderDate'
		default:
			return 'dueDate'
	}
}
