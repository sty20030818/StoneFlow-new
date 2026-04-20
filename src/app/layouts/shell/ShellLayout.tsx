import type { PropsWithChildren } from 'react'

import {
	selectActiveDrawerId,
	selectActiveDrawerKind,
	selectIsCommandOpen,
	selectIsProjectCreateOpen,
	selectIsTaskCreateOpen,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import { useShellProjects } from '@/app/layouts/shell/model/useShellProjects'
import { ProjectCreateDialog } from '@/features/project/ui/ProjectCreateDialog'
import { TaskCreateDialog } from '@/features/task/ui/TaskCreateDialog'
import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { ShellFooter } from '@/app/layouts/shell/ShellFooter'
import { ShellHeader } from '@/app/layouts/shell/ShellHeader'
import { ShellMain } from '@/app/layouts/shell/ShellMain'
import { ShellSidebar } from '@/app/layouts/shell/ShellSidebar'
import type { ShellSectionKey } from '@/app/layouts/shell/types'

type ShellLayoutProps = PropsWithChildren<{
	currentSpaceId: string
	activeSection: ShellSectionKey
}>

export function ShellLayout({ children, currentSpaceId, activeSection }: ShellLayoutProps) {
	const isCommandOpen = useShellLayoutStore(selectIsCommandOpen)
	const isTaskCreateOpen = useShellLayoutStore(selectIsTaskCreateOpen)
	const isProjectCreateOpen = useShellLayoutStore(selectIsProjectCreateOpen)
	const activeDrawerKind = useShellLayoutStore(selectActiveDrawerKind)
	const activeDrawerId = useShellLayoutStore(selectActiveDrawerId)
	const {
		projects,
		isLoading: isProjectsLoading,
		error: projectsError,
	} = useShellProjects(currentSpaceId)
	const projectLinks = projects.map((project) => ({
		id: project.id,
		label: project.name,
		badge: project.status,
	}))
	const setCommandOpen = useShellLayoutStore((state) => state.setCommandOpen)
	const openTaskCreateDialog = useShellLayoutStore((state) => state.openTaskCreateDialog)
	const closeTaskCreateDialog = useShellLayoutStore((state) => state.closeTaskCreateDialog)
	const openProjectCreateDialog = useShellLayoutStore((state) => state.openProjectCreateDialog)
	const closeProjectCreateDialog = useShellLayoutStore((state) => state.closeProjectCreateDialog)
	const openDrawer = useShellLayoutStore((state) => state.openDrawer)
	const closeDrawer = useShellLayoutStore((state) => state.closeDrawer)

	return (
		<div className='sf-shell-layout relative flex h-full min-h-0 flex-col overflow-hidden bg-background'>
			<ShellHeader
				activeSection={activeSection}
				currentSpaceId={currentSpaceId}
				isCommandOpen={isCommandOpen}
				isProjectsLoading={isProjectsLoading}
				onCommandOpenChange={setCommandOpen}
				onCloseDrawer={closeDrawer}
				onOpenProjectCreateDialog={openProjectCreateDialog}
				onOpenTaskCreateDialog={openTaskCreateDialog}
				onOpenDrawer={openDrawer}
				projects={projectLinks}
				projectsError={projectsError}
			/>

			<div className='relative flex min-h-0 flex-1 overflow-hidden'>
				<ShellSidebar
					currentSpaceId={currentSpaceId}
					isProjectsLoading={isProjectsLoading}
					onOpenProjectCreateDialog={openProjectCreateDialog}
					projects={projectLinks}
					projectsError={projectsError}
				/>

				<div className='relative flex min-w-0 flex-1 flex-col overflow-hidden bg-(--sf-color-shell-chrome)'>
					<ShellMain
						activeDrawerId={activeDrawerId}
						activeDrawerKind={activeDrawerKind}
						currentSpaceId={currentSpaceId}
						onCloseDrawer={closeDrawer}
					>
						{children}
					</ShellMain>
				</div>
			</div>

			<TaskCreateDialog
				currentSpaceId={currentSpaceId}
				onClose={closeTaskCreateDialog}
				open={isTaskCreateOpen}
				projects={projects}
				projectsLoading={isProjectsLoading}
			/>

			<ProjectCreateDialog
				currentSpaceId={currentSpaceId}
				onClose={closeProjectCreateDialog}
				open={isProjectCreateOpen}
			/>

			<ShellFooter activeSection={activeSection} currentSpaceId={currentSpaceId} />
		</div>
	)
}
