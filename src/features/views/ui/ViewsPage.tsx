import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { EntityScene } from '@/app/layouts/entity-scene'
import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import { buildCanonicalViewPath, useShellRoute } from '@/app/routing'
import { useEntityDetailController } from '@/features/entity-detail'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { selectProjectOptions, useProjectStore } from '@/features/project/model/useProjectStore'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
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
	selectTaskViewRun,
	selectTaskViews,
	useViewStore,
} from '@/features/view/model/useViewStore'
import { ViewActionsMenu } from '@/features/view/ui/ViewActionsMenu'
import { ViewEditorDialog } from '@/features/view/ui/ViewEditorDialog'
import { useTaskChangedListener } from '@/shared/events'
import { isScopeMatch } from '@/shared/lib/scope'
import type { TaskListItem, View } from '@/shared/types'
import { AppBreadcrumb } from '@/shared/ui/AppBreadcrumb'
import { resolveBreadcrumb } from '@/shared/ui/breadcrumbResolver'
import { PlusIcon } from 'lucide-react'

const ALL_SCOPE = { type: 'all' } as const

export function ViewsPage() {
	const shellRoute = useShellRoute()
	const scope = shellRoute.scope ?? ALL_SCOPE
	const spaceId = shellRoute.spaceId
	const navigate = useNavigate()
	const { viewId: routeViewId } = useParams()
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const entityDetailController = useEntityDetailController()
	const activeDetail = entityDetailController.activeDetail
	const openEntityDrawer = entityDetailController.openDrawer
	const taskPreviewController = useTaskPreviewController()
	const taskViews = useViewStore(selectTaskViews)
	const taskRun = useViewStore(selectTaskViewRun)
	const loadTaskViews = useViewStore((state) => state.loadTaskViews)
	const runTaskView = useViewStore((state) => state.runTaskView)
	const refreshTaskRun = useViewStore((state) => state.refreshTaskRun)
	const createTaskView = useViewStore((state) => state.createTaskView)
	const updateTaskView = useViewStore((state) => state.updateTaskView)
	const deleteTaskView = useViewStore((state) => state.deleteTaskView)
	const toggleTaskViewVisible = useViewStore((state) => state.toggleTaskViewVisible)
	const reorderTaskViews = useViewStore((state) => state.reorderTaskViews)
	const loadSidebarProjects = useProjectStore((state) => state.loadSidebar)
	const projectOptions = useProjectStore(selectProjectOptions)
	const spaces = useSpaceStore(selectSpaces)
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

	const visibleViews = useMemo(
		() => taskViews.items.filter((view) => view.isVisible),
		[taskViews.items],
	)
	const activeView = useMemo(() => {
		if (!routeViewId) {
			return visibleViews[0] ?? null
		}

		return (
			taskViews.items.find(
				(view) => view.id === routeViewId || (view.key !== null && view.key === routeViewId),
			) ??
			visibleViews[0] ??
			null
		)
	}, [routeViewId, taskViews.items, visibleViews])
	const isTaskRunCurrent =
		!!activeView &&
		!!taskRun.input &&
		taskRun.input.viewId === activeView.id &&
		isScopeMatch(taskRun.input.scope, scope)
	const boardStatus =
		taskViews.status === 'idle' ||
		taskViews.status === 'loading' ||
		(activeView && (!isTaskRunCurrent || taskRun.status === 'idle' || taskRun.status === 'loading'))
			? 'loading'
			: activeView
				? taskRun.status
				: 'ready'
	const visibleTasks = useMemo(
		() => (isTaskRunCurrent ? (taskRun.item?.items ?? []) : []),
		[isTaskRunCurrent, taskRun.item?.items],
	)
	const breadcrumbItems = useMemo(
		() =>
			resolveBreadcrumb({
				route: shellRoute,
				viewName: activeView?.name ?? null,
			}),
		[activeView?.name, shellRoute],
	)

	useEffect(() => {
		void loadTaskViews()
		void loadSidebarProjects(scope)
	}, [loadSidebarProjects, loadTaskViews, scope])

	useEffect(() => {
		if (taskViews.status !== 'ready' || visibleViews.length === 0 || !activeView) {
			return
		}

		const nextViewValue = activeView.id
		if (routeViewId === nextViewValue) {
			return
		}

		void navigate(buildCanonicalViewPath(scope, nextViewValue, spaceId), { replace: true })
	}, [activeView, navigate, routeViewId, scope, spaceId, taskViews.status, visibleViews.length])

	useEffect(() => {
		if (!activeView) {
			return
		}

		void runTaskView({
			scope,
			viewId: activeView.id,
		})
	}, [activeView, runTaskView, scope])

	useTaskChangedListener(scope, () => {
		void refreshTaskRun()
	})

	const sections = useMemo(
		() => buildCustomSections(taskRun.item?.groups ?? [], visibleTasks),
		[taskRun.item?.groups, visibleTasks],
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
		void navigate(buildCanonicalViewPath(scope, view.id, spaceId))
	}

	async function handleCreateView(input: Parameters<typeof createTaskView>[0]) {
		setIsSavingView(true)
		try {
			const created = await createTaskView(input)
			void navigate(buildCanonicalViewPath(scope, created.id, spaceId))
		} finally {
			setIsSavingView(false)
		}
	}

	async function handleUpdateView(input: Parameters<typeof updateTaskView>[0]) {
		setIsSavingView(true)
		try {
			await updateTaskView(input)
		} finally {
			setIsSavingView(false)
		}
	}

	async function handleDeleteView(view: View) {
		await deleteTaskView(view.id)
		if (activeView?.id === view.id) {
			const fallbackView = visibleViews.find((item) => item.id !== view.id)
			if (fallbackView) {
				navigateToView(fallbackView)
			}
		}
	}

	async function handleToggleVisible(view: View, visible: boolean) {
		await toggleTaskViewVisible(view.id, visible)
		if (!visible && activeView?.id === view.id) {
			const fallbackView = visibleViews.find((item) => item.id !== view.id)
			if (fallbackView) {
				navigateToView(fallbackView)
			}
		}
	}

	async function handleReorder(orderedIds: string[]) {
		await reorderTaskViews({
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
						emptyActionLabel: '创建任务',
						emptyDescription: activeView?.description ?? '当前视图下没有符合条件的任务。',
						emptyTitle: activeView ? `${activeView.name} 暂无任务` : '暂无视图',
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
						onEmptyAction: () => openTaskCreateDialog({ status: 'todo' }),
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
						{isTaskRunCurrent && taskRun.item?.view.description
							? taskRun.item.view.description
							: isTaskRunCurrent && taskRun.item
								? `当前视图共 ${taskRun.item.items.length} 条任务`
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
					void refreshTaskRun()
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
						views={taskViews.items}
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
