import type { ProjectOverviewItem } from '@/shared/types'
import { useDangerConfirm } from '@/features/danger-confirm'
import { formatShortDate } from '@/shared/lib/date'
import {
	createProjectParentMetadataDropdownProps,
	MetadataDateButton,
	MetadataFieldDropdown,
	projectDateMetadataIcons,
} from '@/features/metadata-fields'
import {
	CreatedAtCell,
	IconCell,
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
		isHovered?: boolean
		hoverSource?: 'pointer' | 'keyboard' | null
	}
	rowShortcutHandlers?: {
		onHover: (projectId: string | null) => void
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
	rowShortcutHandlers,
	selectionGroupPosition,
	projectBinding,
	actions,
}: ProjectRowAdapterProps) {
	const { requestDangerConfirm } = useDangerConfirm()
	const showProjectCell = projectBinding?.showProjectCell ?? false
	const hasProjectOptions = Boolean(
		showProjectCell &&
		projectBinding?.projectOptions &&
		projectBinding.onSelectProject &&
		projectBinding.onSelectNoProject,
	)
	const hasSelection = typeof actions.onToggleSelected === 'function'
	const isSelected = rowState.isSelected ?? false
	const isHovered = rowState.isHovered ?? false
	const hoverSource = rowState.hoverSource ?? null
	const projectPlacementDropdownProps = createProjectParentMetadataDropdownProps(
		projectBinding?.projectOptions ?? [],
	)

	return (
		<ProjectContextMenu
			isBusy={rowState.isPending}
			projectName={project.name}
			onMoveToTrash={() => actions.onDeleteProject(project.id)}
			onOpenProject={() => actions.onOpenProject(project.id)}
		>
			<RowShell.Root
				aria-label={`打开项目 ${project.name}`}
				data-project-id={project.id}
				interactive
				hovered={isHovered}
				hoverSource={hoverSource}
				selected={isSelected}
				selectionGroupPosition={selectionGroupPosition}
				onClick={() => actions.onOpenProject(project.id)}
				onKeyDown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault()
						actions.onOpenProject(project.id)
					}
				}}
				onMouseEnter={() => rowShortcutHandlers?.onHover(project.id)}
				onMouseLeave={() => rowShortcutHandlers?.onHover(null)}
				pending={rowState.isPending}
			>
				<RowShell.Left className='gap-3'>
					<RowShell.Leading>
						{hasSelection ? (
							<RowSelectionCell
								ariaLabel={`选择项目 ${project.name}`}
								checked={isSelected}
								disabled={rowState.isPending}
								visible={isSelected || isHovered}
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
							projectName={project.name}
							projectId={project.id}
							requestDangerConfirm={requestDangerConfirm}
							actions={actions}
						/>
					</RowShell.Actions>
					<RowShell.Fields>
						{showProjectCell ? (
							<MetadataFieldDropdown
								compact
								disabled={rowState.isPending}
								fieldKey='parentProject'
								headerShortcut={projectPlacementDropdownProps.headerShortcut}
								label='父项目'
								menuLabel={projectPlacementDropdownProps.menuLabel}
								options={projectPlacementDropdownProps.options}
								stopPropagation
								value=''
								onChange={(value: string) => {
									if (!hasProjectOptions) {
										return
									}
									if (value) {
										projectBinding?.onSelectProject?.(value)
										return
									}
									projectBinding?.onSelectNoProject?.()
								}}
							/>
						) : null}
						<MetadataDateButton
							ariaLabel={`截止 ${project.name}`}
							compact
							formatter={formatShortDate}
							icon={projectDateMetadataIcons.due}
							labelPrefix='截止'
							stopPropagation
							value={project.dueAt}
						/>
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
	projectName,
	projectId,
	requestDangerConfirm,
	actions,
}: {
	completedAt: string | null
	disabled: boolean
	projectName: string
	projectId: string
	requestDangerConfirm: ReturnType<typeof useDangerConfirm>['requestDangerConfirm']
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
				onClick={async () => {
					const confirmed = await requestDangerConfirm({
						intent: 'archive',
						entityType: 'project',
						count: 1,
						entityLabel: projectName,
					})
					if (!confirmed) {
						return
					}
					actions.onArchiveProject(projectId)
				}}
			>
				归档
			</RowActionButton>
			<RowActionButton
				{...actionButtonProps}
				disabled={disabled}
				onClick={async () => {
					const confirmed = await requestDangerConfirm({
						intent: 'trash',
						entityType: 'project',
						count: 1,
						entityLabel: projectName,
					})
					if (!confirmed) {
						return
					}
					actions.onDeleteProject(projectId)
				}}
			>
				删除
			</RowActionButton>
		</>
	)
}

export type { ProjectRowAdapterProps }
