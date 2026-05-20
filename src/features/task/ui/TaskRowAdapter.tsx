import { formatShortDate } from '@/shared/lib/date'
import { TASK_PRIORITY_OPTIONS, type TaskPriorityValue } from '@/features/task/model/taskPriority'
import { TASK_STATUS_OPTIONS } from '@/features/task/model/taskStatus'
import { PriorityIcon } from '@/features/task/ui/PriorityIcon'
import { TaskContextMenu } from '@/features/task/ui/TaskContextMenu'
import type { TaskContextMenuBulkActions } from '@/features/task/ui/useTaskContextMenuBulkActions'
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
	type RowSelectionGroupPosition,
} from '@/shared/ui/row'

type TaskRowAdapterProps = {
	task: TaskListItem
	contextTasks?: TaskListItem[]
	rowState: {
		isActive: boolean
		isSelected: boolean
		isPending: boolean
		isHovered?: boolean
		hoverSource?: 'pointer' | 'keyboard' | null
	}
	rowShortcutHandlers?: {
		onHover: (taskId: string | null) => void
		onPointerMove: (taskId: string, point: { x: number; y: number }) => void
	}
	selectionGroupPosition?: RowSelectionGroupPosition
	contextMenuActions?: TaskContextMenuBulkActions
	projectBinding?: {
		projectOptions?: Array<{ id: string; name: string }>
		onSelectProject?: (task: TaskListItem, projectId: string) => void
		onSelectNoProject?: (task: TaskListItem) => void
		showProjectCellOptions?: boolean
	}
	actions: {
		onOpenTask: (taskId: string) => void
		onToggleTaskSelection: (taskId: string) => void
		onUpdateTaskPriority: (task: TaskListItem, priority: TaskPriorityValue) => Promise<void>
		onUpdateTaskStatus: (task: TaskListItem, status: TaskStatus) => Promise<void>
		onUpdateTaskDueDate?: (task: TaskListItem, dueAt: string | null) => Promise<void>
		onToggleTaskStatus: (task: TaskListItem) => Promise<void>
		onArchiveTask?: (task: TaskListItem) => Promise<void>
		onDeleteTask?: (task: TaskListItem) => Promise<void>
	}
}

/**
 * TaskRowAdapter 负责把任务实体语义翻译为统一 RowShell + 功能型 field cells。
 */
