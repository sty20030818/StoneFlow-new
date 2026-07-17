import { useMemo, type ReactNode } from 'react'
import { groupBy, uniq } from 'es-toolkit/array'

import {
	selectProjectTaskBoardOpenSections,
	useShellPreferenceStore,
} from '@/features/shell-dialogs'
import {
	BoardCollapsibleSection,
	BoardEmptyState,
	BoardLoadingState,
	BoardGroup,
	BoardGroupHeader,
	BoardRoot,
	BoardRows,
	BoardSectionContextMenu,
	BOARD_GROUP_HEADER_CLASS,
} from '@/shared/components/board'
import { useDialogStore } from '@/features/shell-dialogs'
import { useSectionSelection } from '@/features/bulk-action'
import type { TaskDisplayPropertyKey } from '@/features/display-options'
import {
	TASK_BOARD_STATUS_ORDER,
	orderTasksByTaskBoardVisualOrder,
} from '@/features/task/model/taskBoardOrder'
import { type TaskPriorityValue } from '@/features/task/model/taskPriority'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { TaskRowShortcutScope, type TaskRowShortcutState } from '@/features/task/shortcuts'
import { TaskRowAdapter, type TaskRowAdapterProps } from '@/features/task/components/TaskRowAdapter'
import { TaskStatusIndicator } from '@/features/task/model/indicators/TaskStatusIndicator'
import { useTaskContextMenuBulkActions } from '@/features/task/components/useTaskContextMenuBulkActions'
import type { TaskPlacementTarget } from '@/features/metadata-fields'
import type { TaskListItem, TaskStatus } from '@/shared/types'
import { Button } from '@/shared/components/base/button'
import { ListTodoIcon, PlusIcon } from 'lucide-react'
import { entityBoardSectionActionButtonClass } from '@/shared/components/patterns/entity-board'

type TaskBoardProps = {
	tasks: TaskListItem[]
	status?: 'idle' | 'loading' | 'ready' | 'error'
	customSections?: Array<{
		key: string
		label: string
		tasks: TaskListItem[]
	}>
	createProjectId?: string | null
	pendingTaskId: string | null
	activeTaskId: string | null
	selectedTaskIdSet: Set<string>
	focusedTaskId?: string | null
	emptyTitle?: string
	emptyDescription?: string
	emptyActionLabel?: string
	onEmptyAction: () => void
	onToggleTaskSelection: (taskId: string) => void
	onSetFocusedTask?: (taskId: string | null) => void
	onMoveTaskFocus?: (
		delta: number,
		options?: {
			preserveAnchor?: boolean
			selectRange?: boolean
			startFromId?: string | null
			resetAnchorToStart?: boolean
		},
	) => string | null
	onClearTaskSelection?: () => void
	onSelectAllTasks?: (taskIds: string[]) => void
	onUpdateTaskPriority: (task: TaskListItem, priority: TaskPriorityValue) => Promise<void>
	onUpdateTaskStatus: (task: TaskListItem, status: TaskStatus) => Promise<void>
	onUpdateTaskDueDate?: (task: TaskListItem, dueAt: string | null) => Promise<void>
	onUpdateTaskScheduledAt?: (task: TaskListItem, scheduledAt: string | null) => Promise<void>
	onUpdateTaskReminderAt?: (task: TaskListItem, reminderAt: string | null) => Promise<void>
	onToggleTaskStatus: (task: TaskListItem) => Promise<void>
	onArchiveTask?: (task: TaskListItem) => Promise<void>
	onDeleteTask?: (task: TaskListItem) => Promise<void>
	onOpenTask: (taskId: string) => void
	onPeekTask?: (taskId: string, source: 'keyboard' | 'pointer') => void
	statusOrder?: readonly TaskStatus[]
	hideEmptySections?: boolean
	projectOptions?: Array<{ id: string; name: string; spaceId: string }>
	spaces?: Array<{ id: string; name: string }>
	onSelectPlacement?: (task: TaskListItem, target: TaskPlacementTarget) => void
	showProjectCellOptions?: boolean
	visibleProperties?: TaskDisplayPropertyKey[]
}

