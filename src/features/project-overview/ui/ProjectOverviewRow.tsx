import { CanonicalBoard } from '@/app/layouts/entity-scene/CanonicalBoard'
import type { ProjectOverviewItem } from '@/shared/types'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
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
		<CanonicalBoard.Row className='items-start px-4 py-4' isPending={busy}>
			<div className='flex min-w-0 flex-1 items-start gap-3'>
				<CanonicalBoard.RowLead className='pt-0.5'>
					<span className='inline-flex size-8 items-center justify-center rounded-xl bg-(--sf-color-bg-surface-muted) text-(--sf-color-shell-secondary)'>
						<FolderIcon className='size-4' />
					</span>
				</CanonicalBoard.RowLead>

				<CanonicalBoard.RowMain>
					<div className='min-w-0 space-y-2'>
						<div className='min-w-0'>
							<p className='truncate text-sm font-semibold text-foreground'>{project.name}</p>
							<p className='text-[12px] text-(--sf-color-shell-secondary)'>{project.spaceName}</p>
						</div>
						{project.description ? (
							<p className='text-[13px] leading-6 text-(--sf-color-shell-secondary)'>
								{project.description}
							</p>
						) : null}
						<div className='flex flex-wrap items-center gap-2 text-[12px] text-(--sf-color-shell-secondary)'>
							<Badge variant='secondary'>{project.activeTaskCount} 个活跃</Badge>
							<Badge variant='outline'>{project.taskCount} 个任务</Badge>
							{project.dueAt ? <Badge variant='outline'>截止 {project.dueAt}</Badge> : null}
							{project.completedAt ? <Badge variant='success'>已完成</Badge> : null}
						</div>
					</div>
				</CanonicalBoard.RowMain>
			</div>

			<CanonicalBoard.RowActions className='flex-wrap'>
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
			</CanonicalBoard.RowActions>
		</CanonicalBoard.Row>
	)
}
