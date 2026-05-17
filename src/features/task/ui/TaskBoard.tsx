import { useMemo, type ReactNode } from 'react'
import { groupBy, uniq } from 'es-toolkit/array'

import {
	selectProjectTaskBoardOpenSections,
	useShellPreferenceStore,
} from '@/app/layouts/shell/model/useShellPreferenceStore'
import {
	BoardCollapsibleSection,
	BoardEmptyState,
	BoardGroup,
	BoardGroupHeader,
	BoardRoot,
	BoardRows,
	BoardSectionContextMenu,
	BOARD_GROUP_HEADER_CLASS,
} from '@/shared/ui/board'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { useSectionSelection } from '@/features/bulk-action'
import {
	TASK_BOARD_STATUS_ORDER,
	orderTasksByTaskBoardVisualOrder,
} from '@/features/task/model/taskBoardOrder'
import { type TaskPriorityValue } from '@/features/task/model/taskPriority'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { TaskRowShortcutScope, type TaskRowShortcutState } from '@/features/task/shortcuts'
import { TaskRowAdapter, type TaskRowAdapterProps } from '@/features/task/ui/TaskRowAdapter'
import { TaskStatusIndicator } from '@/features/task/ui/TaskMetadataSelect'
import type { TaskListItem, TaskStatus } from '@/shared/types'
import { Button } from '@/shared/ui/base/button'
import { ListTodoIcon, PlusIcon } from 'lucide-react'
import { entityBoardSectionActionButtonClass } from '@/shared/ui/patterns/entity-board'

type TaskBoardProps = {
	tasks: TaskListItem[]
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
	onUpdateTaskPriority: (task: TaskListItem, priority: TaskPriorityValue) => Promise<void>
	onUpdateTaskStatus: (task: TaskListItem, status: TaskStatus) => Promise<void>
	onToggleTaskStatus: (task: TaskListItem) => Promise<void>
	onArchiveTask?: (task: TaskListItem) => Promise<void>
	onDeleteTask?: (task: TaskListItem) => Promise<void>
	onOpenTask: (taskId: string) => void
	statusOrder?: readonly TaskStatus[]
	hideEmptySections?: boolean
	projectOptions?: Array<{ id: string; name: string }>
	onSelectProject?: (task: TaskListItem, projectId: string) => void
	onSelectNoProject?: (task: TaskListItem) => void
}

export function TaskBoard({
	tasks,
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
	onUpdateTaskPriority,
	onUpdateTaskStatus,
	onToggleTaskStatus,
	onArchiveTask,
	onDeleteTask,
	onOpenTask,
	statusOrder = TASK_BOARD_STATUS_ORDER,
	hideEmptySections = false,
	projectOptions,
	onSelectProject,
	onSelectNoProject,
}: TaskBoardProps) {
	const openSections = useShellPreferenceStore(selectProjectTaskBoardOpenSections)
	const setProjectTaskBoardOpenSections = useShellPreferenceStore(
		(state) => state.setProjectTaskBoardOpenSections,
	)

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
	const taskShortcutOrder = useMemo(
		() => orderTasksByTaskBoardVisualOrder(tasks, { statusOrder, customSections }),
		[customSections, statusOrder, tasks],
	)

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
		const actions: TaskRowAdapterProps['actions'] = {
			onOpenTask,
			onToggleTaskSelection,
			onUpdateTaskPriority,
			onUpdateTaskStatus,
			onToggleTaskStatus,
			onArchiveTask,
			onDeleteTask,
		}
		const projectBinding: TaskRowAdapterProps['projectBinding'] = {
			projectOptions,
			onSelectProject,
			onSelectNoProject,
		}
		return (
			<TaskRowAdapter
				key={task.id}
				actions={actions}
				projectBinding={projectBinding}
				rowState={{
					isActive: activeTaskId === task.id,
					isPending: pendingTaskId === task.id,
					isSelected: selectedTaskIdSet.has(task.id),
					isKeyboardFocused: focusedTaskId === task.id,
				}}
				rowShortcutHandlers={
					rowShortcutState
						? {
								onFocus: rowShortcutState.onRowFocus,
								onHover: rowShortcutState.onRowHover,
							}
						: undefined
				}
				task={task}
			/>
		)
	}

	if (tasks.length === 0 && emptyTitle) {
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
			onMoveTaskFocus={onMoveTaskFocus}
			onSetFocusedTask={onSetFocusedTask}
			onToggleTaskSelection={onToggleTaskSelection}
			selectedTaskIdSet={selectedTaskIdSet}
			tasks={taskShortcutOrder}
		>
			{(rowShortcutState) =>
				customSections && customSections.length > 0 ? (
					<BoardRoot className='gap-2'>
						{customSections.map((section) => (
							<TaskCustomSection
								createProjectId={createProjectId}
								key={section.key}
								label={section.label}
								renderTaskRow={(task) => renderTaskRow(task, rowShortcutState)}
								selectedTaskIdSet={selectedTaskIdSet}
								tasks={section.tasks}
							/>
						))}
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
