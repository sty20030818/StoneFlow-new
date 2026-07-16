import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { TaskContextMenu } from '@/features/task/components/TaskContextMenu'
import type { TaskContextMenuBulkActions } from '@/features/task/components/useTaskContextMenuBulkActions'
import type { TaskDisplayPropertyKey } from '@/features/display-options'
import {
	createTaskPlacementGroupedDropdownProps,
	createTaskPriorityMetadataDropdownProps,
	createTaskStatusMetadataDropdownProps,
	MetadataDateDropdown,
	MetadataFieldDropdown,
	MetadataPlacementDropdown,
	resolveTaskPlacementTarget,
	taskDateMetadataIcons,
	type TaskPlacementTarget,
} from '@/features/metadata-fields'
import type { TaskListItem, TaskStatus } from '@/shared/types'
import {
	CreatedAtCell,
	RowSelectionCell,
	RowShell,
	RowTitleCell,
	type RowSelectionGroupPosition,
} from '@/shared/components/row'
import { formatShortDate } from '@/shared/lib/date'

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
		projectOptions?: Array<{ id: string; name: string; spaceId: string }>
		spaces?: Array<{ id: string; name: string }>
		onSelectPlacement?: (task: TaskListItem, target: TaskPlacementTarget) => void
		showProjectCellOptions?: boolean
	}
	visibleProperties?: readonly TaskDisplayPropertyKey[]
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
	visibleProperties,
	actions,
}: TaskRowAdapterProps) {
	const { isActive, isSelected, isPending, isHovered = false, hoverSource = null } = rowState
	const actionTargets = contextTasks && contextTasks.length > 0 ? contextTasks : [task]
	const isDoneLike = task.status === 'done' || task.status === 'canceled'
	const hasProjectOptions = Boolean(
		projectBinding?.projectOptions && projectBinding.onSelectPlacement,
	)
	const showProjectCellOptions =
		hasProjectOptions && projectBinding?.showProjectCellOptions !== false
	const usesBulkDangerActions = actionTargets.length > 1 && Boolean(contextMenuActions)
	const priorityDropdownProps = createTaskPriorityMetadataDropdownProps()
	const statusDropdownProps = createTaskStatusMetadataDropdownProps()
	const placementSpaces = projectBinding?.spaces?.some((space) => space.id === task.spaceId)
		? projectBinding.spaces
		: [{ id: task.spaceId, name: task.spaceName }, ...(projectBinding?.spaces ?? [])]
	const placementDropdownProps = createTaskPlacementGroupedDropdownProps({
		mode: 'local',
		currentSpaceId: task.spaceId,
		spaces: placementSpaces,
		projects: projectBinding?.projectOptions ?? [],
	})
	const projectValue = resolveTaskPlacementTarget({
		spaceId: task.spaceId,
		projectId: task.projectId,
		inboxAt: task.inboxAt,
	})
	const visiblePropertySet = new Set(
		visibleProperties ?? ['status', 'priority', 'project', 'dueAt', 'scheduledAt', 'createdAt'],
	)
	const showStatus = visiblePropertySet.has('status')
	const showPriority = visiblePropertySet.has('priority')
	const showProject = visiblePropertySet.has('project') && showProjectCellOptions
	const showDueAt = visiblePropertySet.has('dueAt')
	const showScheduledAt = visiblePropertySet.has('scheduledAt')
	const showUpdatedAt = visiblePropertySet.has('updatedAt')
	const showCreatedAt = visiblePropertySet.has('createdAt')

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
								contextMenuActions ? (targets) => contextMenuActions.onArchive(targets) : undefined,
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
			onSelectPlacement={
				hasProjectOptions
					? (target) =>
							runContextMenuTaskAction(
								actionTargets,
								contextMenuActions
									? (targets) => contextMenuActions.onSelectPlacement(targets, target)
									: undefined,
								(item) => projectBinding!.onSelectPlacement!(item, target),
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
			onSelectStatus={(status) =>
				runContextMenuTaskAction(
					actionTargets,
					contextMenuActions
						? (targets) => contextMenuActions.onSelectStatus(targets, status)
						: undefined,
					(target) => actions.onUpdateTaskStatus(target, status),
				)
			}
			placementGroups={showProjectCellOptions ? placementDropdownProps.groups : undefined}
			placementValue={projectValue}
			priority={task.priority}
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
						{showPriority ? (
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
						) : null}
						{showStatus ? (
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
						) : null}
					</RowShell.Leading>

					<RowShell.Title>
						<RowTitleCell doneLike={isDoneLike} title={task.title} />
					</RowShell.Title>
				</RowShell.Left>

				<RowShell.Right>
					<RowShell.Fields>
						{showDueAt ? (
							<MetadataDateDropdown
								ariaLabel={`截止 ${task.title}`}
								compact
								hideWhenEmpty
								icon={taskDateMetadataIcons.due}
								label='截止时间'
								menuAlign='end'
								stopPropagation
								value={task.dueAt}
								onChange={(value) => void actions.onUpdateTaskDueDate?.(task, value)}
							/>
						) : null}
						{showScheduledAt ? (
							<MetadataDateDropdown
								ariaLabel={`计划 ${task.title}`}
								compact
								hideWhenEmpty
								icon={taskDateMetadataIcons.scheduled}
								label='计划时间'
								menuAlign='end'
								stopPropagation
								value={task.scheduledAt}
								onChange={(value) => void actions.onUpdateTaskScheduledAt?.(task, value)}
							/>
						) : null}
						{showProject ? (
							<MetadataPlacementDropdown
								compact
								disabled={isPending}
								groups={placementDropdownProps.groups}
								headerShortcut={placementDropdownProps.headerShortcut}
								label='归属'
								menuAlign='end'
								menuLabel={placementDropdownProps.menuLabel}
								shortcutMode='clear-only'
								stopPropagation
								value={projectValue}
								onChange={(value: TaskPlacementTarget) =>
									projectBinding?.onSelectPlacement?.(task, value)
								}
							/>
						) : null}
						{showUpdatedAt ? <UpdatedAtCell value={task.updatedAt} /> : null}
						{showCreatedAt ? <CreatedAtCell value={task.createdAt} /> : null}
					</RowShell.Fields>
				</RowShell.Right>
			</RowShell.Root>
		</TaskContextMenu>
	)
}

function UpdatedAtCell({ value }: { value: string | null | undefined }) {
	if (!value) {
		return null
	}

	return (
		<span
			className='shrink-0 text-xs tabular-nums text-sf-text-tertiary'
			title={`更新于 ${formatShortDate(value)}`}
		>
			{formatShortDate(value)}
		</span>
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
		placements: tasks.map((item) =>
			resolveTaskPlacementTarget({
				spaceId: item.spaceId,
				projectId: item.projectId,
				inboxAt: item.inboxAt,
			}),
		),
		projectNames: tasks.map((item) => item.projectName ?? null),
	}
}

export type { TaskRowAdapterProps }
