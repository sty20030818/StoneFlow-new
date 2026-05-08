import { formatShortDate } from '@/shared/lib/date'
import { TASK_PRIORITY_OPTIONS, type TaskPriorityValue } from '@/features/task/model/taskPriority'
import { TASK_STATUS_OPTIONS } from '@/features/task/model/taskStatus'
import { PriorityIcon } from '@/features/task/ui/PriorityIcon'
import { TaskContextMenu } from '@/features/task/ui/TaskContextMenu'
import { TaskStatusIndicator } from '@/features/task/ui/TaskMetadataSelect'
import type { TaskListItem, TaskStatus } from '@/shared/types'
import {
	CreatedAtCell,
	DueDateCell,
	PriorityCell,
	ProjectCell,
	ReminderCell,
	RowSelectionCell,
	RowShell,
	RowTitleCell,
	ScheduledDateCell,
	StatusCell,
	TagsCell,
} from '@/shared/ui/row'

type TaskRowAdapterProps = {
	task: TaskListItem
	rowState: {
		isActive: boolean
		isSelected: boolean
		isPending: boolean
	}
	projectBinding?: {
		projectOptions?: Array<{ id: string; name: string }>
		onSelectProject?: (task: TaskListItem, projectId: string) => void
		onSelectNoProject?: (task: TaskListItem) => void
	}
	actions: {
		onOpenTask: (taskId: string) => void
		onToggleTaskSelection: (taskId: string) => void
		onUpdateTaskPriority: (task: TaskListItem, priority: TaskPriorityValue) => Promise<void>
		onUpdateTaskStatus: (task: TaskListItem, status: TaskStatus) => Promise<void>
		onToggleTaskStatus: (task: TaskListItem) => Promise<void>
		onArchiveTask?: (task: TaskListItem) => Promise<void>
		onDeleteTask?: (task: TaskListItem) => Promise<void>
	}
}

/**
 * TaskRowAdapter 负责把任务实体语义翻译为统一 RowShell + 功能型 field cells。
 */
export function TaskRowAdapter({ task, rowState, projectBinding, actions }: TaskRowAdapterProps) {
	const { isActive, isSelected, isPending } = rowState
	const isDoneLike = task.status === 'done' || task.status === 'canceled'
	const hasProjectOptions = Boolean(
		projectBinding?.projectOptions &&
			projectBinding.onSelectProject &&
			projectBinding.onSelectNoProject,
	)

	return (
		<TaskContextMenu
			isBusy={isPending}
			onArchive={actions.onArchiveTask ? () => void actions.onArchiveTask!(task) : undefined}
			onMoveToTrash={actions.onDeleteTask ? () => void actions.onDeleteTask!(task) : undefined}
			onOpenDetails={() => actions.onOpenTask(task.id)}
			onToggleStatus={() => void actions.onToggleTaskStatus(task)}
			status={task.status}
		>
			<RowShell.Root
				aria-label={`打开任务 ${task.title}`}
				data-shell-task-card='true'
				data-task-id={task.id}
				interactive
				active={isActive}
				pending={isPending}
				selected={isSelected}
				onClick={() => actions.onOpenTask(task.id)}
				onKeyDown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault()
						actions.onOpenTask(task.id)
					}
				}}
			>
				<RowShell.Left>
					<RowShell.Leading>
						<RowSelectionCell
							ariaLabel={`选择任务 ${task.title}`}
							checked={isSelected}
							disabled={isPending}
							onCheckedChange={() => actions.onToggleTaskSelection(task.id)}
						/>
						<PriorityCell
							ariaLabel={`设置任务 ${task.title} 的优先级`}
							disabled={isPending}
							onChange={(priority) => void actions.onUpdateTaskPriority(task, priority)}
							options={TASK_PRIORITY_OPTIONS.map((option) => ({
								value: option.value,
								label: option.label,
								icon: <PriorityIcon priority={option.value} size='md' />,
							}))}
							value={task.priority}
						/>
						<StatusCell
							ariaLabel={`设置任务 ${task.title} 的状态`}
							disabled={isPending}
							onChange={(status) => void actions.onUpdateTaskStatus(task, status)}
							options={TASK_STATUS_OPTIONS.map((option) => ({
								value: option.value,
								label: option.label,
								icon: <TaskStatusIndicator status={option.value} />,
							}))}
							value={task.status}
						/>
					</RowShell.Leading>

					<RowShell.Title>
						<RowTitleCell doneLike={isDoneLike} title={task.title} />
					</RowShell.Title>
				</RowShell.Left>

				<RowShell.Right>
					<RowShell.Fields>
						<TagsCell />
						<DueDateCell formatter={formatShortDate} value={task.dueAt} />
						<ScheduledDateCell formatter={formatShortDate} value={task.scheduledAt} />
						<ReminderCell formatter={formatShortDate} value={task.reminderAt} />
						<ProjectCell
							disabled={isPending}
							onSelectNone={
								hasProjectOptions
									? () => projectBinding?.onSelectNoProject?.(task)
									: undefined
							}
							onSelectProject={
								hasProjectOptions
									? (projectId) => projectBinding?.onSelectProject?.(task, projectId)
									: undefined
							}
							options={hasProjectOptions ? projectBinding?.projectOptions : undefined}
							projectName={task.projectName}
						/>
						<CreatedAtCell value={task.createdAt} />
					</RowShell.Fields>
				</RowShell.Right>
			</RowShell.Root>
		</TaskContextMenu>
	)
}

export type { TaskRowAdapterProps }
