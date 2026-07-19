import { useCallback, useMemo, useState } from 'react'

import type { ShellRoute } from '@/app/navigation'
import type { Scope } from '@/shared/types'
import type { ShellSectionKey } from '@/layout/types'
import { useShellCommandActions } from '@/layout/command-bridge/useShellCommandActions'
import {
	selectCommandMenuFilterKind,
	selectCommandMenuMode,
	selectCommandSelectionOverride,
	selectCreateDialogType,
	selectIsCommandOpen,
	selectIsShortcutHelpOpen,
	useDialogStore,
} from '@/features/shell-dialogs'
import { useCommandSelectionContext } from '@/features/selection'
import { usePageFilterContext } from '@/features/filter'
import { useSubmitRegistryActions, useSubmitRegistryContext } from '@/features/submit'
import { useSpaces } from '@/features/space'
import { useEntityDetailController } from '@/features/entity-detail'
import { useTaskPreviewController } from '@/features/task'
import { useSearchFocusIntentStore } from '@/features/global-search'
import {
	DEFAULT_KEYBINDINGS,
	type CommandChordSession,
	type Keybinding,
	useCommandRunner,
	useCommandRuntime,
	COMMAND_IDS,
	type CommandId,
} from '@/features/command'
import { useBulkActionContext } from '@/features/bulk-action'
import { createShellCommandTaskMetaHandlers } from '@/layout/model/shellCommandTaskMeta'
import { createRunEntityBulkActionFromCommand } from '@/layout/model/runShellCommandBulkAction'
import { useShellCommandOpenRouting } from '@/layout/model/useShellCommandOpenRouting'
import { useShellCommandProjects } from '@/layout/model/useShellCommandProjects'
import { useShellCommandHostContext } from '@/layout/model/useShellCommandHostContext'

type OpenTaskCreate = ReturnType<typeof useDialogStore.getState>['openTaskCreateDialog']

/**
 * 命令宿主：装配 Host 依赖 → compose actions → Context + Runtime。
 *
 * 打开路由 / 项目列表 / Context 切片 / bulk 执行已拆到同夹子模块；
 * 本文件只做接线，不写 domain mutation。
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
	isSettingsMode = false,
	settingsReturnPath,
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
	/** Settings Mode：Esc 关层无上层时可退出设置 */
	isSettingsMode?: boolean
	settingsReturnPath?: string
}) {
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

	const isTaskDetailPage = shellRoute.kind === 'task'
	const { openTaskPage, navigate } = useShellCommandOpenRouting({
		shellRoute,
		spaceStatus,
		activeDetail,
		isTaskDetailPage,
		closeEntityDrawer,
		taskPreviewController,
	})

	const commandProjects = useShellCommandProjects(isCommandOpen, spaceStatus)

	const runEntityBulkActionFromCommand = useMemo(
		() => createRunEntityBulkActionFromCommand(runBulkAction),
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
		isSettingsMode,
		navigate,
		openProjectCreateDialog,
		openTaskCreateDialog,
		pageFilter,
		requestSearchFocus,
		runEntityBulkActionFromCommand,
		setCommandMenuFilterKind,
		settingsReturnPath,
		submitRegistryActions,
		taskPreviewController,
		toggleShortcutHelp,
	})

	const commandSelection = commandSelectionOverride ?? registeredCommandSelection
	const commandContext = useShellCommandHostContext({
		currentSpaceId,
		activeSection,
		shellRoute,
		activeDetail,
		isCommandOpen,
		isShortcutHelpOpen,
		createDialogType,
		commandMenuFilterKind,
		commandSelection,
		pageFilter,
		submitRegistry,
		taskPreviewController,
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

	const taskMetaHandlers = useMemo(
		() => createShellCommandTaskMetaHandlers(commandContext, runEntityBulkActionFromCommand),
		[commandContext, runEntityBulkActionFromCommand],
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
		...taskMetaHandlers,
	}
}
