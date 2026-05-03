import { useState } from 'react'

import {
	CANONICAL_BOARD_COLLAPSIBLE_CLASS,
	CANONICAL_BOARD_SECTION_HEADER_CLASS,
	CanonicalBoard,
	type CanonicalBoardSection,
} from '@/app/layouts/entity-scene/CanonicalBoard'
import type { ProjectOverviewItem } from '@/shared/types'
import { Button } from '@/shared/ui/base/button'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/ui/base/empty'
import { Badge } from '@/shared/ui/base/badge'
import { ArchiveIcon, FolderIcon, PlayIcon, CheckIcon } from 'lucide-react'

import { ProjectOverviewRow } from '@/features/project-overview/ui/ProjectOverviewRow'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/base/collapsible'

type ProjectBoardSectionKey = 'active' | 'completed' | 'archived'

type ProjectBoardProps = {
	variant: 'overview'
	items: ProjectOverviewItem[]
	status: 'idle' | 'loading' | 'ready' | 'error'
	busyProjectId: string | null
	emptyTitle: string
	emptyDescription: string
	emptyActionLabel?: string
	onEmptyAction?: () => void
	onOpen: (projectId: string) => void
	onComplete: (projectId: string) => void
	onReopen: (projectId: string) => void
	onArchive: (projectId: string) => void
	onDelete: (projectId: string) => void
}

const PROJECT_SECTION_ORDER: ProjectBoardSectionKey[] = ['active', 'completed', 'archived']

/**
 * 项目实体侧统一 board。
 * 项目总览不再使用独立卡片，而是映射到 canonical board 的 section + row 结构。
 */
export function ProjectBoard(props: ProjectBoardProps) {
	if (props.status === 'loading' && props.items.length === 0) {
		return (
			<EmptyPage>
				<div className='rounded-[28px] border border-(--sf-color-border-subtle) bg-white/90 p-6 text-[13px] text-(--sf-color-shell-secondary)'>
					正在读取项目列表…
				</div>
			</EmptyPage>
		)
	}

	if (props.status === 'ready' && props.items.length === 0) {
		return (
			<EmptyPage>
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<FolderIcon />
						</EmptyMedia>
						<EmptyTitle>{props.emptyTitle}</EmptyTitle>
						<EmptyDescription>{props.emptyDescription}</EmptyDescription>
					</EmptyHeader>
					{props.onEmptyAction && props.emptyActionLabel ? (
						<EmptyContent>
							<Button onClick={props.onEmptyAction} type='button'>
								{props.emptyActionLabel}
							</Button>
						</EmptyContent>
					) : null}
				</Empty>
			</EmptyPage>
		)
	}

	const sections = buildProjectSections(props.items).filter((section) => section.items.length > 0)

	return (
		<CanonicalBoard.Root>
			{sections.map((section) => (
				<ProjectBoardSectionBlock
					busyProjectId={props.busyProjectId}
					key={section.key}
					onArchive={props.onArchive}
					onComplete={props.onComplete}
					onDelete={props.onDelete}
					onOpen={props.onOpen}
					onReopen={props.onReopen}
					section={section}
				/>
			))}
		</CanonicalBoard.Root>
	)
}

function ProjectBoardSectionBlock({
	section,
	busyProjectId,
	onOpen,
	onComplete,
	onReopen,
	onArchive,
	onDelete,
}: {
	section: CanonicalBoardSection<ProjectOverviewItem> & {
		key: ProjectBoardSectionKey
	}
	busyProjectId: string | null
	onOpen: (projectId: string) => void
	onComplete: (projectId: string) => void
	onReopen: (projectId: string) => void
	onArchive: (projectId: string) => void
	onDelete: (projectId: string) => void
}) {
	const [open, setOpen] = useState(true)

	return (
		<Collapsible className={CANONICAL_BOARD_COLLAPSIBLE_CLASS} onOpenChange={setOpen} open={open}>
			<div className={CANONICAL_BOARD_SECTION_HEADER_CLASS}>
				<CollapsibleTrigger
					aria-label={`切换 ${section.label} 分区折叠状态`}
					className='inline-flex size-4 shrink-0 items-center justify-center border-none bg-transparent p-0 text-(--sf-color-icon-subtle) outline-none transition-none hover:bg-transparent hover:text-(--sf-color-icon-subtle) focus-visible:border-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:outline-none'
				>
					<CanonicalBoard.Chevron data-chevron />
				</CollapsibleTrigger>
				<div className='flex min-w-0 flex-1 items-center gap-2 px-1 text-sm font-semibold text-foreground'>
					<ProjectSectionStatusIcon sectionKey={section.key} />
					<span className='truncate'>{section.label}</span>
					<Badge className='ml-1 border-transparent bg-transparent shadow-none' variant='secondary'>
						{section.items.length}
					</Badge>
				</div>
				<span className='pr-1' />
			</div>

			<CollapsibleContent className='overflow-hidden px-0'>
				<CanonicalBoard.Rows>
					{section.items.map((project) => (
						<ProjectOverviewRow
							busy={busyProjectId === project.id}
							key={project.id}
							onArchive={() => onArchive(project.id)}
							onComplete={() => onComplete(project.id)}
							onDelete={() => onDelete(project.id)}
							onOpen={() => onOpen(project.id)}
							onReopen={() => onReopen(project.id)}
							project={project}
						/>
					))}
				</CanonicalBoard.Rows>
			</CollapsibleContent>
		</Collapsible>
	)
}

function buildProjectSections(
	items: ProjectOverviewItem[],
): Array<CanonicalBoardSection<ProjectOverviewItem> & { key: ProjectBoardSectionKey }> {
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
				<span className='flex size-4 shrink-0 items-center justify-center rounded-full bg-(--sf-color-project-task-status-done) text-white'>
					<CheckIcon className='size-3' />
				</span>
			)
		case 'archived':
			return (
				<span className='flex size-4 shrink-0 items-center justify-center text-(--sf-color-text-secondary)'>
					<ArchiveIcon className='size-3.5' />
				</span>
			)
		default:
			return (
				<span className='flex size-4 shrink-0 items-center justify-center text-(--sf-color-info-soft-text)'>
					<PlayIcon className='size-3 fill-current' />
				</span>
			)
	}
}
