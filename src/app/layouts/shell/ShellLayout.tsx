import { useEffect, useMemo, type PropsWithChildren } from 'react'
import { useLocation } from 'react-router-dom'

import type { ShellSectionKey } from '@/app/layouts/shell/types'
import type { Scope } from '@/shared/types'
import { useSidebarNavBadges } from '@/app/layouts/shell/model/useSidebarNavBadges'
import {
	selectActiveDrawerId,
	selectActiveDrawerKind,
	useDrawerStore,
} from '@/app/layouts/shell/model/useDrawerStore'
import {
	selectIsCommandOpen,
	selectIsProjectCreateOpen,
	selectIsTaskCreateOpen,
	selectTaskCreateInitialPlacement,
	selectTaskCreateProjectId,
	selectTaskCreateStatus,
	useDialogStore,
} from '@/app/layouts/shell/model/useDialogStore'
import {
	selectSidebarSettings,
	selectSidebarSettingsError,
	selectSidebarSettingsStatus,
	useSidebarSettingsStore,
} from '@/app/layouts/shell/model/useSidebarSettingsStore'
// import { ShellFooter } from '@/app/layouts/shell/ShellFooter'
import { ShellHeader } from '@/app/layouts/shell/ShellHeader'
import { ShellMain } from '@/app/layouts/shell/ShellMain'
import { ShellSidebar } from '@/app/layouts/shell/ShellSidebar'
import {
	selectProjectOptions,
	selectProjectSidebar,
	useProjectStore,
} from '@/features/project/model/useProjectStore'
import {
	selectSpaceError,
	selectSpaces,
	selectSpaceStatus,
	useSpaceStore,
} from '@/features/space/model/useSpaceStore'
import { ProjectCreateDialog } from '@/features/project/ui/ProjectCreateDialog'
import { TaskCreateDialog } from '@/features/task/ui/TaskCreateDialog'
import { SidebarProvider } from '@/shared/ui/base/sidebar'
import {
	shellChromeSkeletonMainCardClass,
	shellChromeSkeletonStatusTextClass,
} from '@/shared/ui/patterns/shell-chrome'

type ShellLayoutProps = PropsWithChildren<{
	currentScope: Scope
	currentSpaceId: string | null
	activeSection: ShellSectionKey
}>

