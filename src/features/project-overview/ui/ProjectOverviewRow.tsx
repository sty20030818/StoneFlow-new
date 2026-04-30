import type { ProjectOverviewItem } from '@/shared/types'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { cn } from '@/shared/lib/utils'
import { LINEAR_CARD_BASE_CLASS, LINEAR_CARD_IDLE_CLASS } from '@/shared/ui/linearSurface'
import { FolderIcon } from 'lucide-react'

type ProjectOverviewRowProps = {
	project: ProjectOverviewItem
	busy: boolean
	onOpen: () => void
	onComplete: () => void
	onReopen: () => void
	onArchive: () => void
	onDelete: () => void
}

export function ProjectOverviewRow({
	project,
	busy,
	onOpen,
	onComplete,
	onReopen,
	onArchive,
	onDelete,
}: ProjectOverviewRowProps) {
	return (
		<div className={cn(LINEAR_CARD_BASE_CLASS, LINEAR_CARD_IDLE_CLASS)}>
			<div className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
				<div className='min-w-0 space-y-2'>
					<div className='flex items-center gap-2'>
						<span className='flex h-8 w-8 items-center justify-center rounded-2xl bg-(--sf-color-bg-surface-muted) text-(--sf-color-shell-secondary)'>
							<FolderIcon className='size-4' />
						</span>
						<div className='min-w-0'>
							<p className='truncate text-[15px] font-semibold text-foreground'>{project.name}</p>
							<p className='text-[12px] text-(--sf-color-shell-secondary)'>{project.spaceName}</p>
						</div>
					</div>
					{project.description ? (
						<p className='text-[13px] leading-6 text-(--sf-color-shell-secondary)'>
							{project.description}
						</p>
					) : null}
					<div className='flex flex-wrap items-center gap-2 text-[12px] text-(--sf-color-shell-secondary)'>
						<Badge variant='secondary'>{project.activeTaskCount} active</Badge>
						<Badge variant='outline'>{project.taskCount} tasks</Badge>
						{project.dueAt ? <Badge variant='outline'>Due {project.dueAt}</Badge> : null}
						{project.completedAt ? <Badge variant='success'>Completed</Badge> : null}
					</div>
				</div>

				<div className='flex flex-wrap items-center gap-2'>
					<Button disabled={busy} onClick={onOpen} size='sm' variant='outline'>
						打开
					</Button>
					{project.completedAt ? (
						<Button disabled={busy} onClick={onReopen} size='sm' variant='outline'>
							重开
						</Button>
					) : (
						<Button disabled={busy} onClick={onComplete} size='sm' variant='outline'>
							完成
						</Button>
					)}
					<Button disabled={busy} onClick={onArchive} size='sm' variant='outline'>
						归档
					</Button>
					<Button disabled={busy} onClick={onDelete} size='sm' variant='outline'>
						删除
					</Button>
				</div>
			</div>
		</div>
	)
}
