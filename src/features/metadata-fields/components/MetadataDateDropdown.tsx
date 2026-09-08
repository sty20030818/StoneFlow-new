import type { ReactNode } from 'react'
import { Dropdown } from '@heroui/react'

import {
	type CustomDateFieldKey,
	createDueDateActionSpec,
	formatMetadataDisplayDate,
	mapMetadataActionSpecToDropdownProps,
	normalizeMetadataDateValue,
} from '@/features/metadata-fields/core'
import { useDialogStore } from '@/features/shell-dialogs'

import type { MetadataFieldButtonAppearance } from './MetadataFieldButton'
import {
	MetadataFieldDropdown,
	MetadataFieldMenu,
	type MetadataCommandShortcut,
} from './MetadataFieldDropdown'

type MetadataDateDropdownProps = {
	label: string
	value: string | null | undefined
	icon: ReactNode
	ariaLabel?: string
	tooltipLabel?: string
	buttonLabel?: string
	compact?: boolean
	buttonAppearance?: MetadataFieldButtonAppearance
	disabled?: boolean
	disabledReason?: ReactNode
	drawerOwnedOverlay?: boolean
	menuAlign?: 'start' | 'center' | 'end'
	stopPropagation?: boolean
	shortcutMode?: 'default' | 'clear-only'
	shortcut?: MetadataCommandShortcut
	hideWhenEmpty?: boolean
	onChange: (value: string | null) => void
}

export function MetadataDateDropdown({
	label,
	value,
	icon,
	ariaLabel,
	tooltipLabel,
	buttonLabel,
	compact,
	buttonAppearance = 'default',
	disabled,
	disabledReason,
	drawerOwnedOverlay,
	menuAlign,
	stopPropagation,
	shortcutMode = 'clear-only',
	shortcut,
	hideWhenEmpty = false,
	onChange,
}: MetadataDateDropdownProps) {
	const { normalizedValue, ...dateFieldProps } = useMetadataDateField({ label, value, onChange })
	if (hideWhenEmpty && !normalizedValue) {
		return null
	}
	const buttonLabelPrefix = getMetadataDateButtonLabelPrefix(label)
	const resolvedButtonLabel =
		buttonLabel ??
		(normalizedValue
			? `${buttonLabelPrefix} ${formatMetadataDisplayDate(normalizedValue)}`
			: '添加时间')

	return (
		<MetadataFieldDropdown
			{...dateFieldProps}
			ariaLabel={ariaLabel}
			buttonIcon={icon}
			buttonLabel={resolvedButtonLabel}
			buttonAppearance={buttonAppearance}
			compact={compact}
			disabled={disabled}
			disabledReason={disabledReason}
			drawerOwnedOverlay={drawerOwnedOverlay}
			menuAlign={menuAlign}
			shortcutMode={shortcutMode}
			shortcut={shortcut}
			stopPropagation={stopPropagation}
			tooltipLabel={tooltipLabel}
		/>
	)
}

export function MetadataDateSubmenu({
	label,
	value,
	icon,
	disabled,
	onChange,
}: Pick<MetadataDateDropdownProps, 'label' | 'value' | 'icon' | 'disabled' | 'onChange'>) {
	const { normalizedValue, ...dateFieldProps } = useMetadataDateField({ label, value, onChange })
	const actionLabel = `${normalizedValue ? '更改' : '设置'}${label}`

	return (
		<Dropdown.SubmenuTrigger>
			<Dropdown.Item
				aria-label={actionLabel}
				id={dateFieldProps.fieldKey}
				isDisabled={disabled}
				textValue={actionLabel}
			>
				{icon}
				<span className='min-w-0 flex-1'>{actionLabel}</span>
				{normalizedValue ? (
					<span className='text-xs text-muted tabular-nums'>
						{formatMetadataDisplayDate(normalizedValue)}
					</span>
				) : null}
				<Dropdown.SubmenuIndicator />
			</Dropdown.Item>
			<Dropdown.Popover offset={6}>
				<MetadataFieldMenu {...dateFieldProps} shortcutMode='clear-only' />
			</Dropdown.Popover>
		</Dropdown.SubmenuTrigger>
	)
}

function useMetadataDateField({
	label,
	value,
	onChange,
}: Pick<MetadataDateDropdownProps, 'label' | 'value' | 'onChange'>) {
	const openCustomDateDialog = useDialogStore((state) => state.openCustomDateDialog)
	const normalizedValue = normalizeMetadataDateValue(value)
	const spec = createDueDateActionSpec({
		currentValue: normalizedValue,
		showClearOption: Boolean(normalizedValue),
	})
	const dropdownProps = mapMetadataActionSpecToDropdownProps(spec)
	const selectedDateOptionKey = normalizedValue
		? (spec.options.find((option) => option.value === normalizedValue)?.key ?? 'custom')
		: null

	return {
		normalizedValue,
		label,
		fieldKey: getMetadataDateFieldKey(label),
		value: selectedDateOptionKey,
		values: selectedDateOptionKey ? [selectedDateOptionKey] : [],
		options: dropdownProps.options.map((option) => ({ ...option, value: option.key })),
		onSelectCustomOption: () => {
			openCustomDateDialog({
				label,
				value: normalizedValue,
				hasExistingValue: Boolean(normalizedValue),
				onSubmit: onChange,
			})
		},
		onChange: (nextValue: string | null | undefined) => {
			const selected = dropdownProps.options.find((option) => option.key === nextValue)
			onChange(selected?.value ?? null)
		},
	}
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
