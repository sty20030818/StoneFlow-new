import type { ProjectOverviewItem } from '@/shared/types'
import { formatShortDate } from '@/shared/lib/date'
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
						<DueDateCell formatter={formatShortDate} value={project.dueAt} />
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
						<CreatedAtCell formatter={formatShortDate} value={project.createdAt} />
					</RowShell.Fields>

					<RowShell.Actions className='flex-wrap'>
						<ProjectActions
							completedAt={project.completedAt}
							disabled={rowState.isPending}
							projectId={project.id}
							actions={actions}
						/>
					</RowShell.Actions>
				</RowShell.Right>
			</RowShell.Root>
		</ProjectContextMenu>
	)
}

const actionButtonProps = {
	className: projectOverviewActionButtonClass,
	size: 'sm' as const,
	variant: 'outline' as const,
}

function ProjectActions({
	completedAt,
	disabled,
	projectId,
	actions,
}: {
	completedAt: string | null
	disabled: boolean
	projectId: string
	actions: ProjectRowAdapterProps['actions']
}) {
	const toggleLabel = completedAt ? '重开' : '完成'
	const onToggle = completedAt
		? () => actions.onReopenProject(projectId)
		: () => actions.onCompleteProject(projectId)

	return (
		<>
			<RowActionButton {...actionButtonProps} disabled={disabled} onClick={onToggle}>
				{toggleLabel}
			</RowActionButton>
			<RowActionButton
				{...actionButtonProps}
				disabled={disabled}
				onClick={() => actions.onArchiveProject(projectId)}
			>
				归档
			</RowActionButton>
			<RowActionButton
				{...actionButtonProps}
				disabled={disabled}
				onClick={() => actions.onDeleteProject(projectId)}
			>
				删除
			</RowActionButton>
		</>
	)
}

export type { ProjectRowAdapterProps }
