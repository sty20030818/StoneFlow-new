import {
	mapMetadataActionSpecToDropdownProps,
	type MetadataActionSpec,
	type MetadataDropdownMappedProps,
} from '@/features/metadata-fields/core'

export type CommandMenuMetadataOption<TValue> = {
	key: string
	value: TValue
	label: string
	leading: React.ReactNode
	digit?: string
	disabled?: boolean
	disabledReason?: string
	action?: 'select' | 'openCustomDateDialog'
}

export type CommandMenuMetadataGroup<TValue> = {
	heading: string
	placeholder?: string
	options: Array<CommandMenuMetadataOption<TValue>>
}

export function mapMetadataActionSpecToCommandMenuGroup<TValue>(
	spec: MetadataActionSpec<TValue>,
): CommandMenuMetadataGroup<TValue> {
	const dropdownProps: MetadataDropdownMappedProps<TValue> = mapMetadataActionSpecToDropdownProps(spec)

	return {
		heading: spec.headerLabel,
		placeholder: spec.commandPlaceholder,
		options: spec.options.map((option, index) => ({
			key: option.key ?? String(index),
			value: option.value,
			label: option.label,
			leading: dropdownProps.options[index]?.icon ?? null,
			digit: option.digit,
			disabled: option.disabled,
			disabledReason: option.disabledReason,
			action: option.action,
		})),
	}
}
