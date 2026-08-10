import type { MetadataActionSpec } from '@/features/metadata-fields/contract'
import { renderMetadataActionIcon } from '@/features/metadata-fields/presentation'

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
	return {
		heading: spec.headerLabel,
		placeholder: spec.commandPlaceholder,
		options: spec.options.map((option, index) => ({
			key: option.key ?? String(index),
			value: option.value,
			label: option.label,
			leading: renderMetadataActionIcon(option.iconKey),
			digit: option.digit,
			disabled: option.disabled,
			disabledReason: option.disabledReason,
			action: option.action,
		})),
	}
}
