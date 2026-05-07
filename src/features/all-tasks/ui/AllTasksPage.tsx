import { useEffect, useMemo, useState } from 'react'

import { EntityScene } from '@/app/layouts/entity-scene'
import { MainCard } from '@/app/layouts/main-card/MainCardLayout'
import { useDrawerStore } from '@/app/layouts/shell/model/useDrawerStore'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import {
	selectProjectOptions,
	useProjectStore,
} from '@/features/project/model/useProjectStore'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { getTaskPlacement } from '@/features/task/model/taskPlacement'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { useTaskListController } from '@/features/task/model/useTaskListController'
import { TaskBulkActionBar } from '@/features/task/ui/TaskBulkActionBar'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { selectTaskList, useTaskStore } from '@/features/task/model/useTaskStore'
import { TASK_BULK_ACTION_BUTTON_CLASS } from '@/shared/ui/patterns/task-row'
import { Button } from '@/shared/ui/base/button'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import { breadcrumbLeadClass, breadcrumbLeadIconClass } from '@/shared/ui/patterns/breadcrumb'
import type { TaskStatus } from '@/shared/types'
import { CommandIcon, ListTodoIcon, PlusIcon } from 'lucide-react'

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
	const { selectedTaskIdSet, selectedCount, toggleTaskSelection, clearTaskSelection } =
		useTaskSelection(filteredTasks.map((task) => task.id))

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
					sectionVariant: 'project',
					statusOrder: ['doing', 'todo', 'waiting', 'done', 'canceled'],
				},
				boardData: {
					items: filteredTasks,
					activeItemId: activeDrawerKind === 'task' ? activeDrawerId : null,
					pendingItemId: pendingTaskId,
					selectedTaskIdSet,
				},
				boardActions: {
					onArchiveTask: archiveListTask,
					onDeleteTask: deleteListTask,
					onEmptyAction: () => openTaskCreateDialog({ status: 'todo' }),
					onOpenTask: (taskId) => openDrawer('task', taskId),
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
				<TaskBulkActionBar
					action={
						<Button className={TASK_BULK_ACTION_BUTTON_CLASS} size='sm' variant='outline'>
							<CommandIcon className='size-3.5' />
							批量操作
						</Button>
					}
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
						全部任务
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}
