import { useMemo } from 'react'

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
import { TASK_PRIORITY_OPTIONS, type TaskPriorityValue } from '@/features/task/model/taskPriority'
import { formatTaskStatusLabel, TASK_STATUS_OPTIONS } from '@/features/task/model/taskStatus'
import { TaskContextMenu } from '@/features/task/ui/TaskContextMenu'
import { TASK_ROW_BULK_SELECTED_CLASS } from '@/features/task/ui/taskRowBulkSelected'
import { TaskStatusIndicator } from '@/features/task/ui/TaskMetadataSelect'
import { TaskRowProvider, useTaskRowContext } from '@/features/task/ui/TaskRowContext'
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
import {
	CreatedAtCell,
	DueDateCell,
	PriorityCell,
	ProjectCell,
	ReminderCell,
	RowSelectionCell,
	RowShell,
	ScheduledDateCell,
	StatusCell,
	TagsCell,
	RowTitleCell,
} from '@/shared/ui/row'
import { PriorityIcon } from './PriorityIcon'

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

	const contextValue = useMemo(
		() => ({
			activeTaskId,
			pendingTaskId,
			selectedTaskIdSet,
			projectOptions,
			onToggleTaskSelection,
			onUpdateTaskPriority,
			onUpdateTaskStatus,
			onToggleTaskStatus,
			onArchiveTask,
			onDeleteTask,
			onOpenTask,
			onSelectProject,
			onSelectNoProject,
		}),
		[
			activeTaskId,
			pendingTaskId,
			selectedTaskIdSet,
			projectOptions,
			onToggleTaskSelection,
			onUpdateTaskPriority,
			onUpdateTaskStatus,
			onToggleTaskStatus,
			onArchiveTask,
			onDeleteTask,
			onOpenTask,
			onSelectProject,
			onSelectNoProject,
		],
	)

	const groupedTasks = useMemo(() => {
		return {
			todo: tasks.filter((task) => task.status === 'todo'),
			doing: tasks.filter((task) => task.status === 'doing'),
			waiting: tasks.filter((task) => task.status === 'waiting'),
			done: tasks.filter((task) => task.status === 'done'),
			canceled: tasks.filter((task) => task.status === 'canceled'),
		} satisfies Record<TaskStatus, TaskListItem[]>
	}, [tasks])

	function handleSectionOpenChange(status: TaskStatus, open: boolean) {
		const nextSections = open
			? Array.from(new Set([...openSections, status]))
			: openSections.filter((section) => section !== status)
		setProjectTaskBoardOpenSections(nextSections)
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

	return (
		<TaskRowProvider value={contextValue}>
			{customSections && customSections.length > 0 ? (
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
								status={status}
								tasks={groupedTasks[status]}
							/>
						))}
				</div>
			)}
		</TaskRowProvider>
	)
}

function TaskCustomSection({
	label,
	tasks,
	createProjectId,
}: {
	label: string
	tasks: TaskListItem[]
	createProjectId: string | null
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
				{tasks.map((task) => (
					<TaskBoardRow key={task.id} task={task} />
				))}
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
}: {
	status: TaskStatus
	label: string
	tasks: TaskListItem[]
	open: boolean
	createProjectId: string | null
	onOpenChange: (open: boolean) => void
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
					{tasks.map((task) => (
						<TaskBoardRow key={task.id} task={task} />
					))}
				</BoardRows>
			</CollapsibleContent>
		</Collapsible>
	)
}

function TaskBoardRow({ task }: { task: TaskListItem }) {
	const ctx = useTaskRowContext()
	const isPending = ctx.pendingTaskId === task.id
	const isActive = ctx.activeTaskId === task.id
	const isSelected = ctx.selectedTaskIdSet.has(task.id)
	const isDoneLike = task.status === 'done' || task.status === 'canceled'
	const hasProjectOptions = Boolean(
		ctx.projectOptions && ctx.onSelectProject && ctx.onSelectNoProject,
	)

	return (
		<TaskContextMenu
			isBusy={isPending}
			onArchive={ctx.onArchiveTask ? () => void ctx.onArchiveTask!(task) : undefined}
			onMoveToTrash={ctx.onDeleteTask ? () => void ctx.onDeleteTask!(task) : undefined}
			onOpenDetails={() => ctx.onOpenTask(task.id)}
			onToggleStatus={() => void ctx.onToggleTaskStatus(task)}
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
				onClick={() => ctx.onOpenTask(task.id)}
				onKeyDown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault()
						ctx.onOpenTask(task.id)
					}
				}}
				selectedClassName={TASK_ROW_BULK_SELECTED_CLASS}
			>
				<RowShell.Left>
					<RowShell.Leading>
						<RowSelectionCell
							ariaLabel={`选择任务 ${task.title}`}
							checked={isSelected}
							disabled={isPending}
							onCheckedChange={() => ctx.onToggleTaskSelection(task.id)}
						/>
						<PriorityCell
							ariaLabel={`设置任务 ${task.title} 的优先级`}
							disabled={isPending}
							onChange={(priority) => void ctx.onUpdateTaskPriority(task, priority)}
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
							onChange={(status) => void ctx.onUpdateTaskStatus(task, status)}
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
					<TaskFieldRail
						createdAt={task.createdAt}
						dueAt={task.dueAt}
						hasProjectOptions={hasProjectOptions}
						isPending={isPending}
						reminderAt={task.reminderAt}
						onSelectNoProject={
							hasProjectOptions ? () => ctx.onSelectNoProject!(task) : undefined
						}
						onSelectProject={
							hasProjectOptions
								? (projectId) => ctx.onSelectProject!(task, projectId)
								: undefined
						}
						projectName={task.projectName}
						projects={ctx.projectOptions}
						scheduledAt={task.scheduledAt}
					/>
				</RowShell.Right>
			</RowShell.Root>
		</TaskContextMenu>
	)
}

function TaskFieldRail({
	dueAt,
	createdAt,
	projectName,
	projects,
	hasProjectOptions,
	isPending,
	reminderAt,
	scheduledAt,
	onSelectProject,
	onSelectNoProject,
}: {
	dueAt: string | null
	createdAt: string
	projectName: string | null | undefined
	projects?: Array<{ id: string; name: string }>
	hasProjectOptions: boolean
	isPending: boolean
	reminderAt: string | null
	scheduledAt: string | null
	onSelectProject?: (projectId: string) => void
	onSelectNoProject?: () => void
}) {
	return (
		<RowShell.Fields>
			<TagsCell />
			<DueDateCell formatter={formatTaskDate} value={dueAt} />
			<ScheduledDateCell formatter={formatTaskDate} value={scheduledAt} />
			<ReminderCell formatter={formatTaskDate} value={reminderAt} />
			<ProjectCell
				disabled={isPending}
				onSelectNone={hasProjectOptions ? onSelectNoProject : undefined}
				onSelectProject={hasProjectOptions ? onSelectProject : undefined}
				options={hasProjectOptions ? projects : undefined}
				projectName={projectName}
			/>
			<CreatedAtCell value={createdAt} />
		</RowShell.Fields>
	)
}

function formatTaskDate(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}
	return new Intl.DateTimeFormat('zh-CN', {
		month: 'numeric',
		day: 'numeric',
	}).format(date)
}
