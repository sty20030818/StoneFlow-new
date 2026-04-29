import type { PropsWithChildren } from 'react'

import type { ShellSectionKey } from '@/app/layouts/shell/types'
import {
	SHELL_NAV_BADGES,
	SHELL_PROJECT_LINKS,
} from '@/app/layouts/shell/config'
import {
	selectActiveDrawerId,
	selectActiveDrawerKind,
	selectIsCommandOpen,
	selectIsProjectCreateOpen,
	selectIsTaskCreateOpen,
	selectProjectCreateParentId,
	selectTaskCreateProjectId,
	selectTaskCreateStatus,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
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
	const isCommandOpen = useShellLayoutStore(selectIsCommandOpen)
	const isTaskCreateOpen = useShellLayoutStore(selectIsTaskCreateOpen)
	const taskCreateProjectId = useShellLayoutStore(selectTaskCreateProjectId)
	const taskCreateStatus = useShellLayoutStore(selectTaskCreateStatus)
	const isProjectCreateOpen = useShellLayoutStore(selectIsProjectCreateOpen)
	const projectCreateParentId = useShellLayoutStore(selectProjectCreateParentId)
	const activeDrawerKind = useShellLayoutStore(selectActiveDrawerKind)
	const activeDrawerId = useShellLayoutStore(selectActiveDrawerId)
	const setCommandOpen = useShellLayoutStore((state) => state.setCommandOpen)
	const openTaskCreateDialog = useShellLayoutStore((state) => state.openTaskCreateDialog)
	const closeTaskCreateDialog = useShellLayoutStore((state) => state.closeTaskCreateDialog)
	const openProjectCreateDialog = useShellLayoutStore((state) => state.openProjectCreateDialog)
	const closeProjectCreateDialog = useShellLayoutStore((state) => state.closeProjectCreateDialog)
	const openDrawer = useShellLayoutStore((state) => state.openDrawer)
	const closeDrawer = useShellLayoutStore((state) => state.closeDrawer)

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
