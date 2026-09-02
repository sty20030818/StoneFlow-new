/**
 * 全部任务 / 独立事项列表场景：Default View + Filter Draft → 统一 Task Query。
 */
import { useCallback, useMemo } from 'react'

import { resolveBreadcrumb, resolveShellRouteScope, useCurrentShellRoute } from '@/app/navigation'
import { useTaskDisplayOptions } from '@/features/display-options'
import { useListFilterSession, useRegisterFilterCommandAdapter } from '@/features/filter'
import { useEntityDetailController } from '@/features/entity-detail'
import { useProjectOptions } from '@/features/project'
import { useDialogStore } from '@/features/shell-dialogs'
import { useSpaces } from '@/features/space'
import { getDefaultTaskViews, useDefaultTaskViewSelection } from '@/features/task-workspace'
import { useCreateViewMutation } from '@/features/view'
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
	const filterSession = useListFilterSession({ base: EMPTY_FILTER_QUERY })
	const projectOptions = useProjectOptions(scope)
	const { spaces } = useSpaces()
	const createSavedView = useCreateViewMutation()
	useRegisterFilterCommandAdapter({ session: filterSession })

	const queryInput = useMemo(
		() => ({
			scope,
			context,
			baseViewKey: viewSelection.selected.baseViewKey,
			filters: filterSession.effective,
		}),
		[context, filterSession.effective, scope, viewSelection.selected.baseViewKey],
	)

	const taskList = useTaskQueryData(queryInput)
	const taskSourceItems = taskList.status === 'loading' ? [] : taskList.items
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
		source: { items: taskSourceItems, status: taskList.status, onRetry: taskList.refetch },
		displayPageKey: config.displayPageKey,
		display,
		fallbackSubtitle,
		activeTaskId: activeDetail?.kind === 'task' ? activeDetail.id : null,
		onCreateTask: openCreate,
		projectOptions,
		spaces,
		showProjectCellOptions: config.supportsProject,
		showSpaceLabel: isAllScope,
		empty: {
			emptyActionLabel: '创建任务',
			emptyDescription: config.emptyDescription,
			emptyTitle: config.emptyTitle,
		},
		pagination: taskList.pagination,
	})

	const filterUiValue = {
		session: filterSession,
		...(context.kind === 'all'
			? { projects: projectOptions.map((project) => ({ id: project.id, name: project.name })) }
			: {}),
		onSave: async (input: { mode: 'create' | 'overwrite'; name?: string }) => {
			if (input.mode !== 'create' || !input.name?.trim()) return
			await createSavedView.mutateAsync({
				name: input.name.trim(),
				scope,
				context,
				baseViewKey: viewSelection.selected.baseViewKey,
				filters: filterSession.effective,
			})
			filterSession.clearTemp()
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
		openCreate,
	}
}
