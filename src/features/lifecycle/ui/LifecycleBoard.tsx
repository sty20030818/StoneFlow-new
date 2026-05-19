import { useEffect, useMemo, useRef, useState } from 'react'

import {
	BoardCollapsibleSection,
	BoardEmptyState,
	BoardRoot,
	BoardSectionContextMenu,
	type BoardSection,
} from '@/shared/ui/board'
import { useSectionSelection } from '@/features/bulk-action'
import { entityBoardMutedIconClass } from '@/shared/ui/patterns/entity-board'
import { cn } from '@/shared/lib/utils'
import type { LifecycleEntry, LifecycleMode } from '@/shared/types'
import { ArchiveIcon, BoxIcon, FolderIcon, TrashIcon } from 'lucide-react'
import { ROW_SHELL_META_TEXT_CLASS } from '@/shared/ui/row'
import { LifecycleRowAdapter } from '@/features/lifecycle/ui/LifecycleRowAdapter'
import {
	EntityRowShortcutScope,
	type EntityRowShortcutState,
} from '@/features/selection/ui/EntityRowShortcutScope'

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
	pendingEntryId,
	emptyTitle,
	emptyDescription,
	emptyActionLabel,
	onEmptyAction,
	onRestore,
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
							items={section.items}
							key={section.key}
							label={section.label}
							mode={mode}
							onCollapseAll={handleCollapseAll}
							onExpandAll={handleExpandAll}
							onOpenChange={(open) => handleOpenChange(section.key, open)}
							onOpenDetail={onOpenDetail}
							onRestore={onRestore}
							onToggleEntrySelection={onToggleEntrySelection}
							open={openSections.has(section.key)}
							pendingEntryId={pendingEntryId}
							rowShortcutState={rowShortcutState}
							focusedEntryId={focusedEntryId}
							selectedEntryIdSet={selectedEntryIdSet}
						/>
					))}
				</BoardRoot>
			)}
		</EntityRowShortcutScope>
	)
}

function LifecycleBoardSectionBlock({
	label,
	items,
	mode,
	open,
	onOpenChange,
	pendingEntryId,
	onRestore,
	onOpenDetail,
	selectedEntryIdSet,
	onToggleEntrySelection,
	onCollapseAll,
	onExpandAll,
	focusedEntryId,
	rowShortcutState,
}: {
	label: string
	items: LifecycleEntry[]
	mode: LifecycleMode
	open: boolean
	onOpenChange: (open: boolean) => void
	pendingEntryId: string | null
	onRestore: (entry: LifecycleEntry) => void
	onOpenDetail?: (entry: LifecycleEntry) => void
	selectedEntryIdSet?: Set<string>
	onToggleEntrySelection?: (entryId: string) => void
	onCollapseAll: () => void
	onExpandAll: () => void
	focusedEntryId: string | null
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
			selectedIdSet={selectedEntryIdSet}
			trailing={
				selectedCount > 0 ? (
					<span className={cn('pr-1', ROW_SHELL_META_TEXT_CLASS)}>已选 {selectedCount} 项</span>
				) : undefined
			}
		>
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
						isHovered: focusedEntryId === entry.id,
						hoverSource: focusedEntryId === entry.id ? 'keyboard' : null,
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
