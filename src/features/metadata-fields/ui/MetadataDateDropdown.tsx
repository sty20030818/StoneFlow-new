import type { ReactNode } from 'react'

import {
	type CustomDateFieldKey,
	createDueDateActionSpec,
	formatMetadataDisplayDate,
	formatLocalDate,
	getEndOfLocalWeek,
	mapMetadataActionSpecToDropdownProps,
	normalizeMetadataDateValue,
	startOfLocalDay,
	addLocalDays,
} from '@/features/metadata-fields/core'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'

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
	const openCustomDateDialog = useDialogStore((state) => state.openCustomDateDialog)
	const normalizedValue = normalizeMetadataDateValue(value)
	if (hideWhenEmpty && !normalizedValue) {
		return null
	}
	const spec = createDueDateActionSpec({
		currentValue: normalizedValue,
		showClearOption: Boolean(normalizedValue),
	})
	const dueDateDropdownProps = mapMetadataActionSpecToDropdownProps(spec)
	const selectedDateOptionKey = getSelectedDateOptionKey(normalizedValue)
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
			values={selectedDateOptionKey ? [selectedDateOptionKey] : []}
			label={label}
			menuAlign={menuAlign}
			menuLabel={isDueDate ? dueDateDropdownProps.menuLabel : undefined}
			options={dueDateDropdownProps.options.map((option) => ({
				...option,
				value: option.key,
			}))}
			shortcutMode={shortcutMode}
			stopPropagation={stopPropagation}
			value={selectedDateOptionKey}
			onSelectCustomOption={() => {
				openCustomDateDialog({
					fieldKey: getMetadataDateFieldKey(label),
					label,
					value: normalizedValue,
					hasExistingValue: Boolean(normalizedValue),
					onSubmit: onChange,
				})
			}}
			onChange={(nextValue) => {
				const selected = dueDateDropdownProps.options.find((option) => option.key === nextValue)
				onChange(selected?.value ?? null)
			}}
		/>
	)
}

function getSelectedDateOptionKey(value: string | null) {
	if (!value) {
		return null
	}

	const today = startOfLocalDay(new Date())
	if (value === formatLocalDate(today)) {
		return 'today'
	}

	if (value === formatLocalDate(addLocalDays(today, 1))) {
		return 'tomorrow'
	}

	if (value === formatLocalDate(getEndOfLocalWeek(today))) {
		return 'this-week'
	}

	if (value === formatLocalDate(addLocalDays(today, 7))) {
		return 'one-week'
	}

	return 'custom'
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

function getMetadataDateFieldKey(label: string): CustomDateFieldKey {
	switch (label) {
		case '计划时间':
			return 'scheduledDate'
		case '提醒时间':
			return 'reminderDate'
		default:
			return 'dueDate'
	}
}
