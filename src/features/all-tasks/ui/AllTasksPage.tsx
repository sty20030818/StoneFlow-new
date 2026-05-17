import { useEffect, useMemo, useState } from 'react'

import { EntityScene } from '@/app/layouts/entity-scene'
import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import { useDrawerStore } from '@/app/layouts/shell/model/useDrawerStore'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { selectProjectOptions, useProjectStore } from '@/features/project/model/useProjectStore'
import { buildTaskCommandSelection, useRegisterCommandSelection } from '@/features/selection/model'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { getTaskBoardVisualOrderIds } from '@/features/task/model/taskBoardOrder'
import { getTaskPlacement } from '@/features/task/model/taskPlacement'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { useTaskSelectionEscape } from '@/features/task/shortcuts'
import { useTaskListController } from '@/features/task/model/useTaskListController'
import { BulkActionBar } from '@/shared/ui/bulk-action-bar'
import { BulkCommandMenuAction } from '@/features/command/ui'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { selectTaskList, useTaskStore } from '@/features/task/model/useTaskStore'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import { breadcrumbLeadClass, breadcrumbLeadIconClass } from '@/shared/ui/patterns/breadcrumb'
import type { TaskStatus } from '@/shared/types'
import { ListTodoIcon, PlusIcon } from 'lucide-react'

type TaskFilter = 'all' | 'noProject' | TaskStatus

const TASK_FILTERS: TaskFilter[] = [
	'all',
	'noProject',
	'doing',
	'todo',
	'waiting',
	'done',
	'canceled',
]
export function AllTasksPage() {
	const { scope } = useScopeRoute()
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const activeDrawerId = useDrawerStore((state) => state.activeDrawerId)
	const activeDrawerKind = useDrawerStore((state) => state.activeDrawerKind)
	const openDrawer = useDrawerStore((state) => state.openDrawer)
	const taskList = useTaskStore(selectTaskList)
	const loadList = useTaskStore((state) => state.loadList)
	const {
		pendingTaskId,
		updateTaskStatus,
		updateTaskPriority,
		toggleTaskStatus,
		archiveListTask,
		deleteListTask,
		leaveListTaskToProject,
		leaveListTaskAsNoProject,
	} = useTaskListController()
	const projectOptions = useProjectStore(selectProjectOptions)
	const [taskFilter, setTaskFilter] = useState<TaskFilter>('all')

	const visibleTasks = useMemo(
		() => taskList.items.filter((task) => task.archivedAt === null),
		[taskList.items],
	)
	const filteredTasks = useMemo(
		() =>
			taskFilter === 'all'
				? visibleTasks
				: taskFilter === 'noProject'
					? visibleTasks.filter((task) => getTaskPlacement(task) === 'noProject')
					: visibleTasks.filter((task) => task.status === taskFilter),
		[taskFilter, visibleTasks],
	)
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
	} = useTaskSelection(taskSelectionOrderIds)
	const commandSelection = useMemo(
		() =>
			buildTaskCommandSelection({
				selectedIds: selectionSnapshot.ids,
				tasks: filteredTasks,
				fallbackSubtitle: (task) => (task.inboxAt ? 'Inbox' : '独立事项'),
				clearSelection: clearTaskSelection,
			}),
		[clearTaskSelection, filteredTasks, selectionSnapshot.ids],
	)
	useRegisterCommandSelection(commandSelection)
	useTaskSelectionEscape({
		hasSelection: selectedCount > 0,
		clearSelection: clearTaskSelection,
	})

	useEffect(() => {
		void loadList({
			scope,
			viewKey: 'all',
			placement: { kind: 'all' },
		})
	}, [loadList, scope])

	return (
		<EntityScene
			board={{
				boardKind: 'task',
				boardConfig: {
					variant: 'all-tasks',
					emptyActionLabel: '创建任务',
					emptyDescription: '当前筛选下没有任务，尝试切换筛选或创建新任务。',
					emptyTitle: '暂无任务',
					hideEmptySections: true,
				},
				boardData: {
					items: filteredTasks,
					activeItemId: activeDrawerKind === 'task' ? activeDrawerId : null,
					pendingItemId: pendingTaskId,
					selectedTaskIdSet,
					focusedTaskId,
				},
				boardActions: {
					onArchiveTask: archiveListTask,
					onClearTaskSelection: clearTaskSelection,
					onDeleteTask: deleteListTask,
					onEmptyAction: () => openTaskCreateDialog({ status: 'todo' }),
					onOpenTask: (taskId) => openDrawer('task', taskId),
					onSetFocusedTask: setFocusedTaskId,
					onMoveTaskFocus: moveFocus,
					onSelectNoProject: (task) => void leaveListTaskAsNoProject(task),
					onSelectProject: (task, projectId) => void leaveListTaskToProject(task, projectId),
					onToggleTaskSelection: toggleTaskSelection,
					onToggleTaskStatus: toggleTaskStatus,
					onUpdateTaskPriority: updateTaskPriority,
					onUpdateTaskStatus: updateTaskStatus,
					projectOptions,
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
				void loadList({
					scope,
					viewKey: 'all',
					placement: { kind: 'all' },
				})
			}}
			sceneVariant='all-tasks'
			toolbarPills={TASK_FILTERS.map((filter) => ({
				label:
					filter === 'all'
						? '所有任务'
						: filter === 'noProject'
							? '独立事项'
							: formatTaskStatusLabel(filter),
				active: taskFilter === filter,
				onClick: () => setTaskFilter(filter),
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