export function ShellLayout({
	children,
	currentScope,
	currentSpaceId,
	activeSection,
}: ShellLayoutProps) {
	const isCommandOpen = useDialogStore(selectIsCommandOpen)
	const isTaskCreateOpen = useDialogStore(selectIsTaskCreateOpen)
	const taskCreateProjectId = useDialogStore(selectTaskCreateProjectId)
	const taskCreateStatus = useDialogStore(selectTaskCreateStatus)
	const taskCreateInitialPlacement = useDialogStore(selectTaskCreateInitialPlacement)
	const isProjectCreateOpen = useDialogStore(selectIsProjectCreateOpen)
	const activeDrawerKind = useDrawerStore(selectActiveDrawerKind)
	const activeDrawerId = useDrawerStore(selectActiveDrawerId)
	const setCommandOpen = useDialogStore((state) => state.setCommandOpen)
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)

	const { pathname } = useLocation()
	const routeProjectId = useMemo(() => {
		const match = pathname.match(/\/project\/([^/]+)/)
		return match?.[1] ?? null
	}, [pathname])
	const isNoProjectPage = pathname.endsWith('/no-project')

	const handleOpenTaskCreate = useMemo(() => {
		if (routeProjectId) {
			return () => openTaskCreateDialog({ projectId: routeProjectId })
		}
		if (isNoProjectPage) {
			return () => openTaskCreateDialog({ placement: 'noProject' })
		}
		return () => openTaskCreateDialog()
	}, [isNoProjectPage, openTaskCreateDialog, routeProjectId])
	const closeTaskCreateDialog = useDialogStore((state) => state.closeTaskCreateDialog)
	const openProjectCreateDialog = useDialogStore((state) => state.openProjectCreateDialog)
	const closeProjectCreateDialog = useDialogStore((state) => state.closeProjectCreateDialog)
	const openDrawer = useDrawerStore((state) => state.openDrawer)
	const closeDrawer = useDrawerStore((state) => state.closeDrawer)
	const sidebarSettingsStatus = useSidebarSettingsStore(selectSidebarSettingsStatus)
	const sidebarSettings = useSidebarSettingsStore(selectSidebarSettings)
	const sidebarSettingsError = useSidebarSettingsStore(selectSidebarSettingsError)
	const spaces = useSpaceStore(selectSpaces)
	const spaceStatus = useSpaceStore(selectSpaceStatus)
	const spaceError = useSpaceStore(selectSpaceError)
	const sidebarProjects = useProjectStore(selectProjectSidebar)
	const projectOptions = useProjectStore(selectProjectOptions)
	const scopeKey = currentScope.type === 'all' ? 'all' : `space:${currentScope.spaceId}`
	const navBadges = useSidebarNavBadges(currentScope)
	const loadSidebarSettings = useSidebarSettingsStore((state) => state.load)
	const loadSpaces = useSpaceStore((state) => state.load)
	const loadSidebarProjects = useProjectStore((state) => state.loadSidebar)
	const createSpace = useSpaceStore((state) => state.createSpace)
	const updateSpace = useSpaceStore((state) => state.updateSpace)
	const setDefaultSpace = useSpaceStore((state) => state.setDefaultSpace)
	const archiveSpace = useSpaceStore((state) => state.archiveSpace)
	const deleteSpace = useSpaceStore((state) => state.deleteSpace)
	const setSidebarWidth = useSidebarSettingsStore((state) => state.setSidebarWidth)
	const setDesktopPreference = useSidebarSettingsStore((state) => state.setDesktopPreference)
	const setSidebarItemVisibility = useSidebarSettingsStore((state) => state.setItemVisibility)
	const resetSidebarMainItemsVisibility = useSidebarSettingsStore(
		(state) => state.resetMainItemsVisibility,
	)

	useEffect(() => {
		if (sidebarSettingsStatus === 'idle') {
			void loadSidebarSettings()
		}
	}, [loadSidebarSettings, sidebarSettingsStatus])

	useEffect(() => {
		if (spaceStatus === 'idle') {
			void loadSpaces()
		}
	}, [loadSpaces, spaceStatus])

	useEffect(() => {
		if (spaceStatus === 'ready') {
			void loadSidebarProjects(currentScope)
		}
	}, [currentScope, loadSidebarProjects, scopeKey, spaceStatus])

	if (
		!sidebarSettings ||
		spaceStatus === 'loading' ||
		(spaceStatus === 'ready' && spaces.length === 0)
	) {
		return (
			<ShellLayoutSkeleton
				message={sidebarSettingsError ?? spaceError}
				status={sidebarSettings ? spaceStatus : sidebarSettingsStatus}
			/>
		)
	}

	const currentSpaceLabel =
		currentScope.type === 'all'
			? '全部 Spaces'
			: (spaces.find((space) => space.id === currentSpaceId)?.name ??
				currentSpaceId ??
				'未选择 Space')
	const projectLinks = sidebarProjects.items.map((project) => ({
		id: project.id,
		label: project.name,
		badge: sidebarSettings.projectSection.showCounts
			? String(project.taskCount)
			: project.completedAt
				? 'done'
				: undefined,
	}))

	return (
		<SidebarProvider
			className='sf-shell-layout relative flex h-full min-h-0 flex-col overflow-hidden bg-background'
			desktopPreference={sidebarSettings.desktopPreference}
			onDesktopPreferenceChange={(next) => {
				void setDesktopPreference(next)
			}}
			onSidebarWidthCommit={(width) => {
				void setSidebarWidth(width)
			}}
			sidebarWidth={sidebarSettings.width}
		>
			<ShellHeader
				activeSection={activeSection}
				currentSpaceId={currentSpaceId}
				currentScope={currentScope}
				isCommandOpen={isCommandOpen}
				onCloseDrawer={closeDrawer}
				onCommandOpenChange={setCommandOpen}
				onOpenDrawer={openDrawer}
				onOpenProjectCreateDialog={() => openProjectCreateDialog()}
				onOpenTaskCreateDialog={handleOpenTaskCreate}
				projects={projectLinks}
				spaces={spaces}
			/>

			<div className='relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-sf-shell'>
				<div className='flex min-h-0 w-(--sf-shell-sidebar-reserved-width) shrink-0 flex-col overflow-hidden transition-[width] duration-(--sf-shell-layout-sync-duration) ease-(--sf-shell-layout-sync-easing) motion-reduce:transition-none group-data-[sidebar-resizing=true]/sidebar-wrapper:transition-none'>
					<ShellSidebar
						currentScope={currentScope}
						currentSpaceId={currentSpaceId}
						navBadges={navBadges}
						onArchiveSpace={archiveSpace}
						onCreateSpace={createSpace}
						onDeleteSpace={deleteSpace}
						onOpenProjectCreateDialog={openProjectCreateDialog}
						onResetMainItemsVisibility={() => {
							void resetSidebarMainItemsVisibility()
						}}
						onSetDefaultSpace={setDefaultSpace}
						onUpdateItemVisibility={(target, visible) => {
							void setSidebarItemVisibility(target, visible)
						}}
						onUpdateSpace={updateSpace}
						projects={projectLinks}
						spaces={spaces}
						settings={sidebarSettings}
					/>
				</div>

				<div className='relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-sf-shell'>
					<ShellMain
						activeDrawerId={activeDrawerId}
						activeDrawerKind={activeDrawerKind}
						currentSpaceLabel={currentSpaceLabel}
						onCloseDrawer={closeDrawer}
						onOpenProjectCreateDialog={() => openProjectCreateDialog()}
						onOpenTaskCreateDialog={handleOpenTaskCreate}
					>
						{children}
					</ShellMain>
				</div>
			</div>

			<TaskCreateDialog
				currentScope={currentScope}
				initialPlacement={taskCreateInitialPlacement}
				initialProjectId={taskCreateProjectId}
				initialStatus={taskCreateStatus}
				onClose={closeTaskCreateDialog}
				open={isTaskCreateOpen}
				projects={projectOptions}
				projectsLoading={sidebarProjects.status === 'loading'}
				spaces={spaces}
			/>

			<ProjectCreateDialog
				currentSpaceLabel={currentSpaceLabel}
				onClose={closeProjectCreateDialog}
				open={isProjectCreateOpen}
				spaceId={currentScope.type === 'space' ? currentScope.spaceId : null}
			/>

			{/* <ShellFooter navBadges={navBadges} /> */}
			<div className='h-2 shrink-0' />
		</SidebarProvider>
	)
}

