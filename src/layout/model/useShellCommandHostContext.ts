import { useMemo } from 'react'

import type { ShellRoute } from '@/app/navigation'
import type { ShellSectionKey } from '@/layout/types'
import {
	resolveCommandRoutePage,
	resolveCommandActivePanel,
} from '@/layout/shellCommandRouteHelpers'
import { resolveShellDetailState } from '@/features/task'
import type { EntityDetailRouteState } from '@/features/entity-detail'
import { useCommandContext, type CommandSelectionContext } from '@/features/command'
import type { PageFilterKind } from '@/features/filter'
import type { usePageFilterContext } from '@/features/filter'
import type { useSubmitRegistryContext } from '@/features/submit'
import type { useTaskPreviewController } from '@/features/task'

type PageFilter = ReturnType<typeof usePageFilterContext>
type SubmitRegistry = ReturnType<typeof useSubmitRegistryContext>
type TaskPreview = ReturnType<typeof useTaskPreviewController>

type UseShellCommandHostContextArgs = {
	currentSpaceId: string | null
	activeSection: ShellSectionKey
	shellRoute: ShellRoute
	activeDetail: EntityDetailRouteState
	isCommandOpen: boolean
	isShortcutHelpOpen: boolean
	createDialogType: 'task' | 'project' | null
	commandMenuFilterKind: PageFilterKind
	commandSelection: CommandSelectionContext
	pageFilter: PageFilter
	submitRegistry: SubmitRegistry
	taskPreviewController: TaskPreview
}

/**
 * 把壳上的 route / selection / filter / submit / 预览 聚合成 CommandContext。
 */
export function useShellCommandHostContext({
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
}: UseShellCommandHostContextArgs) {
	const routeProjectId = shellRoute.kind === 'project' ? shellRoute.projectId : null

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

	return commandContext
}
