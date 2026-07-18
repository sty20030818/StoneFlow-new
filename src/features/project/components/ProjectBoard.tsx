import { useMemo, useState } from 'react'

import {
	BoardCollapsibleSection,
	BoardEmptyState,
	BoardLoadingState,
	BoardRoot,
	BoardSectionContextMenu,
	type BoardSection,
} from '@/shared/components/board'
import { useSectionSelection } from '@/features/bulk-action'
import type { ProjectOverviewItem } from '@/shared/types'
import { ArchiveIcon, FolderIcon, PlayIcon, CheckIcon } from 'lucide-react'
import { entityBoardMutedIconClass } from '@/shared/components/patterns/entity-board'

import { ProjectRowAdapter } from './ProjectRowAdapter'
import { EntityRowShortcutScope, type EntityRowShortcutState } from '@/features/selection'

type ProjectBoardSectionKey = 'active' | 'completed' | 'archived'

type ProjectBoardProps = {
	variant: 'overview'
	items: ProjectOverviewItem[]
	status: 'idle' | 'loading' | 'ready' | 'error'
	busyProjectId: string | null
	selectedProjectIds?: Set<string>
	focusedProjectId?: string | null
	emptyTitle: string
	emptyDescription: string
	emptyActionLabel?: string
	onEmptyAction?: () => void
	onOpen: (projectId: string) => void
	onComplete: (projectId: string) => void
	onReopen: (projectId: string) => void
	onArchive: (projectId: string) => void
	onDelete: (projectId: string) => void
	onToggleProjectSelection?: (projectId: string) => void
	onSetFocusedProject?: (projectId: string | null) => void
	onMoveProjectFocus?: (
		delta: number,
		options?: {
			preserveAnchor?: boolean
			selectRange?: boolean
			startFromId?: string | null
			resetAnchorToStart?: boolean
		},
	) => string | null
	onClearProjectSelection?: () => void
	onSelectAllProjects?: (projectIds: string[]) => void
}

const PROJECT_SECTION_ORDER: ProjectBoardSectionKey[] = ['active', 'completed', 'archived']

/**
 * 项目实体侧统一 board。
 * 项目总览映射到共享 board 的 section + row 结构。
 */
export function ProjectBoard(props: ProjectBoardProps) {
	const [openSections, setOpenSections] = useState<Set<string>>(
		() => new Set(PROJECT_SECTION_ORDER),
	)

	if (props.status === 'idle' || props.status === 'loading') {
		return <BoardLoadingState />
	}

	if (props.status === 'ready' && props.items.length === 0) {
		return (
			<BoardEmptyState
				actionLabel={props.emptyActionLabel}
				description={props.emptyDescription}
				icon={<FolderIcon />}
				onAction={props.onEmptyAction}
				title={props.emptyTitle}
			/>
		)
	}

	const sections = buildProjectSections(props.items).filter((section) => section.items.length > 0)

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
		setOpenSections(new Set(sections.map((s) => s.key)))
	}

	const visibleProjects = sections
		.filter((section) => openSections.has(section.key))
		.flatMap((section) => section.items)

	return (
		<EntityRowShortcutScope
			focusedId={props.focusedProjectId ?? null}
			ids={visibleProjects.map((project) => project.id)}
			onClearSelection={props.onClearProjectSelection}
			onMoveFocus={props.onMoveProjectFocus}
			onSelectAll={props.onSelectAllProjects}
			onSetFocusedId={props.onSetFocusedProject}
			onToggleSelection={props.onToggleProjectSelection}
			selectedIdSet={props.selectedProjectIds}
		>
			{(rowShortcutState) => (
				<BoardRoot>
					{sections.map((section) => (
						<ProjectBoardSectionBlock
							busyProjectId={props.busyProjectId}
							key={section.key}
							onArchive={props.onArchive}
							onCollapseAll={handleCollapseAll}
							onComplete={props.onComplete}
							onDelete={props.onDelete}
							onExpandAll={handleExpandAll}
							onOpen={props.onOpen}
							onOpenChange={(open) => handleOpenChange(section.key, open)}
							onReopen={props.onReopen}
							onToggleProjectSelection={props.onToggleProjectSelection}
							open={openSections.has(section.key)}
							section={section}
							selectedProjectIds={props.selectedProjectIds}
							rowShortcutState={rowShortcutState}
						/>
					))}
				</BoardRoot>
			)}
		</EntityRowShortcutScope>
	)
}

