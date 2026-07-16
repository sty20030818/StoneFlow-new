import type { ReactNode } from 'react'

import type {
	MetadataFieldIndicator,
	TaskPlacementGroup,
	TaskPlacementGroupItem,
	TaskPlacementTarget,
} from '@/features/metadata-fields/core'
import {
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from '@/shared/components/base/dropdown-menu'

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
	return groups.map((group, index) => (
		<div key={group.spaceId}>
			{index > 0 ? <DropdownMenuSeparator /> : null}
			<DropdownMenuLabel className='px-2 py-1.5 text-[12px] normal-case tracking-normal text-muted-foreground'>
				{group.heading}
			</DropdownMenuLabel>
			<DropdownMenuGroup>
				{group.items.map((item) => (
					<MetadataFieldMenuItem
						digit={getDigit(item)}
						icon={getIcon(item)}
						indicator={getIndicator(item.target)}
						key={item.key}
						label={item.title}
						stopPropagation={stopPropagation}
						trailing={item.meta}
						value={item.target}
						onSelect={onChange}
					/>
				))}
			</DropdownMenuGroup>
		</div>
	))
}
