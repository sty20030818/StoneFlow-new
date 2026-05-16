import { useMemo, useState } from 'react'

import {
	BoardCollapsibleSection,
	BoardEmptyState,
	BoardRoot,
	BoardSectionContextMenu,
	type BoardSection,
	useSectionSelection,
} from '@/shared/ui/board'
import { entityBoardMutedIconClass } from '@/shared/ui/patterns/entity-board'
import { cn } from '@/shared/lib/utils'
import type { LifecycleEntry, LifecycleMode } from '@/shared/types'
import { ArchiveIcon, BoxIcon, FolderIcon, TrashIcon } from 'lucide-react'
import { ROW_SHELL_META_TEXT_CLASS } from '@/shared/ui/row'
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
	const [openSections, setOpenSections] = useState<Set<string>>(
		() => new Set(visibleSections.map((s) => s.key)),
	)

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

	return (
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
	open,
	onOpenChange,
	pendingEntryId,
	onRestore,
	onOpenDetail,
	selectedEntryIdSet,
	onToggleEntrySelection,
	onCollapseAll,
	onExpandAll,
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
