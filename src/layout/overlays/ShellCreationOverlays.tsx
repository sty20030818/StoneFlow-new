import { useNavigate } from '@tanstack/react-router'

import { openCanonicalProjectDetail } from '@/app/navigation'
import type { ProjectOption } from '@/features/project'
import { ProjectCreateContent } from '@/features/project'
import type { CustomDateDialogState } from '@/features/shell-dialogs'
import { CustomDateDialog } from '@/features/metadata-fields'
import { TaskCreateContent } from '@/features/task'
import type { CreateModalHeaderProps } from '@/shared/components/create-modal-content'
import type { Scope, Space, TaskPlacement, TaskStatus } from '@/shared/types'
import { CreateDialogHeader, CreateDialogShell } from '@/layout/CreateDialogShell'

type TaskCreateDraft = {
	projectId?: string | null
	status?: TaskStatus
	placement?: TaskPlacement
}

export type ShellCreationOverlaysProps = {
	createDialogType: 'task' | 'project' | null
	shouldDelayTaskCreateDialog: boolean
	defaultCreateSpaceId: string | null
	taskCreatePresentation: 'default' | 'fullscreen'
	taskCreateDraft: TaskCreateDraft
	spaces: Space[]
	projectOptions: ProjectOption[]
	projectsLoading: boolean
	currentScope: Scope
	customDateDialog: CustomDateDialogState | null
	closeTaskCreateDialog: () => void
	closeProjectCreateDialog: () => void
	toggleTaskCreatePresentation: () => void
	closeCustomDateDialog: () => void
}

export function ShellCreationOverlays({
	createDialogType,
	shouldDelayTaskCreateDialog,
	defaultCreateSpaceId,
	taskCreatePresentation,
	taskCreateDraft,
	spaces,
	projectOptions,
	projectsLoading,
	currentScope,
	customDateDialog,
	closeTaskCreateDialog,
	closeProjectCreateDialog,
	toggleTaskCreatePresentation,
	closeCustomDateDialog,
}: ShellCreationOverlaysProps) {
	const navigate = useNavigate({ from: '/' })
	const isTaskCreate = createDialogType === 'task'
	const title = isTaskCreate ? '新建任务' : '新建项目'
	const closeCreateDialog = isTaskCreate ? closeTaskCreateDialog : closeProjectCreateDialog
	const fullscreen = isTaskCreate && taskCreatePresentation === 'fullscreen'
	const renderHeader = (props: CreateModalHeaderProps) => (
		<CreateDialogHeader
			{...props}
			fullscreen={fullscreen}
			onClose={closeCreateDialog}
			onToggleFullscreen={isTaskCreate ? toggleTaskCreatePresentation : undefined}
			spaces={spaces}
			title={title}
		/>
	)

	return (
		<>
			{createDialogType && !shouldDelayTaskCreateDialog ? (
				<CreateDialogShell
					description={
						isTaskCreate
							? '创建新任务，设置标题、描述、状态、优先级与归属。'
							: '在目标 Space 中创建新项目，填写名称与说明。'
					}
					fullscreen={fullscreen}
					onClose={closeCreateDialog}
					open
					title={title}
				>
					{isTaskCreate ? (
						<TaskCreateContent
							currentScope={currentScope}
							initialPlacement={taskCreateDraft.placement ?? null}
							initialProjectId={taskCreateDraft.projectId ?? null}
							initialSpaceId={defaultCreateSpaceId}
							initialStatus={taskCreateDraft.status ?? 'todo'}
							onClose={closeTaskCreateDialog}
							projects={projectOptions}
							projectsLoading={projectsLoading}
							renderHeader={renderHeader}
							spaces={spaces}
						/>
					) : (
						<ProjectCreateContent
							spaces={spaces}
							initialSpaceId={defaultCreateSpaceId}
							onClose={closeProjectCreateDialog}
							onCreated={(project) => {
								void navigate({
									to: openCanonicalProjectDetail(project.id, project.spaceId) as never,
								})
							}}
							renderHeader={renderHeader}
						/>
					)}
				</CreateDialogShell>
			) : null}
			{customDateDialog ? (
				<CustomDateDialog
					hasExistingValue={customDateDialog.hasExistingValue}
					label={customDateDialog.label}
					open
					value={customDateDialog.value}
					onOpenChange={(open) => {
						if (!open) closeCustomDateDialog()
					}}
					onSubmit={(value) => {
						customDateDialog.onSubmit?.(value)
						closeCustomDateDialog()
					}}
				/>
			) : null}
		</>
	)
}
