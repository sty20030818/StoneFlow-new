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
import { useListFilterSession, useRegisterFilterCommandAdapter } from '@/features/filter'
import { useEntityDetailController } from '@/features/entity-detail'
import { useDialogStore } from '@/features/shell-dialogs'
import { useSpaces } from '@/features/space'
import { useTaskCollectionScene, useTaskQueryData } from '@/features/task'
import { getDefaultTaskViews, useDefaultTaskViewSelection } from '@/features/task-workspace'
import { useCreateViewMutation } from '@/features/view'
import { EMPTY_FILTER_QUERY } from '@/shared/types'
import type { Scope, TaskViewContext } from '@/shared/types'

import {
	useArchiveProjectMutation,
	useCompleteProjectMutation,
	useDeleteProjectMutation,
	useReopenProjectMutation,
} from './project.mutations'
import { useSuspenseProjectDetailQuery } from './project.queries'
import { useProjectOptions } from './useProjectData'

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
	const { data: project } = useSuspenseProjectDetailQuery(projectId)
	const projectOptions = useProjectOptions(scope)
	const { spaces } = useSpaces()
	const completeProject = useCompleteProjectMutation()
	const reopenProject = useReopenProjectMutation()
	const archiveProject = useArchiveProjectMutation()
	const deleteProject = useDeleteProjectMutation()
	const createSavedView = useCreateViewMutation()
	const [busyAction, setBusyAction] = useState<string | null>(null)
	const context = useMemo<TaskViewContext>(() => ({ kind: 'project', projectId }), [projectId])
	const defaultViews = useMemo(
		() => getDefaultTaskViews({ context, projectCompleted: Boolean(project?.completedAt) }),
		[context, project?.completedAt],
	)
	const viewSelection = useDefaultTaskViewSelection(defaultViews)

	const display = useTaskDisplayOptions(PROJECT_DETAIL_DISPLAY_PAGE_KEY)
	const filterSession = useListFilterSession({ base: EMPTY_FILTER_QUERY })

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
			items: project ? taskList.items : [],
			status: project ? taskList.status : 'ready',
			onRetry: taskList.refetch,
		},
		displayPageKey: PROJECT_DETAIL_DISPLAY_PAGE_KEY,
		display,
		fallbackSubtitle: project?.name ?? '当前项目',
		activeTaskId,
		onCreateTask: () => openTaskCreateDialog({ projectId }),
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

	const filterUiValue = {
		session: filterSession,
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
		toolbarPills: defaultViews.options,
		selectedToolbarKey: viewSelection.selectedKey,
		selectToolbar: viewSelection.select,
		filterUiValue,
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
