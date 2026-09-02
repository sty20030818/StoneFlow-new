import { Alert, Button, Skeleton } from '@heroui/react'
import { ContextMenu, EmptyState } from '@heroui-pro/react'
import { ArchiveIcon, CheckIcon, ChevronRightIcon, FolderIcon, PlayIcon } from 'lucide-react'
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
import type { ProjectOverviewItem } from '@/shared/types'

import type { ProjectSection, ProjectSectionKey } from '../model/buildProjectSections'
import { ProjectRowAdapter } from './ProjectRowAdapter'

export type ProjectBoardProps = {
	sections: ProjectSection[]
	collection: GroupedCollectionInteraction<string, ProjectSectionKey>
	status: 'idle' | 'loading' | 'ready' | 'error'
	busyProjectId: string | null
	emptyTitle: string
	emptyDescription: string
	emptyActionLabel?: string
	onEmptyAction?: () => void
	onRetry: () => void | Promise<unknown>
	onOpen: (projectId: string) => void
	onComplete: (projectId: string) => void
	onReopen: (projectId: string) => void
}

/** 项目浏览表面只渲染分组与行；selection/focus 由 scene 的阶段 H collection 持有。 */
export function ProjectBoard({
	sections,
	collection,
	status,
	busyProjectId,
	emptyTitle,
	emptyDescription,
	emptyActionLabel,
	onEmptyAction,
	onRetry,
	onOpen,
	onComplete,
	onReopen,
}: ProjectBoardProps) {
	if (status === 'idle' || status === 'loading') return <ProjectBoardLoading />

	if (status === 'error') {
		return (
			<Alert role='alert' status='danger'>
				<Alert.Indicator />
				<Alert.Content>
					<Alert.Title>读取项目失败</Alert.Title>
					<Alert.Description>项目数据暂时无法读取，请稍后重试。</Alert.Description>
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
					<FolderIcon />
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

	const selectedProjects = sections
		.flatMap((section) => section.items)
		.filter((project) => collection.interaction.selectedKeys.has(project.id))

	return (
		<CollectionGridRoot
			ariaLabel='项目列表'
			className='flex min-h-0 flex-1 flex-col outline-none'
			focusIntent={collection.focusIntent}
			interaction={collection.interaction}
			onActivate={onOpen}
			onFocusIntentConsumed={collection.consumeFocusIntent}
		>
			{(rootState) => (
				<>
					{visibleSections.map((section) => (
						<ProjectBoardSection
							busyProjectId={busyProjectId}
							collection={collection}
							contextProjects={selectedProjects}
							key={section.key}
							onComplete={onComplete}
							onOpen={onOpen}
							onReopen={onReopen}
							rootState={rootState}
							section={section}
						/>
					))}
				</>
			)}
		</CollectionGridRoot>
	)
}

function ProjectBoardSection({
	section,
	collection,
	rootState,
	contextProjects,
	busyProjectId,
	onOpen,
	onComplete,
	onReopen,
}: {
	section: ProjectSection
	collection: ProjectBoardProps['collection']
	rootState: CollectionGridRootState<string>
	contextProjects: ProjectOverviewItem[]
	busyProjectId: string | null
	onOpen: ProjectBoardProps['onOpen']
	onComplete: ProjectBoardProps['onComplete']
	onReopen: ProjectBoardProps['onReopen']
}) {
	const [contextMenuOpen, setContextMenuOpen] = useState(false)
	const sectionIds = useMemo(() => section.items.map((project) => project.id), [section.items])
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
		<section className='flex flex-col' data-project-section={section.key}>
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
								<ProjectSectionStatusIcon sectionKey={section.key} />
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
					{section.items.map((project, index) => {
						const isSelected = collection.interaction.selectedKeys.has(project.id)
						const selectionPosition = getBoardRowSelectionPosition(
							project.id,
							section.items[index - 1]?.id,
							section.items[index + 1]?.id,
							collection.interaction.selectedKeys,
						)
						return (
							<BoardRowSlot key={project.id} selectionPosition={selectionPosition}>
								<CollectionGridRow
									interaction={collection.interaction}
									itemKey={project.id}
									rootState={rootState}
								>
									{({ rowProps, gridCellProps, rowRef, onContextMenuOpenChange }) => (
										<ProjectRowAdapter
											actions={{
												onCompleteProject: onComplete,
												onOpenProject: onOpen,
												onReopenProject: onReopen,
												onToggleSelected: () => collection.interaction.toggleSelection(project.id),
											}}
											contextProjects={
												isSelected && contextProjects.length > 1 ? contextProjects : undefined
											}
											gridCellProps={gridCellProps}
											onContextMenuOpenChange={onContextMenuOpenChange}
											project={project}
											rowProps={rowProps}
											rowRef={rowRef}
											rowState={{
												isFocused: rootState.focusedKey === project.id,
												focusSource:
													rootState.focusedKey === project.id ? rootState.focusSource : null,
												isPending: busyProjectId === project.id,
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

function ProjectBoardLoading() {
	return (
		<div aria-busy='true' aria-label='正在读取项目' className='flex flex-col'>
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

function ProjectSectionStatusIcon({ sectionKey }: { sectionKey: ProjectSectionKey }) {
	switch (sectionKey) {
		case 'completed':
			return (
				<span className='flex size-4 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground'>
					<CheckIcon className='size-3' />
				</span>
			)
		case 'archived':
			return <ArchiveIcon className='size-4 shrink-0 text-muted' />
		default:
			return <PlayIcon className='size-4 shrink-0 fill-current text-accent' />
	}
}
