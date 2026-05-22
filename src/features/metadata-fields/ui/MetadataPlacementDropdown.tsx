import type { ReactNode } from 'react'

import {
	findMetadataPlacementOption,
	isMetadataPlacementValueEqual,
	type MetadataPlacementOption,
	type MetadataPlacementValue,
} from '@/features/metadata-fields/core'

import { MetadataFieldDropdown } from './MetadataFieldDropdown'
import type { MetadataFieldKey } from './MetadataFieldDropdown'

export type MetadataPlacementDropdownProps = {
	label: string
	value: MetadataPlacementValue
	values?: MetadataPlacementValue[]
	options: MetadataPlacementOption[]
	menuLabel?: string
	headerShortcut?: string | null
	ariaLabel?: string
	buttonIcon?: ReactNode
	buttonLabel?: ReactNode
	compact?: boolean
	buttonAppearance?: 'default' | 'row-icon'
	disabled?: boolean
	drawerOwnedOverlay?: boolean
	menuAlign?: 'start' | 'center' | 'end'
	stopPropagation?: boolean
	shortcutMode?: 'default' | 'clear-only'
	onChange: (value: MetadataPlacementValue) => void
}

export function MetadataPlacementDropdown({
	label,
	value,
	values,
	options,
	menuLabel,
	headerShortcut,
	ariaLabel,
	buttonIcon,
	buttonLabel,
	compact,
	buttonAppearance = 'default',
	disabled,
	drawerOwnedOverlay,
	menuAlign,
	stopPropagation,
	shortcutMode = 'clear-only',
	onChange,
}: MetadataPlacementDropdownProps) {
	const currentOption = findMetadataPlacementOption(options, value)
	const resolvedValue = currentOption?.value ?? options[0]?.value

	if (!currentOption || !resolvedValue) {
		return null
	}

	return (
		<MetadataFieldDropdown
			ariaLabel={ariaLabel}
			buttonIcon={buttonIcon ?? currentOption.icon}
			buttonLabel={buttonLabel ?? currentOption.label}
			buttonAppearance={buttonAppearance}
			compact={compact}
			disabled={disabled}
			drawerOwnedOverlay={drawerOwnedOverlay}
			fieldKey={getMetadataPlacementFieldKey(label)}
			headerShortcut={headerShortcut}
			isValueEqual={isMetadataPlacementValueEqual}
			label={label}
			menuAlign={menuAlign}
			menuLabel={menuLabel}
			options={options}
			shortcutMode={shortcutMode}
			stopPropagation={stopPropagation}
			value={resolvedValue}
			values={values}
			onChange={onChange}
		/>
	)
}

function getMetadataPlacementFieldKey(label: string): MetadataFieldKey {
	switch (label) {
		case '空间':
			return 'space'
		case '父项目':
			return 'parentProject'
		default:
			return 'project'
	}
}
