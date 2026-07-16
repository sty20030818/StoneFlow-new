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

/**
 * Command bridge 依赖袋。
 * 字段多是因为 ShellCommandActions 有 ~34 个方法，各自要闭包不同能力；
 * 不是同一状态的重复订阅（订阅发生在 Content/hooks 层，这里是纯入参）。
 */
export type ShellCommandBridgeDeps = {
	/** 当前工作区 scope，用于 navigateTo 拼 path */
	currentScope: Scope
	/** 当前 spaceId（all 时可能为 fallback），用于 navigate 默认 space */
	currentSpaceId: string | null
	/** 当前 URL 抽屉详情；closeCurrentLayer / togglePreview 用 */
	activeDetail: { kind: string; id: string } | null
	/** 会话历史后退 */
	goBack: () => void
	/** 会话历史前进 */
	goForward: () => void
	/** Esc 关层时是否还能后退 */
	canGoBack: boolean
	/** 关实体抽屉（URL search） */
	closeEntityDrawer: () => void
	closeProjectCreateDialog: () => void
	closeTaskCreateDialog: () => void
	/** 当前创建弹窗类型；关层优先级判断 */
	createDialogType: 'task' | 'project' | null
	/** 按当前页预填的「快速新建任务」 */
	handleOpenTaskCreate: () => void
	/** 命令板是否打开；关层顺序 */
	isCommandOpen: boolean
	/** 快捷键帮助是否打开 */
	isShortcutHelpOpen: boolean
	navigate: (opts: { to: never } | NavigateOptions) => unknown
	openProjectCreateDialog: () => void
	openTaskCreateDialog: ReturnType<typeof useDialogStore.getState>['openTaskCreateDialog']
	/** 页筛选 context（filter 类命令） */
	pageFilter: PageFilter
	/** 全局搜索聚焦意图 */
	requestSearchFocus: () => void
	/** 命令 → bulk 执行桥 */
	runEntityBulkActionFromCommand: (
		ctx: CommandContext,
		entity: BulkEntityType,
		actionId: BulkActionId,
		labels: BulkActionResultMessageLabels,
		payload?: BulkActionPayload,
	) => Promise<void>
	/** 同步命令板 filter kind 与 dialog store */
	setCommandMenuFilterKind: (kind: PageFilterKind) => void
	/** 表单提交 registry actions */
	submitRegistryActions: SubmitActions
	/** 右侧任务预览控制器 */
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
