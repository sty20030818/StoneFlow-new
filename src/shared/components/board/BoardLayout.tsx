import { Chip } from '@heroui/react'
import type { ComponentProps, ReactNode } from 'react'

import {
	COLLECTION_ITEM_GAP,
	COLLECTION_ROW_HEIGHT,
	COLLECTION_ROW_SIZE,
	COLLECTION_SECTION_HEADER_HEIGHT,
} from '@/shared/components/collectionGeometry'
import { cn } from '@/shared/lib/utils'

export type BoardRowSelectionPosition = 'single' | 'first' | 'middle' | 'last'

export function getBoardRowSelectionPosition(
	itemKey: string,
	previousItemKey: string | undefined,
	nextItemKey: string | undefined,
	selectedKeys: ReadonlySet<string>,
): BoardRowSelectionPosition | undefined {
	if (!selectedKeys.has(itemKey)) return undefined

	const joinsPrevious = previousItemKey !== undefined && selectedKeys.has(previousItemKey)
	const joinsNext = nextItemKey !== undefined && selectedKeys.has(nextItemKey)

	if (joinsPrevious) return joinsNext ? 'middle' : 'last'
	return joinsNext ? 'first' : 'single'
}

const ROW_SELECTION_RADIUS: Record<BoardRowSelectionPosition, string> = {
	single: 'var(--radius-surface)',
	first: 'var(--radius-surface) var(--radius-surface) 0 0',
	middle: '0',
	last: '0 0 var(--radius-surface) var(--radius-surface)',
}

export function BoardRowSlot({
	children,
	selectionPosition,
}: {
	children: ReactNode
	selectionPosition?: BoardRowSelectionPosition
}) {
	const joinsNext = selectionPosition === 'first' || selectionPosition === 'middle'

	return (
		<div
			data-board-row-slot='true'
			data-selection-group-position={selectionPosition}
			role='presentation'
			style={{ height: COLLECTION_ROW_SIZE }}
		>
			<div
				style={{
					background: selectionPosition ? 'var(--selection)' : undefined,
					borderRadius: selectionPosition ? ROW_SELECTION_RADIUS[selectionPosition] : undefined,
					height: COLLECTION_ROW_HEIGHT + (joinsNext ? COLLECTION_ITEM_GAP : 0),
					overflow: selectionPosition ? 'hidden' : undefined,
				}}
			>
				{children}
			</div>
		</div>
	)
}

type BoardSectionHeaderProps = Omit<ComponentProps<'div'>, 'children'> & {
	label: ReactNode
	count: number
	selectedCount?: number
	leading?: ReactNode
	trailing?: ReactNode
}

export function BoardSectionHeader({
	label,
	count,
	selectedCount = 0,
	leading,
	trailing,
	className,
	style,
	...props
}: BoardSectionHeaderProps) {
	return (
		<div
			{...props}
			className={cn(
				'flex min-w-0 items-center gap-2 rounded-[var(--radius-surface)] bg-default pl-3 pr-1',
				className,
			)}
			data-board-section-header='true'
			style={{ ...style, height: COLLECTION_SECTION_HEADER_HEIGHT }}
		>
			{leading ? <div className='flex shrink-0 items-center gap-1'>{leading}</div> : null}
			<div className='flex min-w-0 flex-1 items-center gap-2 px-1 text-xs font-semibold text-foreground'>
				<div className='min-w-0 truncate'>{label}</div>
				<Chip className='ml-1' size='sm' variant='tertiary'>
					{count}
				</Chip>
				{selectedCount > 0 ? (
					<Chip color='accent' size='sm' variant='soft'>
						已选 {selectedCount}
					</Chip>
				) : null}
			</div>
			{trailing ? <div className='flex shrink-0 items-center'>{trailing}</div> : null}
		</div>
	)
}
