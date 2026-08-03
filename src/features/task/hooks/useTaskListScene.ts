import { useCallback, useMemo, useState } from 'react'

import { useCurrentShellRoute, resolveBreadcrumb, resolveShellRouteScope } from '@/app/navigation'
import { useDialogStore } from '@/features/shell-dialogs'
import { useEntityDetailController } from '@/features/entity-detail'
import { useProjectOptions } from '@/features/project'
import { useSpaces } from '@/features/space'
import { useTaskPreviewController } from '@/features/task/detail'
import type { TaskStatus } from '@/shared/types'

import { useTaskListData } from './useTaskData'
import { useTaskCollectionScene } from './useTaskCollectionScene'
import {
	ALL_TASK_FILTERS,
	INCOMPLETE_TASK_STATUSES,
	STANDALONE_STATUS_FILTERS,
	TASK_LIST_PAGE_VIEW_KEY,
	VARIANT_CONFIG,
	type AllTaskFilterPill,
	type TaskListSceneVariant,
	type TaskListSubtitleTask,
} from './list-scene/variantConfig'
import { formatTaskStatusLabel } from '../model/taskStatus'

export type { TaskListSceneVariant } from './list-scene/variantConfig'
export { TASK_LIST_PAGE_VIEW_KEY } from './list-scene/variantConfig'

/** status 维度 pill（不含独立事项） */
type StatusMode = 'incomplete' | 'all' | TaskStatus

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

	// 默认「未完成」：下推 status 白名单，并与筛选项同步
	const [statusMode, setStatusMode] = useState<StatusMode>(
		variant === 'all' ? 'incomplete' : 'all',
	)
	const [standaloneOnly, setStandaloneOnly] = useState(false)

	const listStatuses = useMemo(() => {
		if (statusMode === 'all') {
			return undefined
		}
		if (statusMode === 'incomplete') {
			return INCOMPLETE_TASK_STATUSES
		}
		return [statusMode]
	}, [statusMode])

	// All 与单 Space「所有任务」同一 viewKey 语义，仅 scope 不同
	// standalone / statuses 下推 SQL，避免前端再滤与 totalCount 冲突
	const listInput = useMemo(
		() => ({
			scope,
			viewKey: TASK_LIST_PAGE_VIEW_KEY,
			placement: standaloneOnly
				? ({ kind: 'standalone' } as const)
				: config.placement,
			...(listStatuses ? { statuses: listStatuses } : {}),
		}),
		[config.placement, listStatuses, scope, standaloneOnly],
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
		// 未完成默认：隐藏 done/canceled；与 statusMode 一致
		initialShowCompleted: statusMode !== 'incomplete',
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
		hasNextPage: taskList.hasNextPage,
		isFetchingNextPage: taskList.isFetchingNextPage,
		fetchNextPage: taskList.fetchNextPage,
		fetchNextPageError: taskList.fetchNextPageError,
		totalCount: taskList.totalCount,
		loadedCount: taskList.loadedCount,
		// status/showCompleted/standalone 已在 list_tasks 下推
		serverDrivenFilters: ['status', 'showCompleted', 'standalone'],
	})

	const applyStatusMode = useCallback(
		(mode: StatusMode, nextStandalone: boolean) => {
			setStatusMode(mode)
			setStandaloneOnly(nextStandalone)
			const actions = taskCollection.controller.actions
			actions.applyFilter({ kind: 'standaloneOnly', enabled: nextStandalone })
			if (mode === 'incomplete') {
				actions.applyFilter({ kind: 'showCompleted', value: false })
				actions.applyFilter({ kind: 'status', values: [] })
				return
			}
			if (mode === 'all') {
				actions.applyFilter({ kind: 'showCompleted', value: true })
				actions.applyFilter({ kind: 'status', values: [] })
				return
			}
			// 单状态：允许看到 done/canceled 行
			actions.applyFilter({ kind: 'showCompleted', value: true })
			actions.applyFilter({ kind: 'status', values: [mode] })
		},
		[taskCollection.controller.actions],
	)

	const toolbarPills = useMemo(() => {
		if (config.showStatusPills === 'status-only') {
			return STANDALONE_STATUS_FILTERS.map((filter) => ({
				label: filter === 'all' ? '所有任务' : formatTaskStatusLabel(filter),
				active:
					filter === 'all'
						? statusMode === 'all'
						: statusMode === filter,
				onClick: () => applyStatusMode(filter === 'all' ? 'all' : filter, false),
			}))
		}

		return ALL_TASK_FILTERS.map((filter: AllTaskFilterPill) => {
			const label =
				filter === 'incomplete'
					? '未完成任务'
					: filter === 'all'
						? '所有任务'
						: filter === 'standalone'
							? '独立事项'
							: formatTaskStatusLabel(filter)

			const active =
				filter === 'standalone'
					? standaloneOnly
					: filter === 'incomplete'
						? statusMode === 'incomplete' && !standaloneOnly
						: filter === 'all'
							? statusMode === 'all' && !standaloneOnly
							: statusMode === filter && !standaloneOnly

			return {
				label,
				active,
				onClick: () => {
					if (filter === 'standalone') {
						// 独立事项叠加：保持当前 statusMode，只开 standalone
						setStandaloneOnly(true)
						taskCollection.controller.actions.applyFilter({
							kind: 'standaloneOnly',
							enabled: true,
						})
						return
					}
					applyStatusMode(filter, false)
				},
			}
		})
	}, [
		applyStatusMode,
		config.showStatusPills,
		standaloneOnly,
		statusMode,
		taskCollection.controller.actions,
	])

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
