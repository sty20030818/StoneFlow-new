import type { ReactNode } from 'react'

import {
	createMetadataDateOptions,
	normalizeMetadataDateValue,
} from '@/features/metadata-fields/core'

import { MetadataFieldDropdown } from './MetadataFieldDropdown'

export type MetadataDateDropdownProps = {
	label: string
	value: string | null | undefined
	icon: ReactNode
	disabled?: boolean
	drawerOwnedOverlay?: boolean
	stopPropagation?: boolean
	onChange: (value: string | null) => void
}

export function MetadataDateDropdown({
	label,
	value,
	icon,
	disabled,
	drawerOwnedOverlay,
	stopPropagation,
	onChange,
}: MetadataDateDropdownProps) {
	const normalizedValue = normalizeMetadataDateValue(value)
	const options = createMetadataDateOptions(normalizedValue).map((option) => ({
		...option,
		icon,
		trailing: option.trailing ?? option.meta,
	}))
	const currentOption = options.find((option) => option.value === normalizedValue)
	const buttonLabel = normalizedValue
		? `${label} ${normalizedValue}`
		: (currentOption?.label ?? '未设置')

	return (
		<MetadataFieldDropdown
			buttonIcon={icon}
			buttonLabel={buttonLabel}
			disabled={disabled}
			drawerOwnedOverlay={drawerOwnedOverlay}
			isValueEqual={(left, right) => left === right}
			label={label}
			options={options}
			stopPropagation={stopPropagation}
			value={normalizedValue}
			onChange={onChange}
		/>
	)
}
