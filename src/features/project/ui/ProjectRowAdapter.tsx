import type { ProjectOverviewItem } from '@/shared/types'
import {
	CreatedAtCell,
	DueDateCell,
	ProjectCell,
	ReminderCell,
	RowActionButton,
	RowShell,
	RowTitleCell,
	ROW_SHELL_ENTITY_ICON_CLASS,
	ScheduledDateCell,
	TagsCell,
} from '@/shared/ui/row'
import { FolderIcon } from 'lucide-react'

import { ProjectContextMenu } from '@/features/project/ui/ProjectContextMenu'
import { projectOverviewActionButtonClass } from '@/shared/ui/patterns/project-overview'

type ProjectRowAdapterProps = {
	project: ProjectOverviewItem
	rowState: {
		isPending: boolean
	}
	projectBinding?: {
		showProjectCell?: boolean
		projectOptions?: Array<{ id: string; name: string }>
		onSelectProject?: (projectId: string) => void
		onSelectNoProject?: () => void
	}
	actions: {
		onOpenProject: (projectId: string) => void
		onCompleteProject: (projectId: string) => void
		onReopenProject: (projectId: string) => void
		onArchiveProject: (projectId: string) => void
		onDeleteProject: (projectId: string) => void
	}
}

/**
 * ProjectRowAdapter 负责把项目实体语义翻译为统一 RowShell + Field Cells。
 */
export function ProjectRowAdapter({ project, rowState, projectBinding, actions }: ProjectRowAdapterProps) {
	const showProjectCell = projectBinding?.showProjectCell ?? false
	const hasProjectOptions = Boolean(
		showProjectCell &&
			projectBinding?.projectOptions &&
			projectBinding.onSelectProject &&
			projectBinding.onSelectNoProject,
	)

	return (
		<ProjectContextMenu
			isBusy={rowState.isPending}
			onMoveToTrash={() => actions.onDeleteProject(project.id)}
			onOpenProject={() => actions.onOpenProject(project.id)}
		>
			<RowShell.Root
				aria-label={`打开项目 ${project.name}`}
				data-project-id={project.id}
				interactive
				onClick={() => actions.onOpenProject(project.id)}
				onKeyDown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault()
						actions.onOpenProject(project.id)
					}
				}}
				pending={rowState.isPending}
			>
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
						{showProjectCell ? (
							<ProjectCell
								disabled={rowState.isPending}
								onSelectNone={hasProjectOptions ? projectBinding?.onSelectNoProject : undefined}
								onSelectProject={
									hasProjectOptions ? projectBinding?.onSelectProject : undefined
								}
								options={hasProjectOptions ? projectBinding?.projectOptions : undefined}
								projectName={null}
							/>
						) : null}
						<CreatedAtCell formatter={formatProjectDate} value={project.createdAt} />
					</RowShell.Fields>

					<RowShell.Actions className='flex-wrap'>
						{project.completedAt ? (
							<RowActionButton
								className={projectOverviewActionButtonClass}
								disabled={rowState.isPending}
								onClick={() => actions.onReopenProject(project.id)}
								size='sm'
								variant='outline'
							>
								重开
							</RowActionButton>
						) : (
							<RowActionButton
								className={projectOverviewActionButtonClass}
								disabled={rowState.isPending}
								onClick={() => actions.onCompleteProject(project.id)}
								size='sm'
								variant='outline'
							>
								完成
							</RowActionButton>
						)}
						<RowActionButton
							className={projectOverviewActionButtonClass}
							disabled={rowState.isPending}
							onClick={() => actions.onArchiveProject(project.id)}
							size='sm'
							variant='outline'
						>
							归档
						</RowActionButton>
						<RowActionButton
							className={projectOverviewActionButtonClass}
							disabled={rowState.isPending}
							onClick={() => actions.onDeleteProject(project.id)}
							size='sm'
							variant='outline'
						>
							删除
						</RowActionButton>
					</RowShell.Actions>
				</RowShell.Right>
			</RowShell.Root>
		</ProjectContextMenu>
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

export type { ProjectRowAdapterProps }
