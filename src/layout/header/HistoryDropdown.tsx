import { memo, useState } from 'react'
import { Dropdown, Tooltip } from '@heroui/react'
import { Header } from 'react-aria-components'

import { getSpaceVisual } from '@/features/space'
import type { ShellRouteHistoryEntry } from '@/app/navigation'
import type { Space } from '@/shared/types'
import { cn } from '@/shared/lib/utils'
import {
	shellChromeNavCircleButtonClass,
	shellChromeNavCircleButtonExpandedClass,
	shellChromeTruncateLabelClass,
} from '@/shared/components/patterns/shell-chrome'
import type { SpaceVisualDefinition } from '@/features/space'
import { HistoryIcon, OrbitIcon } from 'lucide-react'

const ALL_SPACES_VISUAL: SpaceVisualDefinition = {
	label: '所有空间',
	icon: OrbitIcon,
	iconClassName: 'text-[#8b5cf6]',
	iconBadgeClassName: 'bg-[#8b5cf6]',
	swatchClassName: 'bg-[#8b5cf6]',
}

type HistoryDropdownProps = {
	entries: ShellRouteHistoryEntry[]
	spaces: Space[]
	onNavigate: (entry: ShellRouteHistoryEntry) => void
}

export function HistoryDropdown({ entries, spaces, onNavigate }: HistoryDropdownProps) {
	const [menuOpen, setMenuOpen] = useState(false)
	const [tooltipOpen, setTooltipOpen] = useState(false)

	function handleMenuOpenChange(nextOpen: boolean) {
		setMenuOpen(nextOpen)
		if (nextOpen) {
			setTooltipOpen(false)
		}
	}

	return (
		<Dropdown isOpen={menuOpen} onOpenChange={handleMenuOpenChange}>
			<Tooltip
				isOpen={tooltipOpen}
				onOpenChange={(nextOpen) => setTooltipOpen(menuOpen ? false : nextOpen)}
			>
				<Dropdown.Trigger
					aria-label='打开历史记录'
					className={`${shellChromeNavCircleButtonClass} ${shellChromeNavCircleButtonExpandedClass}`}
				>
					<HistoryIcon className='size-3.5' />
				</Dropdown.Trigger>
				<Tooltip.Content>打开历史记录</Tooltip.Content>
			</Tooltip>
			<Dropdown.Popover className='min-w-68' placement='bottom start'>
				<Dropdown.Menu aria-label='最近浏览'>
					<Dropdown.Section>
						<Header className='px-2 py-1 text-xs font-medium text-muted'>最近浏览</Header>
						{entries.length > 0 ? (
							entries.map((entry) => (
								<HistoryEntryItem
									entry={entry}
									key={entry.path}
									onSelect={onNavigate}
									spaces={spaces}
								/>
							))
						) : (
							<Dropdown.Item id='empty' isDisabled textValue='暂无历史记录'>
								暂无历史记录
							</Dropdown.Item>
						)}
					</Dropdown.Section>
				</Dropdown.Menu>
			</Dropdown.Popover>
		</Dropdown>
	)
}

type HistoryEntryItemProps = {
	entry: ShellRouteHistoryEntry
	spaces: Space[]
	onSelect: (entry: ShellRouteHistoryEntry) => void
}

const HistoryEntryItem = memo(function HistoryEntryItem({
	entry,
	spaces,
	onSelect,
}: HistoryEntryItemProps) {
	const EntryIcon = entry.entryIcon
	const entrySpace = entry.spaceId ? spaces.find((s) => s.id === entry.spaceId) : null
	const entryVisual = entrySpace
		? getSpaceVisual(entrySpace)
		: !entry.spaceId
			? ALL_SPACES_VISUAL
			: null
	const SpaceIcon = entryVisual?.icon

	return (
		<Dropdown.Item id={entry.path} onAction={() => onSelect(entry)} textValue={entry.label}>
			<EntryIcon className='size-3.5 shrink-0' />
			<span className={shellChromeTruncateLabelClass}>{entry.label}</span>
			{SpaceIcon && entryVisual ? (
				<span className='ml-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground'>
					<SpaceIcon className={cn('size-3', entryVisual.iconClassName)} />
					<span className='max-w-20 truncate'>{entry.spaceName}</span>
				</span>
			) : null}
		</Dropdown.Item>
	)
})
