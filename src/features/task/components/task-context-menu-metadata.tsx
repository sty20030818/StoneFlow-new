import {
	mapMetadataActionSpecToDropdownProps,
	type MetadataActionSpec,
	type MetadataDropdownMappedProps,
} from '@/features/metadata-fields'

export type TaskContextMenuMetadataOption<TValue> = {
	key: string
	value: TValue
	label: string
	icon: React.ReactNode
	shortcut?: string
	disabled?: boolean
	trailing?: React.ReactNode
	action?: 'select' | 'openCustomDateDialog'
}

export type TaskContextMenuMetadataGroup<TValue> = {
	label: string
	options: Array<TaskContextMenuMetadataOption<TValue>>
}

export function mapMetadataActionSpecToTaskContextMenuGroup<TValue>(
	spec: MetadataActionSpec<TValue>,
): TaskContextMenuMetadataGroup<TValue> {
	const dropdownProps: MetadataDropdownMappedProps<TValue> =
		mapMetadataActionSpecToDropdownProps(spec)

	return {
		label: spec.headerLabel,
		options: spec.options.map((option, index) => ({
			key: option.key ?? String(index),
			value: option.value,
			label: option.label,
			icon: dropdownProps.options[index]?.icon ?? null,
			shortcut: option.digit,
			disabled: option.disabled,
			trailing: dropdownProps.options[index]?.trailing ?? null,
			action: option.action,
		})),
	}
}
