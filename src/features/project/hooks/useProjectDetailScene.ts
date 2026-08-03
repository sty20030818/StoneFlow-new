import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'

import {
	openSection,
	resolveBreadcrumb,
	resolveShellRouteScope,
	useCurrentShellRoute,
} from '@/app/navigation'
import { useDangerConfirm } from '@/features/danger-confirm'
import {
	useTaskDisplayOptions,
	type TaskDisplayPageKey,
} from '@/features/display-options'
import {
	adaptFilterQueryToListTasks,
	filterQueriesEqual,
	isFilterQueryEmpty,
	pageFilterSliceToFilterQuery,
	useListFilterSession,
} from '@/features/filter'
import { useEntityDetailController } from '@/features/entity-detail'
import { useDialogStore } from '@/features/shell-dialogs'
import { useSpaces } from '@/features/space'
import {
	formatTaskStatusLabel,
	useTaskCollectionScene,
	useTaskListData,
	useTaskPageFilterController,
	useTaskPreviewController,
} from '@/features/task'
import { createView } from '@/features/view'
import { EMPTY_FILTER_QUERY } from '@/shared/types'
import type { Scope, TaskListItem, TaskStatus } from '@/shared/types'

const PROJECT_SERVER_DRIVEN = [
	'status',
	'showCompleted',
	'project',
	'priority',
	'date',
] as const

const EMPTY_PROJECT_FILTER_TASKS: TaskListItem[] = []

import {
	useArchiveProjectMutation,
	useCompleteProjectMutation,
	useDeleteProjectMutation,
	useReopenProjectMutation,
} from './project.mutations'
import { useSuspenseProjectDetailQuery } from './project.queries'
import { useProjectOptions } from './useProjectData'

const PROJECT_TASK_FILTERS: Array<'all' | TaskStatus> = [
	'all',
	'doing',
	'todo',
	'waiting',
	'done',
	'canceled',
]

const PROJECT_DETAIL_DISPLAY_PAGE_KEY: TaskDisplayPageKey = 'task:project-detail'

type UseProjectDetailSceneArgs = {
	scopeOverride?: Scope
}

