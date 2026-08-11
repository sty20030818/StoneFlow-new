/**
 * 全部任务 / 独立事项列表场景：
 * Display + FilterQuery 会话 → adapt → list_tasks；集合编排走 useTaskCollectionScene。
 * 工具条 pills 只改 FilterQuery / showCompleted，不另起本地筛选状态。
 */
import { useCallback, useMemo } from 'react'

import { useCurrentShellRoute, resolveBreadcrumb, resolveShellRouteScope } from '@/app/navigation'
import { useTaskDisplayOptions } from '@/features/display-options'
import {
	adaptFilterQueryToListTasks,
	FILTER_PROJECT_NONE_VALUE,
	filterQueryToCommandProjection,
	removeFilterField,
	setFilterFieldClause,
	useListFilterSession,
	useRegisterFilterCommandAdapter,
} from '@/features/filter'
import { useDialogStore } from '@/features/shell-dialogs'
import { useEntityDetailController } from '@/features/entity-detail'
import { useProjectOptions } from '@/features/project'
import { useSpaces } from '@/features/space'
import { useTaskPreviewController } from '@/features/task/detail'
import { createView } from '@/features/view'
import { EMPTY_FILTER_QUERY } from '@/shared/types'
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

	const display = useTaskDisplayOptions(config.displayPageKey)
	const filterSession = useListFilterSession({ base: EMPTY_FILTER_QUERY })
	const projectOptions = useProjectOptions(scope)
	const { spaces } = useSpaces()

	useRegisterFilterCommandAdapter({
		session: filterSession,
		showCompleted: display.options.showCompleted,
		onToggleCompleted: () => {
			void display.actions.applyPartial({
				showCompleted: !display.options.showCompleted,
			})
		},
	})

	const listInput = useMemo(() => {
		const patch = adaptFilterQueryToListTasks(filterSession.effective)
		let statuses = patch.statuses
		if (!statuses && !display.options.showCompleted) {
			statuses = INCOMPLETE_TASK_STATUSES
		}
		const placement =
			patch.project?.mode === 'none'
				? ({ kind: 'standalone' } as const)
				: patch.project?.mode === 'specific'
					? { kind: 'project' as const, projectId: patch.project.projectId }
					: config.placement
		return {
			scope,
			viewKey: TASK_LIST_PAGE_VIEW_KEY,
			placement,
			...(statuses ? { statuses } : {}),
			...(patch.priorities && patch.priorities.length > 0 ? { priorities: patch.priorities } : {}),
			...(patch.dateFilter ? { dateFilter: patch.dateFilter } : {}),
		}
	}, [config.placement, display.options.showCompleted, filterSession.effective, scope])

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
		return (task: TaskListSubtitleTask) => {
			const spaceLabel = task.spaceName ?? '未命名空间'
			return task.projectName ? `${spaceLabel} · ${task.projectName}` : spaceLabel
		}
	}, [config.fallbackSubtitle, isAllScope])

	const taskCollection = useTaskCollectionScene({
		source: { items: taskSourceItems, status: taskBoardStatus },
		displayPageKey: config.displayPageKey,
		display,
		projects: projectOptions,
		supportsProject: config.supportsProject,
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
	})

	const projection = useMemo(
		() => filterQueryToCommandProjection(filterSession.effective),
		[filterSession.effective],
	)

	const toolbarPills = useMemo(() => {
		const noStatus = projection.statusValues.length === 0
		const isStandalonePill = projection.standaloneOnly

		if (config.showStatusPills === 'status-only') {
			return STANDALONE_STATUS_FILTERS.map((filter) => ({
				label: filter === 'all' ? '所有任务' : formatTaskStatusLabel(filter),
				active:
					filter === 'all'
						? noStatus
						: projection.statusValues.length === 1 && projection.statusValues[0] === filter,
				onClick: () => {
					if (filter === 'all') {
						filterSession.replaceEffective(removeFilterField(filterSession.effective, 'status'))
						void display.actions.applyPartial({ showCompleted: true })
						return
					}
					filterSession.replaceEffective(
						setFilterFieldClause(filterSession.effective, 'status', 'is', [filter]),
					)
					void display.actions.applyPartial({
						showCompleted:
							filter === 'done' || filter === 'canceled' ? true : display.options.showCompleted,
					})
				},
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
					? isStandalonePill && noStatus
					: filter === 'incomplete'
						? !display.options.showCompleted && noStatus && !isStandalonePill
						: filter === 'all'
							? display.options.showCompleted && noStatus && !isStandalonePill
							: !isStandalonePill &&
								projection.statusValues.length === 1 &&
								projection.statusValues[0] === filter

			return {
				label,
				active,
				onClick: () => {
					if (filter === 'standalone') {
						filterSession.replaceEffective(
							setFilterFieldClause(
								removeFilterField(filterSession.effective, 'status'),
								'project',
								'is',
								[FILTER_PROJECT_NONE_VALUE],
							),
						)
						return
					}
					if (filter === 'incomplete') {
						filterSession.replaceEffective(
							removeFilterField(removeFilterField(filterSession.effective, 'status'), 'project'),
						)
						void display.actions.applyPartial({ showCompleted: false })
						return
					}
					if (filter === 'all') {
						filterSession.replaceEffective(
							removeFilterField(removeFilterField(filterSession.effective, 'status'), 'project'),
						)
						void display.actions.applyPartial({ showCompleted: true })
						return
					}
					// 具体状态
					const next = setFilterFieldClause(
						removeFilterField(filterSession.effective, 'project'),
						'status',
						'is',
						[filter as TaskStatus],
					)
					filterSession.replaceEffective(next)
					void display.actions.applyPartial({
						showCompleted:
							filter === 'done' || filter === 'canceled' ? true : display.options.showCompleted,
					})
				},
			}
		})
	}, [
		config.showStatusPills,
		display.actions,
		display.options.showCompleted,
		filterSession,
		projection.standaloneOnly,
		projection.statusValues,
	])

	const filterUiValue = useMemo(
		() => ({
			session: filterSession,
			projects: projectOptions.map((project) => ({ id: project.id, name: project.name })),
			onSave: async (input: { mode: 'create' | 'overwrite'; name?: string }) => {
				if (input.mode !== 'create' || !input.name?.trim()) {
					return
				}
				await createView({
					name: input.name.trim(),
					scope,
					filters: filterSession.effective,
				})
				filterSession.clearTemp()
			},
		}),
		[filterSession, projectOptions, scope],
	)

	return {
		variant,
		displayPageKey: config.displayPageKey,
		breadcrumbItems,
		taskCollection,
		toolbarPills,
		filterUiValue,
		bulk: {
			selectedCount: taskCollection.selectedCount,
			clearTaskSelection: taskCollection.clearTaskSelection,
		},
		openCreate,
	}
}
