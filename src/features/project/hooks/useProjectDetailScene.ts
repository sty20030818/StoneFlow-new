import { useMemo, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'

import {
	openSection,
	resolveBreadcrumb,
	resolveShellRouteScope,
	useCurrentShellRoute,
} from '@/app/navigation'
import { useDangerConfirm } from '@/features/danger-confirm'
import type { TaskDisplayPageKey } from '@/features/display-options'
import { useEntityDetailController } from '@/features/entity-detail'
import { useDialogStore } from '@/features/shell-dialogs'
import { useSpaces } from '@/features/space'
import {
	formatTaskStatusLabel,
	useTaskCollectionScene,
	useTaskListData,
	useTaskPreviewController,
} from '@/features/task'
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

	const taskList = useTaskListData(
		useMemo(
			() => ({
				scope,
				viewKey: 'all' as const,
				placement: { kind: 'project' as const, projectId },
			}),
			[projectId, scope],
		),
	)
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
		serverDrivenFilters: ['status', 'showCompleted', 'project'],
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

	return {
		project,
		busyAction,
		breadcrumbItems,
		taskCollection,
		displayPageKey: PROJECT_DETAIL_DISPLAY_PAGE_KEY,
		toolbarPills,
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
