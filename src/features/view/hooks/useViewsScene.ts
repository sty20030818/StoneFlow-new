import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'

import {
	openView,
	resolveBreadcrumb,
	resolveShellRouteScope,
	useCurrentShellRoute,
} from '@/app/navigation'
import { useDialogStore } from '@/features/shell-dialogs'
import {
	applyTaskDisplayOptionsToTasks,
	createTaskDisplayApplyContext,
	createTaskDisplayViewPageKey,
	useTaskDisplayOptions,
} from '@/features/display-options'
import { useEntityDetailController } from '@/features/entity-detail'
import type { EntitySceneBoardSlotProps } from '@/features/entity-scene'
import { useProjectOptions } from '@/features/project'
import { useSpaces } from '@/features/space'
import { useEntitySelectionEscape, useRegisterCommandSelection } from '@/features/selection'
import {
	buildTaskCommandSelection,
	useRegisterTaskPreviewSource,
	useTaskListController,
	useTaskPreviewController,
	useTaskSelection,
} from '@/features/task'
import { useTaskChangedListener } from '@/shared/events'
import type { View } from '@/shared/types'

import type { ViewSearchDefinition } from '../api/viewSearch'
import {
	useCreateViewMutation,
	useDeleteViewMutation,
	useUpdateViewMutation,
} from './view.mutations'
import { useTaskViewRunQuery, useViewsQuery } from './view.queries'

const EMPTY_TASK_VIEWS: View[] = []

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
	const search = useSearch({ strict: false }) as Partial<ViewSearchDefinition>
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const entityDetailController = useEntityDetailController()
	const activeDetail = entityDetailController.activeDetail
	const openEntityDrawer = entityDetailController.openDrawer
	const taskPreviewController = useTaskPreviewController()
	const taskViewsQuery = useViewsQuery()
	const taskViews = taskViewsQuery.data ?? EMPTY_TASK_VIEWS
	const createTaskView = useCreateViewMutation()
	const updateTaskView = useUpdateViewMutation()
	const deleteTaskView = useDeleteViewMutation()
	const projectOptions = useProjectOptions(scope)
	const { spaces } = useSpaces()
	const {
		pendingTaskId,
		updateTaskPriority,
		updateTaskStatus,
		updateTaskDueDate,
		updateTaskScheduledAt,
		updateTaskReminderAt,
		toggleTaskStatus,
		archiveListTask,
		deleteListTask,
		updateTaskPlacement,
	} = useTaskListController()

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
	const taskRunInput = activeView
		? {
				scope,
				viewId: activeView.kind === 'custom' ? activeView.id : null,
				viewKey: activeView.systemKey,
				filters: Object.keys(search.filters ?? {}).length > 0 ? search.filters : undefined,
				sort: search.sort && search.sort.length > 0 ? search.sort : undefined,
				groupBy: search.groupBy ?? undefined,
			}
		: null
	const taskRunQuery = useTaskViewRunQuery(taskRunInput)
	const taskRun = taskRunQuery.data ?? null
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
	const visibleTasks = useMemo(() => taskRun?.items ?? [], [taskRun?.items])
	const breadcrumbItems = useMemo(
		() =>
			resolveBreadcrumb({
				route: shellRoute,
				viewName: activeView?.name ?? null,
			}),
		[activeView?.name, shellRoute],
	)
	const displayPageKey = useMemo(
		() => createTaskDisplayViewPageKey(activeView?.id ?? 'empty-state'),
		[activeView?.id],
	)
	const display = useTaskDisplayOptions(displayPageKey)

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
	const displayResult = useMemo(
		() =>
			applyTaskDisplayOptionsToTasks({
				items: visibleTasks,
				options: display.options,
				context: createTaskDisplayApplyContext(displayPageKey),
			}),
		[display.options, displayPageKey, visibleTasks],
	)
	const {
		selectedTaskIdSet,
		selectionSnapshot,
		selectedCount,
		focusedTaskId,
		toggleTaskSelection,
		clearTaskSelection,
		setFocusedTaskId,
		moveFocus,
		selectTaskIds,
	} = useTaskSelection(displayResult.selectionOrderIds)
	const commandSelection = useMemo(
		() =>
			buildTaskCommandSelection({
				selectedIds: selectionSnapshot.ids,
				tasks: visibleTasks,
				fallbackSubtitle: activeView?.name ?? '当前视图',
				focusedTaskId,
				clearSelection: clearTaskSelection,
			}),
		[activeView?.name, clearTaskSelection, focusedTaskId, selectionSnapshot.ids, visibleTasks],
	)
	useRegisterCommandSelection(commandSelection)
	useRegisterTaskPreviewSource({
		tasks: visibleTasks,
		focusedTaskId,
		activeTaskId: activeDetail?.kind === 'task' ? activeDetail.id : null,
	})
	useEntitySelectionEscape({
		hasSelection: selectedCount > 0,
		clearSelection: clearTaskSelection,
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

	const board: EntitySceneBoardSlotProps = {
		boardKind: 'task',
		boardConfig: {
			variant: 'view',
			customSections: displayResult.boardPatch.customSections,
			emptyActionLabel: activeView ? '创建任务' : '创建视图',
			emptyDescription: activeView
				? `视图「${activeView.name}」下还没有符合条件的任务。点「创建任务」新增一项，或者调整一下视图条件再看看。`
				: '这里会显示你整理好的任务视图，现在还没准备好。点「创建视图」先建一个，后面筛选、回看和聚焦都会更顺手。',
			emptyTitle: activeView ? '当前没有任务' : '当前还没有视图',
			hideEmptySections: displayResult.boardPatch.hideEmptySections ?? true,
			statusOrder: displayResult.boardPatch.statusOrder,
			visibleProperties: displayResult.visibleProperties,
		},
		boardData: {
			items: displayResult.orderedItems,
			status: boardStatus,
			activeItemId: activeDetail?.kind === 'task' ? activeDetail.id : null,
			pendingItemId: pendingTaskId,
			selectedTaskIdSet,
			focusedTaskId,
		},
		boardActions: {
			onArchiveTask: archiveListTask,
			onClearTaskSelection: clearTaskSelection,
			onDeleteTask: deleteListTask,
			onEmptyAction: () => {
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
				if (activeDetail?.kind === 'task') {
					return
				}
				taskPreviewController.openPreview(taskId, source)
			},
			onSelectAllTasks: selectTaskIds,
			onSetFocusedTask: setFocusedTaskId,
			onMoveTaskFocus: moveFocus,
			onSelectPlacement: (task, target) => void updateTaskPlacement(task, target),
			onToggleTaskSelection: toggleTaskSelection,
			onToggleTaskStatus: toggleTaskStatus,
			onUpdateTaskDueDate: updateTaskDueDate,
			onUpdateTaskScheduledAt: updateTaskScheduledAt,
			onUpdateTaskReminderAt: updateTaskReminderAt,
			onUpdateTaskPriority: updateTaskPriority,
			onUpdateTaskStatus: updateTaskStatus,
			projectOptions,
			spaces,
			showProjectCellOptions: false,
		},
	}

	return {
		activeView,
		taskViews,
		visibleViews,
		breadcrumbItems,
		board,
		sceneVariant: 'view' as const,
		displayPageKey,
		footerDescription: taskRun ? `当前视图共 ${taskRun.items.length} 条任务` : '正在准备视图数据',
		bulk: {
			selectedCount,
			clearTaskSelection,
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