function ShellLayoutSkeleton({
	status,
	message,
}: {
	status: 'idle' | 'loading' | 'ready' | 'error'
	message: string | null
}) {
	return (
		<div className='relative flex h-full min-h-0 flex-col overflow-hidden bg-background'>
			<div className='flex h-12 shrink-0 items-center justify-between border-b border-sf-border-subtle bg-sf-shell px-4'>
				<div className='h-4 w-40 rounded-full bg-sf-surface-panel-muted' />
				<div className='h-8 w-28 rounded-full bg-sf-surface-panel-muted' />
			</div>

			<div className='flex min-h-0 flex-1 overflow-hidden bg-sf-shell'>
				<aside className='flex w-64 shrink-0 flex-col gap-4 border-r border-sf-border-subtle bg-sf-shell px-3 py-4'>
					<div className='flex items-center gap-3'>
						<div className='size-9 rounded-2xl bg-sf-surface-panel-muted' />
						<div className='h-4 w-28 rounded-full bg-sf-surface-panel-muted' />
					</div>
					<div className='flex flex-col gap-2'>
						{Array.from({ length: 4 }).map((_, index) => (
							<div
								className='h-9 rounded-xl bg-sf-surface-panel-muted'
								key={`sidebar-skeleton-nav-${index}`}
							/>
						))}
					</div>
					<div className='mt-2 h-px bg-sf-border-subtle' />
					<div className='flex flex-col gap-2'>
						<div className='h-4 w-20 rounded-full bg-sf-surface-panel-muted' />
						{Array.from({ length: 3 }).map((_, index) => (
							<div
								className='h-8 rounded-xl bg-sf-surface-panel-muted'
								key={`sidebar-skeleton-project-${index}`}
							/>
						))}
					</div>
				</aside>

				<div className='flex min-h-0 flex-1 flex-col bg-sf-shell p-4'>
					<div className={shellChromeSkeletonMainCardClass}>
						<div className='h-6 w-48 rounded-full bg-sf-surface-panel-muted' />
						<div className='mt-6 grid gap-3'>
							<div className='h-16 rounded-2xl bg-sf-surface-panel-muted' />
							<div className='h-16 rounded-2xl bg-sf-surface-panel-muted' />
							<div className='h-28 rounded-3xl bg-sf-surface-panel-muted' />
						</div>
						<div className={shellChromeSkeletonStatusTextClass}>
							{status === 'error' ? (message ?? 'Sidebar 设置加载失败') : '正在读取 Sidebar 配置…'}
						</div>
					</div>
				</div>
			</div>

			<div className='h-9.5 shrink-0 border-t border-sf-border-subtle bg-sf-shell' />
		</div>
	)
}
