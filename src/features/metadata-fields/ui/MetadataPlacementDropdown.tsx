import type { ReactNode } from 'react'

import {
	findMetadataPlacementOption,
	isMetadataPlacementValueEqual,
	type MetadataPlacementOption,
	type MetadataPlacementValue,
} from '@/features/metadata-fields/core'

import { MetadataFieldDropdown } from './MetadataFieldDropdown'

export type MetadataPlacementDropdownProps = {
	label: string
	value: MetadataPlacementValue
	values?: MetadataPlacementValue[]
	options: MetadataPlacementOption[]
	buttonIcon?: ReactNode
	buttonLabel?: ReactNode
	disabled?: boolean
	drawerOwnedOverlay?: boolean
	stopPropagation?: boolean
	onChange: (value: MetadataPlacementValue) => void
}

export function MetadataPlacementDropdown({
	label,
	value,
	values,
	options,
	buttonIcon,
	buttonLabel,
	disabled,
	drawerOwnedOverlay,
	stopPropagation,
	onChange,
}: MetadataPlacementDropdownProps) {
	const currentOption = findMetadataPlacementOption(options, value)
	const resolvedValue = currentOption?.value ?? options[0]?.value

	if (!currentOption || !resolvedValue) {
		return null
	}

	return (
		<MetadataFieldDropdown
			buttonIcon={buttonIcon ?? currentOption.icon}
			buttonLabel={buttonLabel ?? currentOption.label}
			disabled={disabled}
			drawerOwnedOverlay={drawerOwnedOverlay}
			isValueEqual={isMetadataPlacementValueEqual}
			label={label}
			options={options}
			stopPropagation={stopPropagation}
			value={resolvedValue}
			values={values}
			onChange={onChange}
		/>
	)
}
