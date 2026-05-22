import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { TaskContextMenu } from '@/features/task/ui/TaskContextMenu'
import type { TaskContextMenuBulkActions } from '@/features/task/ui/useTaskContextMenuBulkActions'
import {
	createTaskPlacementMetadataOptions,
	createTaskPriorityMetadataDropdownProps,
	createTaskStatusMetadataDropdownProps,
	MetadataDateDropdown,
	MetadataFieldDropdown,
	MetadataPlacementDropdown,
	taskDateMetadataIcons,
} from '@/features/metadata-fields'
import type { TaskListItem, TaskStatus } from '@/shared/types'
import {
	CreatedAtCell,
	RowSelectionCell,
	RowShell,
	RowTitleCell,
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
		onUpdateTaskScheduledAt?: (task: TaskListItem, scheduledAt: string | null) => Promise<void>
		onUpdateTaskReminderAt?: (task: TaskListItem, reminderAt: string | null) => Promise<void>
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
	const priorityDropdownProps = createTaskPriorityMetadataDropdownProps()
	const statusDropdownProps = createTaskStatusMetadataDropdownProps()
	const placementOptions = createTaskPlacementMetadataOptions({
		projects: projectBinding?.projectOptions ?? [],
	})
	const projectValue = task.projectId
		? ({ kind: 'project', projectId: task.projectId } as const)
		: ({ kind: 'noProject' } as const)

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
						<MetadataFieldDropdown
							ariaLabel={`设置任务 ${task.title} 的优先级`}
							buttonAppearance='row-icon'
							compact
							disabled={isPending}
							fieldKey='priority'
							headerShortcut={priorityDropdownProps.headerShortcut}
							label='优先级'
							menuLabel={priorityDropdownProps.menuLabel}
							options={priorityDropdownProps.options}
							stopPropagation
							value={task.priority}
							onChange={(priority) => void actions.onUpdateTaskPriority(task, priority)}
						/>
						<MetadataFieldDropdown
							ariaLabel={`设置任务 ${task.title} 的状态`}
							buttonAppearance='row-icon'
							compact
							disabled={isPending}
							fieldKey='status'
							headerShortcut={statusDropdownProps.headerShortcut}
							label='状态'
							menuLabel={statusDropdownProps.menuLabel}
							options={statusDropdownProps.options}
							stopPropagation
							value={task.status}
							onChange={(status) => void actions.onUpdateTaskStatus(task, status)}
						/>
					</RowShell.Leading>

					<RowShell.Title>
						<RowTitleCell doneLike={isDoneLike} title={task.title} />
					</RowShell.Title>
				</RowShell.Left>

				<RowShell.Right>
					<RowShell.Fields>
						<TagsCell />
						<MetadataDateDropdown
							ariaLabel={`截止 ${task.title}`}
							compact
							hideWhenEmpty
							icon={taskDateMetadataIcons.due}
							label='截止时间'
							stopPropagation
							value={task.dueAt}
							onChange={(value) => void actions.onUpdateTaskDueDate?.(task, value)}
						/>
						<MetadataDateDropdown
							ariaLabel={`计划 ${task.title}`}
							compact
							hideWhenEmpty
							icon={taskDateMetadataIcons.scheduled}
							label='计划时间'
							stopPropagation
							value={task.scheduledAt}
							onChange={(value) => void actions.onUpdateTaskScheduledAt?.(task, value)}
						/>
						<MetadataDateDropdown
							ariaLabel={`提醒 ${task.title}`}
							compact
							hideWhenEmpty
							icon={taskDateMetadataIcons.reminder}
							label='提醒时间'
							stopPropagation
							value={task.reminderAt}
							onChange={(value) => void actions.onUpdateTaskReminderAt?.(task, value)}
						/>
						{showProjectCellOptions ? (
							<MetadataPlacementDropdown
								compact
								disabled={isPending}
								label='项目'
								options={placementOptions}
								shortcutMode='clear-only'
								stopPropagation
								value={projectValue}
								onChange={(value) => {
									if (value.kind === 'project') {
										projectBinding?.onSelectProject?.(task, value.projectId)
										return
									}
									projectBinding?.onSelectNoProject?.(task)
								}}
							/>
						) : null}
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
