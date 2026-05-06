import { useMemo, useState } from 'react'

import {
	CANONICAL_BOARD_COLLAPSIBLE_CLASS,
	CANONICAL_BOARD_META_TEXT_CLASS,
	CANONICAL_BOARD_SECTION_HEADER_CLASS,
	CanonicalBoard,
	type CanonicalBoardSection,
} from '@/app/layouts/entity-scene/CanonicalBoard'
import { TaskSelectionCheckbox } from '@/features/task/ui/TaskMetadataSelect'
import {
	entityBoardMutedIconClass,
	entityBoardRowActionsClass,
	entityBoardSectionCountBadgeClass,
	entityBoardSectionHeadingClass,
	entityBoardSectionRightSpacerClass,
	entityBoardSectionToggleClass,
	entityBoardShellSecondaryIconClass,
} from '@/shared/ui/patterns/entity-board'
import { TASK_ROW_BULK_SELECTED_CLASS } from '@/features/task/ui/taskRowBulkSelected'
import { cn } from '@/shared/lib/utils'
import type { LifecycleEntry, LifecycleMode } from '@/shared/types'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/base/collapsible'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/ui/base/empty'
import { ArchiveIcon, BoxIcon, FolderIcon, ListTodoIcon, TrashIcon } from 'lucide-react'

export type LifecycleBoardSection = CanonicalBoardSection<LifecycleEntry>

type LifecycleBoardProps = {
	mode: LifecycleMode
	sections: LifecycleBoardSection[]
	pendingEntryId: string | null
	emptyTitle: string
	emptyDescription: string
	emptyActionLabel?: string
	onEmptyAction?: () => void
	onRestore: (entry: LifecycleEntry) => void
	onDeleteFromArchive?: (entry: LifecycleEntry) => void
	onPermanentlyDelete?: (entry: LifecycleEntry) => void
	onOpenDetail?: (entry: LifecycleEntry) => void
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
	onDeleteFromArchive,
	onPermanentlyDelete,
	onOpenDetail,
}: LifecycleBoardProps) {
	const visibleSections = sections.filter((section) => section.items.length > 0)

	if (visibleSections.length === 0) {
		return (
			<EmptyPage>
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							{mode === 'archive' ? <BoxIcon /> : <FolderIcon />}
						</EmptyMedia>
						<EmptyTitle>{emptyTitle}</EmptyTitle>
						<EmptyDescription>{emptyDescription}</EmptyDescription>
					</EmptyHeader>
					{onEmptyAction && emptyActionLabel ? (
						<EmptyContent>
							<Button onClick={onEmptyAction} type='button'>
								{emptyActionLabel}
							</Button>
						</EmptyContent>
					) : null}
				</Empty>
			</EmptyPage>
		)
	}

	return (
		<CanonicalBoard.Root>
			{visibleSections.map((section) => (
				<LifecycleBoardSectionBlock
					items={section.items}
					key={section.key}
					label={section.label}
					mode={mode}
					onDeleteFromArchive={onDeleteFromArchive}
					onOpenDetail={onOpenDetail}
					onPermanentlyDelete={onPermanentlyDelete}
					onRestore={onRestore}
					pendingEntryId={pendingEntryId}
				/>
			))}
		</CanonicalBoard.Root>
	)
}

function LifecycleBoardSectionBlock({
	label,
	items,
	mode,
	pendingEntryId,
	onRestore,
	onDeleteFromArchive,
	onPermanentlyDelete,
	onOpenDetail,
}: {
	label: string
	items: LifecycleEntry[]
	mode: LifecycleMode
	pendingEntryId: string | null
	onRestore: (entry: LifecycleEntry) => void
	onDeleteFromArchive?: (entry: LifecycleEntry) => void
	onPermanentlyDelete?: (entry: LifecycleEntry) => void
	onOpenDetail?: (entry: LifecycleEntry) => void
}) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
	const selectedCount = selectedIds.size
	const [open, setOpen] = useState(true)

	function toggleEntry(entryId: string) {
		setSelectedIds((prev) => {
			const next = new Set(prev)
			if (next.has(entryId)) {
				next.delete(entryId)
			} else {
				next.add(entryId)
			}
			return next
		})
	}

	return (
		<Collapsible className={CANONICAL_BOARD_COLLAPSIBLE_CLASS} onOpenChange={setOpen} open={open}>
			<div className={CANONICAL_BOARD_SECTION_HEADER_CLASS}>
				<CollapsibleTrigger
					aria-label={`切换 ${label} 分区折叠状态`}
					className={entityBoardSectionToggleClass}
				>
					<CanonicalBoard.Chevron data-chevron />
				</CollapsibleTrigger>
				<div className={entityBoardSectionHeadingClass}>
					<LifecycleModeIcon mode={mode} />
					<span className='truncate'>{label}</span>
					<Badge className={entityBoardSectionCountBadgeClass} variant='secondary'>
						{items.length}
					</Badge>
				</div>
				{selectedCount > 0 ? (
					<span className={cn(entityBoardSectionRightSpacerClass, CANONICAL_BOARD_META_TEXT_CLASS)}>
						已选 {selectedCount} 项
					</span>
				) : (
					<span className={entityBoardSectionRightSpacerClass} />
				)}
			</div>

			<CollapsibleContent className='overflow-hidden px-0'>
				<CanonicalBoard.Rows>
					{items.map((entry) => (
						<LifecycleBoardRow
							entry={entry}
							isPending={pendingEntryId === entry.id}
							isSelected={selectedIds.has(entry.id)}
							key={entry.id}
							mode={mode}
							onDeleteFromArchive={onDeleteFromArchive}
							onOpenDetail={onOpenDetail}
							onPermanentlyDelete={onPermanentlyDelete}
							onRestore={onRestore}
							onToggleSelected={() => toggleEntry(entry.id)}
						/>
					))}
				</CanonicalBoard.Rows>
			</CollapsibleContent>
		</Collapsible>
	)
}

