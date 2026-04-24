import type { PropsWithChildren } from 'react'
import { startTransition } from 'react'
import { useNavigate } from 'react-router-dom'

import {
	selectActiveDrawerId,
	selectActiveDrawerKind,
	selectIsCommandOpen,
	selectIsProjectCreateOpen,
	selectIsTaskCreateOpen,
	selectProjectCreateParentId,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import { useShellProjects } from '@/app/layouts/shell/model/useShellProjects'
import { ProjectCreateDialog } from '@/features/project/ui/ProjectCreateDialog'
import { TaskCreateDialog } from '@/features/task/ui/TaskCreateDialog'
import { flattenProjectTree } from '@/features/project/model/types'
import { useShellLayoutStore } from '@/app/layouts/shell/model/useShellLayoutStore'
import { ShellFooter } from '@/app/layouts/shell/ShellFooter'
import { ShellHeader } from '@/app/layouts/shell/ShellHeader'
import { ShellMain } from '@/app/layouts/shell/ShellMain'
import { ShellSidebar } from '@/app/layouts/shell/ShellSidebar'
import { useShellNavBadges } from '@/app/layouts/shell/model/useShellNavBadges'
import { useCommandOpenListener } from '@/shared/events/commandOpen'
import { useTaskChangedListener } from '@/shared/events/taskChanged'
import { SidebarProvider } from '@/shared/ui/base/sidebar'
import type { ShellSectionKey } from '@/app/layouts/shell/types'

type ShellLayoutProps = PropsWithChildren<{
	currentSpaceId: string
	activeSection: ShellSectionKey
}>

export function ShellLayout({ children, currentSpaceId, activeSection }: ShellLayoutProps) {
	const navigate = useNavigate()
	const isCommandOpen = useShellLayoutStore(selectIsCommandOpen)
	const isTaskCreateOpen = useShellLayoutStore(selectIsTaskCreateOpen)
	const isProjectCreateOpen = useShellLayoutStore(selectIsProjectCreateOpen)
	const projectCreateParentId = useShellLayoutStore(selectProjectCreateParentId)
	const activeDrawerKind = useShellLayoutStore(selectActiveDrawerKind)
	const activeDrawerId = useShellLayoutStore(selectActiveDrawerId)
	const {
		projects,
		isLoading: isProjectsLoading,
		error: projectsError,
		refresh: refreshProjects,
	} = useShellProjects(currentSpaceId)
	const flatProjects = flattenProjectTree(projects)
	const navBadges = useShellNavBadges(currentSpaceId)
	const projectLinks = flatProjects.map((project) => ({
		id: project.id,
		label: project.name,
		badge: project.status,
	}))
	const projectTreeLinks = projects.map((project) => ({
		id: project.id,
		label: project.name,
		badge: project.status,
		children: project.children.map((childProject) => ({
			id: childProject.id,
			label: childProject.name,
			badge: childProject.status,
		})),
	}))
	const setCommandOpen = useShellLayoutStore((state) => state.setCommandOpen)
	const openTaskCreateDialog = useShellLayoutStore((state) => state.openTaskCreateDialog)
	const closeTaskCreateDialog = useShellLayoutStore((state) => state.closeTaskCreateDialog)
	const openProjectCreateDialog = useShellLayoutStore((state) => state.openProjectCreateDialog)
	const closeProjectCreateDialog = useShellLayoutStore((state) => state.closeProjectCreateDialog)
	const openDrawer = useShellLayoutStore((state) => state.openDrawer)
	const closeDrawer = useShellLayoutStore((state) => state.closeDrawer)
	const bumpTaskDataVersion = useShellLayoutStore((state) => state.bumpTaskDataVersion)

	useTaskChangedListener(currentSpaceId, () => {
		bumpTaskDataVersion()
	})

	useCommandOpenListener((payload) => {
		if (payload.kind === 'project') {
			setCommandOpen(false)
			closeDrawer()
			startTransition(() => {
				navigate(`/space/${payload.spaceSlug}/project/${payload.id}`)
			})
			return
		}

		setCommandOpen(false)
		startTransition(() => {
			const targetPath = payload.projectId
				? `/space/${payload.spaceSlug}/project/${payload.projectId}`
				: `/space/${payload.spaceSlug}/inbox`
			navigate(targetPath)
			openDrawer('task', payload.id)
		})
	})

	return (
		<div className='sf-shell-layout relative flex h-full min-h-0 flex-col overflow-hidden bg-background'>
			<ShellHeader
				activeSection={activeSection}
				currentSpaceId={currentSpaceId}
				isCommandOpen={isCommandOpen}
				isProjectsLoading={isProjectsLoading}
				onCommandOpenChange={setCommandOpen}
				onCloseDrawer={closeDrawer}
				onOpenProjectCreateDialog={() => openProjectCreateDialog()}
				onOpenTaskCreateDialog={openTaskCreateDialog}
				onOpenDrawer={openDrawer}
				projects={projectLinks}
				projectsError={projectsError}
			/>

			<SidebarProvider className='relative flex min-h-0 flex-1 overflow-hidden'>
				<ShellSidebar
					currentSpaceId={currentSpaceId}
					isProjectsLoading={isProjectsLoading}
					onOpenTaskCreateDialog={openTaskCreateDialog}
					onOpenProjectCreateDialog={openProjectCreateDialog}
					onRefreshProjects={() => void refreshProjects()}
					navBadges={navBadges}
					projects={projectTreeLinks}
					projectsError={projectsError}
				/>

				<div className='relative flex min-w-0 flex-1 flex-col overflow-hidden bg-(--sf-color-shell-chrome)'>
					<ShellMain
						activeDrawerId={activeDrawerId}
						activeDrawerKind={activeDrawerKind}
						currentSpaceId={currentSpaceId}
						onCloseDrawer={closeDrawer}
						onOpenProjectCreateDialog={() => openProjectCreateDialog()}
						onOpenTaskCreateDialog={openTaskCreateDialog}
					>
						{children}
					</ShellMain>
				</div>
			</SidebarProvider>

			<TaskCreateDialog
				currentSpaceId={currentSpaceId}
				onClose={closeTaskCreateDialog}
				open={isTaskCreateOpen}
				projects={flatProjects}
				projectsLoading={isProjectsLoading}
			/>

			<ProjectCreateDialog
				currentSpaceId={currentSpaceId}
				onClose={closeProjectCreateDialog}
				open={isProjectCreateOpen}
				parentProjectId={projectCreateParentId}
			/>

			<ShellFooter activeSection={activeSection} currentSpaceId={currentSpaceId} />
		</div>
	)
}
