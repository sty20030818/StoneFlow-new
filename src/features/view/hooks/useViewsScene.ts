import { useMemo, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { hashKey, useQuery } from '@tanstack/react-query'

import {
	openProjectDetail,
	openSection,
	openView,
	resolveBreadcrumb,
	resolveShellRouteScope,
	useCurrentShellRoute,
} from '@/app/navigation'
import { createTaskDisplayViewPageKey, useTaskDisplayOptions } from '@/features/display-options'
import { useListFilterSession, useRegisterFilterCommandAdapter } from '@/features/filter'
import { useEntityDetailController } from '@/features/entity-detail'
import { projectDetailQueryOptions, useProjectOptions } from '@/features/project'
import { useDialogStore } from '@/features/shell-dialogs'
import { useSpaces } from '@/features/space'
import { useTaskBoardPagination, useTaskCollectionScene } from '@/features/task'
import { getDefaultTaskViews } from '@/features/task-workspace'
import { useTaskChangedListener } from '@/shared/events'
import {
	EMPTY_FILTER_QUERY,
	type CreateViewInput,
	type Scope,
	type TaskViewContext,
	type View,
} from '@/shared/types'

import {
	useCreateViewMutation,
	useDeleteViewMutation,
	useUpdateViewMutation,
} from './view.mutations'
import {
	flattenTaskViewPages,
	taskViewRunInfiniteQueryOptions,
	useTaskViewRunInfiniteQuery,
	useViewsQuery,
} from './view.queries'

const EMPTY_VIEWS: View[] = []

export function resolveSavedViewWorkspaceContext(
	context: TaskViewContext | undefined,
	scope: Scope,
) {
	if (context?.kind === 'standalone') {
		return {
			createDraft: { placement: 'standalone' as const },
			createProjectId: null,
			supportsProject: false,
			showSpaceLabel: scope.type === 'all',
		}
	}
	if (context?.kind === 'project') {
		return {
			createDraft: { projectId: context.projectId },
			createProjectId: context.projectId,
			supportsProject: false,
			showSpaceLabel: scope.type === 'all',
		}
	}
	return {
		createDraft: { status: 'todo' as const },
		createProjectId: null,
		supportsProject: context?.kind === 'all',
		showSpaceLabel: scope.type === 'all',
	}
}

function useSavedViewEditor(scope: ReturnType<typeof resolveShellRouteScope>) {
	const createView = useCreateViewMutation()
	const updateView = useUpdateViewMutation()
	const [open, setOpen] = useState(false)
	const [view, setView] = useState<View | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const projects = useProjectOptions(scope)

	return {
		open,
		view,
		projects,
		isSubmitting,
		openCreate: () => {
			setView(null)
			setOpen(true)
		},
		openEdit: (nextView: View) => {
			setView(nextView)
			setOpen(true)
		},
		onClose: () => {
			setOpen(false)
			setView(null)
		},
		onCreate: async (input: Omit<CreateViewInput, 'scope'>) => {
			setIsSubmitting(true)
			try {
				await createView.mutateAsync({ ...input, scope } satisfies CreateViewInput)
			} finally {
				setIsSubmitting(false)
			}
		},
		onUpdate: async (input: Parameters<typeof updateView.mutateAsync>[0]) => {
			setIsSubmitting(true)
			try {
				await updateView.mutateAsync(input)
			} finally {
				setIsSubmitting(false)
			}
		},
	}
}

export function useSavedViewLibraryScene() {
	const shellRoute = useCurrentShellRoute()
	const scope = resolveShellRouteScope(shellRoute)
	const spaceId = shellRoute.spaceId
	const navigate = useNavigate({ from: '/' })
	const viewsQuery = useViewsQuery(scope)
	const deleteView = useDeleteViewMutation()
	const editor = useSavedViewEditor(scope)
	const [search, setSearch] = useState('')
	const views = viewsQuery.data ?? EMPTY_VIEWS
	const normalizedSearch = search.trim().toLocaleLowerCase('zh-CN')
	const visibleViews = normalizedSearch
		? views.filter((view) => view.name.toLocaleLowerCase('zh-CN').includes(normalizedSearch))
		: views

	return {
		breadcrumbItems: resolveBreadcrumb({ route: shellRoute }),
		views: visibleViews,
		status: viewsQuery.isError
			? 'error'
			: viewsQuery.isLoading || viewsQuery.isPending
				? 'loading'
				: 'ready',
		search,
		setSearch,
		editor,
		openView: (view: View) =>
			void navigate({ to: openView(scope, view.id, spaceId) as never, search: {} as never }),
		deleteView: async (view: View) => {
			await deleteView.mutateAsync(view.id)
		},
	}
}

export function useSavedViewWorkspaceScene() {
	const shellRoute = useCurrentShellRoute()
	const scope = resolveShellRouteScope(shellRoute)
	const spaceId = shellRoute.spaceId
	const navigate = useNavigate({ from: '/' })
	const { viewId = '' } = useParams({ strict: false }) as { viewId?: string }
	const viewsQuery = useViewsQuery(scope)
	const views = viewsQuery.data ?? EMPTY_VIEWS
	const activeView = views.find((view) => view.id === viewId) ?? null
	const runnableView = activeView?.definitionError ? null : activeView
	const projectId = runnableView?.context.kind === 'project' ? runnableView.context.projectId : ''
	const projectQuery = useQuery({
		...projectDetailQueryOptions(projectId),
		enabled: projectId.length > 0,
	})
	const defaultViews = runnableView
		? getDefaultTaskViews({
				context: runnableView.context,
				projectCompleted: Boolean(projectQuery.data?.completedAt),
			})
		: { options: [], defaultKey: 'incomplete' as const }
	const displayPageKey = createTaskDisplayViewPageKey(activeView?.id ?? 'missing')
	const display = useTaskDisplayOptions(displayPageKey)
	const viewDefinitionPending = viewsQuery.isLoading || viewsQuery.isPending
	const filterSession = useListFilterSession({
		base: viewDefinitionPending ? null : (runnableView?.filters ?? EMPTY_FILTER_QUERY),
	})
	const projectOptions = useProjectOptions(scope)
	const { spaces } = useSpaces()
	const activeDetail = useEntityDetailController().activeDetail
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const createView = useCreateViewMutation()
	const updateView = useUpdateViewMutation()
	const deleteView = useDeleteViewMutation()
	const editor = useSavedViewEditor(scope)
	const workspaceContext = resolveSavedViewWorkspaceContext(runnableView?.context, scope)
	const openCreateTask = () => openTaskCreateDialog(workspaceContext.createDraft)
	useRegisterFilterCommandAdapter({ session: filterSession })

	const taskRunInput = runnableView
		? {
				scope,
				viewId: runnableView.id,
				...(filterSession.dirty ? { filters: filterSession.temp } : {}),
			}
		: null
	const taskRunQuery = useTaskViewRunInfiniteQuery(taskRunInput)
	const items = useMemo(
		() => flattenTaskViewPages(taskRunQuery.data?.pages),
		[taskRunQuery.data?.pages],
	)
	const boardStatus =
		viewsQuery.isLoading || viewsQuery.isPending || (runnableView && taskRunQuery.isPending)
			? 'loading'
			: runnableView && taskRunQuery.isLoadingError
				? 'error'
				: 'ready'
	useTaskChangedListener(scope, () => {
		void taskRunQuery.refetch()
	})
	const taskTotalCount = taskRunQuery.data?.pages[0]?.totalCount
	const pagination = useTaskBoardPagination({
		sourceKey: taskRunInput
			? hashKey(taskViewRunInfiniteQueryOptions(taskRunInput).queryKey)
			: 'saved-view:none',
		loadedPageCount: taskRunQuery.data?.pages.length ?? 0,
		fetchNextPage: taskRunQuery.fetchNextPage,
		hasNextPage: taskRunQuery.hasNextPage,
		isFetchingNextPage: taskRunQuery.isFetchingNextPage,
		isFetchNextPageError: taskRunQuery.isFetchNextPageError,
		error: taskRunQuery.error,
		totalCount: taskTotalCount,
	})
	const taskCollection = useTaskCollectionScene({
		source: { items, status: boardStatus, onRetry: taskRunQuery.refetch },
		displayPageKey,
		display,
		fallbackSubtitle:
			runnableView?.context.kind === 'standalone'
				? '独立事项'
				: runnableView?.context.kind === 'project'
					? (projectQuery.data?.name ?? runnableView.name)
					: scope.type === 'all'
						? (task) => {
								const spaceLabel = task.spaceName ?? '未命名空间'
								return task.projectName ? `${spaceLabel} · ${task.projectName}` : spaceLabel
							}
						: (task) => task.projectName ?? '独立事项',
		activeTaskId: activeDetail?.kind === 'task' ? activeDetail.id : null,
		onCreateTask: openCreateTask,
		projectOptions,
		spaces,
		showProjectCellOptions: workspaceContext.supportsProject,
		showSpaceLabel: workspaceContext.showSpaceLabel,
		createProjectId: workspaceContext.createProjectId,
		pagination,
		empty: {
			emptyActionLabel: '创建任务',
			emptyDescription: runnableView
				? `视图「${runnableView.name}」下没有符合条件的任务。`
				: '这个保存视图不存在，或不属于当前范围。',
			emptyTitle: runnableView ? '当前没有任务' : '找不到保存视图',
		},
	})

	const filterUiValue = {
		session: filterSession,
		...(runnableView?.context.kind === 'all'
			? { projects: projectOptions.map((project) => ({ id: project.id, name: project.name })) }
			: {}),
		canOverwriteView: Boolean(runnableView),
		onSave: async (input: { mode: 'create' | 'overwrite'; name?: string }) => {
			if (!runnableView) return
			if (input.mode === 'overwrite') {
				await updateView.mutateAsync({
					viewId: runnableView.id,
					filters: filterSession.effective,
				})
				filterSession.clearTemp()
				return
			}
			if (!input.name?.trim()) return
			const created = await createView.mutateAsync({
				name: input.name.trim(),
				scope,
				context: runnableView.context,
				baseViewKey: runnableView.baseViewKey,
				filters: filterSession.effective,
			})
			filterSession.clearTemp()
			void navigate({ to: openView(scope, created.id, spaceId) as never, search: {} as never })
		},
	}

	function selectToolbar(key: string) {
		if (!runnableView || key === `saved:${runnableView.id}`) return
		const target = defaultViews.options.find((option) => option.key === key)
		if (!target) return
		const to =
			runnableView.context.kind === 'standalone'
				? openSection(scope, 'standalone', spaceId)
				: runnableView.context.kind === 'project'
					? openProjectDetail(runnableView.context.projectId, {
							scope,
							fallbackSpaceId: spaceId,
						})
					: openSection(scope, 'tasks', spaceId)
		void navigate({
			to: to as never,
			search: (target.key === defaultViews.defaultKey ? {} : { v: target.key }) as never,
		})
	}

	return {
		activeView,
		viewStatus:
			viewsQuery.isLoading || viewsQuery.isPending
				? 'loading'
				: viewsQuery.isError
					? 'error'
					: activeView?.definitionError
						? 'invalid-definition'
						: activeView
							? 'ready'
							: 'not-found',
		breadcrumbItems: resolveBreadcrumb({ route: shellRoute, viewName: activeView?.name ?? null }),
		displayPageKey,
		filterUiValue,
		taskCollection,
		toolbarPills: runnableView
			? [
					{ key: `saved:${runnableView.id}`, label: runnableView.name },
					...defaultViews.options.map(({ key, label }) => ({ key, label })),
				]
			: [],
		selectedToolbarKey: runnableView ? `saved:${runnableView.id}` : '',
		selectToolbar,
		openTaskCreateDialog: openCreateTask,
		openLibrary: () =>
			void navigate({ to: openView(scope, null, spaceId) as never, search: {} as never }),
		editor,
		deleteActiveView: async () => {
			if (!activeView) return
			await deleteView.mutateAsync(activeView.id)
			void navigate({ to: openView(scope, null, spaceId) as never, search: {} as never })
		},
	}
}
