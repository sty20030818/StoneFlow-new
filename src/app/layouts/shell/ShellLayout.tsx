import type { PropsWithChildren } from 'react'

import type { ShellSectionKey } from '@/app/layouts/shell/types'
import {
	SHELL_NAV_BADGES,
	SHELL_PROJECT_LINKS,
} from '@/app/layouts/shell/config'
import {
	selectActiveDrawerId,
	selectActiveDrawerKind,
	useDrawerStore,
} from '@/app/layouts/shell/model/useDrawerStore'
import {
	selectIsCommandOpen,
	selectIsProjectCreateOpen,
	selectIsTaskCreateOpen,
	selectProjectCreateParentId,
	selectTaskCreateProjectId,
	selectTaskCreateStatus,
	useDialogStore,
} from '@/app/layouts/shell/model/useDialogStore'
import { ShellFooter } from '@/app/layouts/shell/ShellFooter'
import { ShellHeader } from '@/app/layouts/shell/ShellHeader'
import { ShellMain } from '@/app/layouts/shell/ShellMain'
import { ShellSidebar } from '@/app/layouts/shell/ShellSidebar'
import { getProjectOptions } from '@/features/workspace'
import { ProjectCreateDialog } from '@/features/project/ui/ProjectCreateDialog'
import { TaskCreateDialog } from '@/features/task/ui/TaskCreateDialog'
import { SidebarProvider } from '@/shared/ui/base/sidebar'

type ShellLayoutProps = PropsWithChildren<{
	currentSpaceId: string
	activeSection: ShellSectionKey
}>

export function ShellLayout({ children, currentSpaceId, activeSection }: ShellLayoutProps) {
	const isCommandOpen = useDialogStore(selectIsCommandOpen)
	const isTaskCreateOpen = useDialogStore(selectIsTaskCreateOpen)
	const taskCreateProjectId = useDialogStore(selectTaskCreateProjectId)
	const taskCreateStatus = useDialogStore(selectTaskCreateStatus)
	const isProjectCreateOpen = useDialogStore(selectIsProjectCreateOpen)
	const projectCreateParentId = useDialogStore(selectProjectCreateParentId)
	const activeDrawerKind = useDrawerStore(selectActiveDrawerKind)
	const activeDrawerId = useDrawerStore(selectActiveDrawerId)
	const setCommandOpen = useDialogStore((state) => state.setCommandOpen)
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const closeTaskCreateDialog = useDialogStore((state) => state.closeTaskCreateDialog)
	const openProjectCreateDialog = useDialogStore((state) => state.openProjectCreateDialog)
	const closeProjectCreateDialog = useDialogStore((state) => state.closeProjectCreateDialog)
	const openDrawer = useDrawerStore((state) => state.openDrawer)
	const closeDrawer = useDrawerStore((state) => state.closeDrawer)

	return (
		<SidebarProvider className='sf-shell-layout relative flex h-full min-h-0 flex-col overflow-hidden bg-background'>
			<ShellHeader
				activeSection={activeSection}
				currentSpaceId={currentSpaceId}
				isCommandOpen={isCommandOpen}
				onCloseDrawer={closeDrawer}
				onCommandOpenChange={setCommandOpen}
				onOpenDrawer={openDrawer}
				onOpenProjectCreateDialog={() => openProjectCreateDialog()}
				onOpenTaskCreateDialog={() => openTaskCreateDialog()}
				projects={SHELL_PROJECT_LINKS}
			/>

			<div className='relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-(--sf-color-shell-chrome)'>
				<div className='flex min-h-0 w-(--sf-shell-sidebar-reserved-width) shrink-0 flex-col overflow-hidden transition-[width] duration-(--sf-shell-layout-sync-duration) ease-(--sf-shell-layout-sync-easing) motion-reduce:transition-none group-data-[sidebar-resizing=true]/sidebar-wrapper:transition-none'>
					<ShellSidebar
						currentSpaceId={currentSpaceId}
						navBadges={SHELL_NAV_BADGES}
						onOpenProjectCreateDialog={openProjectCreateDialog}
						projects={SHELL_PROJECT_LINKS}
					/>
				</div>

				<div className='relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-(--sf-color-shell-chrome)'>
					<ShellMain
						activeDrawerId={activeDrawerId}
						activeDrawerKind={activeDrawerKind}
						currentSpaceId={currentSpaceId}
						onCloseDrawer={closeDrawer}
						onOpenProjectCreateDialog={() => openProjectCreateDialog()}
						onOpenTaskCreateDialog={() => openTaskCreateDialog()}
					>
						{children}
					</ShellMain>
				</div>
			</div>

			<TaskCreateDialog
				currentSpaceId={currentSpaceId}
				initialProjectId={taskCreateProjectId}
				initialStatus={taskCreateStatus}
				onClose={closeTaskCreateDialog}
				open={isTaskCreateOpen}
				projects={getProjectOptions()}
				projectsLoading={false}
			/>

			<ProjectCreateDialog
				currentSpaceId={currentSpaceId}
				onClose={closeProjectCreateDialog}
				open={isProjectCreateOpen}
				parentProjectId={projectCreateParentId}
			/>

			<ShellFooter activeSection={activeSection} currentSpaceId={currentSpaceId} />
		</SidebarProvider>
	)
}
