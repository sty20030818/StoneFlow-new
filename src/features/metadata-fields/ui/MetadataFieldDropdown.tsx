import { useMemo, type ReactNode } from 'react'

import {
	buildMetadataShortcutItems,
	defaultMetadataValueComparator,
	getMetadataFieldIndicator,
	type MetadataFieldOption,
	type MetadataValueComparator,
} from '@/features/metadata-fields/core'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { buildDigitShortcutMap, ShortcutDigitSelectLayer } from '@/shared/ui/shortcut-menu'

import { MetadataFieldButton } from './MetadataFieldButton'
import { MetadataFieldMenuItem } from './MetadataFieldMenuItem'

export type MetadataFieldDropdownProps<TValue> = {
	label: string
	value: TValue
	values?: TValue[]
	options: Array<MetadataFieldOption<TValue>>
	ariaLabel?: string
	buttonLabel?: ReactNode
	buttonIcon?: ReactNode
	compact?: boolean
	disabled?: boolean
	drawerOwnedOverlay?: boolean
	stopPropagation?: boolean
	isValueEqual?: MetadataValueComparator<TValue>
	onChange: (value: TValue) => void
}

export function MetadataFieldDropdown<TValue>({
	label,
	value,
	values,
	options,
	ariaLabel,
	buttonLabel,
	buttonIcon,
	compact,
	disabled,
	drawerOwnedOverlay,
	stopPropagation,
	isValueEqual = defaultMetadataValueComparator,
	onChange,
}: MetadataFieldDropdownProps<TValue>) {
	const currentOption = options.find((option) => isValueEqual(option.value, value)) ?? options[0]
	const selectedValues = values ?? [value]
	const shortcutItems = useMemo(() => buildMetadataShortcutItems(options), [options])
	const digitShortcutMap = useMemo(() => buildDigitShortcutMap(shortcutItems), [shortcutItems])

	if (!currentOption) {
		return null
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<MetadataFieldButton
					ariaLabel={ariaLabel ?? label}
					compact={compact}
					disabled={disabled}
					icon={buttonIcon ?? currentOption.icon}
					label={buttonLabel ?? currentOption.label}
					stopPropagation={stopPropagation}
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align='start'
				data-drawer-owned-overlay={drawerOwnedOverlay ? 'true' : undefined}
				sideOffset={6}
			>
				<ShortcutDigitSelectLayer items={shortcutItems} onSelect={(item) => onChange(item.value)} />
				<DropdownMenuLabel>{label}</DropdownMenuLabel>
				<DropdownMenuGroup>
					{options.map((option, index) => (
						<MetadataFieldMenuItem
							disabled={option.disabled}
							digit={digitShortcutMap[index]?.digit ?? ''}
							icon={option.icon}
							indicator={getMetadataFieldIndicator({
								optionValue: option.value,
								selectedValues,
								isValueEqual,
							})}
							key={option.key ?? String(index)}
							label={option.label}
							stopPropagation={stopPropagation}
							trailing={option.trailing}
							value={option.value}
							onSelect={onChange}
						/>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
