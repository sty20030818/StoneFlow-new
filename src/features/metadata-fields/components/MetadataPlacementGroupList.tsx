import type { ReactNode } from 'react'
import { Dropdown } from '@heroui/react'
import { Header } from 'react-aria-components'

import type {
	MetadataFieldIndicator,
	TaskPlacementGroup,
	TaskPlacementGroupItem,
	TaskPlacementTarget,
} from '@/features/metadata-fields/core'
import { MetadataFieldMenuItem } from './MetadataFieldMenuItem'

export type MetadataPlacementGroupListProps = {
	groups: TaskPlacementGroup[]
	getIndicator: (target: TaskPlacementTarget) => MetadataFieldIndicator
	getDigit: (item: TaskPlacementGroupItem) => string
	getIcon: (item: TaskPlacementGroupItem) => ReactNode
	stopPropagation?: boolean
	onChange: (value: TaskPlacementTarget) => void
}

export function MetadataPlacementGroupList({
	groups,
	getIndicator,
	getDigit,
	getIcon,
	stopPropagation,
	onChange,
}: MetadataPlacementGroupListProps) {
	return groups.map((group) => (
		<Dropdown.Section key={group.spaceId}>
			<Header className='px-2 py-1.5 text-[12px] font-medium text-muted'>{group.heading}</Header>
			{group.items.map((item) => (
				<MetadataFieldMenuItem
					digit={getDigit(item)}
					icon={getIcon(item)}
					id={item.key}
					indicator={getIndicator(item.target)}
					key={item.key}
					label={item.title}
					stopPropagation={stopPropagation}
					trailing={item.meta}
					value={item.target}
					onSelect={onChange}
				/>
			))}
		</Dropdown.Section>
	))
}
