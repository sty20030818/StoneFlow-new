import { useNavigate } from '@tanstack/react-router'

import { openCanonicalProjectDetail } from '@/app/navigation'
import type { Scope, Space, TaskPlacement, TaskStatus } from '@/shared/types'
import type { ProjectOption } from '@/features/project'
import type { CustomDateDialogState } from '@/features/shell-dialogs'
import { CreateDialogShell } from '@/layout/CreateDialogShell'
import { ProjectCreateContent } from '@/features/project'
import { TaskCreateContent } from '@/features/task'
import { CustomDateDialog } from '@/features/metadata-fields'
import { SystemStatusChip, UpdateDialog } from '@/features/update'
import type { UpdateChannel } from '@/features/update/contract'
import { ChangelogDialog } from '@/features/changelog'
import { AboutDialog } from '@/features/app-info'

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
	changelogOpen: boolean
	changelogChannel: UpdateChannel
	changelogFocusVersion?: string | null
	onChangelogOpenChange: (open: boolean) => void
	aboutOpen: boolean
	onAboutOpenChange: (open: boolean) => void
	onOpenChangelogFromAbout: () => void
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
	changelogOpen,
	changelogChannel,
	changelogFocusVersion,
	onChangelogOpenChange,
	aboutOpen,
	onAboutOpenChange,
	onOpenChangelogFromAbout,
}: ShellOverlaysProps) {
	const navigate = useNavigate({ from: '/' })

	return (
		<>
			{createDialogType && !shouldDelayTaskCreateDialog ? (
				<CreateDialogShell
					description={
						createDialogType === 'task'
							? '创建新任务，设置标题、描述、状态、优先级与归属。'
							: '在目标 Space 中创建新项目，填写名称与说明。'
					}
					fullscreen={createDialogType === 'task' && taskCreatePresentation === 'fullscreen'}
					onClose={createDialogType === 'task' ? closeTaskCreateDialog : closeProjectCreateDialog}
					onSelectSpace={setSelectedSpaceId}
					onToggleFullscreen={toggleTaskCreatePresentation}
					open
					selectedSpaceId={selectedSpaceId ?? defaultCreateSpaceId}
					showFullscreenToggle={createDialogType === 'task'}
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
					) : (
						<ProjectCreateContent
							onClose={closeProjectCreateDialog}
							onCreated={(project) => {
								void navigate({
									to: openCanonicalProjectDetail(project.id, project.spaceId) as never,
								})
							}}
							selectedSpaceId={selectedSpaceId}
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
			<ChangelogDialog
				channel={changelogChannel}
				focusVersion={changelogFocusVersion}
				open={changelogOpen}
				onOpenChange={onChangelogOpenChange}
			/>
			<AboutDialog
				open={aboutOpen}
				onOpenChange={onAboutOpenChange}
				onOpenChangelog={onOpenChangelogFromAbout}
			/>
			<SystemStatusChip />
		</>
	)
}
