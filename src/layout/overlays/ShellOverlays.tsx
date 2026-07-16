import type { Scope, Space, TaskPlacement, TaskStatus } from '@/shared/types'
import type { ProjectOption } from '@/features/project/model/types'
import type { CustomDateDialogState } from '@/layout/model/useDialogStore'
import { CreateDialogShell } from '@/layout/CreateDialogShell'
import { ProjectCreateContent } from '@/features/project/components/ProjectCreateContent'
import { TaskCreateContent } from '@/features/task'
import { CustomDateDialog } from '@/features/metadata-fields'
import { SystemStatusChip, UpdateDialog } from '@/features/update'

type TaskCreateDraft = {
	projectId?: string | null
	status?: TaskStatus
	placement?: TaskPlacement
}

export type ShellOverlaysProps = {
	createDialogType: 'task' | 'project' | null
	shouldDelayTaskCreateDialog: boolean
	selectedSpaceId: string | null
	defaultCreateSpaceId: string | null
	taskCreatePresentation: 'default' | 'fullscreen'
	taskCreateDraft: TaskCreateDraft
	spaces: Space[]
	projectOptions: ProjectOption[]
	projectsLoading: boolean
	currentScope: Scope
	customDateDialog: CustomDateDialogState | null
	setSelectedSpaceId: (id: string | null) => void
	closeTaskCreateDialog: () => void
	closeProjectCreateDialog: () => void
	toggleTaskCreatePresentation: () => void
	closeCustomDateDialog: () => void
}

export function ShellOverlays({
	createDialogType,
	shouldDelayTaskCreateDialog,
	selectedSpaceId,
	defaultCreateSpaceId,
	taskCreatePresentation,
	taskCreateDraft,
	spaces,
	projectOptions,
	projectsLoading,
	currentScope,
	customDateDialog,
	setSelectedSpaceId,
	closeTaskCreateDialog,
	closeProjectCreateDialog,
	toggleTaskCreatePresentation,
	closeCustomDateDialog,
}: ShellOverlaysProps) {
	return (
		<>
			<CreateDialogShell
				description={
					createDialogType === 'task'
						? '创建新任务，设置标题、描述、状态、优先级与归属。'
						: '在目标 Space 中创建新项目，填写名称与说明。'
				}
				onClose={() => {
					if (createDialogType === 'task') {
						closeTaskCreateDialog()
					} else {
						closeProjectCreateDialog()
					}
				}}
				onSelectSpace={setSelectedSpaceId}
				open={createDialogType !== null && !shouldDelayTaskCreateDialog}
				selectedSpaceId={selectedSpaceId ?? defaultCreateSpaceId}
				fullscreen={createDialogType === 'task' && taskCreatePresentation === 'fullscreen'}
				showFullscreenToggle={createDialogType === 'task'}
				onToggleFullscreen={toggleTaskCreatePresentation}
				spaces={spaces}
				title={createDialogType === 'task' ? '新建任务' : '新建项目'}
			>
				{createDialogType === 'task' ? (
					<TaskCreateContent
						currentScope={currentScope}
						initialPlacement={taskCreateDraft.placement ?? null}
						initialProjectId={taskCreateDraft.projectId ?? null}
						initialStatus={taskCreateDraft.status ?? 'todo'}
						onClose={closeTaskCreateDialog}
						projects={projectOptions}
						projectsLoading={projectsLoading}
						selectedSpaceId={selectedSpaceId ?? defaultCreateSpaceId}
						spaces={spaces}
					/>
				) : createDialogType === 'project' ? (
					<ProjectCreateContent
						onClose={closeProjectCreateDialog}
						selectedSpaceId={selectedSpaceId}
					/>
				) : null}
			</CreateDialogShell>
			{customDateDialog ? (
				<CustomDateDialog
					fieldKey={customDateDialog.fieldKey}
					hasExistingValue={customDateDialog.hasExistingValue}
					label={customDateDialog.label}
					open
					value={customDateDialog.value}
					onOpenChange={(open) => {
						if (!open) {
							closeCustomDateDialog()
						}
					}}
					onSubmit={(value) => {
						customDateDialog.onSubmit?.(value)
						closeCustomDateDialog()
					}}
				/>
			) : null}
			<UpdateDialog />
			<SystemStatusChip />
		</>
	)
}
