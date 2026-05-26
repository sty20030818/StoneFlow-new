import { useEffect, useMemo } from 'react'

import { EntityScene } from '@/app/layouts/entity-scene'
import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import { useShellRoute } from '@/app/routing'
import { useEntityDetailController } from '@/features/entity-detail'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import {
	useRegisterPageFilterController,
	useTaskPageFilterController,
} from '@/features/filter/model'
import { selectProjectOptions, useProjectStore } from '@/features/project/model/useProjectStore'
import { buildTaskCommandSelection, useRegisterCommandSelection } from '@/features/selection/model'
import { getTaskBoardVisualOrderIds } from '@/features/task/model/taskBoardOrder'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { useTaskListController } from '@/features/task/model/useTaskListController'
import { BulkActionBar, BulkCommandMenuAction } from '@/features/bulk-action'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import {
	isTaskListInputMatch,
	selectTaskList,
	useTaskStore,
} from '@/features/task/model/useTaskStore'
import { useRegisterTaskPreviewSource, useTaskPreviewController } from '@/features/task/detail'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import { breadcrumbLeadClass, breadcrumbLeadIconClass } from '@/shared/ui/patterns/breadcrumb'
import type { TaskStatus } from '@/shared/types'
import { ListTodoIcon, PlusIcon } from 'lucide-react'

const ALL_SCOPE = { type: 'all' } as const

const TASK_FILTERS: Array<'all' | 'noProject' | TaskStatus> = [
	'all',
	'noProject',
	'doing',
	'todo',
	'waiting',
	'done',
	'canceled',
]
export function AllTasksPage() {
	const shellRoute = useShellRoute()
	const scope = shellRoute.scope ?? ALL_SCOPE
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const entityDetailController = useEntityDetailController()
	const activeDetail = entityDetailController.activeDetail
	const openEntityDrawer = entityDetailController.openDrawer
	const taskPreviewController = useTaskPreviewController()
	const taskList = useTaskStore(selectTaskList)
	const loadList = useTaskStore((state) => state.loadList)
	const listInput = useMemo(
		() => ({
			scope,
			viewKey: 'all' as const,
			placement: { kind: 'all' as const },
		}),
		[scope],
	)
	const taskBoardStatus = isTaskListInputMatch(taskList.input, listInput)
		? taskList.status
		: 'loading'
	const taskSourceItems = taskBoardStatus === 'loading' ? [] : taskList.items
	const {
		pendingTaskId,
		updateTaskStatus,
		updateTaskPriority,
		updateTaskDueDate,
		updateTaskScheduledAt,
		updateTaskReminderAt,
		toggleTaskStatus,
		archiveListTask,
		deleteListTask,
		leaveListTaskToProject,
		leaveListTaskAsNoProject,
	} = useTaskListController()
	const projectOptions = useProjectStore(selectProjectOptions)
	const spaces = useSpaceStore(selectSpaces)
	const { controller, filteredTasks } = useTaskPageFilterController({
		tasks: taskSourceItems,
		projects: projectOptions,
		capabilities: {
			supportsPriority: true,
			supportsStatus: true,
			supportsDate: true,
			supportsProject: true,
			supportsToggleCompleted: true,
			supportsClearAll: true,
		},
	})
	useRegisterPageFilterController(controller)
	const taskSelectionOrderIds = useMemo(
		() => getTaskBoardVisualOrderIds(filteredTasks),
		[filteredTasks],
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
				tasks: filteredTasks,
				fallbackSubtitle: (task) => (task.inboxAt ? 'Inbox' : '独立事项'),
				focusedTaskId,
				clearSelection: clearTaskSelection,
			}),
		[clearTaskSelection, filteredTasks, focusedTaskId, selectionSnapshot.ids],
	)
	useRegisterCommandSelection(commandSelection)
	useRegisterTaskPreviewSource({
		tasks: filteredTasks,
		focusedTaskId,
		activeTaskId: activeDetail?.kind === 'task' ? activeDetail.id : null,
	})

	useEffect(() => {
		void loadList(listInput)
	}, [loadList, listInput])

	return (
		<EntityScene
			board={{
				boardKind: 'task',
				boardConfig: {
					variant: 'tasks',
					emptyActionLabel: '创建任务',
					emptyDescription: '当前筛选下没有任务，尝试切换筛选或创建新任务。',
					emptyTitle: '暂无任务',
					hideEmptySections: true,
				},
				boardData: {
					items: filteredTasks,
					status: taskBoardStatus,
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
					onSelectNoProject: (task) => void leaveListTaskAsNoProject(task),
					onSelectProject: (task, projectId) => void leaveListTaskToProject(task, projectId),
					onToggleTaskSelection: toggleTaskSelection,
					onToggleTaskStatus: toggleTaskStatus,
					onUpdateTaskDueDate: updateTaskDueDate,
					onUpdateTaskScheduledAt: updateTaskScheduledAt,
					onUpdateTaskReminderAt: updateTaskReminderAt,
					onUpdateTaskPriority: updateTaskPriority,
					onUpdateTaskStatus: updateTaskStatus,
					projectOptions,
					spaces,
				},
			}}
			breadcrumb={<AllTasksBreadcrumb />}
			bulkBar={
				<BulkActionBar
					action={<BulkCommandMenuAction />}
					onClear={clearTaskSelection}
					selectedCount={selectedCount}
				/>
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
				void loadList(listInput)
			}}
			sceneVariant='tasks'
			toolbarPills={TASK_FILTERS.map((filter) => ({
				label:
					filter === 'all'
						? '所有任务'
						: filter === 'noProject'
							? '独立事项'
							: formatTaskStatusLabel(filter),
				active:
					filter === 'all'
						? controller.state.statusValues.length === 0 && !controller.state.projectlessOnly
						: filter === 'noProject'
							? controller.state.projectlessOnly
							: controller.state.statusValues.length === 1 &&
								controller.state.statusValues[0] === filter &&
								!controller.state.projectlessOnly,
				onClick: () => {
					if (filter === 'all') {
						controller.actions.applyFilter({ kind: 'status', values: [] })
						controller.actions.applyFilter({ kind: 'projectlessOnly', enabled: false })
						return
					}

					if (filter === 'noProject') {
						controller.actions.applyFilter({ kind: 'status', values: [] })
						controller.actions.applyFilter({ kind: 'projectlessOnly', enabled: true })
						return
					}

					controller.actions.applyFilter({ kind: 'projectlessOnly', enabled: false })
					controller.actions.applyFilter({ kind: 'status', values: [filter] })
				},
			}))}
		/>
	)
}

function AllTasksBreadcrumb() {
	return (
		<Breadcrumb>
			<BreadcrumbList className='text-sm font-semibold leading-5'>
				<BreadcrumbItem>
					<BreadcrumbPage className={breadcrumbLeadClass}>
						<ListTodoIcon aria-hidden className={breadcrumbLeadIconClass} />
						所有任务
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}
