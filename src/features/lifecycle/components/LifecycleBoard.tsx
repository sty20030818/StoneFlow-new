import { Alert, Button, Skeleton } from '@heroui/react'
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
import {
	BoardRowSlot,
	BoardSectionContextMenu,
	BoardSectionHeader,
	COLLECTION_ROW_HEIGHT,
	COLLECTION_ROW_SIZE,
	COLLECTION_SECTION_HEADER_HEIGHT,
	COLLECTION_SECTION_HEADER_SIZE,
	getBoardRowSelectionPosition,
} from '@/shared/components/board'
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
	onRetry: () => void | Promise<unknown>
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
	onRetry,
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
				<Button onPress={() => void onRetry()} size='sm' type='button' variant='danger-soft'>
					重试
				</Button>
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
			className='flex min-h-0 flex-1 flex-col outline-none'
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
		<section className='flex flex-col' data-lifecycle-section={section.key}>
			<ContextMenu open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
				<ContextMenu.Trigger
					className='sticky top-0 z-10 block'
					onDoubleClick={() => collection.setGroupOpen(section.key, !open)}
					style={{ height: COLLECTION_SECTION_HEADER_SIZE }}
				>
					<BoardSectionHeader
						count={section.items.length}
						label={section.label}
						leading={
							<>
								<CollectionGridGroupTrigger groupKey={section.key} rootState={rootState}>
									{({ triggerRef, onBlur }) => (
										<Button
											ref={triggerRef}
											aria-expanded={open}
											aria-label={`${open ? '折叠' : '展开'} ${section.label}`}
											isIconOnly
											onBlur={onBlur}
											onPress={() => collection.setGroupOpen(section.key, !open)}
											size='sm'
											variant='ghost'
										>
											<ChevronRightIcon className={open ? 'size-3.5 rotate-90' : 'size-3.5'} />
										</Button>
									)}
								</CollectionGridGroupTrigger>
								<LifecycleModeIcon mode={mode} />
							</>
						}
						selectedCount={selectedCount}
					/>
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
				<div className='flex flex-col' role='presentation'>
					{section.items.map((entry, index) => {
						const isSelected = collection.interaction.selectedKeys.has(entry.id)
						const selectionPosition = getBoardRowSelectionPosition(
							entry.id,
							section.items[index - 1]?.id,
							section.items[index + 1]?.id,
							collection.interaction.selectedKeys,
						)
						return (
							<BoardRowSlot key={entry.id} selectionPosition={selectionPosition}>
								<CollectionGridRow
									interaction={collection.interaction}
									itemKey={entry.id}
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
												focusSource:
													rootState.focusedKey === entry.id ? rootState.focusSource : null,
												isFocused: rootState.focusedKey === entry.id,
												isSelected,
											}}
										/>
									)}
								</CollectionGridRow>
							</BoardRowSlot>
						)
					})}
				</div>
			) : null}
		</section>
	)
}

function LifecycleBoardLoading() {
	return (
		<div aria-busy='true' aria-label='正在读取生命周期数据' className='flex flex-col'>
			{Array.from({ length: 2 }, (_, sectionIndex) => (
				<div className='flex flex-col' key={sectionIndex}>
					<div style={{ height: COLLECTION_SECTION_HEADER_SIZE }}>
						<Skeleton
							animationType='none'
							className='w-40'
							style={{ height: COLLECTION_SECTION_HEADER_HEIGHT }}
						/>
					</div>
					{Array.from({ length: 3 }, (_, rowIndex) => (
						<div key={rowIndex} style={{ height: COLLECTION_ROW_SIZE }}>
							<Skeleton
								animationType='none'
								className='w-full'
								style={{ height: COLLECTION_ROW_HEIGHT }}
							/>
						</div>
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
