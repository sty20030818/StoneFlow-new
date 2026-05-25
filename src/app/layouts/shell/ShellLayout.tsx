import {
	startTransition,
	useCallback,
	useEffect,
	useMemo,
	useState,
	type PropsWithChildren,
} from 'react'
import { useNavigate } from 'react-router-dom'

import {
	buildCanonicalProjectPath,
	buildCanonicalSectionPath,
} from '@/app/routing'
import type { ShellRoute } from '@/app/routing'
import type { ShellSectionKey } from '@/app/layouts/shell/types'
import type { Scope } from '@/shared/types'
import { useShellRouteHistory } from '@/app/layouts/shell/model/useShellRouteHistory'
import { useSidebarNavBadges } from '@/app/layouts/shell/model/useSidebarNavBadges'
import {
	selectCommandMenuMode,
	selectCommandMenuFilterKind,
	selectCommandSelectionOverride,
	selectCustomDateDialog,
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
import { useEntityDetailController } from '@/features/entity-detail'
import {
	selectPendingTaskOpenIntent,
	useSearchOpenIntentStore,
} from '@/features/global-search/model/useSearchOpenIntentStore'
import { useSearchFocusIntentStore } from '@/features/global-search/model/useSearchFocusIntentStore'
import { type CommandOpenPayload, useCommandOpenListener } from '@/shared/events'
import { listAllVisibleProjects } from '@/features/project/api/projects'
import {
	selectProjectOptions,
	selectProjectSidebar,
	useProjectStore,
} from '@/features/project/model/useProjectStore'
import { CommandSelectionProvider, useCommandSelectionContext } from '@/features/selection/model'
import { PageFilterProvider, usePageFilterContext } from '@/features/filter/model'
import {
	SubmitRegistryProvider,
	useSubmitRegistryActions,
	useSubmitRegistryContext,
} from '@/features/submit/model'
import { takePendingCommandOpenIntent } from '@/features/space/api/spaces'
import {
	selectSpaceError,
	selectSpaces,
	selectSpaceStatus,
	useSpaceStore,
} from '@/features/space/model/useSpaceStore'
import { ProjectCreateContent } from '@/features/project/ui/ProjectCreateContent'
import { TaskPreviewProvider, useTaskPreviewController } from '@/features/task/detail'
import { TaskCreateContent } from '@/features/task/ui/TaskCreateContent'
import { useTaskStore } from '@/features/task/model/useTaskStore'
import { CustomDateDialog } from '@/features/metadata-fields'
import { CreateDialogShell } from '@/shared/ui/create-dialog-shell'
import { requestSidebarToggle, SidebarProvider } from '@/shared/ui/base/sidebar'
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
	type TaskPlacementTarget,
} from '@/features/command'
import { COMMAND_IDS, type CommandContext, type CommandId } from '@/features/command/core'
import {
	BulkActionProvider,
	LIFECYCLE_BULK_ACTION_IDS,
	PROJECT_BULK_ACTION_IDS,
	TASK_BULK_ACTION_IDS,
	createCommandBulkSelectionSnapshot,
	createLifecycleBulkAdapter,
	createProjectBulkAdapter,
	createTaskBulkAdapter,
	lifecycleBulkActions,
	projectBulkActions,
	shouldClearBulkSelection,
	showBulkActionResultToast,
	taskBulkActions,
	useBulkActionContext,
	type BulkActionId,
	type BulkActionPayload,
	type BulkActionResultMessageLabels,
	type BulkEntityType,
} from '@/features/bulk-action'
import { DangerConfirmProvider } from '@/features/danger-confirm'
import {
	selectArchiveEntries,
	selectTrashEntries,
	useLifecycleStore,
} from '@/features/lifecycle/model/useLifecycleStore'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import type { TaskStatus } from '@/shared/types'

type ShellLayoutProps = PropsWithChildren<{
	currentScope: Scope
	currentSpaceId: string | null
	activeSection: ShellSectionKey
	shellRoute: ShellRoute
}>

