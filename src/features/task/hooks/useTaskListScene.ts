/**
 * 全部任务 / 独立事项列表场景：Default View + Filter Draft → 统一 Task Query。
 */
import { useCallback, useMemo } from 'react'

import { resolveBreadcrumb, resolveShellRouteScope, useCurrentShellRoute } from '@/app/navigation'
import { normalizeTaskWindowOrder, useTaskDisplayOptions } from '@/features/display-options'
import { useListFilterSession, useRegisterFilterCommandAdapter } from '@/features/filter'
import { useEntityDetailController } from '@/features/entity-detail'
import { useProjectOptions } from '@/features/project'
import { useDialogStore } from '@/features/shell-dialogs'
import { useSpaces } from '@/features/space'
import {
	getDefaultTaskEmptyState,
	getDefaultTaskViews,
	useDefaultTaskViewSelection,
} from '@/features/task-workspace'
import { useViewSaveFlow } from '@/features/view'
import { useLocalDateBasis } from '@/shared/query/useLocalDateBasis'
import { EMPTY_FILTER_QUERY, type TaskViewContext } from '@/shared/types'

import { useTaskCollectionScene } from './useTaskCollectionScene'
import { useTaskQueryData } from './useTaskData'
import {
	VARIANT_CONFIG,
	type TaskListSceneVariant,
	type TaskListSubtitleTask,
} from './list-scene/variantConfig'

export type { TaskListSceneVariant } from './list-scene/variantConfig'

export function useTaskListScene(variant: TaskListSceneVariant) {
	const config = VARIANT_CONFIG[variant]
	const shellRoute = useCurrentShellRoute()
	const scope = resolveShellRouteScope(shellRoute)
	const isAllScope = scope.type === 'all'
	const context = useMemo<TaskViewContext>(
		() => (variant === 'standalone' ? { kind: 'standalone' } : { kind: 'all' }),
		[variant],
	)
	const defaultViews = useMemo(
		() => getDefaultTaskViews({ context, projectCompleted: false }),
		[context],
	)
	const viewSelection = useDefaultTaskViewSelection(defaultViews)
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const activeDetail = useEntityDetailController().activeDetail
	const display = useTaskDisplayOptions(config.displayPageKey)
	const dateBasis = useLocalDateBasis()
	const filterSession = useListFilterSession({ base: EMPTY_FILTER_QUERY })
	const projectOptions = useProjectOptions(scope)
	const { spaces } = useSpaces()
	const saveFlow = useViewSaveFlow({ scope, spaceId: shellRoute.spaceId })
	useRegisterFilterCommandAdapter({ session: filterSession })

	const queryInput = useMemo(
		() => ({
			scope,
			context,
			baseViewKey: viewSelection.selected.baseViewKey,
			filters: filterSession.effective,
			order: normalizeTaskWindowOrder(display.options),
			dateBasis,
		}),
		[
			context,
			filterSession.effective,
			scope,
			viewSelection.selected.baseViewKey,
			display.options,
			dateBasis,
		],
	)

	const taskList = useTaskQueryData(queryInput, display.status !== 'loading')
	const breadcrumbItems = useMemo(() => resolveBreadcrumb({ route: shellRoute }), [shellRoute])
	const openCreate = useCallback(() => {
		openTaskCreateDialog(config.createDraft)
	}, [config.createDraft, openTaskCreateDialog])
	const fallbackSubtitle = useMemo(() => {
		if (!isAllScope) return config.fallbackSubtitle
		return (task: TaskListSubtitleTask) => {
			const spaceLabel = task.spaceName ?? '未命名空间'
			return task.projectName ? `${spaceLabel} · ${task.projectName}` : spaceLabel
		}
	}, [config.fallbackSubtitle, isAllScope])

	const taskCollection = useTaskCollectionScene({
		source: {
			items: taskList.items,
			status: taskList.status,
			onRetry: taskList.refetch,
			collapseScopeKey: JSON.stringify([scope, context, queryInput.baseViewKey]),
		},
		displayPageKey: config.displayPageKey,
		display,
		fallbackSubtitle,
		activeTaskId: activeDetail?.kind === 'task' ? activeDetail.id : null,
		projectOptions,
		spaces,
		showProjectCellOptions: config.supportsProject,
		showSpaceLabel: isAllScope,
		empty: getDefaultTaskEmptyState({
			query: queryInput,
			totalCount: taskList.pagination.totalCount,
			onCreateTask: openCreate,
		}),
		pagination: taskList.pagination,
	})

	const filterUiValue = {
		session: filterSession,
		boundary: {
			scope,
			context,
			baseViewKey: queryInput.baseViewKey,
			spaceName: spaces.find((space) => space.id === shellRoute.spaceId)?.name,
		},
		...(context.kind === 'all'
			? { projects: projectOptions.map((project) => ({ id: project.id, name: project.name })) }
			: {}),
		onSave: saveFlow.begin,
	}
	const saveView = {
		flow: saveFlow,
		canOverwrite: false,
		onSave: async (input: { mode: 'create' | 'overwrite'; name?: string }) => {
			if (input.mode !== 'create' || !input.name?.trim()) return
			await saveFlow.submit({
				mode: 'create',
				input: {
					scope: queryInput.scope,
					context: queryInput.context,
					baseViewKey: queryInput.baseViewKey,
					filters: queryInput.filters,
					name: input.name.trim(),
				},
			})
		},
	}

	return {
		displayPageKey: config.displayPageKey,
		breadcrumbItems,
		taskCollection,
		toolbarPills: defaultViews.options,
		selectedToolbarKey: viewSelection.selectedKey,
		selectToolbar: viewSelection.select,
		filterUiValue,
		saveView,
		openCreate,
	}
}
