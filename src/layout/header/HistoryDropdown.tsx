import { memo } from 'react'
import { Button, Dropdown } from '@heroui/react'
import { Header } from 'react-aria-components'

import { ALL_SPACES_VISUAL, getSpaceVisual } from '@/features/space'
import type { ShellRouteHistoryEntry } from '@/app/navigation'
import type { Space } from '@/shared/types'
import { cn } from '@/shared/lib/utils'
import { ActionTooltip } from '@/shared/components/tooltip'
import { HistoryIcon } from 'lucide-react'

type HistoryDropdownProps = {
	entries: ShellRouteHistoryEntry[]
	spaces: Space[]
	onNavigate: (entry: ShellRouteHistoryEntry) => void
}

export function HistoryDropdown({ entries, spaces, onNavigate }: HistoryDropdownProps) {
	return (
		<Dropdown>
			<ActionTooltip label='打开历史记录'>
				<Button aria-label='打开历史记录' isIconOnly size='sm' type='button' variant='ghost'>
					<HistoryIcon className='size-3.5' />
				</Button>
			</ActionTooltip>
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
			<span className='min-w-0 truncate'>{entry.label}</span>
			{SpaceIcon && entryVisual ? (
				<span className='ml-auto flex shrink-0 items-center gap-1 text-xs text-muted'>
					<SpaceIcon className={cn('size-3', entryVisual.iconClassName)} />
					<span className='max-w-20 truncate'>{entry.spaceName}</span>
				</span>
			) : null}
		</Dropdown.Item>
	)
})