export function TaskBoard({
	tasks,
	status = 'ready',
	customSections,
	createProjectId = null,
	pendingTaskId,
	activeTaskId,
	selectedTaskIdSet,
	focusedTaskId = null,
	emptyTitle,
	emptyDescription,
	emptyActionLabel,
	onEmptyAction,
	onToggleTaskSelection,
	onSetFocusedTask,
	onMoveTaskFocus,
	onClearTaskSelection,
	onSelectAllTasks,
	onUpdateTaskPriority,
	onUpdateTaskStatus,
	onUpdateTaskDueDate,
	onUpdateTaskScheduledAt,
	onUpdateTaskReminderAt,
	onToggleTaskStatus,
	onArchiveTask,
	onDeleteTask,
	onOpenTask,
	onPeekTask,
	statusOrder = TASK_BOARD_STATUS_ORDER,
	hideEmptySections = false,
	projectOptions,
	spaces,
	onSelectPlacement,
	showProjectCellOptions = true,
	visibleProperties,
}: TaskBoardProps) {
	const openSections = useShellPreferenceStore(selectProjectTaskBoardOpenSections)
	const setProjectTaskBoardOpenSections = useShellPreferenceStore(
		(state) => state.setProjectTaskBoardOpenSections,
	)
	const contextMenuActions = useTaskContextMenuBulkActions({ onClearTaskSelection })

	const groupedTasks = useMemo(() => {
		const tasksByStatus = groupBy(tasks, (task) => task.status)

		return {
			todo: tasksByStatus.todo ?? [],
			doing: tasksByStatus.doing ?? [],
			waiting: tasksByStatus.waiting ?? [],
			done: tasksByStatus.done ?? [],
			canceled: tasksByStatus.canceled ?? [],
		} satisfies Record<TaskStatus, TaskListItem[]>
	}, [tasks])
	const taskShortcutOrder = useMemo(() => {
		if (customSections && customSections.length > 0) {
			return orderTasksByTaskBoardVisualOrder(tasks, { statusOrder, customSections })
		}

		const visibleStatuses = new Set(openSections)
		return orderTasksByTaskBoardVisualOrder(
			tasks.filter((task) => visibleStatuses.has(task.status)),
			{ statusOrder },
		)
	}, [customSections, openSections, statusOrder, tasks])

	function handleSectionOpenChange(status: TaskStatus, open: boolean) {
		const nextSections = open
			? uniq([...openSections, status])
			: openSections.filter((section) => section !== status)
		setProjectTaskBoardOpenSections(nextSections)
	}

	function handleCollapseAll() {
		setProjectTaskBoardOpenSections([])
	}

	function handleExpandAll() {
		const allVisible = statusOrder.filter((status) => groupedTasks[status].length > 0)
		setProjectTaskBoardOpenSections(allVisible)
	}

	function renderTaskRow(task: TaskListItem, rowShortcutState?: TaskRowShortcutState) {
		const contextTasks = selectedTaskIdSet.has(task.id)
			? tasks.filter((item) => selectedTaskIdSet.has(item.id))
			: [task]
		const actions: TaskRowAdapterProps['actions'] = {
			onOpenTask,
			onToggleTaskSelection,
			onUpdateTaskPriority,
			onUpdateTaskStatus,
			onUpdateTaskDueDate,
			onUpdateTaskScheduledAt,
			onUpdateTaskReminderAt,
			onToggleTaskStatus,
			onArchiveTask,
			onDeleteTask,
		}
		const projectBinding: TaskRowAdapterProps['projectBinding'] = {
			projectOptions,
			spaces,
			onSelectPlacement,
			showProjectCellOptions,
		}
		return (
			<TaskRowAdapter
				key={task.id}
				actions={actions}
				contextTasks={contextTasks}
				contextMenuActions={contextMenuActions}
				projectBinding={projectBinding}
				rowState={{
					isActive: activeTaskId === task.id,
					isPending: pendingTaskId === task.id,
					isSelected: selectedTaskIdSet.has(task.id),
					isHovered: rowShortcutState?.hoveredId === task.id,
					hoverSource:
						rowShortcutState?.hoveredId === task.id ? rowShortcutState.hoverSource : null,
				}}
				rowShortcutHandlers={
					rowShortcutState
						? {
								onHover: rowShortcutState.onRowHover,
								onPointerMove: rowShortcutState.onRowPointerMove,
							}
						: undefined
				}
				task={task}
				visibleProperties={visibleProperties}
			/>
		)
	}

	if (status === 'idle' || status === 'loading') {
		return <BoardLoadingState />
	}

	if (status === 'ready' && tasks.length === 0 && emptyTitle) {
		return (
			<BoardEmptyState
				actionLabel={emptyActionLabel}
				description={emptyDescription}
				icon={<ListTodoIcon />}
				onAction={onEmptyAction}
				title={emptyTitle}
			/>
		)
	}

	return (
		<TaskRowShortcutScope
			activeTaskId={activeTaskId}
			focusedTaskId={focusedTaskId}
			onClearTaskSelection={onClearTaskSelection}
			onOpenTask={onOpenTask}
			onPeekTask={onPeekTask}
			onMoveTaskFocus={onMoveTaskFocus}
			onSelectAllTasks={onSelectAllTasks}
			onSetFocusedTask={onSetFocusedTask}
			onToggleTaskSelection={onToggleTaskSelection}
			selectedTaskIdSet={selectedTaskIdSet}
			tasks={taskShortcutOrder}
		>
			{(rowShortcutState) =>
				customSections && customSections.length > 0 ? (
					<BoardRoot className='gap-2'>
						{customSections.length === 1 && customSections[0]?.key === 'all' ? (
							<BoardRows
								getItemId={(_child, index) => customSections[0]?.tasks[index]?.id}
								selectedIdSet={selectedTaskIdSet}
							>
								{customSections[0].tasks.map((task) => renderTaskRow(task, rowShortcutState))}
							</BoardRows>
						) : (
							customSections.map((section) => (
								<TaskCustomSection
									createProjectId={createProjectId}
									key={section.key}
									label={section.label}
									renderTaskRow={(task) => renderTaskRow(task, rowShortcutState)}
									selectedTaskIdSet={selectedTaskIdSet}
									tasks={section.tasks}
								/>
							))
						)}
					</BoardRoot>
				) : (
					<BoardRoot>
						{statusOrder
							.filter((status) => !hideEmptySections || groupedTasks[status].length > 0)
							.map((status) => (
								<TaskStatusSection
									createProjectId={createProjectId}
									key={status}
									label={formatTaskStatusLabel(status)}
									onCollapseAll={handleCollapseAll}
									onExpandAll={handleExpandAll}
									onOpenChange={(open) => handleSectionOpenChange(status, open)}
									onToggleTaskSelection={onToggleTaskSelection}
									open={openSections.includes(status)}
									renderTaskRow={(task) => renderTaskRow(task, rowShortcutState)}
									selectedTaskIdSet={selectedTaskIdSet}
									status={status}
									tasks={groupedTasks[status]}
								/>
							))}
					</BoardRoot>
				)
			}
		</TaskRowShortcutScope>
	)
}

