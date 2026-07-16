import { startTransition, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { openTaskDetail } from '@/app/navigation/intents'
import type { ShellRoute } from '@/app/navigation/shellRoute'
import type { Scope } from '@/shared/types'
import type { ShellSectionKey } from '@/app/layouts/shell/types'
import { useShellCommandActions } from '@/app/layouts/shell/command-bridge/useShellCommandActions'
import {
	resolveCommandRoutePage,
	resolveCommandActivePanel,
} from '@/app/layouts/shell/shellCommandRouteHelpers'
import {
	resolveCommandOpenTargetPath,
	resolveShellDetailState,
} from '@/app/layouts/shell/model/taskOpenStrategy'
import {
	selectCommandMenuFilterKind,
	selectCommandMenuMode,
	selectCommandSelectionOverride,
	selectCreateDialogType,
	selectIsCommandOpen,
	selectIsShortcutHelpOpen,
	useDialogStore,
} from '@/app/layouts/shell/model/useDialogStore'
import { listAllVisibleProjects } from '@/features/project/api/projects'
import { useCommandSelectionContext } from '@/features/selection/model'
import { usePageFilterContext } from '@/features/filter/model'
import { useSubmitRegistryActions, useSubmitRegistryContext } from '@/features/submit/model'
import { takePendingCommandOpenIntent } from '@/features/space/api/spaces'
import { useSpaces } from '@/features/space/query'
import { useEntityDetailController } from '@/features/entity-detail'
import { useTaskPreviewController } from '@/features/task/detail'
import { useSearchFocusIntentStore } from '@/features/global-search/model/useSearchFocusIntentStore'
import { type CommandOpenPayload, useCommandOpenListener } from '@/shared/events'
import {
	DEFAULT_KEYBINDINGS,
	type CommandChordSession,
	type Keybinding,
	useCommandContext,
	useCommandRunner,
	useCommandRuntime,
	type TaskPlacementTarget,
} from '@/features/command'
import { COMMAND_IDS, type CommandContext, type CommandId } from '@/features/command/core'
import {
	TASK_BULK_ACTION_IDS,
	createCommandBulkSelectionSnapshot,
	shouldClearBulkSelection,
	showBulkActionResultToast,
	useBulkActionContext,
	type BulkActionId,
	type BulkActionPayload,
	type BulkActionResultMessageLabels,
	type BulkEntityType,
} from '@/features/bulk-action'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import type { TaskStatus } from '@/shared/types'

type OpenTaskCreate = ReturnType<typeof useDialogStore.getState>['openTaskCreateDialog']

/**
 * 命令宿主：把壳上的 route/selection/filter/submit/预览 聚合成 CommandContext + Runtime。
 *
 * 输出字段多，是因为 Header / ShortcutLayer / 命令板 需要的形状不同；
 * 不是同一状态的多份拷贝（除 command UI 协议里 isPreviewOpen ≈ isRightPreviewOpen 历史双字段）。
 */
export function useShellCommandSystem({
	currentScope,
	currentSpaceId,
	activeSection,
	shellRoute,
	handleOpenTaskCreate,
	openTaskCreateDialog,
	openProjectCreateDialog,
	closeTaskCreateDialog,
	closeProjectCreateDialog,
	goBack,
	goForward,
	canGoBack,
}: {
	currentScope: Scope
	currentSpaceId: string | null
	activeSection: ShellSectionKey
	shellRoute: ShellRoute
	handleOpenTaskCreate: () => void
	openTaskCreateDialog: OpenTaskCreate
	openProjectCreateDialog: () => void
	closeTaskCreateDialog: () => void
	closeProjectCreateDialog: () => void
	goBack: () => void
	goForward: () => void
	canGoBack: boolean
}) {
	const navigate = useNavigate({ from: '/' })

	const isCommandOpen = useDialogStore(selectIsCommandOpen)
	const commandMenuMode = useDialogStore(selectCommandMenuMode)
	const commandMenuFilterKind = useDialogStore(selectCommandMenuFilterKind)
	const commandSelectionOverride = useDialogStore(selectCommandSelectionOverride)
	const isShortcutHelpOpen = useDialogStore(selectIsShortcutHelpOpen)
	const createDialogType = useDialogStore(selectCreateDialogType)
	const setCommandOpen = useDialogStore((state) => state.setCommandOpen)
	const setCommandMenuFilterKind = useDialogStore((state) => state.setCommandMenuFilterKind)
	const setShortcutHelpOpen = useDialogStore((state) => state.setShortcutHelpOpen)
	const toggleShortcutHelp = useDialogStore((state) => state.toggleShortcutHelp)

	const entityDetailController = useEntityDetailController()
	const activeDetail = entityDetailController.activeDetail
	const isDrawerOpen = entityDetailController.isOpen
	const closeEntityDrawer = entityDetailController.closeDrawer

	const taskPreviewController = useTaskPreviewController()
	const { runBulkAction } = useBulkActionContext()
	const pageFilter = usePageFilterContext()
	const submitRegistry = useSubmitRegistryContext()
	const submitRegistryActions = useSubmitRegistryActions()
	const requestSearchFocus = useSearchFocusIntentStore((state) => state.requestFocus)
	const registeredCommandSelection = useCommandSelectionContext()
	const { status: spaceStatus } = useSpaces()

	const [chordSession, setChordSession] = useState<CommandChordSession | null>(null)
	const [commandProjects, setCommandProjects] = useState<
		Array<{
			id: string
			label: string
			spaceId: string
			spaceName: string
			completedAt: string | null
		}>
	>([])

	const routeProjectId = shellRoute.kind === 'project' ? shellRoute.projectId : null
	const isTaskDetailPage = shellRoute.kind === 'task'

	const openTaskPage = useCallback(
		({ taskId, spaceId }: { taskId: string; spaceId: string }) => {
			const targetPath = openTaskDetail(taskId, spaceId)
			taskPreviewController.closePreview()
			closeEntityDrawer()
			if (shellRoute.pathname === targetPath) {
				return
			}
			startTransition(() => {
				void navigate({ to: targetPath as never })
			})
		},
		[closeEntityDrawer, navigate, shellRoute.pathname, taskPreviewController],
	)

	useEffect(() => {
		if (!isCommandOpen || spaceStatus !== 'ready' || commandProjects.length > 0) {
			return
		}
		let cancelled = false
		void listAllVisibleProjects()
			.then((items) => {
				if (cancelled) return
				setCommandProjects(
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
				if (!cancelled) setCommandProjects([])
			})
		return () => {
			cancelled = true
		}
	}, [commandProjects.length, isCommandOpen, spaceStatus])

	useEffect(() => {
		if ((!activeDetail && !isTaskDetailPage) || !taskPreviewController.previewState.open) {
			return
		}
		taskPreviewController.closePreview()
	}, [activeDetail, isTaskDetailPage, taskPreviewController])

	const handleCommandOpen = useCallback(
		(payload: CommandOpenPayload) => {
			if (payload.kind === 'task') {
				openTaskPage({ taskId: payload.id, spaceId: payload.spaceId })
				return
			}
			const targetPath = resolveCommandOpenTargetPath(payload)
			closeEntityDrawer()
			if (shellRoute.pathname === targetPath) return
			startTransition(() => {
				void navigate({ to: targetPath as never })
			})
		},
		[closeEntityDrawer, navigate, openTaskPage, shellRoute.pathname],
	)

	useCommandOpenListener(handleCommandOpen)

	useEffect(() => {
		if (spaceStatus !== 'ready') {
			return
		}
		let cancelled = false
		void takePendingCommandOpenIntent()
			.then((payload) => {
				if (cancelled || !payload) return
				handleCommandOpen(payload)
			})
			.catch((error) => {
				console.error('take pending command open intent failed', { error })
			})
		return () => {
			cancelled = true
		}
	}, [handleCommandOpen, spaceStatus])

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

	const shellCommandActions = useShellCommandActions({
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
	})

	const detailState = useMemo(
		() =>
			resolveShellDetailState({
				activeDetailKind: activeDetail?.kind ?? null,
				routeKind: shellRoute.kind,
			}),
		[activeDetail?.kind, shellRoute.kind],
	)

	const commandRoute = useMemo(
		() => ({
			page: resolveCommandRoutePage(activeSection),
			projectId: routeProjectId ?? undefined,
		}),
		[activeSection, routeProjectId],
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

	const previewOpen = taskPreviewController.previewState.open

	const commandUi = useMemo(
		() => ({
			isCommandMenuOpen: isCommandOpen,
			isPreviewOpen: previewOpen,
			/** command 协议历史字段，与 isPreviewOpen 同值 */
			isRightPreviewOpen: previewOpen,
			isDetailOpen: detailState.isDetailOpen,
			detailEntityType: detailState.detailEntityType,
			isModalOpen: createDialogType !== null || isShortcutHelpOpen,
		}),
		[
			createDialogType,
			detailState.detailEntityType,
			detailState.isDetailOpen,
			isCommandOpen,
			isShortcutHelpOpen,
			previewOpen,
		],
	)

	const commandSpace = useMemo(
		() => ({ currentSpaceId: currentSpaceId ?? undefined }),
		[currentSpaceId],
	)
	const commandProject = useMemo(
		() => ({ currentProjectId: routeProjectId ?? undefined }),
		[routeProjectId],
	)
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

	const commandSelection = commandSelectionOverride ?? registeredCommandSelection

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
			if (!command) return true
			return commandRuntime.getCommandState(command, commandContext).enabled
		},
		[commandContext, commandRuntime],
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
				{ successVerb: '更新', entityLabel: '任务' },
				payload,
			)
		},
		[commandContext, runEntityBulkActionFromCommand],
	)

	const onSelectTaskPriority = useCallback(
		(priority: TaskPriorityValue) => {
			void updateSelectedTasks(TASK_BULK_ACTION_IDS.setPrioritySelected, { priority }).catch(
				() => undefined,
			)
		},
		[updateSelectedTasks],
	)
	const onSelectTaskStatus = useCallback(
		(status: TaskStatus) => {
			void updateSelectedTasks(TASK_BULK_ACTION_IDS.setStatusSelected, { status }).catch(
				() => undefined,
			)
		},
		[updateSelectedTasks],
	)
	const onSelectTaskPlacement = useCallback(
		(target: TaskPlacementTarget) => {
			void updateSelectedTasks(TASK_BULK_ACTION_IDS.setPlacementSelected, { target }).catch(
				() => undefined,
			)
		},
		[updateSelectedTasks],
	)
	const onSelectTaskDate = useCallback(
		(dueAt: string | null) => {
			void updateSelectedTasks(TASK_BULK_ACTION_IDS.setDateSelected, { dueAt }).catch(
				() => undefined,
			)
		},
		[updateSelectedTasks],
	)

	return {
		commandContext,
		commandRuntime,
		runCommand,
		shouldTriggerCommandShortcut,
		activeShortcutBindings,
		chordSession,
		setChordSession,
		isCommandOpen,
		commandMenuMode,
		commandMenuFilterKind,
		isShortcutHelpOpen,
		setCommandOpen,
		setCommandMenuFilterKind,
		setShortcutHelpOpen,
		activeDetail,
		isDrawerOpen,
		closeEntityDrawer,
		openTaskPage,
		/** 命令板项目列表；空时 Header 可回退侧栏 projects */
		commandProjects,
		pageFilter,
		onSelectTaskPriority,
		onSelectTaskStatus,
		onSelectTaskPlacement,
		onSelectTaskDate,
	}
}
