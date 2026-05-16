import type { ProjectOverviewItem } from '@/shared/types'
import { formatShortDate } from '@/shared/lib/date'
import {
	CreatedAtCell,
	DueDateCell,
	IconCell,
	ProjectCell,
	RowActionButton,
	RowSelectionCell,
	RowShell,
	RowTitleCell,
	type RowSelectionGroupPosition,
} from '@/shared/ui/row'
import { FolderIcon } from 'lucide-react'

import { ProjectContextMenu } from '@/features/project/ui/ProjectContextMenu'
import { projectOverviewActionButtonClass } from '@/shared/ui/patterns/project-overview'

type ProjectRowAdapterProps = {
	project: ProjectOverviewItem
	rowState: {
		isPending: boolean
		isSelected?: boolean
	}
	selectionGroupPosition?: RowSelectionGroupPosition
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
		onToggleSelected?: (projectId: string) => void
	}
}

/**
 * ProjectRowAdapter 负责把项目实体语义翻译为统一 RowShell + Field Cells。
 */
export function ProjectRowAdapter({
	project,
	rowState,
	selectionGroupPosition,
	projectBinding,
	actions,
}: ProjectRowAdapterProps) {
	const showProjectCell = projectBinding?.showProjectCell ?? false
	const hasProjectOptions = Boolean(
		showProjectCell &&
		projectBinding?.projectOptions &&
		projectBinding.onSelectProject &&
		projectBinding.onSelectNoProject,
	)
	const hasSelection = typeof actions.onToggleSelected === 'function'
	const isSelected = rowState.isSelected ?? false

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
				selected={isSelected}
				selectionGroupPosition={selectionGroupPosition}
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
					<RowShell.Leading>
						{hasSelection ? (
							<RowSelectionCell
								ariaLabel={`选择项目 ${project.name}`}
								checked={isSelected}
								disabled={rowState.isPending}
								onCheckedChange={() => actions.onToggleSelected?.(project.id)}
							/>
						) : null}
						<IconCell icon={<FolderIcon className='size-4' />} />
					</RowShell.Leading>

					<RowShell.Title>
						<RowTitleCell title={project.name} />
					</RowShell.Title>
				</RowShell.Left>

				<RowShell.Right>
					<RowShell.Actions className='flex-wrap'>
						<ProjectActions
							completedAt={project.completedAt}
							disabled={rowState.isPending}
							projectId={project.id}
							actions={actions}
						/>
					</RowShell.Actions>
					<RowShell.Fields>
						{showProjectCell ? (
							<ProjectCell
								disabled={rowState.isPending}
								onSelectNone={hasProjectOptions ? projectBinding?.onSelectNoProject : undefined}
								onSelectProject={hasProjectOptions ? projectBinding?.onSelectProject : undefined}
								options={hasProjectOptions ? projectBinding?.projectOptions : undefined}
								projectName={null}
							/>
						) : null}
						<DueDateCell formatter={formatShortDate} value={project.dueAt} />
						<CreatedAtCell formatter={formatShortDate} value={project.createdAt} />
					</RowShell.Fields>
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
