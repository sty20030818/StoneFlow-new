import { startTransition, useMemo } from 'react'
import type { NavigateOptions } from '@tanstack/react-router'

import { openShellNavigationTarget } from '@/app/navigation/intents'
import type { Scope } from '@/shared/types'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { requestSidebarToggle } from '@/shared/ui/base/sidebar'
import { type ShellCommandActions, type ShellNavigationTarget } from '@/features/command'
import { type CommandContext } from '@/features/command/core'
import {
	LIFECYCLE_BULK_ACTION_IDS,
	PROJECT_BULK_ACTION_IDS,
	TASK_BULK_ACTION_IDS,
	type BulkActionId,
	type BulkActionPayload,
	type BulkActionResultMessageLabels,
	type BulkEntityType,
} from '@/features/bulk-action'
import type { PageFilterKind } from '@/features/filter/model'
import type { usePageFilterContext } from '@/features/filter/model'
import type { useSubmitRegistryActions } from '@/features/submit/model'
import type { useTaskPreviewController } from '@/features/task/detail'

type PageFilter = ReturnType<typeof usePageFilterContext>
type SubmitActions = ReturnType<typeof useSubmitRegistryActions>
type TaskPreview = ReturnType<typeof useTaskPreviewController>

export type ShellCommandBridgeDeps = {
	currentScope: Scope
	currentSpaceId: string | null
	activeDetail: { kind: string; id: string } | null
	goBack: () => void
	goForward: () => void
	canGoBack: boolean
	closeEntityDrawer: () => void
	closeProjectCreateDialog: () => void
	closeTaskCreateDialog: () => void
	createDialogType: 'task' | 'project' | null
	handleOpenTaskCreate: () => void
	isCommandOpen: boolean
	isShortcutHelpOpen: boolean
	navigate: (opts: { to: never } | NavigateOptions) => unknown
	openProjectCreateDialog: () => void
	openTaskCreateDialog: ReturnType<typeof useDialogStore.getState>['openTaskCreateDialog']
	pageFilter: PageFilter
	requestSearchFocus: () => void
	runEntityBulkActionFromCommand: (
		ctx: CommandContext,
		entity: BulkEntityType,
		actionId: BulkActionId,
		labels: BulkActionResultMessageLabels,
		payload?: BulkActionPayload,
	) => Promise<void>
	setCommandMenuFilterKind: (kind: PageFilterKind) => void
	submitRegistryActions: SubmitActions
	taskPreviewController: TaskPreview
	toggleShortcutHelp: () => void
}

export function useShellCommandActions(deps: ShellCommandBridgeDeps): ShellCommandActions {
	const {
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
	} = deps

	return useMemo<ShellCommandActions>(
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
					void navigate({
						to: openShellNavigationTarget(target, {
							scope: currentScope,
							fallbackSpaceId: currentSpaceId,
						}) as never,
					})
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
