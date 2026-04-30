import type { ProjectOverviewItem } from '@/shared/types'
import { EmptyPage } from '@/shared/ui/base/empty'

import { ProjectOverviewRow } from '@/features/project-overview/ui/ProjectOverviewRow'

type ProjectOverviewListProps = {
	items: ProjectOverviewItem[]
	status: 'idle' | 'loading' | 'ready' | 'error'
	busyProjectId: string | null
	onOpen: (projectId: string) => void
	onComplete: (projectId: string) => void
	onReopen: (projectId: string) => void
	onArchive: (projectId: string) => void
	onDelete: (projectId: string) => void
}

export function ProjectOverviewList({
	items,
	status,
	busyProjectId,
	onOpen,
	onComplete,
	onReopen,
	onArchive,
	onDelete,
}: ProjectOverviewListProps) {
	if (status === 'loading' && items.length === 0) {
		return (
			<EmptyPage>
				<div className='rounded-[28px] border border-(--sf-color-border-subtle) bg-white/90 p-6 text-[13px] text-(--sf-color-shell-secondary)'>
					正在读取 Project Overview…
				</div>
			</EmptyPage>
		)
	}

	return (
		<div className='grid gap-3'>
			{items.map((project) => (
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
		</div>
	)
}