/** 项目详情只组合项目头部与 task 域提供的完整任务集合。 */
export function useProjectDetailScene({ scopeOverride }: UseProjectDetailSceneArgs = {}) {
	const navigate = useNavigate({ from: '/' })
	const { projectId = '' } = useParams({ strict: false }) as { projectId?: string }
	const shellRoute = useCurrentShellRoute()
	const scope = scopeOverride ?? resolveShellRouteScope(shellRoute)
	const spaceId = scope.type === 'space' ? scope.spaceId : null
	const { requestDangerConfirm } = useDangerConfirm()
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const entityDetailController = useEntityDetailController()
	const activeDetail = entityDetailController.activeDetail
	const taskPreviewController = useTaskPreviewController()
	const { data: project } = useSuspenseProjectDetailQuery(projectId)
	const projectOptions = useProjectOptions(scope)
	const { spaces } = useSpaces()
	const completeProject = useCompleteProjectMutation()
	const reopenProject = useReopenProjectMutation()
	const archiveProject = useArchiveProjectMutation()
	const deleteProject = useDeleteProjectMutation()
	const [busyAction, setBusyAction] = useState<string | null>(null)

	const display = useTaskDisplayOptions(PROJECT_DETAIL_DISPLAY_PAGE_KEY)
	const filterSession = useListFilterSession({ base: EMPTY_FILTER_QUERY })

	const projectFilter = useTaskPageFilterController({
		tasks: EMPTY_PROJECT_FILTER_TASKS,
		capabilities: {
			supportsPriority: true,
			supportsStatus: true,
			supportsDate: true,
			supportsProject: false,
			supportsToggleCompleted: true,
			supportsClearAll: true,
		},
		initialShowCompleted: display.options.showCompleted,
		serverDrivenFilters: PROJECT_SERVER_DRIVEN,
	})

	const hadControllerFiltersRef = useRef(false)
	useEffect(() => {
		const fromController = pageFilterSliceToFilterQuery(projectFilter.querySlice)
		if (!isFilterQueryEmpty(fromController)) {
			hadControllerFiltersRef.current = true
			if (!filterQueriesEqual(fromController, filterSession.temp)) {
				filterSession.setTemp(fromController)
			}
			return
		}
		if (hadControllerFiltersRef.current) {
			hadControllerFiltersRef.current = false
			filterSession.clearTemp()
		}
	}, [
		projectFilter.querySlice.dateValue,
		projectFilter.querySlice.priorityValues,
		projectFilter.querySlice.projectId,
		projectFilter.querySlice.statusValues,
		filterSession,
	])

	const listInput = useMemo(() => {
		const patch = adaptFilterQueryToListTasks(filterSession.effective)
		let statuses = patch.statuses
		if (!statuses && !display.options.showCompleted) {
			statuses = ['todo', 'doing', 'waiting']
		}
		return {
			scope,
			viewKey: 'all' as const,
			placement: { kind: 'project' as const, projectId },
			...(statuses ? { statuses } : {}),
			...(patch.priorities && patch.priorities.length > 0
				? { priorities: patch.priorities }
				: {}),
			...(patch.dateFilter ? { dateFilter: patch.dateFilter } : {}),
		}
	}, [display.options.showCompleted, filterSession.effective, projectId, scope])
	const taskList = useTaskListData(listInput)
	const visibleTasks = useMemo(
		() => taskList.items.filter((task) => task.archivedAt === null),
		[taskList.items],
	)
	const projectMoveOptions = useMemo(
		() =>
			project
				? projectOptions.filter((option) => option.spaceId === project.spaceId)
				: projectOptions,
		[project, projectOptions],
	)
	const activeTaskId = activeDetail?.kind === 'task' ? activeDetail.id : null
	const taskCollection = useTaskCollectionScene({
		source: {
			items: project ? visibleTasks : [],
			status: project ? taskList.status : 'ready',
		},
		displayPageKey: PROJECT_DETAIL_DISPLAY_PAGE_KEY,
		supportsProject: false,
		fallbackSubtitle: project?.name ?? '当前项目',
		activeTaskId,
		onCreateTask: () => openTaskCreateDialog({ projectId }),
		onOpenTask: (taskId) => {
			taskPreviewController.closePreview()
			entityDetailController.openDrawer({ kind: 'task', id: taskId })
		},
		onPeekTask: (taskId, source) => {
			if (activeDetail?.kind !== 'task') {
				taskPreviewController.openPreview(taskId, source)
			}
		},
		projectOptions: projectMoveOptions,
		spaces,
		showProjectCellOptions: false,
		createProjectId: projectId,
		hasNextPage: taskList.hasNextPage,
		isFetchingNextPage: taskList.isFetchingNextPage,
		fetchNextPage: taskList.fetchNextPage,
		fetchNextPageError: taskList.fetchNextPageError,
		totalCount: taskList.totalCount,
		loadedCount: taskList.loadedCount,
		serverDrivenFilters: PROJECT_SERVER_DRIVEN,
		externalFilter: projectFilter,
		empty: project
			? {
					emptyActionLabel: '创建任务',
					emptyDescription:
						'这个项目里还没有任务，所以现在还看不到进展内容。点「创建任务」先放进第一项，项目就能开始往前推进了。',
					emptyTitle: '当前项目没有任务',
				}
			: {},
	})
	const breadcrumbItems = useMemo(
		() =>
			resolveBreadcrumb({
				route: shellRoute,
				projectDetail: project
					? { id: project.id, name: project.name }
					: projectId
						? { id: projectId, name: '' }
						: null,
			}),
		[project, projectId, shellRoute],
	)
	const toolbarPills = PROJECT_TASK_FILTERS.map((filter) => ({
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

	function goToProjectsOverview() {
		void navigate({ to: openSection(scope, 'projects', spaceId) as never })
	}

	async function runAction(action: string, runner: () => Promise<unknown>) {
		setBusyAction(action)
		try {
			await runner()
		} finally {
			setBusyAction(null)
		}
	}

	const filterUiValue = useMemo(
		() => ({
			session: filterSession,
			projects: projectOptions.map((option) => ({ id: option.id, name: option.name })),
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
		project,
		busyAction,
		breadcrumbItems,
		taskCollection,
		displayPageKey: PROJECT_DETAIL_DISPLAY_PAGE_KEY,
		toolbarPills,
		filterUiValue,
		bulk: {
			selectedCount: taskCollection.selectedCount,
			clearTaskSelection: taskCollection.clearTaskSelection,
		},
		goToProjectsOverview,
		completeOrReopen: () => {
			if (!project) return
			void runAction(project.completedAt ? 'reopen' : 'complete', async () => {
				if (project.completedAt) {
					await reopenProject.mutateAsync(project.id)
					return
				}
				await completeProject.mutateAsync(project.id)
			})
		},
		archive: async () => {
			if (!project) return
			const confirmed = await requestDangerConfirm({
				intent: 'archive',
				entityType: 'project',
				count: 1,
				entityLabel: project.name,
			})
			if (!confirmed) return
			void runAction('archive', async () => {
				await archiveProject.mutateAsync(project.id)
				goToProjectsOverview()
			})
		},
		remove: async () => {
			if (!project) return
			const confirmed = await requestDangerConfirm({
				intent: 'trash',
				entityType: 'project',
				count: 1,
				entityLabel: project.name,
			})
			if (!confirmed) return
			void runAction('delete', async () => {
				await deleteProject.mutateAsync(project.id)
				goToProjectsOverview()
			})
		},
	}
}
