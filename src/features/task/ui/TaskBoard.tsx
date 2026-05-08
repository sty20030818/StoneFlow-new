import { useMemo, type ReactNode } from 'react'
import { groupBy, uniq } from 'es-toolkit/array'

import {
	selectProjectTaskBoardOpenSections,
	useShellPreferenceStore,
} from '@/app/layouts/shell/model/useShellPreferenceStore'
import {
	BOARD_GROUP_HEADER_CLASS,
	BoardCollapsibleSection,
	BoardEmptyState,
	BoardGroup,
	BoardGroupHeader,
	BoardRoot,
	BoardRows,
} from '@/shared/ui/board'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { type TaskPriorityValue } from '@/features/task/model/taskPriority'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { TaskRowAdapter, type TaskRowAdapterProps } from '@/features/task/ui/TaskRowAdapter'
import { TaskStatusIndicator } from '@/features/task/ui/TaskMetadataSelect'
import type { TaskListItem, TaskStatus } from '@/shared/types'
import { Button } from '@/shared/ui/base/button'
import { ListTodoIcon, PlusIcon } from 'lucide-react'
import { entityBoardSectionActionButtonClass } from '@/shared/ui/patterns/entity-board'

const TASK_SECTIONS: TaskStatus[] = ['todo', 'doing', 'waiting', 'done', 'canceled']

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
	emptyTitle?: string
	emptyDescription?: string
	emptyActionLabel?: string
	onEmptyAction: () => void
	onToggleTaskSelection: (taskId: string) => void
	onUpdateTaskPriority: (task: TaskListItem, priority: TaskPriorityValue) => Promise<void>
	onUpdateTaskStatus: (task: TaskListItem, status: TaskStatus) => Promise<void>
	onToggleTaskStatus: (task: TaskListItem) => Promise<void>
	onArchiveTask?: (task: TaskListItem) => Promise<void>
	onDeleteTask?: (task: TaskListItem) => Promise<void>
	onOpenTask: (taskId: string) => void
	statusOrder?: TaskStatus[]
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
	emptyTitle,
	emptyDescription,
	emptyActionLabel,
	onEmptyAction,
	onToggleTaskSelection,
	onUpdateTaskPriority,
	onUpdateTaskStatus,
	onToggleTaskStatus,
	onArchiveTask,
	onDeleteTask,
	onOpenTask,
	statusOrder = TASK_SECTIONS,
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

	function handleSectionOpenChange(status: TaskStatus, open: boolean) {
		const nextSections = open ? uniq([...openSections, status]) : openSections.filter((section) => section !== status)
		setProjectTaskBoardOpenSections(nextSections)
	}

	function renderTaskRow(task: TaskListItem) {
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
				}}
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

	return customSections && customSections.length > 0 ? (
		<BoardRoot className='gap-2'>
			{customSections.map((section) => (
				<TaskCustomSection
					createProjectId={createProjectId}
					key={section.key}
					label={section.label}
					renderTaskRow={renderTaskRow}
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
						onOpenChange={(open) => handleSectionOpenChange(status, open)}
						open={openSections.includes(status)}
						renderTaskRow={renderTaskRow}
						selectedTaskIdSet={selectedTaskIdSet}
						status={status}
						tasks={groupedTasks[status]}
					/>
				))}
		</BoardRoot>
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
			<BoardRows
				selectedIdSet={selectedTaskIdSet}
				getItemId={(_child, i) => tasks[i]?.id}
			>
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
	renderTaskRow,
	selectedTaskIdSet,
}: {
	status: TaskStatus
	label: string
	tasks: TaskListItem[]
	open: boolean
	createProjectId: string | null
	onOpenChange: (open: boolean) => void
	renderTaskRow: (task: TaskListItem) => ReactNode
	selectedTaskIdSet: Set<string>
}) {
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)

	return (
		<BoardCollapsibleSection
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
