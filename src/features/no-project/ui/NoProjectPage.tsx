import { useEffect, useMemo, useState } from 'react'

import {
	MainCardGhostAction,
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { useDrawerStore } from '@/app/layouts/shell/model/useDrawerStore'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { useTaskListController } from '@/features/task/model/useTaskListController'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { selectTaskList, useTaskStore } from '@/features/task/model/useTaskStore'
import { TaskBulkActionBar } from '@/features/task/ui/TaskBulkActionBar'
import { TaskBoard } from '@/features/task/ui/TaskBoard'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { Button } from '@/shared/ui/base/button'
import { CommandIcon, Layers3Icon, PlusIcon } from 'lucide-react'
import type { TaskStatus } from '@/shared/types'

type NoProjectFilter = 'all' | TaskStatus

const NO_PROJECT_FILTERS: NoProjectFilter[] = ['all', 'doing', 'todo', 'waiting', 'done', 'canceled']

export function NoProjectPage() {
	const { scope } = useScopeRoute()
	const taskList = useTaskStore(selectTaskList)
	const loadList = useTaskStore((state) => state.loadList)
	const openDrawer = useDrawerStore((state) => state.openDrawer)
	const activeDrawerId = useDrawerStore((state) => state.activeDrawerId)
	const activeDrawerKind = useDrawerStore((state) => state.activeDrawerKind)
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const {
		pendingTaskId,
		updateTaskPriority,
		updateTaskStatus,
		toggleTaskStatus,
		archiveListTask,
		deleteListTask,
	} = useTaskListController()
	const [taskFilter, setTaskFilter] = useState<NoProjectFilter>('all')
	const filteredTasks = useMemo(
		() =>
			taskFilter === 'all'
				? taskList.items.filter((task) => task.archivedAt === null)
				: taskList.items.filter((task) => task.archivedAt === null && task.status === taskFilter),
		[taskFilter, taskList.items],
	)
	const { selectedTaskIdSet, selectedCount, toggleTaskSelection, clearTaskSelection } = useTaskSelection(
		filteredTasks.map((task) => task.id),
	)

	useEffect(() => {
		void loadList({
			scope,
			viewKey: 'all',
			placement: { kind: 'noProject' },
		})
	}, [loadList, scope])

	return (
		<MainCardLayout
			header={
				<MainCardHeader
					action={
						<MainCardGhostAction aria-label='创建任务' onClick={() => openTaskCreateDialog()}>
							<PlusIcon />
						</MainCardGhostAction>
					}
					title='No Project'
				/>
			}
			toolbar={
				<MainCardToolbar
					onRefresh={() => {
						void loadList({
							scope,
							viewKey: 'all',
							placement: { kind: 'noProject' },
						})
					}}
					pills={NO_PROJECT_FILTERS.map((filter) => ({
						label: filter === 'all' ? '全部' : formatTaskStatusLabel(filter),
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
					emptyDescription='这里展示已经离开 Inbox、但仍不属于任何 Project 的任务。'
					emptyTitle='当前没有 No Project 任务'
					hideEmptySections
					onArchiveTask={archiveListTask}
					onDeleteTask={deleteListTask}
					onEmptyAction={() => openTaskCreateDialog()}
					onOpenTask={(taskId) => openDrawer('task', taskId)}
					onToggleTaskSelection={toggleTaskSelection}
					onToggleTaskStatus={toggleTaskStatus}
					onUpdateTaskPriority={updateTaskPriority}
					onUpdateTaskStatus={updateTaskStatus}
					pendingTaskId={pendingTaskId}
					rowVariant='stacked'
					selectedTaskIdSet={selectedTaskIdSet}
					sectionVariant='compact'
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
				<div className='mt-auto flex items-center gap-2 px-1 text-[12px] text-(--sf-color-text-tertiary)'>
					<Layers3Icon className='size-3.5' />
					这些任务已经离开 Inbox，但还没有归属到任何 Project。
				</div>
			</div>
		</MainCardLayout>
	)
}
