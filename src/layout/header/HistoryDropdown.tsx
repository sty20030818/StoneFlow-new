import { memo, useState } from 'react'

import { getSpaceVisual } from '@/features/space'
import type { ShellRouteHistoryEntry } from '@/app/navigation'
import type { Space } from '@/shared/types'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/base/button'
import { ActionTooltip } from '@/shared/components/tooltip'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/shared/components/base/dropdown-menu'
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
		<DropdownMenu onOpenChange={handleMenuOpenChange} open={menuOpen}>
			<ActionTooltip
				onOpenChange={(nextOpen) => setTooltipOpen(menuOpen ? false : nextOpen)}
				open={tooltipOpen}
			>
				<ActionTooltip.Trigger asChild>
					<DropdownMenuTrigger asChild>
						<Button
							aria-label='打开历史记录'
							className={`${shellChromeNavCircleButtonClass} ${shellChromeNavCircleButtonExpandedClass}`}
							size='icon-sm'
							variant='ghost'
						>
							<HistoryIcon className='size-3.5' />
						</Button>
					</DropdownMenuTrigger>
				</ActionTooltip.Trigger>
				<ActionTooltip.Content>
					<ActionTooltip.Row label='打开历史记录' />
				</ActionTooltip.Content>
			</ActionTooltip>
			<DropdownMenuContent align='start' className='min-w-68'>
				<DropdownMenuLabel>最近浏览</DropdownMenuLabel>
				<DropdownMenuGroup>
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
						<DropdownMenuItem disabled>暂无历史记录</DropdownMenuItem>
					)}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
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
		<DropdownMenuItem onSelect={() => onSelect(entry)}>
			<EntryIcon className='size-3.5 shrink-0' />
			<span className={shellChromeTruncateLabelClass}>{entry.label}</span>
			{SpaceIcon && entryVisual ? (
				<span className='ml-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground'>
					<SpaceIcon className={cn('size-3', entryVisual.iconClassName)} />
					<span className='max-w-20 truncate'>{entry.spaceName}</span>
				</span>
			) : null}
		</DropdownMenuItem>
	)
})