function ProjectBoardSectionBlock({
	section,
	busyProjectId,
	selectedProjectIds,
	open,
	onOpenChange,
	onOpen,
	onComplete,
	onReopen,
	onArchive,
	onDelete,
	onToggleProjectSelection,
	onCollapseAll,
	onExpandAll,
	rowShortcutState,
}: {
	section: BoardSection<ProjectOverviewItem> & {
		key: ProjectBoardSectionKey
	}
	busyProjectId: string | null
	selectedProjectIds?: Set<string>
	open: boolean
	onOpenChange: (open: boolean) => void
	onOpen: (projectId: string) => void
	onComplete: (projectId: string) => void
	onReopen: (projectId: string) => void
	onArchive: (projectId: string) => void
	onDelete: (projectId: string) => void
	onToggleProjectSelection?: (projectId: string) => void
	onCollapseAll: () => void
	onExpandAll: () => void
	rowShortcutState: EntityRowShortcutState
}) {
	const sectionIds = useMemo(() => section.items.map((p) => p.id), [section.items])
	const { selectedCount, handleSelectAll, handleDeselectAll } = useSectionSelection({
		sectionIds,
		selectedIdSet: selectedProjectIds,
		onToggleSelection: onToggleProjectSelection,
	})

	return (
		<BoardCollapsibleSection
			contextMenuContent={
				onToggleProjectSelection ? (
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
			count={section.items.length}
			getItemId={(_child, index) => section.items[index]?.id}
			icon={<ProjectSectionStatusIcon sectionKey={section.key} />}
			label={section.label}
			onOpenChange={onOpenChange}
			open={open}
			selectedCount={selectedCount}
			selectedIdSet={selectedProjectIds}
		>
			{section.items.map((project) => (
				<ProjectRowAdapter
					actions={{
						onArchiveProject: onArchive,
						onCompleteProject: onComplete,
						onDeleteProject: onDelete,
						onOpenProject: onOpen,
						onReopenProject: onReopen,
						onToggleSelected: onToggleProjectSelection,
					}}
					key={project.id}
					project={project}
					rowState={{
						isPending: busyProjectId === project.id,
						isSelected: selectedProjectIds?.has(project.id) ?? false,
						isHovered: rowShortcutState.hoveredId === project.id,
						hoverSource:
							rowShortcutState.hoveredId === project.id ? rowShortcutState.hoverSource : null,
					}}
					rowShortcutHandlers={{
						onHover: rowShortcutState.onRowHover,
					}}
				/>
			))}
		</BoardCollapsibleSection>
	)
}

function buildProjectSections(
	items: ProjectOverviewItem[],
): Array<BoardSection<ProjectOverviewItem> & { key: ProjectBoardSectionKey }> {
	const grouped = new Map<ProjectBoardSectionKey, ProjectOverviewItem[]>([
		['active', []],
		['completed', []],
		['archived', []],
	])

	for (const project of items) {
		grouped.get(getProjectSectionKey(project))?.push(project)
	}

	return PROJECT_SECTION_ORDER.map((key) => ({
		key,
		label: getProjectSectionLabel(key),
		items: grouped.get(key) ?? [],
	}))
}

function getProjectSectionKey(project: ProjectOverviewItem): ProjectBoardSectionKey {
	if (project.archivedAt) {
		return 'archived'
	}
	if (project.completedAt) {
		return 'completed'
	}
	return 'active'
}

function getProjectSectionLabel(key: ProjectBoardSectionKey) {
	switch (key) {
		case 'completed':
			return '已完成项目'
		case 'archived':
			return '已归档项目'
		default:
			return '进行中项目'
	}
}

function ProjectSectionStatusIcon({ sectionKey }: { sectionKey: ProjectBoardSectionKey }) {
	switch (sectionKey) {
		case 'completed':
			return (
				<span className='flex size-4 shrink-0 items-center justify-center rounded-full bg-sf-success-surface-text text-white'>
					<CheckIcon className='size-3' />
				</span>
			)
		case 'archived':
			return (
				<span className={entityBoardMutedIconClass}>
					<ArchiveIcon className='size-3.5' />
				</span>
			)
		default:
			return (
				<span className='flex size-4 shrink-0 items-center justify-center text-sf-info-soft-text'>
					<PlayIcon className='size-3 fill-current' />
				</span>
			)
	}
}
