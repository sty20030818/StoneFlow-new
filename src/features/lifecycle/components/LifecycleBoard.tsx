import { Alert, Button, Chip, Skeleton } from '@heroui/react'
import { ContextMenu, EmptyState } from '@heroui-pro/react'
import { ArchiveIcon, ChevronRightIcon, TrashIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
	CollectionGridGroupTrigger,
	CollectionGridRoot,
	CollectionGridRow,
	type CollectionGridRootState,
	type GroupedCollectionInteraction,
} from '@/features/selection'
import { BoardSectionContextMenu } from '@/shared/components/board'
import { ROW_SHELL_SECTION_HEADER_CLASS } from '@/shared/components/patterns/row-tokens'
import type { LifecycleEntry, LifecycleMode } from '@/shared/types'

import type { LifecycleSection, LifecycleSectionKey } from '../model/buildLifecycleSections'
import { LifecycleRowAdapter } from './LifecycleRowAdapter'

export type LifecycleBoardSection = LifecycleSection

export type LifecycleBoardProps = {
	mode: LifecycleMode
	sections: LifecycleBoardSection[]
	collection: GroupedCollectionInteraction<string, LifecycleSectionKey>
	status?: 'idle' | 'loading' | 'ready' | 'error'
	emptyTitle: string
	emptyDescription: string
	emptyActionLabel?: string
	onEmptyAction?: () => void
	onOpenDetail?: (entry: LifecycleEntry) => void
}

/** 生命周期 Board 只组合 HeroUI 与 Stage H collection，所有写动作由行内 command 投影执行。 */
export function LifecycleBoard({
	mode,
	sections,
	collection,
	status = 'ready',
	emptyTitle,
	emptyDescription,
	emptyActionLabel,
	onEmptyAction,
	onOpenDetail,
}: LifecycleBoardProps) {
	if (status === 'idle' || status === 'loading') return <LifecycleBoardLoading />

	if (status === 'error') {
		return (
			<Alert role='alert' status='danger'>
				<Alert.Indicator />
				<Alert.Content>
					<Alert.Title>{mode === 'archive' ? '读取归档失败' : '读取回收站失败'}</Alert.Title>
					<Alert.Description>生命周期数据暂时无法读取，请稍后重试。</Alert.Description>
				</Alert.Content>
			</Alert>
		)
	}

	const visibleSections = sections.filter((section) => section.items.length > 0)
	if (visibleSections.length === 0) {
		return (
			<EmptyState className='mx-auto my-auto max-w-md'>
				<EmptyState.Header>
					{mode === 'archive' ? <ArchiveIcon /> : <TrashIcon />}
					<EmptyState.Title>{emptyTitle}</EmptyState.Title>
					<EmptyState.Description>{emptyDescription}</EmptyState.Description>
				</EmptyState.Header>
				{onEmptyAction && emptyActionLabel ? (
					<EmptyState.Content>
						<Button onPress={onEmptyAction}>{emptyActionLabel}</Button>
					</EmptyState.Content>
				) : null}
			</EmptyState>
		)
	}

	const selectedEntries = sections
		.flatMap((section) => section.items)
		.filter((entry) => collection.interaction.selectedKeys.has(entry.id))

	return (
		<CollectionGridRoot
			ariaLabel={mode === 'archive' ? '归档列表' : '回收站列表'}
			className='flex min-h-0 flex-1 flex-col gap-1 outline-none'
			focusIntent={collection.focusIntent}
			interaction={collection.interaction}
			onFocusIntentConsumed={collection.consumeFocusIntent}
		>
			{(rootState) => (
				<>
					{visibleSections.map((section) => (
						<LifecycleBoardSectionBlock
							collection={collection}
							contextEntries={selectedEntries}
							key={section.key}
							mode={mode}
							onOpenDetail={onOpenDetail}
							rootState={rootState}
							section={section}
						/>
					))}
				</>
			)}
		</CollectionGridRoot>
	)
}

