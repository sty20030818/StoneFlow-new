import {
	startTransition,
	useCallback,
	useEffect,
	useMemo,
	useState,
	type PropsWithChildren,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { buildScopedSectionPath } from '@/app/layouts/shell/config'
import type { ShellSectionKey } from '@/app/layouts/shell/types'
import type { Scope } from '@/shared/types'
import { useShellRouteHistory } from '@/app/layouts/shell/model/useShellRouteHistory'
import { useSidebarNavBadges } from '@/app/layouts/shell/model/useSidebarNavBadges'
import {
	selectActiveDrawerId,
	selectActiveDrawerKind,
	useDrawerStore,
} from '@/app/layouts/shell/model/useDrawerStore'
import {
	selectCommandMenuMode,
	selectCommandSelectionOverride,
	selectCreateDialogType,
	selectIsCommandOpen,
	selectIsShortcutHelpOpen,
	selectTaskCreateDraft,
	selectTaskCreatePresentation,
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
	selectPendingTaskOpenIntent,
	useSearchOpenIntentStore,
} from '@/features/global-search/model/useSearchOpenIntentStore'
import { useSearchFocusIntentStore } from '@/features/global-search/model/useSearchFocusIntentStore'
import { type CommandOpenPayload, useCommandOpenListener } from '@/shared/events'
import {
	selectProjectOptions,
	selectProjectSidebar,
	useProjectStore,
} from '@/features/project/model/useProjectStore'
import { CommandSelectionProvider, useCommandSelectionContext } from '@/features/selection/model'
import { takePendingCommandOpenIntent } from '@/features/space/api/spaces'
import {
	selectSpaceError,
	selectSpaces,
	selectSpaceStatus,
	useSpaceStore,
} from '@/features/space/model/useSpaceStore'
import { ProjectCreateContent } from '@/features/project/ui/ProjectCreateContent'
import { TaskCreateContent } from '@/features/task/ui/TaskCreateContent'
import { useTaskStore } from '@/features/task/model/useTaskStore'
import { CreateDialogShell } from '@/shared/ui/create-dialog-shell'
import { SidebarProvider } from '@/shared/ui/base/sidebar'
import {
	shellChromeSkeletonMainCardClass,
	shellChromeSkeletonStatusTextClass,
} from '@/shared/ui/patterns/shell-chrome'
import {
	CommandShortcutLayer,
	DEFAULT_KEYBINDINGS,
	type CommandChordSession,
	type Keybinding,
	useCommandContext,
	useCommandRunner,
	useCommandRuntime,
	type CommandFocusContext,
	type CommandRouteContext,
	type ShellCommandActions,
	type ShellNavigationTarget,
} from '@/features/command'
import { COMMAND_IDS, type CommandContext } from '@/features/command/core'
import {
	BulkActionConfirmDialog,
	BulkActionProvider,
	TASK_BULK_ACTION_IDS,
	createTaskBulkAdapter,
	createTaskBulkSelectionSnapshot,
	taskBulkActions,
	useBulkActionContext,
	type BulkActionId,
	type BulkActionPayload,
} from '@/features/bulk-action'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import type { TaskStatus } from '@/shared/types'

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
	return (
		<CommandSelectionProvider>
			<ShellLayoutBulkActionBoundary
				activeSection={activeSection}
				currentScope={currentScope}
				currentSpaceId={currentSpaceId}
			>
				{children}
			</ShellLayoutBulkActionBoundary>
		</CommandSelectionProvider>
	)
}

function ShellLayoutBulkActionBoundary({
	children,
	currentScope,
	currentSpaceId,
	activeSection,
}: ShellLayoutProps) {
	const refreshLoadedTaskSlices = useTaskStore((state) => state.refreshLoadedSlices)
	const taskBulkAdapter = useMemo(
		() =>
			createTaskBulkAdapter({
				refreshLoadedSlices: refreshLoadedTaskSlices,
			}),
		[refreshLoadedTaskSlices],
	)

	return (
		<BulkActionProvider actions={taskBulkActions} context={{ adapter: taskBulkAdapter }}>
			<ShellLayoutContent
				activeSection={activeSection}
				currentScope={currentScope}
				currentSpaceId={currentSpaceId}
			>
				{children}
			</ShellLayoutContent>
		</BulkActionProvider>
	)
}

