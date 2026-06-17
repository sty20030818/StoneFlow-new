import {
	startTransition,
	useCallback,
	useEffect,
	useMemo,
	useState,
	type PropsWithChildren,
} from 'react'

import {} from '@/app/routing'
import { openShellNavigationTarget, openTaskDetail } from '@/app/navigation/intents'
import { useNavigate } from '@/app/routing/tanstackCompat'
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
import {
	resolveCommandOpenTargetPath,
	resolveShellDetailState,
} from '@/app/layouts/shell/model/taskOpenStrategy'
import { useEntityDetailController } from '@/features/entity-detail'
import { useSearchFocusIntentStore } from '@/features/global-search/model/useSearchFocusIntentStore'
import { type CommandOpenPayload, useCommandOpenListener } from '@/shared/events'
import { listAllVisibleProjects } from '@/features/project/api/projects'
import {
	useProjectOverviewData,
	useProjectOptions,
	useProjectSidebarData,
} from '@/features/project/query'
import { CommandSelectionProvider, useCommandSelectionContext } from '@/features/selection/model'
import { PageFilterProvider, usePageFilterContext } from '@/features/filter/model'
import {
	SubmitRegistryProvider,
	useSubmitRegistryActions,
	useSubmitRegistryContext,
} from '@/features/submit/model'
import { takePendingCommandOpenIntent } from '@/features/space/api/spaces'
import {
	useArchiveSpaceMutation,
	useCreateSpaceMutation,
	useDeleteSpaceMutation,
	useSetDefaultSpaceMutation,
	useSpaces,
	useUpdateSpaceMutation,
} from '@/features/space/query'
import { ProjectCreateContent } from '@/features/project/ui/ProjectCreateContent'
import { TaskPreviewProvider, useTaskPreviewController } from '@/features/task/detail'
import { TaskCreateContent } from '@/features/task/ui/TaskCreateContent'
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
import { useLifecycleEntriesQuery } from '@/features/lifecycle/query'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import type { TaskStatus } from '@/shared/types'
import { useQueryClient } from '@tanstack/react-query'
import { invalidateWorkspaceQueries } from '@/shared/query/invalidation'

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
	const queryClient = useQueryClient()
	const refreshLoadedSlices = useCallback(
		() => invalidateWorkspaceQueries(queryClient),
		[queryClient],
	)
	const projectOverview = useProjectOverviewData(currentScope, 'all_projects')
	const archiveEntries = useLifecycleEntriesQuery('archive', currentScope)
	const trashEntries = useLifecycleEntriesQuery('trash', currentScope)
	const taskBulkAdapter = useMemo(
		() =>
			createTaskBulkAdapter({
				refreshLoadedSlices,
			}),
		[refreshLoadedSlices],
	)
	const lifecycleBulkAdapter = useMemo(
		() =>
			createLifecycleBulkAdapter({
				entries: [...(archiveEntries.data ?? []), ...(trashEntries.data ?? [])],
				refreshLoadedSlices,
			}),
		[archiveEntries.data, refreshLoadedSlices, trashEntries.data],
	)
	const projectBulkAdapter = useMemo(
		() =>
			createProjectBulkAdapter({
				availableProjectIds: projectOverview.items.map((project) => project.id),
				refreshLoadedSlices,
			}),
		[projectOverview.items, refreshLoadedSlices],
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
	const closeEntityDrawer = entityDetailController.closeDrawer
	const taskPreviewController = useTaskPreviewController()
	const isTaskPreviewOpen = taskPreviewController.previewState.open
	const closeTaskPreview = taskPreviewController.closePreview
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
	const requestSearchFocus = useSearchFocusIntentStore((state) => state.requestFocus)

	const routeProjectId = shellRoute.kind === 'project' ? shellRoute.projectId : null
	const isTaskDetailPage = shellRoute.kind === 'task'
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
	const { spaces, status: spaceStatus, error: spaceError } = useSpaces()
	const defaultCreateSpaceId = useMemo(
		() =>
			currentScope.type === 'space'
				? currentScope.spaceId
				: (spaces.find((space) => space.isDefault)?.id ?? spaces[0]?.id ?? null),
		[currentScope, spaces],
	)
	const openTaskPage = useCallback(
		({ taskId, spaceId }: { taskId: string; spaceId: string }) => {
			const targetPath = openTaskDetail(taskId, spaceId)

			closeTaskPreview()
			closeEntityDrawer()

			if (shellRoute.pathname === targetPath) {
				return
			}

			startTransition(() => {
				navigate(targetPath)
			})
		},
		[closeEntityDrawer, closeTaskPreview, navigate, shellRoute.pathname],
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
	const sidebarProjects = useProjectSidebarData(currentScope)
	const projectOptions = useProjectOptions(currentScope)
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
	const createSpace = useCreateSpaceMutation()
	const updateSpace = useUpdateSpaceMutation()
	const setDefaultSpace = useSetDefaultSpaceMutation()
	const archiveSpace = useArchiveSpaceMutation()
	const deleteSpace = useDeleteSpaceMutation()
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
		if ((!activeDetail && !isTaskDetailPage) || !isTaskPreviewOpen) {
			return
		}

		closeTaskPreview()
	}, [activeDetail, closeTaskPreview, isTaskDetailPage, isTaskPreviewOpen, taskPreviewController])

	const handleCommandOpen = useMemo(
		() => (payload: CommandOpenPayload) => {
			if (payload.kind === 'task') {
				openTaskPage({
					taskId: payload.id,
					spaceId: payload.spaceId,
				})
				return
			}

			const targetPath = resolveCommandOpenTargetPath(payload)
			closeEntityDrawer()

			if (shellRoute.pathname === targetPath) {
				return
			}

			startTransition(() => {
				navigate(targetPath)
			})
		},
		[closeEntityDrawer, navigate, openTaskPage, shellRoute.pathname],
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
			applyTaskPlacement: (target, ctx) =>
				runEntityBulkActionFromCommand(
					ctx,
					'task',
					TASK_BULK_ACTION_IDS.setPlacementSelected,
					{
						successVerb: '整理',
						entityLabel: '任务',
					},
					{
						target,
					},
				),
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
					navigate(
						openShellNavigationTarget(target, {
							scope: currentScope,
							fallbackSpaceId: currentSpaceId,
						}),
					)
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
	const detailState = useMemo(
		() =>
			resolveShellDetailState({
				activeDetailKind: activeDetail?.kind ?? null,
				routeKind: shellRoute.kind,
			}),
		[activeDetail?.kind, shellRoute.kind],
	)
	const commandUi = useMemo(
		() => ({
			isCommandMenuOpen: isCommandOpen,
			isPreviewOpen: taskPreviewController.previewState.open,
			isDetailOpen: detailState.isDetailOpen,
			detailEntityType: detailState.detailEntityType,
			isModalOpen: createDialogType !== null || isShortcutHelpOpen,
			isRightPreviewOpen: taskPreviewController.previewState.open,
		}),
		[
			createDialogType,
			detailState.detailEntityType,
			detailState.isDetailOpen,
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
				isDetailOpen: detailState.isDetailOpen,
			}),
		}),
		[
			createDialogType,
			detailState.isDetailOpen,
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
				target?: TaskPlacementTarget
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
			void updateSelectedTasks(TASK_BULK_ACTION_IDS.setPlacementSelected, {
				target,
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
				onOpenTaskPage={(task) => {
					openTaskPage({ taskId: task.id, spaceId: task.spaceId })
				}}
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
						onArchiveSpace={(spaceId) => archiveSpace.mutateAsync(spaceId)}
						onCreateSpace={(input) => createSpace.mutateAsync(input)}
						onDeleteSpace={(spaceId) => deleteSpace.mutateAsync(spaceId)}
						onOpenProjectCreateDialog={openProjectCreateDialog}
						onResetMainItemsVisibility={() => {
							void resetSidebarMainItemsVisibility()
						}}
						onSetDefaultSpace={(spaceId) => setDefaultSpace.mutateAsync(spaceId)}
						onUpdateItemVisibility={(target, visible) => {
							void setSidebarItemVisibility(target, visible)
						}}
						onUpdateSpace={(input) => updateSpace.mutateAsync(input)}
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
		case 'tasks':
			return 'tasks'
		case 'views':
			return 'views'
		case 'projects':
			return 'projects'
		case 'archive':
			return 'archive'
		case 'trash':
			return 'trash'
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
