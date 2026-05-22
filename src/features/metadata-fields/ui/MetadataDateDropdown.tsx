import type { ReactNode } from 'react'

import {
	createDueDateActionSpec,
	formatMetadataDisplayDate,
	mapMetadataActionSpecToDropdownProps,
	normalizeMetadataDateValue,
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
	menuAlign?: 'start' | 'center' | 'end'
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
	menuAlign,
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
	const dueDateDropdownProps = mapMetadataActionSpecToDropdownProps(spec)
	const isDueDate = label === '截止时间'
	const buttonLabelPrefix = getMetadataDateButtonLabelPrefix(label)
	const resolvedButtonLabel =
		buttonLabel ??
		(normalizedValue
			? `${buttonLabelPrefix} ${formatMetadataDisplayDate(normalizedValue)}`
			: '添加时间')

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
			headerShortcut={isDueDate ? dueDateDropdownProps.headerShortcut : undefined}
			isValueEqual={(left, right) => left === right}
			label={label}
			menuAlign={menuAlign}
			menuLabel={isDueDate ? dueDateDropdownProps.menuLabel : undefined}
			options={dueDateDropdownProps.options}
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
