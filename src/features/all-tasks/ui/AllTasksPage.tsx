import { useEffect, useState } from 'react'

import {
	MainCardGhostAction,
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
import { useDrawerStore } from '@/app/layouts/shell/model/useDrawerStore'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { selectTaskList, useTaskStore } from '@/features/task/model/useTaskStore'
import { TaskBoard } from '@/features/task/ui/TaskBoard'
import type { TaskListItem, TaskListViewKey } from '@/shared/types'
import { PlusIcon } from 'lucide-react'

const TASK_VIEW_PILLS: Array<{ key: TaskListViewKey; label: string }> = [
	{ key: 'active', label: 'Active' },
	{ key: 'completed', label: 'Completed' },
	{ key: 'canceled', label: 'Canceled' },
	{ key: 'archived', label: 'Archived' },
	{ key: 'all', label: 'All' },
]

export function AllTasksPage() {
	const { scope } = useScopeRoute()
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)
	const activeDrawerId = useDrawerStore((state) => state.activeDrawerId)
	const activeDrawerKind = useDrawerStore((state) => state.activeDrawerKind)
	const openDrawer = useDrawerStore((state) => state.openDrawer)
	const taskList = useTaskStore(selectTaskList)
	const loadList = useTaskStore((state) => state.loadList)
	const updateTask = useTaskStore((state) => state.updateTask)
	const archiveTask = useTaskStore((state) => state.archiveTask)
	const [viewKey, setViewKey] = useState<TaskListViewKey>('active')
	const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)
	const { selectedTaskIdSet, toggleTaskSelection } = useTaskSelection(
		taskList.items.map((task) => task.id),
	)

	useEffect(() => {
		void loadList({
			scope,
			viewKey,
		})
	}, [loadList, scope, viewKey])

	async function runTaskAction(taskId: string, runner: () => Promise<unknown>) {
		setPendingTaskId(taskId)
		try {
			await runner()
		} finally {
			setPendingTaskId(null)
		}
	}

	async function handleUpdateTaskStatus(task: TaskListItem, status: TaskListItem['status']) {
		await runTaskAction(task.id, () =>
			updateTask({
				taskId: task.id,
				status,
			}),
		)
	}

	async function handleUpdateTaskPriority(task: TaskListItem, priority: TaskListItem['priority']) {
		await runTaskAction(task.id, () =>
			updateTask({
				taskId: task.id,
				priority,
			}),
		)
	}

	async function handleToggleTaskStatus(task: TaskListItem) {
		await handleUpdateTaskStatus(
			task,
			task.status === 'done' || task.status === 'canceled' ? 'todo' : 'done',
		)
	}

	async function handleArchiveTask(task: TaskListItem) {
		await runTaskAction(task.id, () => archiveTask(task.id))
	}

	return (
		<MainCardLayout
			header={
				<MainCardHeader
					action={
						<MainCardGhostAction
							aria-label='创建任务'
							onClick={() => openTaskCreateDialog({ status: 'todo' })}
						>
							<PlusIcon />
						</MainCardGhostAction>
					}
					title='All Tasks'
				/>
			}
			toolbar={
				<MainCardToolbar
					onRefresh={() => {
						void loadList({
							scope,
							viewKey,
						})
					}}
					pills={TASK_VIEW_PILLS.map((pill) => ({
						label: pill.label,
						active: pill.key === viewKey,
						onClick: () => setViewKey(pill.key),
					}))}
				/>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col gap-3'>
				<TaskBoard
					activeTaskId={activeDrawerKind === 'task' ? activeDrawerId : null}
					emptyActionLabel='创建任务'
					emptyDescription='阶段 6 先把跨项目任务聚合、筛选和抽屉详情闭环接通。'
					emptyTitle='当前筛选下没有任务'
					onArchiveTask={handleArchiveTask}
					onEmptyAction={() => openTaskCreateDialog({ status: 'todo' })}
					onOpenTask={(taskId) => openDrawer('task', taskId)}
					onToggleTaskSelection={toggleTaskSelection}
					onToggleTaskStatus={handleToggleTaskStatus}
					onUpdateTaskPriority={handleUpdateTaskPriority}
					onUpdateTaskStatus={handleUpdateTaskStatus}
					pendingTaskId={pendingTaskId}
					selectedTaskIdSet={selectedTaskIdSet}
					showProjectName
					tasks={taskList.items}
				/>
			</div>
		</MainCardLayout>
	)
}
