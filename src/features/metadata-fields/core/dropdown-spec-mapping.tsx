import type { MetadataActionSpec } from './metadata-action-spec'
import type { MetadataFieldOption } from './metadata-field.types'
import { renderMetadataActionIcon } from './metadata-icon-tokens'

export type MetadataDropdownMappedProps<TValue> = {
	menuLabel: string
	headerShortcut?: string
	options: Array<MetadataFieldOption<TValue>>
}

export function mapMetadataActionSpecToDropdownProps<TValue>(
	spec: MetadataActionSpec<TValue>,
): MetadataDropdownMappedProps<TValue> {
	return {
		menuLabel: spec.headerLabel,
		headerShortcut: spec.headerShortcut,
		options: spec.options.map((option) => ({
			key: option.key,
			value: option.value,
			label: option.label,
			icon: renderMetadataActionIcon(option.iconKey),
			trailing: option.disabledReason ?? option.meta,
			disabled: option.disabled,
			isEmptyValue: option.isEmptyValue,
			action: option.action,
		})),
	}
}
