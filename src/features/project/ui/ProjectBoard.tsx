import { useState } from 'react'

import {
	BoardCollapsibleSection,
	BoardEmptyState,
	BoardLoadingState,
	BoardRoot,
	type BoardSection,
} from '@/shared/ui/board'
import type { ProjectOverviewItem } from '@/shared/types'
import { ArchiveIcon, FolderIcon, PlayIcon, CheckIcon } from 'lucide-react'
import { entityBoardMutedIconClass } from '@/shared/ui/patterns/entity-board'

import { ProjectRowAdapter } from '@/features/project/ui/ProjectRowAdapter'

type ProjectBoardSectionKey = 'active' | 'completed' | 'archived'

type ProjectBoardProps = {
	variant: 'overview'
	items: ProjectOverviewItem[]
	status: 'idle' | 'loading' | 'ready' | 'error'
	busyProjectId: string | null
	selectedProjectIds?: Set<string>
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
}

const PROJECT_SECTION_ORDER: ProjectBoardSectionKey[] = ['active', 'completed', 'archived']

/**
 * 项目实体侧统一 board。
 * 项目总览映射到共享 board 的 section + row 结构。
 */
export function ProjectBoard(props: ProjectBoardProps) {
	if (props.status === 'loading' && props.items.length === 0) {
		return <BoardLoadingState label='正在读取项目列表…' />
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

	return (
		<BoardRoot>
			{sections.map((section) => (
				<ProjectBoardSectionBlock
					busyProjectId={props.busyProjectId}
					key={section.key}
					onArchive={props.onArchive}
					onComplete={props.onComplete}
					onDelete={props.onDelete}
					onOpen={props.onOpen}
					onReopen={props.onReopen}
					onToggleProjectSelection={props.onToggleProjectSelection}
					section={section}
					selectedProjectIds={props.selectedProjectIds}
				/>
			))}
		</BoardRoot>
	)
}

function ProjectBoardSectionBlock({
	section,
	busyProjectId,
	selectedProjectIds,
	onOpen,
	onComplete,
	onReopen,
	onArchive,
	onDelete,
	onToggleProjectSelection,
}: {
	section: BoardSection<ProjectOverviewItem> & {
		key: ProjectBoardSectionKey
	}
	busyProjectId: string | null
	selectedProjectIds?: Set<string>
	onOpen: (projectId: string) => void
	onComplete: (projectId: string) => void
	onReopen: (projectId: string) => void
	onArchive: (projectId: string) => void
	onDelete: (projectId: string) => void
	onToggleProjectSelection?: (projectId: string) => void
}) {
	const [open, setOpen] = useState(true)

	return (
		<BoardCollapsibleSection
			count={section.items.length}
			getItemId={(_child, index) => section.items[index]?.id}
			icon={<ProjectSectionStatusIcon sectionKey={section.key} />}
			label={section.label}
			onOpenChange={setOpen}
			open={open}
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
