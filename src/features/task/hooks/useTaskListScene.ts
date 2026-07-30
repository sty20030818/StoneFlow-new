import { useCallback, useMemo } from 'react'

import { useCurrentShellRoute, resolveBreadcrumb, resolveShellRouteScope } from '@/app/navigation'
import { useDialogStore } from '@/features/shell-dialogs'
import { useEntityDetailController } from '@/features/entity-detail'
import { useProjectOptions } from '@/features/project'
import { useSpaces } from '@/features/space'
import { useTaskPreviewController } from '@/features/task/detail'

import { useTaskListData } from './useTaskData'
import { useTaskCollectionScene } from './useTaskCollectionScene'
import {
	TASK_LIST_PAGE_VIEW_KEY,
	VARIANT_CONFIG,
	type TaskListSceneVariant,
	type TaskListSubtitleTask,
} from './list-scene/variantConfig'
import { ALL_TASK_FILTERS, STANDALONE_STATUS_FILTERS } from './list-scene/variantConfig'
import { formatTaskStatusLabel } from '../model/taskStatus'

export type { TaskListSceneVariant } from './list-scene/variantConfig'
export { TASK_LIST_PAGE_VIEW_KEY } from './list-scene/variantConfig'

/**
 * 任务列表页（all / standalone）的唯一 wiring 入口。
 *
 * 收口：list data、filter、display、selection、command selection、
 * bulk 可见性、preview source 注册，以及任务 Board 的 props 组装。
 *
 * @param variant - 列表场景变体
 */
export function useTaskListScene(variant: TaskListSceneVariant) {
	const config = VARIANT_CONFIG[variant]
	const shellRoute = useCurrentShellRoute()
	const scope = resolveShellRouteScope(shellRoute)
	const isAllScope = scope.type === 'all'
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const entityDetailController = useEntityDetailController()
	const activeDetail = entityDetailController.activeDetail
	const openEntityDrawer = entityDetailController.openDrawer
	const taskPreviewController = useTaskPreviewController()

	// All 与单 Space「所有任务」同一 viewKey 语义，仅 scope 不同
	const listInput = useMemo(
		() => ({
			scope,
			viewKey: TASK_LIST_PAGE_VIEW_KEY,
			placement: config.placement,
		}),
		[config.placement, scope],
	)
	const taskList = useTaskListData(listInput)
	const taskBoardStatus = taskList.status
	const taskSourceItems = taskBoardStatus === 'loading' ? [] : taskList.items

	const projectOptions = useProjectOptions(scope)
	const { spaces } = useSpaces()

	const breadcrumbItems = useMemo(() => resolveBreadcrumb({ route: shellRoute }), [shellRoute])
	const activeTaskId = activeDetail?.kind === 'task' ? activeDetail.id : null
	const openCreate = useCallback(() => {
		openTaskCreateDialog(config.createDraft)
	}, [config.createDraft, openTaskCreateDialog])
	const fallbackSubtitle = useMemo(() => {
		if (!isAllScope) {
			return config.fallbackSubtitle
		}
		// 所有空间：命令板副标题优先露出 Space
		return (task: TaskListSubtitleTask) => {
			const spaceLabel = task.spaceName ?? '未命名空间'
			return task.projectName ? `${spaceLabel} · ${task.projectName}` : spaceLabel
		}
	}, [config.fallbackSubtitle, isAllScope])
	const taskCollection = useTaskCollectionScene({
		source: { items: taskSourceItems, status: taskBoardStatus },
		displayPageKey: config.displayPageKey,
		projects: projectOptions,
		supportsProject: config.supportsProject,
		initialShowCompleted: config.initialShowCompleted,
		fallbackSubtitle,
		activeTaskId,
		onCreateTask: openCreate,
		onOpenTask: (taskId) => {
			taskPreviewController.closePreview()
			openEntityDrawer({ kind: 'task', id: taskId })
		},
		onPeekTask: (taskId, source) => {
			if (activeDetail?.kind !== 'task') {
				taskPreviewController.openPreview(taskId, source)
			}
		},
		projectOptions,
		spaces,
		showProjectCellOptions: config.supportsProject,
		showSpaceLabel: isAllScope,
		empty: {
			emptyActionLabel: '创建任务',
			emptyDescription: config.emptyDescription,
			emptyTitle: config.emptyTitle,
		},
	})
	const toolbarPills = useMemo(() => {
		if (config.showStatusPills === 'status-only') {
			return STANDALONE_STATUS_FILTERS.map((filter) => ({
				label: filter === 'all' ? '所有任务' : formatTaskStatusLabel(filter),
				active:
					filter === 'all'
						? taskCollection.controller.state.statusValues.length === 0
						: taskCollection.controller.state.statusValues.length === 1 &&
							taskCollection.controller.state.statusValues[0] === filter,
				onClick: () =>
					taskCollection.controller.actions.applyFilter({
						kind: 'status',
						values: filter === 'all' ? [] : [filter],
					}),
			}))
		}

		return ALL_TASK_FILTERS.map((filter) => ({
			label:
				filter === 'all'
					? '所有任务'
					: filter === 'standalone'
						? '独立事项'
						: formatTaskStatusLabel(filter),
			active:
				filter === 'all'
					? taskCollection.controller.state.statusValues.length === 0 &&
						!taskCollection.controller.state.standaloneOnly
					: filter === 'standalone'
						? taskCollection.controller.state.standaloneOnly
						: taskCollection.controller.state.statusValues.length === 1 &&
							taskCollection.controller.state.statusValues[0] === filter &&
							!taskCollection.controller.state.standaloneOnly,
			onClick: () => {
				if (filter === 'all') {
					taskCollection.controller.actions.applyFilter({ kind: 'status', values: [] })
					taskCollection.controller.actions.applyFilter({ kind: 'standaloneOnly', enabled: false })
					return
				}

				if (filter === 'standalone') {
					taskCollection.controller.actions.applyFilter({ kind: 'status', values: [] })
					taskCollection.controller.actions.applyFilter({ kind: 'standaloneOnly', enabled: true })
					return
				}

				taskCollection.controller.actions.applyFilter({ kind: 'standaloneOnly', enabled: false })
				taskCollection.controller.actions.applyFilter({ kind: 'status', values: [filter] })
			},
		}))
	}, [config.showStatusPills, taskCollection.controller])

	return {
		variant,
		displayPageKey: config.displayPageKey,
		breadcrumbItems,
		taskCollection,
		toolbarPills,
		bulk: {
			selectedCount: taskCollection.selectedCount,
			clearTaskSelection: taskCollection.clearTaskSelection,
		},
		openCreate,
		/** standalone 页脚提示由 View 渲染 */
		showStandaloneHint: variant === 'standalone',
	}
}
