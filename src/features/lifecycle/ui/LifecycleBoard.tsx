import { useEffect, useMemo, useRef, useState } from 'react'

import {
	BoardCollapsibleSection,
	BoardEmptyState,
	BoardLoadingState,
	BoardRoot,
	BoardSectionContextMenu,
	type BoardSection,
} from '@/shared/ui/board'
import { useSectionSelection } from '@/features/bulk-action'
import { entityBoardMutedIconClass } from '@/shared/ui/patterns/entity-board'
import type { LifecycleEntry, LifecycleMode } from '@/shared/types'
import { ArchiveIcon, BoxIcon, FolderIcon, TrashIcon } from 'lucide-react'
import { LifecycleRowAdapter } from '@/features/lifecycle/ui/LifecycleRowAdapter'
import {
	EntityRowShortcutScope,
	type EntityRowShortcutState,
} from '@/features/selection/ui/EntityRowShortcutScope'

export type LifecycleBoardSection = BoardSection<LifecycleEntry>

type LifecycleBoardProps = {
	mode: LifecycleMode
	sections: LifecycleBoardSection[]
	status?: 'idle' | 'loading' | 'ready' | 'error'
	pendingEntryId: string | null
	emptyTitle: string
	emptyDescription: string
	emptyActionLabel?: string
	onEmptyAction?: () => void
	onRestore: (entry: LifecycleEntry) => void
	onRestoreEntries?: (entries: LifecycleEntry[]) => void
	onMoveToTrash?: (entry: LifecycleEntry) => void
	onMoveToTrashEntries?: (entries: LifecycleEntry[]) => void
	onPermanentlyDelete?: (entry: LifecycleEntry) => void
	onPermanentlyDeleteEntries?: (entries: LifecycleEntry[]) => void
	onOpenDetail?: (entry: LifecycleEntry) => void
	selectedEntryIdSet?: Set<string>
	focusedEntryId?: string | null
	onToggleEntrySelection?: (entryId: string) => void
	onSetFocusedEntry?: (entryId: string | null) => void
	onMoveEntryFocus?: (
		delta: number,
		options?: {
			preserveAnchor?: boolean
			selectRange?: boolean
			startFromId?: string | null
			resetAnchorToStart?: boolean
		},
	) => string | null
	onClearEntrySelection?: () => void
	onSelectAllEntries?: (entryIds: string[]) => void
}

/**
 * 生命周期页专用 board。
 * 差异只保留在 row 内容，section / row 表面全部复用 entity scene 的共享基建。
 */
