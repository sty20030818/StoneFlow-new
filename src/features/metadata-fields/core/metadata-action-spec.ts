export type MetadataActionFieldKey =
	| 'status'
	| 'priority'
	| 'dueDate'
	| 'project'
	| 'parentProject'
	| 'space'

export type MetadataActionIconKey =
	| 'status-todo'
	| 'status-doing'
	| 'status-waiting'
	| 'status-done'
	| 'status-canceled'
	| 'priority-0'
	| 'priority-1'
	| 'priority-2'
	| 'priority-3'
	| 'priority-4'
	| 'calendar-off'
	| 'calendar-1'
	| 'calendar'
	| 'calendar-days'
	| 'calendar-cog'
	| 'calendar-x-2'
	| 'folder'
	| 'target'
	| 'space'

export type MetadataActionOption<TValue> = {
	key: string
	value: TValue
	label: string
	iconKey?: MetadataActionIconKey
	meta?: string
	disabled?: boolean
	disabledReason?: string
	digit?: string
	isEmptyValue?: boolean
	action?: 'select' | 'openCustomDateDialog'
}

export type MetadataActionSpec<TValue> = {
	fieldKey: MetadataActionFieldKey
	headerLabel: string
	headerShortcut?: string
	commandPlaceholder?: string
	options: Array<MetadataActionOption<TValue>>
}