function LifecycleBoardRow({
	entry,
	mode,
	isSelected,
	isPending,
	onToggleSelected,
	onRestore,
	onDeleteFromArchive,
	onPermanentlyDelete,
	onOpenDetail,
}: {
	entry: LifecycleEntry
	mode: LifecycleMode
	isSelected: boolean
	isPending: boolean
	onToggleSelected: () => void
	onRestore: (entry: LifecycleEntry) => void
	onDeleteFromArchive?: (entry: LifecycleEntry) => void
	onPermanentlyDelete?: (entry: LifecycleEntry) => void
	onOpenDetail?: (entry: LifecycleEntry) => void
}) {
	const Icon = useMemo(() => {
		switch (entry.entityType) {
			case 'space':
				return FolderIcon
			case 'project':
				return BoxIcon
			default:
				return ListTodoIcon
		}
	}, [entry.entityType])

	const canOpenDetail = mode === 'archive' && typeof onOpenDetail === 'function'
	const formattedDateLabel = formatLifecycleDate(
		mode === 'archive' ? entry.archivedAt : entry.deletedAt,
	)

	return (
		<CanonicalBoard.Row
			aria-label={canOpenDetail ? `打开 ${entry.title}` : undefined}
			className='cursor-default'
			data-lifecycle-entity={entry.entityType}
			isPending={isPending}
			isSelected={isSelected}
			onClick={canOpenDetail ? () => onOpenDetail?.(entry) : undefined}
			onKeyDown={
				canOpenDetail
					? (event) => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault()
								onOpenDetail?.(entry)
							}
						}
					: undefined
			}
			role={canOpenDetail ? 'button' : undefined}
			selectedClassName={TASK_ROW_BULK_SELECTED_CLASS}
			tabIndex={canOpenDetail ? 0 : undefined}
		>
			<div className='flex min-w-0 flex-1 items-center gap-2.5'>
				<CanonicalBoard.RowLead>
					<TaskSelectionCheckbox
						ariaLabel={`选择 ${entry.title}`}
						checked={isSelected}
						disabled={isPending}
						onCheckedChange={onToggleSelected}
					/>
				</CanonicalBoard.RowLead>

				<span className={entityBoardShellSecondaryIconClass}>
					<Icon className='size-4' />
				</span>

				<CanonicalBoard.RowMain>
					<p className='truncate text-sm font-medium text-foreground'>{entry.title}</p>
				</CanonicalBoard.RowMain>

				<div className={cn('hidden shrink-0 text-right md:block', CANONICAL_BOARD_META_TEXT_CLASS)}>
					{formattedDateLabel}
				</div>
			</div>

			<CanonicalBoard.RowActions
				className={entityBoardRowActionsClass}
				onClick={(event) => event.stopPropagation()}
				onKeyDown={(event) => event.stopPropagation()}
			>
				<Button
					disabled={isPending}
					onClick={() => onRestore(entry)}
					size='sm'
					type='button'
					variant='outline'
				>
					恢复
				</Button>
				{mode === 'archive' && onDeleteFromArchive ? (
					<Button
						disabled={isPending}
						onClick={() => onDeleteFromArchive(entry)}
						size='sm'
						type='button'
						variant='outline'
					>
						删除
					</Button>
				) : null}
				{mode === 'trash' && onPermanentlyDelete ? (
					<Button
						disabled={isPending}
						onClick={() => onPermanentlyDelete(entry)}
						size='sm'
						type='button'
						variant='outline'
					>
						永久删除
					</Button>
				) : null}
				{mode === 'archive' && onOpenDetail ? (
					<Button
						disabled={isPending}
						onClick={() => onOpenDetail(entry)}
						size='sm'
						type='button'
						variant='ghost'
					>
						打开
					</Button>
				) : null}
			</CanonicalBoard.RowActions>
		</CanonicalBoard.Row>
	)
}

function formatLifecycleDate(value: string | null) {
	if (!value) {
		return '-'
	}

	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}

	return new Intl.DateTimeFormat('zh-CN', {
		month: 'numeric',
		day: 'numeric',
	}).format(date)
}

function LifecycleModeIcon({ mode }: { mode: LifecycleMode }) {
	const Icon = mode === 'archive' ? ArchiveIcon : TrashIcon
	return (
		<span className={entityBoardMutedIconClass}>
			<Icon className='size-3.5' />
		</span>
	)
}
