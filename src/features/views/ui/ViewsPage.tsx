import { useEffect, useMemo, useState } from 'react'

import { EntityScene } from '@/app/layouts/entity-scene'
import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import { useCurrentShellRoute } from '@/app/layouts/shell/model/ShellRouteContext'
import { openView } from '@/app/navigation/intents'
import { resolveShellRouteScope } from '@/app/navigation/scope'
import { useNavigate, useParams } from '@/app/routing/tanstackCompat'
import { useEntityDetailController } from '@/features/entity-detail'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { useProjectOptions } from '@/features/project/query'
import { useSpaces } from '@/features/space/query'
import {
	buildTaskCommandSelection,
	useEntitySelectionEscape,
	useRegisterCommandSelection,
} from '@/features/selection/model'
import { useTaskListController } from '@/features/task/model/useTaskListController'
import { getTaskBoardVisualOrderIds } from '@/features/task/model/taskBoardOrder'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { BulkActionBar, BulkCommandMenuAction } from '@/features/bulk-action'
import { useRegisterTaskPreviewSource, useTaskPreviewController } from '@/features/task/detail'
import {
	useCreateViewMutation,
	useDeleteViewMutation,
	useReorderViewsMutation,
	useTaskViewRunQuery,
	useToggleViewVisibleMutation,
	useUpdateViewMutation,
	useViewsQuery,
} from '@/features/view/query'
import { ViewActionsMenu } from '@/features/view/ui/ViewActionsMenu'
import { ViewEditorDialog } from '@/features/view/ui/ViewEditorDialog'
import { useTaskChangedListener } from '@/shared/events'
import type { TaskListItem, View } from '@/shared/types'
import { AppBreadcrumb } from '@/shared/ui/AppBreadcrumb'
import { resolveBreadcrumb } from '@/shared/ui/breadcrumbResolver'
import { PlusIcon } from 'lucide-react'
const EMPTY_TASK_VIEWS: View[] = []

