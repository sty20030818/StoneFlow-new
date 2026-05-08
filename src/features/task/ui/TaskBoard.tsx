import { useMemo, type ReactNode } from 'react'
import { groupBy, uniq } from 'es-toolkit/array'

import {
	selectProjectTaskBoardOpenSections,
	useShellPreferenceStore,
} from '@/app/layouts/shell/model/useShellPreferenceStore'
import {
	BOARD_COLLAPSIBLE_CLASS,
	BOARD_GROUP_HEADER_CLASS,
	BOARD_STACK_CLASS,
	BoardChevron,
	BoardGroup,
	BoardGroupHeader,
	BoardRows,
} from '@/shared/ui/board'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { type TaskPriorityValue } from '@/features/task/model/taskPriority'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { TaskRowAdapter, type TaskRowAdapterProps } from '@/features/task/ui/TaskRowAdapter'
import { TaskStatusIndicator } from '@/features/task/ui/TaskMetadataSelect'
import { cn } from '@/shared/lib/utils'
import type { TaskListItem, TaskStatus } from '@/shared/types'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/base/collapsible'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/ui/base/empty'
import { ListTodoIcon, PlusIcon } from 'lucide-react'
import {
	entityBoardSectionActionButtonClass,
	entityBoardSectionHeadingClass,
	entityBoardSectionCountBadgeClass,
	entityBoardSectionToggleClass,
} from '@/shared/ui/patterns/entity-board'

type TaskBoardSectionVariant = 'compact' | 'project'

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
	sectionVariant?: TaskBoardSectionVariant
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
	sectionVariant = 'compact',
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
			<EmptyPage>
				<Empty className={sectionVariant === 'project' ? 'rounded-md bg-transparent' : undefined}>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<ListTodoIcon />
						</EmptyMedia>
						<EmptyTitle>{emptyTitle}</EmptyTitle>
						<EmptyDescription>{emptyDescription}</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button onClick={onEmptyAction} type='button'>
							{emptyActionLabel}
						</Button>
					</EmptyContent>
				</Empty>
			</EmptyPage>
		)
	}

	return customSections && customSections.length > 0 ? (
		<div
			className={cn(
				BOARD_STACK_CLASS,
				sectionVariant === 'project' ? 'gap-2' : 'gap-3',
			)}
		>
			{customSections.map((section) => (
				<TaskCustomSection
					createProjectId={createProjectId}
					key={section.key}
					label={section.label}
					renderTaskRow={renderTaskRow}
					tasks={section.tasks}
				/>
			))}
		</div>
	) : (
		<div
			className={cn(
				BOARD_STACK_CLASS,
				sectionVariant === 'project' ? 'gap-1' : 'gap-3',
			)}
		>
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
						status={status}
						tasks={groupedTasks[status]}
					/>
				))}
		</div>
	)
}

function TaskCustomSection({
	label,
	tasks,
	createProjectId,
	renderTaskRow,
}: {
	label: string
	tasks: TaskListItem[]
	createProjectId: string | null
	renderTaskRow: (task: TaskListItem) => ReactNode
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
			<BoardRows>
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
}: {
	status: TaskStatus
	label: string
	tasks: TaskListItem[]
	open: boolean
	createProjectId: string | null
	onOpenChange: (open: boolean) => void
	renderTaskRow: (task: TaskListItem) => ReactNode
}) {
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)

	return (
		<Collapsible
			className={BOARD_COLLAPSIBLE_CLASS}
			onOpenChange={onOpenChange}
			open={open}
		>
			<div className={BOARD_GROUP_HEADER_CLASS}>
				<CollapsibleTrigger
					aria-label={`切换 ${label} 分区折叠状态`}
					className={entityBoardSectionToggleClass}
				>
					<BoardChevron data-chevron />
				</CollapsibleTrigger>
				<div className={entityBoardSectionHeadingClass}>
					<TaskStatusIndicator status={status} />
					<span className='truncate'>{label}</span>
					<Badge className={entityBoardSectionCountBadgeClass} variant='secondary'>
						{tasks.length}
					</Badge>
				</div>
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
			</div>

			<CollapsibleContent className='overflow-hidden px-0'>
				<BoardRows>
					{tasks.map((task) => renderTaskRow(task))}
				</BoardRows>
			</CollapsibleContent>
		</Collapsible>
	)
}