function ShellLayoutContent({
	children,
	currentScope,
	currentSpaceId,
	activeSection,
}: ShellLayoutProps) {
	const navigate = useNavigate()
	const isCommandOpen = useDialogStore(selectIsCommandOpen)
	const commandMenuMode = useDialogStore(selectCommandMenuMode)
	const commandSelectionOverride = useDialogStore(selectCommandSelectionOverride)
	const isShortcutHelpOpen = useDialogStore(selectIsShortcutHelpOpen)
	const createDialogType = useDialogStore(selectCreateDialogType)
	const taskCreateDraft = useDialogStore(selectTaskCreateDraft)
	const taskCreatePresentation = useDialogStore(selectTaskCreatePresentation)
	const activeDrawerKind = useDrawerStore(selectActiveDrawerKind)
	const activeDrawerId = useDrawerStore(selectActiveDrawerId)
	const setCommandOpen = useDialogStore((state) => state.setCommandOpen)
	const setShortcutHelpOpen = useDialogStore((state) => state.setShortcutHelpOpen)
	const toggleShortcutHelp = useDialogStore((state) => state.toggleShortcutHelp)
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const toggleTaskCreatePresentation = useDialogStore((state) => state.toggleTaskCreatePresentation)
	const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
	const [chordSession, setChordSession] = useState<CommandChordSession | null>(null)
	const {
		cancelPendingAction,
		confirmPendingAction,
		isExecuting: isBulkActionExecuting,
		pendingConfirmation: pendingBulkActionConfirmation,
		runBulkAction,
	} = useBulkActionContext()
	const pendingTaskOpenIntent = useSearchOpenIntentStore(selectPendingTaskOpenIntent)
	const consumePendingTaskOpenIntent = useSearchOpenIntentStore(
		(state) => state.consumePendingTaskOpenIntent,
	)
	const setPendingTaskOpenIntent = useSearchOpenIntentStore(
		(state) => state.setPendingTaskOpenIntent,
	)
	const requestSearchFocus = useSearchFocusIntentStore((state) => state.requestFocus)

	const { pathname } = useLocation()
	const routeProjectId = useMemo(() => {
		const match = pathname.match(/\/project\/([^/]+)/)
		return match?.[1] ?? null
	}, [pathname])
	const isNoProjectPage = pathname.endsWith('/no-project')

	const handleOpenTaskCreate = useMemo(() => {
		if (routeProjectId) {
			return () => openTaskCreateDialog({ projectId: routeProjectId }, 'default')
		}
		if (isNoProjectPage) {
			return () => openTaskCreateDialog({ placement: 'noProject' }, 'default')
		}
		return () => openTaskCreateDialog(undefined, 'default')
	}, [isNoProjectPage, openTaskCreateDialog, routeProjectId])
	const openProjectCreateDialog = useDialogStore((state) => state.openProjectCreateDialog)
	const closeTaskCreateDialog = useDialogStore((state) => state.closeTaskCreateDialog)
	const closeProjectCreateDialog = useDialogStore((state) => state.closeProjectCreateDialog)
	const spaces = useSpaceStore(selectSpaces)
	const defaultCreateSpaceId = useMemo(
		() =>
			currentScope.type === 'space'
				? currentScope.spaceId
				: (spaces.find((space) => space.isDefault)?.id ?? spaces[0]?.id ?? null),
		[currentScope, spaces],
	)

	useEffect(() => {
		if (!createDialogType) {
			setSelectedSpaceId(null)
			return
		}
		setSelectedSpaceId((current) => current ?? defaultCreateSpaceId)
	}, [createDialogType, defaultCreateSpaceId])
	const openDrawer = useDrawerStore((state) => state.openDrawer)
	const closeDrawer = useDrawerStore((state) => state.closeDrawer)
	const sidebarSettingsStatus = useSidebarSettingsStore(selectSidebarSettingsStatus)
	const sidebarSettings = useSidebarSettingsStore(selectSidebarSettings)
	const sidebarSettingsError = useSidebarSettingsStore(selectSidebarSettingsError)
	const spaceStatus = useSpaceStore(selectSpaceStatus)
	const spaceError = useSpaceStore(selectSpaceError)
	const sidebarProjects = useProjectStore(selectProjectSidebar)
	const projectOptions = useProjectStore(selectProjectOptions)
	const scopeKey = currentScope.type === 'all' ? 'all' : `space:${currentScope.spaceId}`
	const navBadges = useSidebarNavBadges(currentScope)
	const shouldDelayTaskCreateDialog =
		createDialogType === 'task' &&
		Boolean(taskCreateDraft.projectId) &&
		sidebarProjects.status === 'loading'
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

	useEffect(() => {
		if (
			spaceStatus !== 'ready' ||
			!pendingTaskOpenIntent ||
			pendingTaskOpenIntent.targetPath !== pathname
		) {
			return
		}

		const consumedIntent = consumePendingTaskOpenIntent(pathname)
		if (!consumedIntent) {
			return
		}

		openDrawer('task', consumedIntent.taskId)
	}, [consumePendingTaskOpenIntent, openDrawer, pathname, pendingTaskOpenIntent, spaceStatus])

	const handleCommandOpen = useMemo(
		() => (payload: CommandOpenPayload) => {
			const targetPath = payload.projectId
				? `/space/${payload.spaceId}/project/${payload.projectId}`
				: payload.kind === 'project'
					? `/space/${payload.spaceId}/project/${payload.id}`
					: payload.placement === 'inbox'
						? `/space/${payload.spaceId}/inbox`
						: `/space/${payload.spaceId}/no-project`

			closeDrawer()

			if (payload.kind === 'project') {
				if (pathname === targetPath) {
					return
				}
				startTransition(() => {
					navigate(targetPath)
				})
				return
			}

			setPendingTaskOpenIntent({
				taskId: payload.id,
				targetPath,
			})

			if (pathname === targetPath) {
				openDrawer('task', payload.id)
				return
			}

			startTransition(() => {
				navigate(targetPath)
			})
		},
		[closeDrawer, navigate, openDrawer, pathname, setPendingTaskOpenIntent],
	)

	const projectLinks = useMemo(
		() =>
			sidebarProjects.items.map((project) => ({
				id: project.id,
				label: project.name,
				badge: sidebarSettings?.projectSection.showCounts
					? project.taskCount > 0
						? String(project.taskCount)
						: undefined
					: project.completedAt
						? 'done'
						: undefined,
			})),
		[sidebarProjects.items, sidebarSettings?.projectSection.showCounts],
	)
	const {
		entries: routeHistoryEntries,
		canGoBack,
		canGoForward,
		goBack,
		goForward,
		navigateToHistoryEntry,
	} = useShellRouteHistory({
		currentScope,
		currentSpaceId,
		spaces,
		projects: projectLinks,
	})
	const handleCommandMenuOpenChange = useCallback(
		(open: boolean) => {
			setCommandOpen(open)
		},
		[setCommandOpen],
	)
	const runTaskBulkActionFromCommand = useCallback(
		async (ctx: CommandContext, actionId: BulkActionId, payload?: BulkActionPayload) => {
			if (ctx.selection.type !== 'task' || ctx.selection.ids.length === 0) {
				return
			}

			const snapshot = createTaskBulkSelectionSnapshot(ctx.selection, 'command-menu')
			const result = await runBulkAction(actionId, snapshot, payload)

			if (result.status === 'success') {
				if (result.shouldClearSelection) {
					ctx.selection.clearSelection?.()
				}
				toast.success(result.message ?? `已更新 ${result.succeededIds.length} 个任务`)
				return
			}

			if (result.status === 'partial') {
				toast.error(
					result.message ??
						`已更新 ${result.succeededIds.length} 个任务，${result.failedIds.length} 个失败`,
				)
				return
			}

			if (result.status === 'disabled') {
				toast.error(result.message ?? '批量操作不可用')
				return
			}

			if (result.status === 'failed') {
				toast.error(result.message ?? '批量操作失败')
				throw result.error
			}
		},
		[runBulkAction],
	)

	const shellCommandActions = useMemo<ShellCommandActions>(
		() => ({
			openCommandMenu: () => {
				useDialogStore.getState().openCommand('default')
			},
			openShortcutHelp: () => {
				toggleShortcutHelp()
			},
			focusSearch: requestSearchFocus,
			openQuickTaskCreate: handleOpenTaskCreate,
			openFullTaskCreate: () => openTaskCreateDialog(undefined, 'default'),
			openInboxTaskCreate: () => openTaskCreateDialog({ placement: 'inbox' }, 'default'),
			openProjectCreate: () => openProjectCreateDialog(),
			openTaskPicker: () => {
				useDialogStore.getState().openCommand('task-picker')
			},
			openProjectPicker: () => {
				useDialogStore.getState().openCommand('project-picker')
			},
			openTaskPriorityPicker: (ctx) => {
				useDialogStore.getState().openCommand('task-priority-picker', ctx.selection)
			},
			openTaskStatusPicker: (ctx) => {
				useDialogStore.getState().openCommand('task-status-picker', ctx.selection)
			},
			openTaskDatePicker: (ctx) => {
				useDialogStore.getState().openCommand('task-date-picker', ctx.selection)
			},
			completeSelectedTasks: (ctx) =>
				runTaskBulkActionFromCommand(ctx, TASK_BULK_ACTION_IDS.completeSelected),
			requestArchiveSelectedTasks: (ctx) =>
				runTaskBulkActionFromCommand(ctx, TASK_BULK_ACTION_IDS.archiveSelected),
			requestDeleteSelectedTasks: (ctx) =>
				runTaskBulkActionFromCommand(ctx, TASK_BULK_ACTION_IDS.deleteSelected),
			navigateTo: (target: ShellNavigationTarget) => {
				startTransition(() => {
					navigate(buildScopedSectionPath(currentScope, target, currentSpaceId))
				})
			},
			goBack,
			goForward,
		}),
		[
			currentScope,
			currentSpaceId,
			goBack,
			goForward,
			handleOpenTaskCreate,
			navigate,
			openProjectCreateDialog,
			openTaskCreateDialog,
			requestSearchFocus,
			runTaskBulkActionFromCommand,
			toggleShortcutHelp,
		],
	)
	const activeShortcutBindings = useMemo<Keybinding[]>(
		() =>
			isShortcutHelpOpen
				? DEFAULT_KEYBINDINGS.filter(
						(binding) => binding.commandId === COMMAND_IDS.openShortcutHelp,
					)
				: DEFAULT_KEYBINDINGS,
		[isShortcutHelpOpen],
	)
	const commandRoutePage = resolveCommandRoutePage(activeSection)
	const commandRoute = useMemo(
		() => ({
			page: commandRoutePage,
			projectId: routeProjectId ?? undefined,
		}),
		[commandRoutePage, routeProjectId],
	)
	const commandUi = useMemo(
		() => ({
			isCommandMenuOpen: isCommandOpen,
			isDetailOpen: Boolean(activeDrawerId),
			isModalOpen: createDialogType !== null || isShortcutHelpOpen,
		}),
		[activeDrawerId, createDialogType, isCommandOpen, isShortcutHelpOpen],
	)
	const commandFocus = useMemo(
		() => ({
			activePanel: resolveCommandActivePanel({
				isCommandOpen,
				isShortcutHelpOpen,
				isModalOpen: createDialogType !== null,
				isDetailOpen: Boolean(activeDrawerId),
			}),
		}),
		[activeDrawerId, createDialogType, isCommandOpen, isShortcutHelpOpen],
	)
	const commandSpace = useMemo(
		() => ({
			currentSpaceId: currentSpaceId ?? undefined,
		}),
		[currentSpaceId],
	)
	const commandProject = useMemo(
		() => ({
			currentProjectId: routeProjectId ?? undefined,
		}),
		[routeProjectId],
	)
	const registeredCommandSelection = useCommandSelectionContext()
	const commandSelection = commandSelectionOverride ?? registeredCommandSelection
	const commandContext = useCommandContext({
		route: commandRoute,
		selection: commandSelection,
		focus: commandFocus,
		ui: commandUi,
		space: commandSpace,
		project: commandProject,
	})
	const commandRuntime = useCommandRuntime({
		actions: shellCommandActions,
		context: commandContext,
	})
	const runCommand = useCommandRunner({ runtime: commandRuntime })

	const updateSelectedTasks = useCallback(
		async (
			actionId: BulkActionId,
			payload: { priority?: TaskPriorityValue; status?: TaskStatus; dueAt?: string | null },
		) => {
			if (commandContext.selection.type !== 'task' || commandContext.selection.ids.length === 0) {
				return
			}

			await runTaskBulkActionFromCommand(commandContext, actionId, payload)
		},
		[commandContext, runTaskBulkActionFromCommand],
	)

	const handleSelectTaskPriority = useCallback(
		(priority: TaskPriorityValue) => {
			void updateSelectedTasks(TASK_BULK_ACTION_IDS.setPrioritySelected, { priority }).catch(
				() => undefined,
			)
		},
		[updateSelectedTasks],
	)

	const handleSelectTaskStatus = useCallback(
		(status: TaskStatus) => {
			void updateSelectedTasks(TASK_BULK_ACTION_IDS.setStatusSelected, { status }).catch(
				() => undefined,
			)
		},
		[updateSelectedTasks],
	)

	const handleSelectTaskDate = useCallback(
		(dueAt: string | null) => {
			void updateSelectedTasks(TASK_BULK_ACTION_IDS.setDateSelected, { dueAt }).catch(
				() => undefined,
			)
		},
		[updateSelectedTasks],
	)

	useCommandOpenListener(handleCommandOpen)

	useEffect(() => {
		if (spaceStatus !== 'ready') {
			return
		}

		let cancelled = false
		void takePendingCommandOpenIntent()
			.then((payload) => {
				if (cancelled || !payload) {
					return
				}

				handleCommandOpen(payload)
			})
			.catch((error) => {
				console.error('take pending command open intent failed', { error })
			})

		return () => {
			cancelled = true
		}
	}, [handleCommandOpen, spaceStatus])

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
			<CommandShortcutLayer
				bindings={activeShortcutBindings}
				onChordStateChange={setChordSession}
				onTrigger={runCommand}
			/>
			<ShellHeader
				activeSection={activeSection}
				canGoBack={canGoBack}
				chordSession={chordSession}
				canGoForward={canGoForward}
				commandContext={commandContext}
				commandMenuMode={commandMenuMode}
				commandRuntime={commandRuntime}
				currentSpaceId={currentSpaceId}
				currentScope={currentScope}
				isCommandOpen={isCommandOpen}
				isShortcutHelpOpen={isShortcutHelpOpen}
				onCloseDrawer={closeDrawer}
				onCommandOpenChange={handleCommandMenuOpenChange}
				onNavigateToHistoryEntry={navigateToHistoryEntry}
				onRunCommand={runCommand}
				onSelectTaskDate={handleSelectTaskDate}
				onSelectTaskPriority={handleSelectTaskPriority}
				onSelectTaskStatus={handleSelectTaskStatus}
				onShortcutHelpOpenChange={setShortcutHelpOpen}
				projects={projectLinks}
				routeHistoryEntries={routeHistoryEntries}
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
						projectsLoading={sidebarProjects.status === 'loading'}
						selectedSpaceId={selectedSpaceId ?? defaultCreateSpaceId}
						spaces={spaces}
					/>
				) : (
					<ProjectCreateContent
						onClose={closeProjectCreateDialog}
						selectedSpaceId={selectedSpaceId}
					/>
				)}
			</CreateDialogShell>
			<BulkActionConfirmDialog
				isExecuting={isBulkActionExecuting}
				onCancel={cancelPendingAction}
				onConfirm={confirmPendingAction}
				onOpenChange={() => undefined}
				open={pendingBulkActionConfirmation !== null}
				request={pendingBulkActionConfirmation}
			/>
			{/* <ShellFooter navBadges={navBadges} /> */}
			{/* 占位，保持底部边距 */}
			<div className='h-2 shrink-0 bg-sf-shell' />
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

function resolveCommandRoutePage(section: ShellSectionKey): CommandRouteContext['page'] {
	switch (section) {
		case 'allTasks':
			return 'allTasks'
		case 'views':
			return 'views'
		case 'projects':
			return 'projects'
		case 'project':
			return 'project'
		case 'archive':
			return 'archive'
		case 'trash':
			return 'trash'
		case 'settings':
			return 'settings'
		case 'inbox':
		case 'noProject':
			return 'inbox'
		default:
			return 'unknown'
	}
}

function resolveCommandActivePanel({
	isCommandOpen,
	isShortcutHelpOpen,
	isModalOpen,
	isDetailOpen,
}: {
	isCommandOpen: boolean
	isShortcutHelpOpen: boolean
	isModalOpen: boolean
	isDetailOpen: boolean
}): CommandFocusContext['activePanel'] {
	if (isCommandOpen) {
		return 'command-menu'
	}
	if (isShortcutHelpOpen) {
		return 'modal'
	}
	if (isModalOpen) {
		return 'modal'
	}
	if (isDetailOpen) {
		return 'detail'
	}
	return 'main'
}