export function ShellLayout({
	children,
	currentScope,
	currentSpaceId,
	activeSection,
	shellRoute,
}: ShellLayoutProps) {
	return (
		<CommandSelectionProvider>
			<SubmitRegistryProvider>
				<PageFilterProvider>
					<DangerConfirmProvider>
						<TaskPreviewProvider>
							<ShellLayoutBulkActionBoundary
								activeSection={activeSection}
								currentScope={currentScope}
								currentSpaceId={currentSpaceId}
								shellRoute={shellRoute}
							>
								{children}
							</ShellLayoutBulkActionBoundary>
						</TaskPreviewProvider>
					</DangerConfirmProvider>
				</PageFilterProvider>
			</SubmitRegistryProvider>
		</CommandSelectionProvider>
	)
}

function ShellLayoutBulkActionBoundary({
	children,
	currentScope,
	currentSpaceId,
	activeSection,
	shellRoute,
}: ShellLayoutProps) {
	const refreshLoadedTaskSlices = useTaskStore((state) => state.refreshLoadedSlices)
	const projectOverview = useProjectStore((state) => state.overview)
	const refreshLoadedProjectSlices = useProjectStore((state) => state.refreshLoadedSlices)
	const archiveEntries = useLifecycleStore(selectArchiveEntries)
	const trashEntries = useLifecycleStore(selectTrashEntries)
	const refreshLoadedLifecycleSlices = useLifecycleStore((state) => state.refreshLoadedSlices)
	const taskBulkAdapter = useMemo(
		() =>
			createTaskBulkAdapter({
				refreshLoadedSlices: refreshLoadedTaskSlices,
			}),
		[refreshLoadedTaskSlices],
	)
	const lifecycleBulkAdapter = useMemo(
		() =>
			createLifecycleBulkAdapter({
				entries: [...archiveEntries.items, ...trashEntries.items],
				refreshLoadedSlices: refreshLoadedLifecycleSlices,
			}),
		[archiveEntries.items, refreshLoadedLifecycleSlices, trashEntries.items],
	)
	const projectBulkAdapter = useMemo(
		() =>
			createProjectBulkAdapter({
				availableProjectIds: projectOverview.items.map((project) => project.id),
				refreshLoadedSlices: refreshLoadedProjectSlices,
			}),
		[projectOverview.items, refreshLoadedProjectSlices],
	)
	const bulkActionAdapter = useMemo(
		() => ({
			...taskBulkAdapter,
			...lifecycleBulkAdapter,
			...projectBulkAdapter,
		}),
		[lifecycleBulkAdapter, projectBulkAdapter, taskBulkAdapter],
	)
	const bulkActions = useMemo(
		() => [...taskBulkActions, ...lifecycleBulkActions, ...projectBulkActions],
		[],
	)

	return (
		<BulkActionProvider actions={bulkActions} context={{ adapter: bulkActionAdapter }}>
			<ShellLayoutContent
				activeSection={activeSection}
				currentScope={currentScope}
				currentSpaceId={currentSpaceId}
				shellRoute={shellRoute}
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
	shellRoute,
}: ShellLayoutProps) {
	const navigate = useNavigate()
	const isCommandOpen = useDialogStore(selectIsCommandOpen)
	const commandMenuMode = useDialogStore(selectCommandMenuMode)
	const commandMenuFilterKind = useDialogStore(selectCommandMenuFilterKind)
	const commandSelectionOverride = useDialogStore(selectCommandSelectionOverride)
	const isShortcutHelpOpen = useDialogStore(selectIsShortcutHelpOpen)
	const createDialogType = useDialogStore(selectCreateDialogType)
	const customDateDialog = useDialogStore(selectCustomDateDialog)
	const taskCreateDraft = useDialogStore(selectTaskCreateDraft)
	const taskCreatePresentation = useDialogStore(selectTaskCreatePresentation)
	const entityDetailController = useEntityDetailController()
	const activeDetail = entityDetailController.activeDetail
	const isDrawerOpen = entityDetailController.isOpen
	const openEntityDrawer = entityDetailController.openDrawer
	const closeEntityDrawer = entityDetailController.closeDrawer
	const taskPreviewController = useTaskPreviewController()
	const setCommandOpen = useDialogStore((state) => state.setCommandOpen)
	const setCommandMenuFilterKind = useDialogStore((state) => state.setCommandMenuFilterKind)
	const setShortcutHelpOpen = useDialogStore((state) => state.setShortcutHelpOpen)
	const toggleShortcutHelp = useDialogStore((state) => state.toggleShortcutHelp)
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const closeCustomDateDialog = useDialogStore((state) => state.closeCustomDateDialog)
	const toggleTaskCreatePresentation = useDialogStore((state) => state.toggleTaskCreatePresentation)
	const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null)
	const [chordSession, setChordSession] = useState<CommandChordSession | null>(null)
	const [placementProjects, setPlacementProjects] = useState<
		Array<{
			id: string
			label: string
			spaceId: string
			spaceName: string
			completedAt: string | null
		}>
	>([])
	const { runBulkAction } = useBulkActionContext()
	const pageFilter = usePageFilterContext()
	const submitRegistry = useSubmitRegistryContext()
	const submitRegistryActions = useSubmitRegistryActions()
	const pendingTaskOpenIntent = useSearchOpenIntentStore(selectPendingTaskOpenIntent)
	const consumePendingTaskOpenIntent = useSearchOpenIntentStore(
		(state) => state.consumePendingTaskOpenIntent,
	)
	const setPendingTaskOpenIntent = useSearchOpenIntentStore(
		(state) => state.setPendingTaskOpenIntent,
	)
	const requestSearchFocus = useSearchFocusIntentStore((state) => state.requestFocus)

	const routeProjectId = shellRoute.projectId
	const isNoProjectPage = shellRoute.section === 'noProject'

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
	const sidebarSettingsStatus = useSidebarSettingsStore(selectSidebarSettingsStatus)
	const sidebarSettings = useSidebarSettingsStore(selectSidebarSettings)
	const sidebarSettingsError = useSidebarSettingsStore(selectSidebarSettingsError)
	const spaceStatus = useSpaceStore(selectSpaceStatus)
	const spaceError = useSpaceStore(selectSpaceError)
	const sidebarProjects = useProjectStore(selectProjectSidebar)
	const projectOptions = useProjectStore(selectProjectOptions)
	const scopeKey = currentScope.type === 'all' ? 'all' : `space:${currentScope.spaceId}`
	const navBadges = useSidebarNavBadges(currentScope)
	const hasResolvedTaskDraftProject =
		Boolean(taskCreateDraft.projectId) &&
		projectOptions.some((project) => project.id === taskCreateDraft.projectId)
	const shouldDelayTaskCreateDialog =
		createDialogType === 'task' &&
		Boolean(taskCreateDraft.projectId) &&
		!hasResolvedTaskDraftProject &&
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
		if (spaceStatus !== 'ready') {
			return
		}

		let cancelled = false
		void listAllVisibleProjects()
			.then((items) => {
				if (cancelled) {
					return
				}
				setPlacementProjects(
					items.map((project) => ({
						id: project.id,
						label: project.name,
						spaceId: project.spaceId,
						spaceName: project.spaceName,
						completedAt: project.completedAt,
					})),
				)
			})
			.catch(() => {
				if (cancelled) {
					return
				}
				setPlacementProjects([])
			})

		return () => {
			cancelled = true
		}
	}, [spaceStatus])

	useEffect(() => {
		if (
			spaceStatus !== 'ready' ||
			!pendingTaskOpenIntent ||
			pendingTaskOpenIntent.targetPath !== shellRoute.pathname
		) {
			return
		}

		const consumedIntent = consumePendingTaskOpenIntent(shellRoute.pathname)
		if (!consumedIntent) {
			return
		}

		openEntityDrawer({ kind: 'task', id: consumedIntent.taskId })
	}, [consumePendingTaskOpenIntent, openEntityDrawer, pendingTaskOpenIntent, shellRoute.pathname, spaceStatus])

	useEffect(() => {
		if (!activeDetail || !taskPreviewController.previewState.open) {
			return
		}

		taskPreviewController.closePreview()
	}, [activeDetail, taskPreviewController.closePreview, taskPreviewController.previewState.open])

	const handleCommandOpen = useMemo(
		() => (payload: CommandOpenPayload) => {
			const targetPath = payload.projectId
				? buildCanonicalProjectPath(
						{ type: 'space', spaceId: payload.spaceId },
						payload.projectId,
						payload.spaceId,
					)
				: payload.kind === 'project'
					? buildCanonicalProjectPath(
							{ type: 'space', spaceId: payload.spaceId },
							payload.id,
							payload.spaceId,
						)
					: payload.placement === 'inbox'
						? buildCanonicalSectionPath(
								{ type: 'space', spaceId: payload.spaceId },
								'inbox',
								payload.spaceId,
							)
						: buildCanonicalSectionPath(
								{ type: 'space', spaceId: payload.spaceId },
								'no-project',
								payload.spaceId,
							)

			closeEntityDrawer()

			if (payload.kind === 'project') {
				if (shellRoute.pathname === targetPath) {
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

			if (shellRoute.pathname === targetPath) {
				openEntityDrawer({ kind: 'task', id: payload.id })
				return
			}

			startTransition(() => {
				navigate(targetPath)
			})
		},
		[closeEntityDrawer, navigate, openEntityDrawer, setPendingTaskOpenIntent, shellRoute.pathname],
	)

	const projectLinks = useMemo(
		() =>
			placementProjects.map((project) => ({
				id: project.id,
				label: project.label,
				spaceId: project.spaceId,
				spaceName: project.spaceName,
				completedAt: project.completedAt,
			})),
		[placementProjects],
	)
	const sidebarProjectLinks = useMemo(
		() =>
			sidebarProjects.items.map((project) => ({
				id: project.id,
				label: project.name,
				spaceId: project.spaceId,
				spaceName: spaces.find((space) => space.id === project.spaceId)?.name ?? project.spaceId,
				completedAt: project.completedAt,
				badge: sidebarSettings?.projectSection.showCounts
					? project.taskCount > 0
						? String(project.taskCount)
						: undefined
					: project.completedAt
						? 'done'
						: undefined,
			})),
		[sidebarProjects.items, sidebarSettings?.projectSection.showCounts, spaces],
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
		currentRoute: shellRoute,
		spaces,
		projects: sidebarProjectLinks,
	})
	const handleCommandMenuOpenChange = useCallback(
		(open: boolean) => {
			setCommandOpen(open)
		},
		[setCommandOpen],
	)
	const runEntityBulkActionFromCommand = useCallback(
		async (
			ctx: CommandContext,
			entity: BulkEntityType,
			actionId: BulkActionId,
			labels: BulkActionResultMessageLabels,
			payload?: BulkActionPayload,
		) => {
			if (ctx.selection.type !== entity || ctx.selection.ids.length === 0) {
				return
			}

			const snapshot = createCommandBulkSelectionSnapshot(ctx.selection, entity, 'command-menu')
			const result = await runBulkAction(actionId, snapshot, payload)
			if (shouldClearBulkSelection(result)) {
				ctx.selection.clearSelection?.()
			}
			const feedback = showBulkActionResultToast(result, labels)
			if (feedback.shouldThrow) {
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
			closeCurrentLayer: (ctx) => {
				if (isShortcutHelpOpen) {
					useDialogStore.getState().closeShortcutHelp()
					return
				}

				if (createDialogType === 'task') {
					closeTaskCreateDialog()
					return
				}

				if (createDialogType === 'project') {
					closeProjectCreateDialog()
					return
				}

				if (activeDetail) {
					closeEntityDrawer()
					return
				}

				if (taskPreviewController.previewState.open) {
					taskPreviewController.closePreview()
					return
				}

				if (isCommandOpen) {
					useDialogStore.getState().closeCommand()
					return
				}

				if (ctx.selection.hasSelection) {
					ctx.selection.clearSelection?.()
					return
				}

				if (canGoBack) {
					goBack()
				}
			},
			submitActiveForm: async () => {
				await submitRegistryActions.submitActiveTarget()
			},
			submitAndContinue: async () => {
				await submitRegistryActions.submitActiveTarget('continue')
			},
			submitAndOpen: async () => {
				await submitRegistryActions.submitActiveTarget('open')
			},
			toggleSidebar: () => {
				requestSidebarToggle()
			},
			togglePreview: (ctx) => {
				if (activeDetail?.kind === 'task') {
					closeEntityDrawer()
					taskPreviewController.openPreview(activeDetail.id, 'keyboard')
					return
				}

				if (taskPreviewController.previewState.open) {
					taskPreviewController.closePreview()
					return
				}

				const targetTaskId = resolveTaskDetailTargetId(ctx)
				if (!targetTaskId) {
					return
				}

				taskPreviewController.openPreview(targetTaskId, 'keyboard')
			},
			openTaskPlacementPicker: (ctx) => {
				useDialogStore.getState().openCommand('task-placement-picker', ctx.selection)
			},
			applyTaskPlacement: (target, ctx) => {
				if (target.kind === 'project') {
					return runEntityBulkActionFromCommand(
						ctx,
						'task',
						TASK_BULK_ACTION_IDS.moveToProjectSelected,
						{
							successVerb: '整理',
							entityLabel: '任务',
						},
						{
							projectId: target.projectId,
							spaceId: target.spaceId,
						},
					)
				}

				return runEntityBulkActionFromCommand(
					ctx,
					'task',
					TASK_BULK_ACTION_IDS.moveToNoProjectSelected,
					{
						successVerb: '整理',
						entityLabel: '任务',
					},
					{
						spaceId: target.spaceId,
					},
				)
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
			openFilterPicker: (kind) => {
				pageFilter.actions.openFilterPicker(kind)
				setCommandMenuFilterKind(kind)
				useDialogStore.getState().openCommand('filter-picker', null, kind)
			},
			toggleCompletedFilter: () => {
				pageFilter.actions.toggleCompleted()
			},
			clearAllFilters: () => {
				pageFilter.actions.clearAll()
			},
			completeSelectedTasks: (ctx) =>
				runEntityBulkActionFromCommand(ctx, 'task', TASK_BULK_ACTION_IDS.completeSelected, {
					successVerb: '更新',
					entityLabel: '任务',
				}),
			requestArchiveSelectedTasks: (ctx) =>
				runEntityBulkActionFromCommand(ctx, 'task', TASK_BULK_ACTION_IDS.archiveSelected, {
					successVerb: '更新',
					entityLabel: '任务',
				}),
			requestDeleteSelectedTasks: (ctx) =>
				runEntityBulkActionFromCommand(ctx, 'task', TASK_BULK_ACTION_IDS.deleteSelected, {
					successVerb: '更新',
					entityLabel: '任务',
				}),
			requestArchiveSelectedProjects: (ctx) =>
				runEntityBulkActionFromCommand(ctx, 'project', PROJECT_BULK_ACTION_IDS.archiveSelected, {
					successVerb: '处理',
					entityLabel: '项目',
				}),
			requestDeleteSelectedProjects: (ctx) =>
				runEntityBulkActionFromCommand(ctx, 'project', PROJECT_BULK_ACTION_IDS.deleteSelected, {
					successVerb: '处理',
					entityLabel: '项目',
				}),
			restoreSelectedLifecycleEntries: (ctx) =>
				runEntityBulkActionFromCommand(
					ctx,
					'lifecycle',
					LIFECYCLE_BULK_ACTION_IDS.restoreSelected,
					{ successVerb: '处理', entityLabel: '条目' },
				),
			requestDeleteSelectedLifecycleEntries: (ctx) =>
				runEntityBulkActionFromCommand(ctx, 'lifecycle', LIFECYCLE_BULK_ACTION_IDS.deleteSelected, {
					successVerb: '处理',
					entityLabel: '条目',
				}),
			requestDeletePermanentlySelectedLifecycleEntries: (ctx) =>
				runEntityBulkActionFromCommand(
					ctx,
					'lifecycle',
					LIFECYCLE_BULK_ACTION_IDS.deletePermanentlySelected,
					{ successVerb: '处理', entityLabel: '条目' },
				),
			navigateTo: (target: ShellNavigationTarget) => {
				startTransition(() => {
					navigate(buildCanonicalSectionPath(currentScope, target, currentSpaceId))
				})
			},
			goBack,
			goForward,
		}),
		[
			currentScope,
			currentSpaceId,
			activeDetail,
			goBack,
			goForward,
			canGoBack,
			closeEntityDrawer,
			closeProjectCreateDialog,
			closeTaskCreateDialog,
			createDialogType,
			handleOpenTaskCreate,
			isCommandOpen,
			isShortcutHelpOpen,
			navigate,
			openEntityDrawer,
			openProjectCreateDialog,
			openTaskCreateDialog,
			pageFilter,
			requestSearchFocus,
			runEntityBulkActionFromCommand,
			setCommandMenuFilterKind,
			submitRegistryActions,
			taskPreviewController,
			toggleShortcutHelp,
		],
	)
	const activeShortcutBindings = useMemo<Keybinding[]>(
		() =>
			isShortcutHelpOpen
				? DEFAULT_KEYBINDINGS.filter(
						(binding) =>
							binding.commandId === COMMAND_IDS.openShortcutHelp ||
							binding.commandId === COMMAND_IDS.close,
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
			isPreviewOpen: taskPreviewController.previewState.open,
			isDetailOpen: Boolean(activeDetail),
			detailEntityType: activeDetail?.kind,
			isModalOpen: createDialogType !== null || isShortcutHelpOpen,
			isRightPreviewOpen: taskPreviewController.previewState.open,
		}),
		[
			activeDetail,
			createDialogType,
			isCommandOpen,
			isShortcutHelpOpen,
			taskPreviewController.previewState.open,
		],
	)
	const commandFocus = useMemo(
		() => ({
			activePanel: resolveCommandActivePanel({
				isCommandOpen,
				isShortcutHelpOpen,
				isModalOpen: createDialogType !== null,
				isPreviewOpen: taskPreviewController.previewState.open,
				isDetailOpen: Boolean(activeDetail),
			}),
		}),
		[
			activeDetail,
			createDialogType,
			isCommandOpen,
			isShortcutHelpOpen,
			taskPreviewController.previewState.open,
		],
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
	const commandView = useMemo(
		() => ({
			hasActiveFilters: pageFilter.state.hasActiveFilters,
			showCompleted: pageFilter.state.showCompleted,
			priorityFilterValues: pageFilter.state.priorityValues,
			statusFilterValues: pageFilter.state.statusValues,
			dateFilterValue: pageFilter.state.dateValue,
			projectFilterId: pageFilter.state.projectId,
			projectlessOnly: pageFilter.state.projectlessOnly,
			filterCapabilities: pageFilter.capabilities,
			filterKind: commandMenuFilterKind,
		}),
		[
			commandMenuFilterKind,
			pageFilter.capabilities,
			pageFilter.state.dateValue,
			pageFilter.state.hasActiveFilters,
			pageFilter.state.priorityValues,
			pageFilter.state.projectId,
			pageFilter.state.projectlessOnly,
			pageFilter.state.showCompleted,
			pageFilter.state.statusValues,
		],
	)
	const commandContext = useCommandContext({
		route: commandRoute,
		selection: commandSelection,
		focus: commandFocus,
		ui: commandUi,
		space: commandSpace,
		project: commandProject,
		view: commandView,
		submit: {
			hasActiveTarget: submitRegistry.hasActiveTarget,
			canSubmitDefault: submitRegistry.canSubmitIntent('default'),
			canSubmitContinue: submitRegistry.canSubmitIntent('continue'),
			canSubmitOpen: submitRegistry.canSubmitIntent('open'),
			submitContinueDisabledReason: submitRegistry.getIntentDisabledReason('continue'),
			submitOpenDisabledReason: submitRegistry.getIntentDisabledReason('open'),
		},
	})
	const commandRuntime = useCommandRuntime({
		actions: shellCommandActions,
		context: commandContext,
	})
	const runCommand = useCommandRunner({ runtime: commandRuntime })
	const shouldTriggerCommandShortcut = useCallback(
		(commandId: CommandId) => {
			const command = commandRuntime.getCommands().find((item) => item.id === commandId)
			if (!command) {
				return true
			}

			return commandRuntime.getCommandState(command, commandContext).enabled
		},
		[commandContext, commandRuntime],
	)

	const updateSelectedTasks = useCallback(
		async (
			actionId: BulkActionId,
			payload?: {
				priority?: TaskPriorityValue
				status?: TaskStatus
				dueAt?: string | null
				projectId?: string
				spaceId?: string
			},
		) => {
			if (commandContext.selection.type !== 'task' || commandContext.selection.ids.length === 0) {
				return
			}

			await runEntityBulkActionFromCommand(
				commandContext,
				'task',
				actionId,
				{
					successVerb: '更新',
					entityLabel: '任务',
				},
				payload,
			)
		},
		[commandContext, runEntityBulkActionFromCommand],
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

	const handleSelectTaskPlacement = useCallback(
		(target: TaskPlacementTarget) => {
			if (target.kind === 'project') {
				void updateSelectedTasks(TASK_BULK_ACTION_IDS.moveToProjectSelected, {
					projectId: target.projectId,
					spaceId: target.spaceId,
				}).catch(() => undefined)
				return
			}

			void updateSelectedTasks(TASK_BULK_ACTION_IDS.moveToNoProjectSelected, {
				spaceId: target.spaceId,
			}).catch(() => undefined)
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
				shouldTrigger={shouldTriggerCommandShortcut}
			/>
			<ShellHeader
				activeSection={activeSection}
				canGoBack={canGoBack}
				chordSession={chordSession}
				canGoForward={canGoForward}
				commandContext={commandContext}
				commandMenuMode={commandMenuMode}
				commandMenuFilterKind={commandMenuFilterKind}
				commandRuntime={commandRuntime}
				currentSpaceId={currentSpaceId}
				currentScope={currentScope}
				isCommandOpen={isCommandOpen}
				isShortcutHelpOpen={isShortcutHelpOpen}
				onCloseDrawer={closeEntityDrawer}
				onCommandOpenChange={handleCommandMenuOpenChange}
				onNavigateToHistoryEntry={navigateToHistoryEntry}
				onRunCommand={runCommand}
				onSelectFilterKind={(kind) => {
					pageFilter.actions.openFilterPicker(kind)
					setCommandMenuFilterKind(kind)
				}}
				onApplyFilter={(input) => {
					pageFilter.actions.applyFilter(input)
				}}
				onClearAllFilters={() => {
					pageFilter.actions.clearAll()
				}}
				onToggleCompletedFilter={() => {
					pageFilter.actions.toggleCompleted()
				}}
				onSelectTaskDate={handleSelectTaskDate}
				onSelectTaskPlacement={handleSelectTaskPlacement}
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
						projects={sidebarProjectLinks}
						spaces={spaces}
						settings={sidebarSettings}
					/>
				</div>

				<div className='relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-sf-shell'>
					<ShellMain
						activeDetail={activeDetail}
						currentSpaceLabel={currentSpaceLabel}
						isDrawerOpen={isDrawerOpen}
						onCloseDrawer={closeEntityDrawer}
						onOpenProjectCreateDialog={() => openProjectCreateDialog()}
						onOpenTaskCreateDialog={handleOpenTaskCreate}
						showPreview
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
			{/* <ShellFooter navBadges={navBadges} /> */}
			{/* 占位，保持底部边距 */}
			<div className='h-2 shrink-0 bg-sf-shell' />
		</SidebarProvider>
	)
}

function resolveTaskDetailTargetId(ctx: CommandContext) {
	if (ctx.rowTarget.isTaskTarget && ctx.rowTarget.targetId) {
		return ctx.rowTarget.targetId
	}

	if (ctx.selection.focusedType === 'task' && ctx.selection.focusedId) {
		return ctx.selection.focusedId
	}

	if (ctx.selection.primaryEntity?.type === 'task') {
		return ctx.selection.primaryEntity.id
	}

	if (
		ctx.selection.type === 'task' &&
		ctx.selection.isSingleSelection &&
		ctx.selection.ids.length === 1
	) {
		return ctx.selection.ids[0]
	}

	return null
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
	isPreviewOpen,
	isDetailOpen,
}: {
	isCommandOpen: boolean
	isShortcutHelpOpen: boolean
	isModalOpen: boolean
	isPreviewOpen: boolean
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
	if (isPreviewOpen) {
		return 'preview'
	}
	if (isDetailOpen) {
		return 'detail'
	}
	return 'main'
}
