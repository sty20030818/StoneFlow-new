/**
 * 全部任务 / 独立事项列表场景：
 * Display + FilterQuery 会话 → adapt → list_tasks；集合编排走 useTaskCollectionScene。
 */
import { useCallback, useMemo, useState } from 'react'

import { useCurrentShellRoute, resolveBreadcrumb, resolveShellRouteScope } from '@/app/navigation'
import { useTaskDisplayOptions } from '@/features/display-options'
import {
	adaptFilterQueryToListTasks,
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

type StatusMode = 'incomplete' | 'all' | TaskStatus

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

	const [statusMode, setStatusMode] = useState<StatusMode>(
		variant === 'all' ? 'incomplete' : 'all',
	)
	const [standaloneOnly, setStandaloneOnly] = useState(false)

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
		supportsProject: config.supportsProject,
		projects: projectOptions,
	})

	const listStatuses = useMemo(() => {
		if (statusMode === 'incomplete') {
			return INCOMPLETE_TASK_STATUSES
		}
		if (statusMode === 'all') {
			return display.options.showCompleted ? undefined : INCOMPLETE_TASK_STATUSES
		}
		return [statusMode]
	}, [display.options.showCompleted, statusMode])

	const listInput = useMemo(() => {
		const patch = adaptFilterQueryToListTasks(filterSession.effective)
		const statuses = patch.statuses ?? listStatuses
		const placement =
			standaloneOnly || patch.project?.mode === 'none'
				? ({ kind: 'standalone' } as const)
				: patch.project?.mode === 'specific'
					? ({ kind: 'project' as const, projectId: patch.project.projectId })
					: config.placement
		return {
			scope,
			viewKey: TASK_LIST_PAGE_VIEW_KEY,
			placement,
			...(statuses ? { statuses } : {}),
			...(patch.priorities && patch.priorities.length > 0
				? { priorities: patch.priorities }
				: {}),
			...(patch.dateFilter ? { dateFilter: patch.dateFilter } : {}),
		}
	}, [config.placement, filterSession.effective, listStatuses, scope, standaloneOnly])

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

	const applyStatusMode = useCallback(
		(mode: StatusMode, nextStandalone: boolean) => {
			setStatusMode(mode)
			setStandaloneOnly(nextStandalone)
			if (mode === 'incomplete') {
				void display.actions.applyPartial({ showCompleted: false })
				return
			}
			void display.actions.applyPartial({ showCompleted: true })
		},
		[display.actions],
	)

	const toolbarPills = useMemo(() => {
		if (config.showStatusPills === 'status-only') {
			return STANDALONE_STATUS_FILTERS.map((filter) => ({
				label: filter === 'all' ? '所有任务' : formatTaskStatusLabel(filter),
				active: filter === 'all' ? statusMode === 'all' : statusMode === filter,
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
						setStandaloneOnly(true)
						return
					}
					applyStatusMode(filter, false)
				},
			}
		})
	}, [applyStatusMode, config.showStatusPills, standaloneOnly, statusMode])

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
			hiddenByFilterCount: null as number | null,
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
		showStandaloneHint: variant === 'standalone',
	}
}
