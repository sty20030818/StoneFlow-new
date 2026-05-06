import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { EntityScene } from '@/app/layouts/entity-scene'
import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import { buildScopedSectionPath } from '@/app/layouts/shell/config'
import { useDrawerStore } from '@/app/layouts/shell/model/useDrawerStore'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { selectProjectOptions, useProjectStore } from '@/features/project/model/useProjectStore'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { useTaskListController } from '@/features/task/model/useTaskListController'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { TaskBulkActionBar } from '@/features/task/ui/TaskBulkActionBar'
import {
	selectTaskViewRun,
	selectTaskViews,
	useViewStore,
} from '@/features/view/model/useViewStore'
import { ViewActionsMenu } from '@/features/view/ui/ViewActionsMenu'
import { ViewEditorDialog } from '@/features/view/ui/ViewEditorDialog'
import { useTaskChangedListener } from '@/shared/events'
import type { TaskListItem, View } from '@/shared/types'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import { Layers2Icon, PlusIcon } from 'lucide-react'

import { createPendingBulkAction } from '@/app/layouts/entity-scene/TaskBoardAdapter'

export function ViewsPage() {
	const { scope, spaceId } = useScopeRoute()
	const navigate = useNavigate()
	const location = useLocation()
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const openDrawer = useDrawerStore((state) => state.openDrawer)
	const activeDrawerId = useDrawerStore((state) => state.activeDrawerId)
	const activeDrawerKind = useDrawerStore((state) => state.activeDrawerKind)
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
	const {
		pendingTaskId,
		updateTaskPriority,
		updateTaskStatus,
		toggleTaskStatus,
		archiveListTask,
		deleteListTask,
	} = useTaskListController()

	const [editorOpen, setEditorOpen] = useState(false)
	const [editingView, setEditingView] = useState<View | null>(null)
	const [isSavingView, setIsSavingView] = useState(false)

	const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
	const rawViewValue = searchParams.get('view')
	const visibleViews = useMemo(
		() => taskViews.items.filter((view) => view.isVisible),
		[taskViews.items],
	)
	const activeView = useMemo(() => {
		if (!rawViewValue) {
			return visibleViews[0] ?? null
		}

		return (
			taskViews.items.find(
				(view) => view.id === rawViewValue || (view.key !== null && view.key === rawViewValue),
			) ??
			visibleViews[0] ??
			null
		)
	}, [rawViewValue, taskViews.items, visibleViews])
	const visibleTasks = useMemo(() => taskRun.item?.items ?? [], [taskRun.item?.items])

	useEffect(() => {
		void loadTaskViews()
		void loadSidebarProjects(scope)
	}, [loadSidebarProjects, loadTaskViews, scope])

	useEffect(() => {
		if (taskViews.status !== 'ready' || visibleViews.length === 0 || !activeView) {
			return
		}

		const nextViewValue = activeView.id
		if (rawViewValue === nextViewValue) {
			return
		}

		void navigate(
			{
				pathname: buildScopedSectionPath(scope, 'views', spaceId),
				search: `?view=${nextViewValue}`,
			},
			{ replace: true },
		)
	}, [activeView, navigate, rawViewValue, scope, spaceId, taskViews.status, visibleViews.length])

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
	const { selectedTaskIdSet, selectedCount, toggleTaskSelection, clearTaskSelection } =
		useTaskSelection(visibleTasks.map((task) => task.id))

	function navigateToView(view: View) {
		void navigate({
			pathname: buildScopedSectionPath(scope, 'views', spaceId),
			search: `?view=${view.id}`,
		})
	}

	async function handleCreateView(input: Parameters<typeof createTaskView>[0]) {
		setIsSavingView(true)
		try {
			const created = await createTaskView(input)
			void navigate({
				pathname: buildScopedSectionPath(scope, 'views', spaceId),
				search: `?view=${created.id}`,
			})
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
						rowVariant: 'project',
						sectionVariant: 'project',
						showProjectName: true,
						statusOrder: ['doing', 'todo', 'waiting', 'done', 'canceled'],
					},
					boardData: {
						items: visibleTasks,
						activeItemId: activeDrawerKind === 'task' ? activeDrawerId : null,
						pendingItemId: pendingTaskId,
						selectedTaskIdSet,
					},
					boardActions: {
						onArchiveTask: archiveListTask,
						onDeleteTask: deleteListTask,
						onEmptyAction: () => openTaskCreateDialog({ status: 'todo' }),
						onOpenTask: (taskId) => openDrawer('task', taskId),
						onToggleTaskSelection: toggleTaskSelection,
						onToggleTaskStatus: toggleTaskStatus,
						onUpdateTaskPriority: updateTaskPriority,
						onUpdateTaskStatus: updateTaskStatus,
					},
				}}
				breadcrumb={<ViewsBreadcrumb />}
				bulkActions={
					<TaskBulkActionBar
						action={createPendingBulkAction('批量能力后续接入')}
						onClear={clearTaskSelection}
						selectedCount={selectedCount}
					/>
				}
				footer={
					<div className='px-1 text-[12px] text-sf-text-tertiary'>
						{taskRun.item?.view.description ??
							(taskRun.item
								? `当前视图共 ${taskRun.item.items.length} 条任务`
								: '正在准备视图数据')}
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

function ViewsBreadcrumb() {
	return (
		<Breadcrumb>
			<BreadcrumbList className='text-sm font-semibold leading-5'>
				<BreadcrumbItem>
					<BreadcrumbPage className='inline-flex items-center gap-1.5'>
						<Layers2Icon aria-hidden className='size-4 shrink-0 text-sf-text-tertiary' />
						视图
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}