export function LifecycleBoard({
	mode,
	sections,
	status = 'ready',
	pendingEntryId,
	emptyTitle,
	emptyDescription,
	emptyActionLabel,
	onEmptyAction,
	onRestore,
	onRestoreEntries,
	onMoveToTrash,
	onMoveToTrashEntries,
	onPermanentlyDelete,
	onPermanentlyDeleteEntries,
	onOpenDetail,
	selectedEntryIdSet,
	focusedEntryId = null,
	onToggleEntrySelection,
	onSetFocusedEntry,
	onMoveEntryFocus,
	onClearEntrySelection,
	onSelectAllEntries,
}: LifecycleBoardProps) {
	const visibleSections = sections.filter((section) => section.items.length > 0)
	const [openSections, setOpenSections] = useState<Set<string>>(
		() => new Set(visibleSections.map((s) => s.key)),
	)
	const hasInitializedFromDataRef = useRef(visibleSections.length > 0)

	useEffect(() => {
		if (visibleSections.length === 0) {
			hasInitializedFromDataRef.current = false
			return
		}

		if (hasInitializedFromDataRef.current) {
			return
		}

		hasInitializedFromDataRef.current = true
		setOpenSections(new Set(visibleSections.map((section) => section.key)))
	}, [visibleSections])

	if (status === 'idle' || status === 'loading') {
		return <BoardLoadingState />
	}

	if (status === 'ready' && visibleSections.length === 0) {
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

	function handleOpenChange(key: string, open: boolean) {
		setOpenSections((prev) => {
			const next = new Set(prev)
			if (open) next.add(key)
			else next.delete(key)
			return next
		})
	}

	function handleCollapseAll() {
		setOpenSections(new Set())
	}

	function handleExpandAll() {
		setOpenSections(new Set(visibleSections.map((s) => s.key)))
	}

	const visibleEntries = visibleSections
		.filter((section) => openSections.has(section.key))
		.flatMap((section) => section.items)
	const allSelectedEntries = visibleEntries.filter(
		(entry) => selectedEntryIdSet?.has(entry.id) ?? false,
	)

	return (
		<EntityRowShortcutScope
			focusedId={focusedEntryId}
			ids={visibleEntries.map((entry) => entry.id)}
			onClearSelection={onClearEntrySelection}
			onMoveFocus={onMoveEntryFocus}
			onSelectAll={onSelectAllEntries}
			onSetFocusedId={onSetFocusedEntry}
			onToggleSelection={onToggleEntrySelection}
			selectedIdSet={selectedEntryIdSet}
		>
			{(rowShortcutState) => (
				<BoardRoot>
					{visibleSections.map((section) => (
						<LifecycleBoardSectionBlock
							allSelectedEntries={allSelectedEntries}
							items={section.items}
							key={section.key}
							label={section.label}
							mode={mode}
							onCollapseAll={handleCollapseAll}
							onExpandAll={handleExpandAll}
							onOpenChange={(open) => handleOpenChange(section.key, open)}
							onOpenDetail={onOpenDetail}
							onPermanentlyDelete={onPermanentlyDelete}
							onPermanentlyDeleteEntries={onPermanentlyDeleteEntries}
							onRestore={onRestore}
							onRestoreEntries={onRestoreEntries}
							onMoveToTrash={onMoveToTrash}
							onMoveToTrashEntries={onMoveToTrashEntries}
							onToggleEntrySelection={onToggleEntrySelection}
							open={openSections.has(section.key)}
							pendingEntryId={pendingEntryId}
							rowShortcutState={rowShortcutState}
							selectedEntryIdSet={selectedEntryIdSet}
						/>
					))}
				</BoardRoot>
			)}
		</EntityRowShortcutScope>
	)
}

function LifecycleBoardSectionBlock({
	allSelectedEntries,
	label,
	items,
	mode,
	open,
	onOpenChange,
	pendingEntryId,
	onRestore,
	onRestoreEntries,
	onMoveToTrash,
	onMoveToTrashEntries,
	onPermanentlyDelete,
	onPermanentlyDeleteEntries,
	onOpenDetail,
	selectedEntryIdSet,
	onToggleEntrySelection,
	onCollapseAll,
	onExpandAll,
	rowShortcutState,
}: {
	allSelectedEntries: LifecycleEntry[]
	label: string
	items: LifecycleEntry[]
	mode: LifecycleMode
	open: boolean
	onOpenChange: (open: boolean) => void
	pendingEntryId: string | null
	onRestore: (entry: LifecycleEntry) => void
	onRestoreEntries?: (entries: LifecycleEntry[]) => void
	onMoveToTrash?: (entry: LifecycleEntry) => void
	onMoveToTrashEntries?: (entries: LifecycleEntry[]) => void
	onPermanentlyDelete?: (entry: LifecycleEntry) => void
	onPermanentlyDeleteEntries?: (entries: LifecycleEntry[]) => void
	onOpenDetail?: (entry: LifecycleEntry) => void
	selectedEntryIdSet?: Set<string>
	onToggleEntrySelection?: (entryId: string) => void
	onCollapseAll: () => void
	onExpandAll: () => void
	rowShortcutState: EntityRowShortcutState
}) {
	const sectionIds = useMemo(() => items.map((item) => item.id), [items])
	const { selectedCount, handleSelectAll, handleDeselectAll } = useSectionSelection({
		sectionIds,
		selectedIdSet: selectedEntryIdSet,
		onToggleSelection: onToggleEntrySelection,
	})

	return (
		<BoardCollapsibleSection
			contextMenuContent={
				onToggleEntrySelection ? (
					<BoardSectionContextMenu
						onCollapse={() => onOpenChange(false)}
						onCollapseAll={onCollapseAll}
						onDeselectAll={handleDeselectAll}
						onExpand={() => onOpenChange(true)}
						onExpandAll={onExpandAll}
						onSelectAll={handleSelectAll}
						open={open}
						selectedCount={selectedCount}
					/>
				) : undefined
			}
			count={items.length}
			getItemId={(_child, index) => items[index]?.id}
			icon={<LifecycleModeIcon mode={mode} />}
			label={label}
			onOpenChange={onOpenChange}
			open={open}
			selectedCount={selectedCount}
			selectedIdSet={selectedEntryIdSet}
		>
			{items.map((entry) => (
				<LifecycleRowAdapter
					actions={{
						onOpenDetail,
						onPermanentlyDelete,
						onPermanentlyDeleteEntries,
						onRestore,
						onRestoreEntries,
						onMoveToTrash,
						onMoveToTrashEntries,
						onToggleSelected: onToggleEntrySelection
							? () => onToggleEntrySelection(entry.id)
							: () => undefined,
					}}
					contextEntries={
						(selectedEntryIdSet?.has(entry.id) ?? false) && allSelectedEntries.length > 1
							? allSelectedEntries
							: undefined
					}
					key={entry.id}
					mode={mode}
					entry={entry}
					rowState={{
						isPending: pendingEntryId === entry.id,
						isSelected: selectedEntryIdSet?.has(entry.id) ?? false,
						isHovered: rowShortcutState.hoveredId === entry.id,
						hoverSource:
							rowShortcutState.hoveredId === entry.id ? rowShortcutState.hoverSource : null,
					}}
					rowShortcutHandlers={{
						onHover: rowShortcutState.onRowHover,
					}}
				/>
			))}
		</BoardCollapsibleSection>
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
