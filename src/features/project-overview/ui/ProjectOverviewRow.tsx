import type { ProjectOverviewItem } from '@/shared/types'
import {
	CreatedAtCell,
	DueDateCell,
	ReminderCell,
	RowActionButton,
	RowShell,
	RowTitleCell,
	ROW_SHELL_ENTITY_ICON_CLASS,
	ScheduledDateCell,
	TagsCell,
} from '@/shared/ui/row'
import { projectOverviewActionButtonClass } from '@/shared/ui/patterns/project-overview'
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
		<RowShell.Root pending={busy}>
			<RowShell.Left className='gap-3'>
				<RowShell.Leading className='pt-0.5'>
					<span className={ROW_SHELL_ENTITY_ICON_CLASS}>
						<FolderIcon className='size-4' />
					</span>
				</RowShell.Leading>

				<RowShell.Title>
					<RowTitleCell title={project.name} />
				</RowShell.Title>
			</RowShell.Left>

			<RowShell.Right>
				<RowShell.Fields>
					<TagsCell />
					<DueDateCell formatter={formatProjectDate} value={project.dueAt} />
					<ScheduledDateCell value={null} />
					<ReminderCell value={null} />
					<CreatedAtCell formatter={formatProjectDate} value={project.createdAt} />
				</RowShell.Fields>

				<RowShell.Actions className='flex-wrap'>
					<RowActionButton
						className={projectOverviewActionButtonClass}
						disabled={busy}
						onClick={onOpen}
						size='sm'
						variant='outline'
					>
						打开
					</RowActionButton>
					{project.completedAt ? (
						<RowActionButton
							className={projectOverviewActionButtonClass}
							disabled={busy}
							onClick={onReopen}
							size='sm'
							variant='outline'
						>
							重开
						</RowActionButton>
					) : (
						<RowActionButton
							className={projectOverviewActionButtonClass}
							disabled={busy}
							onClick={onComplete}
							size='sm'
							variant='outline'
						>
							完成
						</RowActionButton>
					)}
					<RowActionButton
						className={projectOverviewActionButtonClass}
						disabled={busy}
						onClick={onArchive}
						size='sm'
						variant='outline'
					>
						归档
					</RowActionButton>
					<RowActionButton
						className={projectOverviewActionButtonClass}
						disabled={busy}
						onClick={onDelete}
						size='sm'
						variant='outline'
					>
						删除
					</RowActionButton>
				</RowShell.Actions>
			</RowShell.Right>
		</RowShell.Root>
	)
}

function formatProjectDate(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}
	return new Intl.DateTimeFormat('zh-CN', {
		month: 'numeric',
		day: 'numeric',
	}).format(date)
}
