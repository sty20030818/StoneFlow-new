import type { ProjectOverviewItem } from '@/shared/types'
import { EmptyPage } from '@/shared/ui/base/empty'
import { entityBoardLoadingCardClass } from '@/shared/ui/patterns/entity-board'

import { ProjectRowAdapter } from '@/features/project/ui/ProjectRowAdapter'

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
				<div className={entityBoardLoadingCardClass}>
					正在读取 Project Overview…
				</div>
			</EmptyPage>
		)
	}

	return (
		<div className='grid gap-3'>
			{items.map((project) => (
				<ProjectRowAdapter
					actions={{
						onArchiveProject: onArchive,
						onCompleteProject: onComplete,
						onDeleteProject: onDelete,
						onOpenProject: onOpen,
						onReopenProject: onReopen,
					}}
					key={project.id}
					project={project}
					rowState={{
						isPending: busyProjectId === project.id,
					}}
				/>
			))}
		</div>
	)
}
