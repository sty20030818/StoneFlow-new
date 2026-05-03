import { useEffect, useMemo, useState } from 'react'

import {
	MainCardGhostAction,
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
import { useDrawerStore } from '@/app/layouts/shell/model/useDrawerStore'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { getTaskPlacement } from '@/features/task/model/taskPlacement'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { useTaskListController } from '@/features/task/model/useTaskListController'
import { TaskBulkActionBar } from '@/features/task/ui/TaskBulkActionBar'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { selectTaskList, useTaskStore } from '@/features/task/model/useTaskStore'
import { TaskBoard } from '@/features/task/ui/TaskBoard'
import { Button } from '@/shared/ui/base/button'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from '@/shared/ui/base/breadcrumb'
import type { TaskStatus } from '@/shared/types'
import { CommandIcon, ListTodoIcon, PlusIcon } from 'lucide-react'

type TaskFilter = 'all' | 'noProject' | TaskStatus

const TASK_FILTERS: TaskFilter[] = ['all', 'noProject', 'doing', 'todo', 'waiting', 'done', 'canceled']

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
	} = useTaskListController()
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
	const { selectedTaskIdSet, selectedCount, toggleTaskSelection, clearTaskSelection } = useTaskSelection(
		filteredTasks.map((task) => task.id),
	)

	useEffect(() => {
		void loadList({
			scope,
			viewKey: 'all',
			placement: { kind: 'all' },
		})
	}, [loadList, scope])

	return (
		<MainCardLayout
			header={
				<MainCardHeader
					breadcrumb={<AllTasksBreadcrumb />}
					action={
						<MainCardGhostAction
							aria-label='创建任务'
							onClick={() => openTaskCreateDialog({ status: 'todo' })}
						>
							<PlusIcon />
						</MainCardGhostAction>
					}
				/>
			}
			toolbar={
				<MainCardToolbar
					onRefresh={() => {
						void loadList({
							scope,
							viewKey: 'all',
							placement: { kind: 'all' },
						})
					}}
					pills={TASK_FILTERS.map((filter) => ({
						label:
							filter === 'all'
								? '所有任务'
								: filter === 'noProject'
									? 'No Project'
									: formatTaskStatusLabel(filter),
						active: taskFilter === filter,
						onClick: () => setTaskFilter(filter),
					}))}
				/>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col gap-3'>
				<TaskBoard
					activeTaskId={activeDrawerKind === 'task' ? activeDrawerId : null}
					emptyActionLabel='创建任务'
					emptyDescription='当前筛选下没有任务，尝试切换筛选或创建新任务。'
					emptyTitle='暂无任务'
					hideEmptySections
					onArchiveTask={archiveListTask}
					onDeleteTask={deleteListTask}
					onEmptyAction={() => openTaskCreateDialog({ status: 'todo' })}
					onOpenTask={(taskId) => openDrawer('task', taskId)}
					onToggleTaskSelection={toggleTaskSelection}
					onToggleTaskStatus={toggleTaskStatus}
					onUpdateTaskPriority={updateTaskPriority}
					onUpdateTaskStatus={updateTaskStatus}
					pendingTaskId={pendingTaskId}
					rowVariant='project'
					selectedTaskIdSet={selectedTaskIdSet}
					sectionVariant='project'
					showProjectName
					statusOrder={['doing', 'todo', 'waiting', 'done', 'canceled']}
					tasks={filteredTasks}
				/>
				<TaskBulkActionBar
					action={
						<Button
							className='border-(--sf-color-border) bg-white text-(--sf-color-sidebar-action-foreground) hover:border-(--sf-color-border-strong) hover:bg-(--sf-color-bg-surface-muted) hover:text-(--sf-color-sidebar-action-foreground)'
							size='sm'
							variant='outline'
						>
							<CommandIcon className='size-3.5' />
							批量操作
						</Button>
					}
					onClear={clearTaskSelection}
					selectedCount={selectedCount}
				/>
			</div>
		</MainCardLayout>
	)
}

function AllTasksBreadcrumb() {
	return (
		<Breadcrumb>
			<BreadcrumbList className='text-sm font-semibold leading-5'>
				<BreadcrumbItem>
					<BreadcrumbPage className='inline-flex items-center gap-1.5'>
						<ListTodoIcon aria-hidden className='size-4 shrink-0 text-(--sf-color-text-tertiary)' />
						All Tasks
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}