export function ViewsPage() {
	const shellRoute = useCurrentShellRoute()
	const scope = resolveShellRouteScope(shellRoute)
	const spaceId = shellRoute.spaceId
	const navigate = useNavigate()
	const { viewId: routeViewId } = useParams()
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const entityDetailController = useEntityDetailController()
	const activeDetail = entityDetailController.activeDetail
	const openEntityDrawer = entityDetailController.openDrawer
	const taskPreviewController = useTaskPreviewController()
	const taskViewsQuery = useViewsQuery('task', false)
	const taskViews = taskViewsQuery.data ?? EMPTY_TASK_VIEWS
	const createTaskView = useCreateViewMutation()
	const updateTaskView = useUpdateViewMutation()
	const deleteTaskView = useDeleteViewMutation()
	const toggleTaskViewVisible = useToggleViewVisibleMutation()
	const reorderTaskViews = useReorderViewsMutation()
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

	const visibleViews = useMemo(() => taskViews.filter((view) => view.isVisible), [taskViews])
	const activeView = useMemo(() => {
		if (!routeViewId) {
			return visibleViews[0] ?? null
		}

		return (
			taskViews.find(
				(view) => view.id === routeViewId || (view.key !== null && view.key === routeViewId),
			) ??
			visibleViews[0] ??
			null
		)
	}, [routeViewId, taskViews, visibleViews])
	const taskRunInput = activeView
		? {
				scope,
				viewId: activeView.id,
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

		void navigate(openView(scope, nextViewValue, spaceId), { replace: true })
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

	const sections = useMemo(
		() => buildCustomSections(taskRun?.groups ?? [], visibleTasks),
		[taskRun?.groups, visibleTasks],
	)
	const taskSelectionOrderIds = useMemo(
		() => getTaskBoardVisualOrderIds(visibleTasks, { customSections: sections }),
		[sections, visibleTasks],
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
	} = useTaskSelection(taskSelectionOrderIds)
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
		void navigate(openView(scope, view.id, spaceId))
	}

	async function handleCreateView(input: Parameters<typeof createTaskView.mutateAsync>[0]) {
		setIsSavingView(true)
		try {
			const created = await createTaskView.mutateAsync(input)
			void navigate(openView(scope, created.id, spaceId))
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
		await deleteTaskView.mutateAsync(view.id)
		if (activeView?.id === view.id) {
			const fallbackView = visibleViews.find((item) => item.id !== view.id)
			if (fallbackView) {
				navigateToView(fallbackView)
			}
		}
	}

	async function handleToggleVisible(view: View, visible: boolean) {
		await toggleTaskViewVisible.mutateAsync({ viewId: view.id, visible })
		if (!visible && activeView?.id === view.id) {
			const fallbackView = visibleViews.find((item) => item.id !== view.id)
			if (fallbackView) {
				navigateToView(fallbackView)
			}
		}
	}

	async function handleReorder(orderedIds: string[]) {
		await reorderTaskViews.mutateAsync({
			entityType: 'task',
			orderedIds,
		})
	}

	return (
		<>
			<EntityScene
				board={{
					boardKind: 'task',
					boardConfig: {
						variant: 'view',
						customSections: sections,
						emptyActionLabel: activeView ? '创建任务' : '创建视图',
						emptyDescription: activeView
							? `视图「${activeView.name}」下还没有符合条件的任务。点「创建任务」新增一项，或者调整一下视图条件再看看。`
							: '这里会显示你整理好的任务视图，现在还没准备好。点「创建视图」先建一个，后面筛选、回看和聚焦都会更顺手。',
						emptyTitle: activeView ? '当前没有任务' : '当前还没有视图',
						hideEmptySections: true,
					},
					boardData: {
						items: visibleTasks,
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

							setEditingView(null)
							setEditorOpen(true)
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
				}}
				breadcrumb={<AppBreadcrumb items={breadcrumbItems} />}
				bulkBar={
					<BulkActionBar
						action={<BulkCommandMenuAction />}
						onClear={clearTaskSelection}
						selectedCount={selectedCount}
					/>
				}
				footer={
					<div className='px-1 text-[12px] text-sf-text-tertiary'>
						{taskRun?.view.description
							? taskRun.view.description
							: taskRun
								? `当前视图共 ${taskRun.items.length} 条任务`
								: '正在准备视图数据'}
					</div>
				}
				headerActions={
					<MainCard.GhostAction
						aria-label='创建任务'
						onClick={() => openTaskCreateDialog({ status: 'todo' })}
					>
						<PlusIcon />
					</MainCard.GhostAction>
				}
				onRefresh={() => {
					void taskRunQuery.refetch()
				}}
				sceneVariant='view'
				toolbarFilterAction={
					<ViewActionsMenu
						activeView={activeView}
						onCreate={() => {
							setEditingView(null)
							setEditorOpen(true)
						}}
						onDelete={(view) => void handleDeleteView(view)}
						onEdit={(view) => {
							setEditingView(view)
							setEditorOpen(true)
						}}
						onReorder={(orderedIds) => void handleReorder(orderedIds)}
						onToggleVisible={(view, visible) => void handleToggleVisible(view, visible)}
						views={taskViews}
					/>
				}
				toolbarPills={visibleViews.map((view) => ({
					label: view.name,
					active: view.id === activeView?.id,
					onClick: () => navigateToView(view),
					role: 'tab' as const,
				}))}
			/>

			<ViewEditorDialog
				isSubmitting={isSavingView}
				onClose={() => {
					setEditorOpen(false)
					setEditingView(null)
				}}
				onCreate={handleCreateView}
				onUpdate={handleUpdateView}
				open={editorOpen}
				projects={projectOptions}
				view={editingView}
			/>
		</>
	)
}

function buildCustomSections(
	groups: Array<{ key: string; label: string; taskIds: string[] }>,
	items: TaskListItem[],
) {
	if (groups.length === 0) {
		return undefined
	}

	const itemMap = new Map(items.map((task) => [task.id, task]))
	return groups
		.map((group) => {
			const tasks = group.taskIds
				.map((taskId) => itemMap.get(taskId))
				.filter((task): task is TaskListItem => task !== undefined)
			if (tasks.length === 0) {
				return null
			}

			const label =
				group.key.startsWith('project:') && tasks[0]?.projectName
					? tasks[0].projectName
					: group.label
			return {
				key: group.key,
				label,
				tasks,
			}
		})
		.filter(
			(group): group is { key: string; label: string; tasks: TaskListItem[] } => group !== null,
		)
}
