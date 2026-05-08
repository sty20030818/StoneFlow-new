import { memo } from 'react'

import { getSpaceVisual } from '@/features/space/model/spaceVisuals'
import type { ShellRouteHistoryEntry } from '@/app/layouts/shell/model/useShellRouteHistory'
import type { Space } from '@/shared/types'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/base/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import {
	shellChromeNavCircleButtonClass,
	shellChromeNavCircleButtonExpandedClass,
	shellChromeTruncateLabelClass,
} from '@/shared/ui/patterns/shell-chrome'
import type { SpaceVisualDefinition } from '@/features/space/model/spaceVisuals'
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
	return (
		<DropdownMenu>
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
