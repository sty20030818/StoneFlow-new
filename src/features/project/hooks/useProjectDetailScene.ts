/**
 * 项目详情场景：项目动作 + FilterQuery 会话 → list + TaskBoard。
 */
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'

import {
	openSection,
	resolveBreadcrumb,
	resolveShellRouteScope,
	useCurrentShellRoute,
} from '@/app/navigation'
import { useDangerConfirm } from '@/features/danger-confirm'
import { useTaskDisplayOptions, type TaskDisplayPageKey } from '@/features/display-options'
import {
	adaptFilterQueryToListTasks,
	filterQueryToCommandProjection,
	removeFilterField,
	setFilterFieldClause,
	useListFilterSession,
	useRegisterFilterCommandAdapter,
} from '@/features/filter'
import { useEntityDetailController } from '@/features/entity-detail'
import { useDialogStore } from '@/features/shell-dialogs'
import { useSpaces } from '@/features/space'
import {
	formatTaskStatusLabel,
	useTaskCollectionScene,
	useTaskListData,
	useTaskPreviewController,
} from '@/features/task'
import { createView } from '@/features/view'
import { EMPTY_FILTER_QUERY } from '@/shared/types'
import type { Scope, TaskStatus } from '@/shared/types'

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
			statuses = ['todo', 'doing', 'waiting']
		}
		return {
			scope,
			viewKey: 'all' as const,
			placement: { kind: 'project' as const, projectId },
			...(statuses ? { statuses } : {}),
			...(patch.priorities && patch.priorities.length > 0 ? { priorities: patch.priorities } : {}),
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
		display,
		supportsProject: false,
		fallbackSubtitle: project?.name ?? '当前项目',
		activeTaskId,
		onCreateTask: () => openTaskCreateDialog({ projectId }),
		onOpenTask: (taskId) => {
			taskPreviewController.closePreview()
			entityDetailController.openTaskDetail(taskId)
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
		empty: project
			? {
					emptyActionLabel: '创建任务',
					emptyDescription:
						'这个项目里还没有任务，所以现在还看不到进展内容。点「创建任务」先放进第一项，项目就能开始往前推进了。',
					emptyTitle: '当前项目没有任务',
				}
			: {},
	})

	const statusProjection = useMemo(
		() => filterQueryToCommandProjection(filterSession.effective),
		[filterSession.effective],
	)

	const toolbarPills = PROJECT_TASK_FILTERS.map((filter) => ({
		label: filter === 'all' ? '所有任务' : formatTaskStatusLabel(filter),
		active:
			filter === 'all'
				? statusProjection.statusValues.length === 0
				: statusProjection.statusValues.length === 1 && statusProjection.statusValues[0] === filter,
		onPress: () => {
			if (filter === 'all') {
				filterSession.replaceEffective(removeFilterField(filterSession.effective, 'status'))
				return
			}
			filterSession.replaceEffective(
				setFilterFieldClause(filterSession.effective, 'status', 'is', [filter]),
			)
		},
	}))

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
		}),
		[filterSession, projectOptions, scope],
	)

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
