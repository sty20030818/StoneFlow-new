import type { ReactNode } from 'react'

export type MetadataFieldValue = string | number | boolean | null

export type MetadataFieldIndicator = 'checked' | 'mixed' | null

export type MetadataFieldOption<TValue = MetadataFieldValue> = {
	value: TValue
	label: string
	icon?: ReactNode
	trailing?: ReactNode
	disabled?: boolean
	isEmptyValue?: boolean
	key?: string
}

export type MetadataPlacementValue =
	| { kind: 'inbox' }
	| { kind: 'noProject' }
	| { kind: 'project'; projectId: string }
	| { kind: 'space'; spaceId: string }

export type MetadataPlacementOption = MetadataFieldOption<MetadataPlacementValue>

export type MetadataDateOptionKey =
	| 'none'
	| 'today'
	| 'tomorrow'
	| 'this-week'
	| 'one-week'
	| 'custom'

export type MetadataDateOption = MetadataFieldOption<string | null> & {
	key: MetadataDateOptionKey
	meta?: string
}

export type MetadataValueComparator<TValue> = (left: TValue, right: TValue) => boolean
