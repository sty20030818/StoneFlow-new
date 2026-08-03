import { useCallback, useMemo, useState } from 'react'

import { useCurrentShellRoute, resolveBreadcrumb, resolveShellRouteScope } from '@/app/navigation'
import { useTaskDisplayOptions } from '@/features/display-options'
import { useDialogStore } from '@/features/shell-dialogs'
import { useEntityDetailController } from '@/features/entity-detail'
import { useProjectOptions } from '@/features/project'
import { useSpaces } from '@/features/space'
import { useTaskPreviewController } from '@/features/task/detail'
import type { TaskStatus } from '@/shared/types'

import { useTaskListData } from './useTaskData'
import { useTaskCollectionScene } from './useTaskCollectionScene'
import { useTaskPageFilterController } from './useTaskPageFilterController'
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
import { encodeListTasksDateFilter } from '../model/listDateFilter'
import { formatTaskStatusLabel } from '../model/taskStatus'

const LIST_SERVER_DRIVEN = [
	'status',
	'showCompleted',
	'standalone',
	'priority',
	'date',
	'project',
] as const

const EMPTY_LIST_FILTER_TASKS: import('@/shared/types').TaskListItem[] = []

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

	// Display 为 showCompleted 真源（P2）；list 下推用其推导 status 白名单
	const display = useTaskDisplayOptions(config.displayPageKey)

	const listStatuses = useMemo(() => {
		if (statusMode === 'incomplete') {
			return INCOMPLETE_TASK_STATUSES
		}
		if (statusMode === 'all') {
			// 「所有任务」pill + Display 隐藏已完成 → 仍下推未完成，避免 totalCount 分叉
			return display.options.showCompleted ? undefined : INCOMPLETE_TASK_STATUSES
		}
		return [statusMode]
	}, [display.options.showCompleted, statusMode])

	const projectOptions = useProjectOptions(scope)
	const { spaces } = useSpaces()

	// filter 状态在 data 之上：querySlice 驱动 listInput，避免二次滤与 totalCount 分叉
	const listFilter = useTaskPageFilterController({
		tasks: EMPTY_LIST_FILTER_TASKS,
		projects: config.supportsProject ? projectOptions : undefined,
		capabilities: {
			supportsPriority: true,
			supportsStatus: true,
			supportsDate: true,
			supportsProject: config.supportsProject,
			// 完成可见性归 Display；Command 切换仍可走 filter，P7 再删
			supportsToggleCompleted: true,
			supportsClearAll: true,
		},
		initialShowCompleted: display.options.showCompleted,
		serverDrivenFilters: LIST_SERVER_DRIVEN,
	})

	// All 与单 Space「所有任务」同一 viewKey；status/standalone/priority/date/project 全下推
	const listInput = useMemo(() => {
		const { priorityValues, dateValue, projectId, standaloneOnly: filterStandalone } =
			listFilter.querySlice
		const dateFilter = encodeListTasksDateFilter(dateValue)
		const placement =
			filterStandalone || standaloneOnly
				? ({ kind: 'standalone' } as const)
				: projectId
					? ({ kind: 'project' as const, projectId })
					: config.placement
		return {
			scope,
			viewKey: TASK_LIST_PAGE_VIEW_KEY,
			placement,
			...(listStatuses ? { statuses: listStatuses } : {}),
			...(priorityValues.length > 0 ? { priorities: priorityValues } : {}),
			...(dateFilter ? { dateFilter } : {}),
		}
	}, [
		config.placement,
		listFilter.querySlice,
		listStatuses,
		scope,
		standaloneOnly,
	])
	const taskList = useTaskListData(listInput)
	const taskBoardStatus = taskList.status
	const taskSourceItems = taskBoardStatus === 'loading' ? [] : taskList.items

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
			if (activeDetail?.kind === 'task') {
				return
			}
			taskPreviewController.openPreview(taskId, source)
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
		serverDrivenFilters: LIST_SERVER_DRIVEN,
		externalFilter: listFilter,
	})

	const applyStatusMode = useCallback(
		(mode: StatusMode, nextStandalone: boolean) => {
			setStatusMode(mode)
			setStandaloneOnly(nextStandalone)
			const actions = taskCollection.controller.actions
			actions.applyFilter({ kind: 'standaloneOnly', enabled: nextStandalone })
			if (mode === 'incomplete') {
				void display.actions.applyPartial({ showCompleted: false })
				actions.applyFilter({ kind: 'showCompleted', value: false })
				actions.applyFilter({ kind: 'status', values: [] })
				return
			}
			if (mode === 'all') {
				void display.actions.applyPartial({ showCompleted: true })
				actions.applyFilter({ kind: 'showCompleted', value: true })
				actions.applyFilter({ kind: 'status', values: [] })
				return
			}
			// 单状态：允许看到 done/canceled 行
			void display.actions.applyPartial({ showCompleted: true })
			actions.applyFilter({ kind: 'showCompleted', value: true })
			actions.applyFilter({ kind: 'status', values: [mode] })
		},
		[display.actions, taskCollection.controller.actions],
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
