import { useState } from 'react'

import {
	BOARD_COLLAPSIBLE_CLASS,
	BOARD_GROUP_HEADER_CLASS,
	BoardChevron,
	BoardEmptyState,
	BoardRoot,
	BoardRows,
	type BoardSection,
} from '@/shared/ui/board'
import {
	entityBoardMutedIconClass,
	entityBoardSectionCountBadgeClass,
	entityBoardSectionHeadingClass,
	entityBoardSectionRightSpacerClass,
	entityBoardSectionToggleClass,
} from '@/shared/ui/patterns/entity-board'
import { cn } from '@/shared/lib/utils'
import type { LifecycleEntry, LifecycleMode } from '@/shared/types'
import { Badge } from '@/shared/ui/base/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/base/collapsible'
import { ArchiveIcon, BoxIcon, FolderIcon, TrashIcon } from 'lucide-react'
import {
	ROW_SHELL_META_TEXT_CLASS,
} from '@/shared/ui/row'
import { LifecycleRowAdapter } from '@/features/lifecycle/ui/LifecycleRowAdapter'

export type LifecycleBoardSection = BoardSection<LifecycleEntry>

type LifecycleBoardProps = {
	mode: LifecycleMode
	sections: LifecycleBoardSection[]
	pendingEntryId: string | null
	emptyTitle: string
	emptyDescription: string
	emptyActionLabel?: string
	onEmptyAction?: () => void
	onRestore: (entry: LifecycleEntry) => void
	onOpenDetail?: (entry: LifecycleEntry) => void
	selectedEntryIdSet?: Set<string>
	onToggleEntrySelection?: (entryId: string) => void
}

/**
 * 生命周期页专用 board。
 * 差异只保留在 row 内容，section / row 表面全部复用 entity scene 的共享基建。
 */
export function LifecycleBoard({
	mode,
	sections,
	pendingEntryId,
	emptyTitle,
	emptyDescription,
	emptyActionLabel,
	onEmptyAction,
	onRestore,
	onOpenDetail,
	selectedEntryIdSet,
	onToggleEntrySelection,
}: LifecycleBoardProps) {
	const visibleSections = sections.filter((section) => section.items.length > 0)

	if (visibleSections.length === 0) {
		return (
			<BoardEmptyState
				actionLabel={emptyActionLabel}
				description={emptyDescription}
				icon={mode === 'archive' ? <BoxIcon /> : <FolderIcon />}
				onAction={onEmptyAction}
				title={emptyTitle}
			/>
		)
	}

	return (
		<BoardRoot>
			{visibleSections.map((section) => (
				<LifecycleBoardSectionBlock
					items={section.items}
					key={section.key}
					label={section.label}
					mode={mode}
					onOpenDetail={onOpenDetail}
					onRestore={onRestore}
					onToggleEntrySelection={onToggleEntrySelection}
					pendingEntryId={pendingEntryId}
					selectedEntryIdSet={selectedEntryIdSet}
				/>
			))}
		</BoardRoot>
	)
}

function LifecycleBoardSectionBlock({
	label,
	items,
	mode,
	pendingEntryId,
	onRestore,
	onOpenDetail,
	selectedEntryIdSet,
	onToggleEntrySelection,
}: {
	label: string
	items: LifecycleEntry[]
	mode: LifecycleMode
	pendingEntryId: string | null
	onRestore: (entry: LifecycleEntry) => void
	onOpenDetail?: (entry: LifecycleEntry) => void
	selectedEntryIdSet?: Set<string>
	onToggleEntrySelection?: (entryId: string) => void
}) {
	const [open, setOpen] = useState(true)
	const selectedCount = selectedEntryIdSet
		? items.filter((item) => selectedEntryIdSet.has(item.id)).length
		: 0

	return (
		<Collapsible className={BOARD_COLLAPSIBLE_CLASS} onOpenChange={setOpen} open={open}>
			<div className={BOARD_GROUP_HEADER_CLASS}>
				<CollapsibleTrigger
					aria-label={`切换 ${label} 分区折叠状态`}
					className={entityBoardSectionToggleClass}
				>
					<BoardChevron data-chevron />
				</CollapsibleTrigger>
				<div className={entityBoardSectionHeadingClass}>
					<LifecycleModeIcon mode={mode} />
					<span className='truncate'>{label}</span>
					<Badge className={entityBoardSectionCountBadgeClass} variant='secondary'>
						{items.length}
					</Badge>
				</div>
				{selectedCount > 0 ? (
					<span className={cn(entityBoardSectionRightSpacerClass, ROW_SHELL_META_TEXT_CLASS)}>
						已选 {selectedCount} 项
					</span>
				) : (
					<span className={entityBoardSectionRightSpacerClass} />
				)}
			</div>

			<CollapsibleContent className='overflow-hidden px-0'>
				<BoardRows>
					{items.map((entry) => (
						<LifecycleRowAdapter
							actions={{
								onOpenDetail,
								onRestore,
								onToggleSelected: onToggleEntrySelection
									? () => onToggleEntrySelection(entry.id)
									: () => undefined,
							}}
							key={entry.id}
							mode={mode}
							entry={entry}
							rowState={{
								isPending: pendingEntryId === entry.id,
								isSelected: selectedEntryIdSet?.has(entry.id) ?? false,
							}}
						/>
					))}
				</BoardRows>
			</CollapsibleContent>
		</Collapsible>
	)
}

function LifecycleModeIcon({ mode }: { mode: LifecycleMode }) {
	const Icon = mode === 'archive' ? ArchiveIcon : TrashIcon
	return (
		<span className={entityBoardMutedIconClass}>
			<Icon className='size-3.5' />
		</span>
	)
}