function TaskCustomSection({
	label,
	tasks,
	createProjectId,
	renderTaskRow,
	selectedTaskIdSet,
}: {
	label: string
	tasks: TaskListItem[]
	createProjectId: string | null
	renderTaskRow: (task: TaskListItem) => ReactNode
	selectedTaskIdSet: Set<string>
}) {
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)

	return (
		<BoardGroup>
			<BoardGroupHeader
				className={BOARD_GROUP_HEADER_CLASS}
				count={tasks.length}
				title={label}
				trailing={
					<Button
						aria-label={`在 ${label} 中创建任务`}
						className={entityBoardSectionActionButtonClass}
						onClick={(event) => {
							event.preventDefault()
							event.stopPropagation()
							openTaskCreateDialog({
								projectId: createProjectId,
							})
						}}
						size='icon-xs'
						type='button'
						variant='ghost'
					>
						<PlusIcon />
					</Button>
				}
			/>
			<BoardRows selectedIdSet={selectedTaskIdSet} getItemId={(_child, i) => tasks[i]?.id}>
				{tasks.map((task) => renderTaskRow(task))}
			</BoardRows>
		</BoardGroup>
	)
}

function TaskStatusSection({
	status,
	label,
	tasks,
	open,
	createProjectId,
	onOpenChange,
	onCollapseAll,
	onExpandAll,
	onToggleTaskSelection,
	renderTaskRow,
	selectedTaskIdSet,
}: {
	status: TaskStatus
	label: string
	tasks: TaskListItem[]
	open: boolean
	createProjectId: string | null
	onOpenChange: (open: boolean) => void
	onCollapseAll: () => void
	onExpandAll: () => void
	onToggleTaskSelection: (taskId: string) => void
	renderTaskRow: (task: TaskListItem) => ReactNode
	selectedTaskIdSet: Set<string>
}) {
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)

	const sectionIds = useMemo(() => tasks.map((t) => t.id), [tasks])
	const { selectedCount, handleSelectAll, handleDeselectAll } = useSectionSelection({
		sectionIds,
		selectedIdSet: selectedTaskIdSet,
		onToggleSelection: onToggleTaskSelection,
	})

	return (
		<BoardCollapsibleSection
			contextMenuContent={
				<BoardSectionContextMenu
					onCollapse={() => onOpenChange(false)}
					onCollapseAll={onCollapseAll}
					onDeselectAll={handleDeselectAll}
					onExpand={() => onOpenChange(true)}
					onExpandAll={onExpandAll}
					onSelectAll={handleSelectAll}
					open={open}
					selectedCount={selectedCount}
				/>
			}
			count={tasks.length}
			getItemId={(_child, i) => tasks[i]?.id}
			icon={<TaskStatusIndicator status={status} />}
			label={label}
			onOpenChange={onOpenChange}
			open={open}
			selectedCount={selectedCount}
			selectedIdSet={selectedTaskIdSet}
			trailing={
				<Button
					aria-label={`在 ${label} 中创建任务`}
					className={entityBoardSectionActionButtonClass}
					onClick={(event) => {
						event.preventDefault()
						event.stopPropagation()
						openTaskCreateDialog({
							projectId: createProjectId,
							status,
						})
					}}
					size='icon-xs'
					type='button'
					variant='ghost'
				>
					<PlusIcon />
				</Button>
			}
		>
			{tasks.map((task) => renderTaskRow(task))}
		</BoardCollapsibleSection>
	)
}
