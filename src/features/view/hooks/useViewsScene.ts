import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'

import {
	openView,
	resolveBreadcrumb,
	resolveShellRouteScope,
	useCurrentShellRoute,
} from '@/app/navigation'
import { useDialogStore } from '@/features/shell-dialogs'
import { createTaskDisplayViewPageKey, useTaskDisplayOptions } from '@/features/display-options'
import {
	adaptFilterQueryToViewFilters,
	useListFilterSession,
	useRegisterFilterCommandAdapter,
} from '@/features/filter'
import { useEntityDetailController } from '@/features/entity-detail'
import { useProjectOptions } from '@/features/project'
import { useSpaces } from '@/features/space'
import { useTaskCollectionScene, useTaskPreviewController } from '@/features/task'
import { useTaskChangedListener } from '@/shared/events'
import { EMPTY_FILTER_QUERY } from '@/shared/types'
import type { View } from '@/shared/types'

import { migrateViewPresentationToDisplay } from '../model/migrateViewPresentationToDisplay'
import {
	useCreateViewMutation,
	useDeleteViewMutation,
	useUpdateViewMutation,
} from './view.mutations'
import { flattenTaskViewPages, useTaskViewRunInfiniteQuery, useViewsQuery } from './view.queries'

const EMPTY_TASK_VIEWS: View[] = []
let viewPresentationMigrationStarted = false

/**
 * Views 页唯一 wiring：视图轨 / run / 任务板 / 编辑器。
 * 任务写路径只组合 task public；不 import layout。
 */