function LifecycleBoardSectionBlock({
	section,
	mode,
	collection,
	rootState,
	contextEntries,
	onOpenDetail,
}: {
	section: LifecycleBoardSection
	mode: LifecycleMode
	collection: LifecycleBoardProps['collection']
	rootState: CollectionGridRootState<string>
	contextEntries: LifecycleEntry[]
	onOpenDetail?: (entry: LifecycleEntry) => void
}) {
	const [contextMenuOpen, setContextMenuOpen] = useState(false)
	const sectionIds = useMemo(() => section.items.map((entry) => entry.id), [section.items])
	const open = collection.openGroupKeys.has(section.key)
	const selectedCount = sectionIds.filter((id) =>
		collection.interaction.selectedKeys.has(id),
	).length
	const handleSelectAll = () =>
		collection.interaction.replaceSelection([...collection.interaction.selectedKeys, ...sectionIds])
	const handleDeselectAll = () =>
		collection.interaction.replaceSelection(
			[...collection.interaction.selectedKeys].filter((id) => !sectionIds.includes(id)),
		)

	return (
		<section className='flex flex-col gap-0.5 pb-1 last:pb-2' data-lifecycle-section={section.key}>
			<ContextMenu open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
				<ContextMenu.Trigger
					className={`sticky top-0 z-10 ${ROW_SHELL_SECTION_HEADER_CLASS}`}
					onDoubleClick={() => collection.setGroupOpen(section.key, !open)}
				>
					<CollectionGridGroupTrigger groupKey={section.key} rootState={rootState}>
						{({ triggerRef, onBlur }) => (
							<Button
								ref={triggerRef}
								aria-label={`${open ? '折叠' : '展开'} ${section.label}`}
								isIconOnly
								size='sm'
								variant='ghost'
								onBlur={onBlur}
								onPress={() => collection.setGroupOpen(section.key, !open)}
							>
								<ChevronRightIcon className={open ? 'size-3.5 rotate-90' : 'size-3.5'} />
							</Button>
						)}
					</CollectionGridGroupTrigger>
					<LifecycleModeIcon mode={mode} />
					<span className='min-w-0 truncate text-sm font-semibold'>{section.label}</span>
					<Chip className='tabular-nums' size='sm' variant='tertiary'>
						{section.items.length}
					</Chip>
					{selectedCount > 0 ? (
						<Chip className='tabular-nums' color='accent' size='sm' variant='soft'>
							已选 {selectedCount}
						</Chip>
					) : null}
				</ContextMenu.Trigger>
				<BoardSectionContextMenu
					onCollapse={() => collection.setGroupOpen(section.key, false)}
					onCollapseAll={collection.collapseAll}
					onDeselectAll={handleDeselectAll}
					onExpand={() => collection.setGroupOpen(section.key, true)}
					onExpandAll={collection.expandAll}
					onSelectAll={handleSelectAll}
					open={open}
					selectedCount={selectedCount}
				/>
			</ContextMenu>

			{open ? (
				<div className='flex flex-col gap-0.5' role='presentation'>
					{section.items.map((entry) => {
						const isSelected = collection.interaction.selectedKeys.has(entry.id)
						return (
							<CollectionGridRow
								interaction={collection.interaction}
								itemKey={entry.id}
								key={entry.id}
								rootState={rootState}
							>
								{({ rowProps, gridCellProps, rowRef, onContextMenuOpenChange }) => (
									<LifecycleRowAdapter
										actions={{
											onOpenDetail,
											onToggleSelected: () => collection.interaction.toggleSelection(entry.id),
										}}
										contextEntries={
											isSelected && contextEntries.length > 1 ? contextEntries : undefined
										}
										entry={entry}
										gridCellProps={gridCellProps}
										mode={mode}
										onContextMenuOpenChange={onContextMenuOpenChange}
										rowProps={rowProps}
										rowRef={rowRef}
										rowState={{
											focusSource: rootState.focusedKey === entry.id ? rootState.focusSource : null,
											isFocused: rootState.focusedKey === entry.id,
											isSelected,
										}}
									/>
								)}
							</CollectionGridRow>
						)
					})}
				</div>
			) : null}
		</section>
	)
}

function LifecycleBoardLoading() {
	return (
		<div aria-busy='true' aria-label='正在读取生命周期数据' className='flex flex-col gap-2'>
			{Array.from({ length: 2 }, (_, sectionIndex) => (
				<div className='flex flex-col gap-1' key={sectionIndex}>
					<Skeleton animationType='none' className='h-9 w-40 rounded-lg' />
					{Array.from({ length: 3 }, (_, rowIndex) => (
						<Skeleton animationType='none' className='h-11 w-full rounded-lg' key={rowIndex} />
					))}
				</div>
			))}
		</div>
	)
}

function LifecycleModeIcon({ mode }: { mode: LifecycleMode }) {
	const Icon = mode === 'archive' ? ArchiveIcon : TrashIcon
	return <Icon className='size-4 shrink-0 text-muted' />
}
