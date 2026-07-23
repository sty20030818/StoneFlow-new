import { useMemo } from 'react'

import { useCurrentShellRoute, resolveBreadcrumb, resolveShellRouteScope } from '@/app/navigation'
import { useDialogStore } from '@/features/shell-dialogs'
import { useEntityDetailController } from '@/features/entity-detail'
import { useProjectOptions } from '@/features/project'
import { useSpaces } from '@/features/space'
import { useTaskPreviewController } from '@/features/task/detail'

import { useTaskListData } from './useTaskData'
import { useTaskListController } from './useTaskListController'
import { useListSceneBoard } from './list-scene/useListSceneBoard'
import { useListSceneFilterDisplay } from './list-scene/useListSceneFilterDisplay'
import { useListSceneSelectionBridge } from './list-scene/useListSceneSelectionBridge'
import { VARIANT_CONFIG, type TaskListSceneVariant } from './list-scene/variantConfig'

export type { TaskListSceneVariant } from './list-scene/variantConfig'

/**
 * 任务列表页（all / standalone）的唯一 wiring 入口。
 *
 * 收口：list data、filter、display、selection、command selection、
 * bulk 可见性、preview source 注册，以及 EntityScene board 打包字段。
 *
 * @param variant - 列表场景变体
 */
export function useTaskListScene(variant: TaskListSceneVariant) {
	const config = VARIANT_CONFIG[variant]
	const shellRoute = useCurrentShellRoute()
	const scope = resolveShellRouteScope(shellRoute)
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const entityDetailController = useEntityDetailController()
	const activeDetail = entityDetailController.activeDetail
	const openEntityDrawer = entityDetailController.openDrawer
	const taskPreviewController = useTaskPreviewController()

	const listInput = useMemo(
		() => ({
			scope,
			viewKey: 'all' as const,
			placement: config.placement,
		}),
		[config.placement, scope],
	)
	const taskList = useTaskListData(listInput)
	const taskBoardStatus = taskList.status
	const taskSourceItems = taskBoardStatus === 'loading' ? [] : taskList.items

	const projectOptions = useProjectOptions(scope)
	const { spaces } = useSpaces()

	const mutations = useTaskListController()
	const breadcrumbItems = useMemo(() => resolveBreadcrumb({ route: shellRoute }), [shellRoute])

	const { controller, filteredTasks, displayResult } = useListSceneFilterDisplay({
		config,
		taskSourceItems,
		projectOptions,
	})

	const activeTaskId = activeDetail?.kind === 'task' ? activeDetail.id : null
	const selection = useListSceneSelectionBridge({
		config,
		filteredTasks,
		selectionOrderIds: displayResult.selectionOrderIds,
		activeTaskId,
	})

	const { openCreate, toolbarPills, board } = useListSceneBoard({
		config,
		controller,
		displayResult,
		taskBoardStatus,
		activeTaskId,
		activeDetailKind: activeDetail?.kind,
		openEntityDrawer,
		openTaskCreateDialog,
		closePreview: taskPreviewController.closePreview,
		openPreview: taskPreviewController.openPreview,
		mutations,
		selection,
		projectOptions,
		spaces,
	})

	return {
		variant,
		displayPageKey: config.displayPageKey,
		breadcrumbItems,
		board,
		toolbarPills,
		bulk: {
			selectedCount: selection.selectedCount,
			clearTaskSelection: selection.clearTaskSelection,
		},
		openCreate,
		/** standalone 页脚提示由 View 渲染 */
		showStandaloneHint: variant === 'standalone',
	}
}