export function TaskRowAdapter({
	task,
	contextTasks,
	rowState,
	rowShortcutHandlers,
	selectionGroupPosition,
	contextMenuActions,
	projectBinding,
	actions,
}: TaskRowAdapterProps) {
	const { isActive, isSelected, isPending, isHovered = false, hoverSource = null } = rowState
	const actionTargets = contextTasks && contextTasks.length > 0 ? contextTasks : [task]
	const isDoneLike = task.status === 'done' || task.status === 'canceled'
	const hasProjectOptions = Boolean(
		projectBinding?.projectOptions &&
		projectBinding.onSelectProject &&
		projectBinding.onSelectNoProject,
	)
	const showProjectCellOptions = hasProjectOptions && projectBinding?.showProjectCellOptions !== false
	const usesBulkDangerActions = actionTargets.length > 1 && Boolean(contextMenuActions)

	return (
		<TaskContextMenu
			archiveRequiresConfirm={!usesBulkDangerActions}
			dangerEntityLabel={task.title}
			isBusy={isPending}
			moveToTrashRequiresConfirm={!usesBulkDangerActions}
			onArchive={
				actions.onArchiveTask
					? () =>
							runContextMenuTaskAction(
								actionTargets,
								contextMenuActions
									? (targets) => contextMenuActions.onArchive(targets)
									: undefined,
								(target) => actions.onArchiveTask!(target),
							)
					: undefined
			}
			onMoveToTrash={
				actions.onDeleteTask
					? () =>
							runContextMenuTaskAction(
								actionTargets,
								contextMenuActions
									? (targets) => contextMenuActions.onMoveToTrash(targets)
									: undefined,
								(target) => actions.onDeleteTask!(target),
							)
					: undefined
			}
			onSelectDueDate={
				actions.onUpdateTaskDueDate
					? (dueAt) =>
							runContextMenuTaskAction(
								actionTargets,
								contextMenuActions
									? (targets) => contextMenuActions.onSelectDueDate(targets, dueAt)
									: undefined,
								(target) => actions.onUpdateTaskDueDate!(target, dueAt),
							)
					: undefined
			}
			onSelectNoProject={
				hasProjectOptions
					? () =>
							runContextMenuTaskAction(
								actionTargets,
								contextMenuActions
									? (targets) => contextMenuActions.onSelectNoProject(targets)
									: undefined,
								(target) => projectBinding!.onSelectNoProject!(target),
							)
					: undefined
			}
			onSelectPriority={(priority) =>
				runContextMenuTaskAction(
					actionTargets,
					contextMenuActions
						? (targets) => contextMenuActions.onSelectPriority(targets, priority)
						: undefined,
					(target) => actions.onUpdateTaskPriority(target, priority),
				)
			}
			onSelectProject={
				hasProjectOptions
					? (projectId) =>
							runContextMenuTaskAction(
								actionTargets,
								contextMenuActions
									? (targets) => contextMenuActions.onSelectProject(targets, projectId)
									: undefined,
								(target) => projectBinding!.onSelectProject!(target, projectId),
							)
					: undefined
			}
			onSelectStatus={(status) =>
				runContextMenuTaskAction(
					actionTargets,
					contextMenuActions
						? (targets) => contextMenuActions.onSelectStatus(targets, status)
						: undefined,
					(target) => actions.onUpdateTaskStatus(target, status),
				)
			}
			priority={task.priority}
			projectId={task.projectId}
			projectName={task.projectName}
			projectOptions={hasProjectOptions ? projectBinding?.projectOptions : undefined}
			selectionValues={buildTaskContextSelectionValues(actionTargets)}
			status={task.status}
			dueAt={task.dueAt}
		>
			<RowShell.Root
				aria-label={`打开任务 ${task.title}`}
				data-shell-task-card='true'
				data-task-id={task.id}
				interactive
				active={isActive}
				pending={isPending}
				hovered={isHovered}
				hoverSource={hoverSource}
				selected={isSelected}
				selectionGroupPosition={selectionGroupPosition}
				onClick={() => actions.onOpenTask(task.id)}
				onMouseEnter={() => rowShortcutHandlers?.onHover(task.id)}
				onMouseLeave={() => rowShortcutHandlers?.onHover(null)}
				onMouseMove={(event) =>
					rowShortcutHandlers?.onPointerMove(task.id, { x: event.clientX, y: event.clientY })
				}
				onPointerMove={(event) =>
					rowShortcutHandlers?.onPointerMove(task.id, { x: event.clientX, y: event.clientY })
				}
			>
				<RowShell.Left>
					<RowShell.Leading>
						<RowSelectionCell
							ariaLabel={`选择任务 ${task.title}`}
							checked={isSelected}
							disabled={isPending}
							visible={isSelected || isHovered}
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
							triggerDataAttribute='priority'
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
							triggerDataAttribute='status'
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
								showProjectCellOptions ? () => projectBinding?.onSelectNoProject?.(task) : undefined
							}
							onSelectProject={
								showProjectCellOptions
									? (projectId) => projectBinding?.onSelectProject?.(task, projectId)
									: undefined
							}
							options={showProjectCellOptions ? projectBinding?.projectOptions : undefined}
							projectName={task.projectName}
						/>
						<CreatedAtCell value={task.createdAt} />
					</RowShell.Fields>
				</RowShell.Right>
			</RowShell.Root>
		</TaskContextMenu>
	)
}

function runContextMenuTaskAction(
	targets: TaskListItem[],
	bulkRunner: ((targets: TaskListItem[]) => void) | undefined,
	singleRunner: (target: TaskListItem) => Promise<void> | void,
) {
	if (targets.length > 1 && bulkRunner) {
		bulkRunner(targets)
		return
	}

	void runForTargets(targets, singleRunner)
}

async function runForTargets(
	targets: TaskListItem[],
	runner: (target: TaskListItem) => Promise<void> | void,
) {
	for (const target of targets) {
		await runner(target)
	}
}

function buildTaskContextSelectionValues(tasks: TaskListItem[]) {
	return {
		statuses: tasks.map((item) => item.status),
		priorities: tasks.map((item) => item.priority),
		dueDates: tasks.map((item) => item.dueAt?.slice(0, 10) ?? null),
		projectIds: tasks.map((item) => item.projectId ?? null),
		projectNames: tasks.map((item) => item.projectName ?? null),
	}
}

export type { TaskRowAdapterProps }