export function useViewsScene() {
	const shellRoute = useCurrentShellRoute()
	const scope = resolveShellRouteScope(shellRoute)
	const spaceId = shellRoute.spaceId
	const navigate = useNavigate({ from: '/' })
	const { viewId: routeViewId } = useParams({ strict: false }) as { viewId?: string }
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const entityDetailController = useEntityDetailController()
	const activeDetail = entityDetailController.activeDetail
	const openEntityDrawer = entityDetailController.openDrawer
	const taskPreviewController = useTaskPreviewController()
	const taskViewsQuery = useViewsQuery()
	const taskViews = taskViewsQuery.data ?? EMPTY_TASK_VIEWS

	// 一次性数据清洗：raw 行 sort/group → display（自包含，不污染产品 View）
	useEffect(() => {
		if (viewPresentationMigrationStarted || !taskViewsQuery.isSuccess) {
			return
		}
		viewPresentationMigrationStarted = true
		void migrateViewPresentationToDisplay().catch(() => {
			viewPresentationMigrationStarted = false
		})
	}, [taskViewsQuery.isSuccess])

	const createTaskView = useCreateViewMutation()
	const updateTaskView = useUpdateViewMutation()
	const deleteTaskView = useDeleteViewMutation()
	const projectOptions = useProjectOptions(scope)
	const { spaces } = useSpaces()
	const [editorOpen, setEditorOpen] = useState(false)
	const [editingView, setEditingView] = useState<View | null>(null)
	const [isSavingView, setIsSavingView] = useState(false)

	const visibleViews = taskViews
	const activeView = useMemo(() => {
		if (!routeViewId) {
			return visibleViews[0] ?? null
		}

		return taskViews.find((view) => view.id === routeViewId) ?? visibleViews[0] ?? null
	}, [routeViewId, taskViews, visibleViews])

	const displayPageKey = useMemo(
		() => createTaskDisplayViewPageKey(activeView?.id ?? 'empty-state'),
		[activeView?.id],
	)

	// base = View 定义；temp = URL `f`
	const viewFilterBase =
		activeView?.kind === 'custom' ? (activeView.filters ?? EMPTY_FILTER_QUERY) : EMPTY_FILTER_QUERY
	const filterSession = useListFilterSession({ base: viewFilterBase })
	const display = useTaskDisplayOptions(displayPageKey)

	useRegisterFilterCommandAdapter({
		session: filterSession,
		showCompleted: display.options.showCompleted,
		onToggleCompleted: () => {
			void display.actions.applyPartial({
				showCompleted: !display.options.showCompleted,
			})
		},
	})

	// 仅 dirty 时用 temp 覆盖 View.filters；sort/group 只走 Display 客户端呈现
	const taskRunInput = activeView
		? {
				scope,
				viewId: activeView.kind === 'custom' ? activeView.id : null,
				viewKey: activeView.systemKey,
				...(filterSession.dirty
					? { filters: adaptFilterQueryToViewFilters(filterSession.temp) }
					: {}),
			}
		: null
	const taskRunQuery = useTaskViewRunInfiniteQuery(taskRunInput)
	const viewItems = useMemo(
		() => flattenTaskViewPages(taskRunQuery.data?.pages),
		[taskRunQuery.data?.pages],
	)
	const viewTotalCount = taskRunQuery.data?.pages[0]?.totalCount ?? 0
	const boardStatus =
		taskViewsQuery.isLoading ||
		taskViewsQuery.isPending ||
		(activeView && (taskRunQuery.isLoading || taskRunQuery.isPending))
			? 'loading'
			: activeView
				? taskRunQuery.isError
					? 'error'
					: 'ready'
				: 'ready'
	const visibleTasks = viewItems
	const breadcrumbItems = useMemo(
		() =>
			resolveBreadcrumb({
				route: shellRoute,
				viewName: activeView?.name ?? null,
			}),
		[activeView?.name, shellRoute],
	)
	useEffect(() => {
		if (
			taskViewsQuery.isLoading ||
			taskViewsQuery.isPending ||
			visibleViews.length === 0 ||
			!activeView
		) {
			return
		}

		const nextViewValue = activeView.id
		if (routeViewId === nextViewValue) {
			return
		}

		void navigate({ to: openView(scope, nextViewValue, spaceId) as never, replace: true })
	}, [
		activeView,
		navigate,
		routeViewId,
		scope,
		spaceId,
		taskViewsQuery.isLoading,
		taskViewsQuery.isPending,
		visibleViews.length,
	])

	useTaskChangedListener(scope, () => {
		void taskRunQuery.refetch()
	})
	const taskCollection = useTaskCollectionScene({
		source: { items: visibleTasks, status: boardStatus },
		displayPageKey,
		display,
		supportsProject: false,
		fallbackSubtitle: activeView?.name ?? '当前视图',
		activeTaskId: activeDetail?.kind === 'task' ? activeDetail.id : null,
		onCreateTask: () => {
			if (activeView) {
				openTaskCreateDialog({ status: 'todo' })
				return
			}
			openCreateEditor()
		},
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
		showProjectCellOptions: false,
		hasNextPage: Boolean(taskRunQuery.hasNextPage),
		isFetchingNextPage: taskRunQuery.isFetchingNextPage,
		fetchNextPage: () => {
			if (taskRunQuery.hasNextPage && !taskRunQuery.isFetchingNextPage) {
				void taskRunQuery.fetchNextPage()
			}
		},
		fetchNextPageError: taskRunQuery.isFetchNextPageError
			? taskRunQuery.error instanceof Error
				? taskRunQuery.error.message
				: '加载更多失败'
			: null,
		totalCount: viewTotalCount,
		loadedCount: visibleTasks.length,
		empty: {
			emptyActionLabel: activeView ? '创建任务' : '创建视图',
			emptyDescription: activeView
				? `视图「${activeView.name}」下还没有符合条件的任务。点「创建任务」新增一项，或者调整一下视图条件再看看。`
				: '这里会显示你整理好的任务视图，现在还没准备好。点「创建视图」先建一个，后面筛选、回看和聚焦都会更顺手。',
			emptyTitle: activeView ? '当前没有任务' : '当前还没有视图',
		},
	})

	function navigateToView(view: View) {
		void navigate({ to: openView(scope, view.id, spaceId) as never })
	}

	function openCreateEditor() {
		setEditingView(null)
		setEditorOpen(true)
	}

	function openEditEditor(view: View) {
		if (view.kind !== 'custom') {
			return
		}
		setEditingView(view)
		setEditorOpen(true)
	}

	function closeEditor() {
		setEditorOpen(false)
		setEditingView(null)
	}

	async function handleCreateView(input: Parameters<typeof createTaskView.mutateAsync>[0]) {
		setIsSavingView(true)
		try {
			const created = await createTaskView.mutateAsync({ ...input, scope })
			void navigate({ to: openView(scope, created.id, spaceId) as never })
		} finally {
			setIsSavingView(false)
		}
	}

	async function handleUpdateView(input: Parameters<typeof updateTaskView.mutateAsync>[0]) {
		setIsSavingView(true)
		try {
			await updateTaskView.mutateAsync(input)
		} finally {
			setIsSavingView(false)
		}
	}

	async function handleDeleteView(view: View) {
		if (view.kind !== 'custom') {
			return
		}
		await deleteTaskView.mutateAsync(view.id)
		if (activeView?.id === view.id) {
			const fallbackView = visibleViews.find((item) => item.id !== view.id)
			if (fallbackView) {
				navigateToView(fallbackView)
			}
		}
	}

	const filterUiValue = useMemo(
		() => ({
			session: filterSession,
			projects: projectOptions.map((project) => ({ id: project.id, name: project.name })),
			canOverwriteView: activeView?.kind === 'custom',
			onSave: async (input: { mode: 'create' | 'overwrite'; name?: string }) => {
				if (input.mode === 'overwrite' && activeView?.kind === 'custom') {
					await updateTaskView.mutateAsync({
						viewId: activeView.id,
						filters: filterSession.effective,
					})
					filterSession.clearTemp()
					return
				}
				if (input.mode === 'create' && input.name?.trim()) {
					const created = await createTaskView.mutateAsync({
						name: input.name.trim(),
						scope,
						filters: filterSession.effective,
					})
					filterSession.clearTemp()
					void navigate({ to: openView(scope, created.id, spaceId) as never })
				}
			},
		}),
		[
			activeView,
			createTaskView,
			filterSession,
			navigate,
			projectOptions,
			scope,
			spaceId,
			updateTaskView,
		],
	)

	return {
		activeView,
		taskViews,
		visibleViews,
		breadcrumbItems,
		taskCollection,
		displayPageKey,
		filterUiValue,
		bulk: {
			selectedCount: taskCollection.selectedCount,
			clearTaskSelection: taskCollection.clearTaskSelection,
		},
		openTaskCreateDialog: () => openTaskCreateDialog({ status: 'todo' }),
		navigateToView,
		openCreateEditor,
		openEditEditor,
		editor: {
			open: editorOpen,
			view: editingView,
			isSubmitting: isSavingView,
			projects: projectOptions,
			onClose: closeEditor,
			onCreate: handleCreateView,
			onUpdate: handleUpdateView,
		},
		actions: {
			onDelete: (view: View) => void handleDeleteView(view),
		},
	}
}
