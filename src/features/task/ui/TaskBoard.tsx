import { useMemo } from 'react'

import {
	selectProjectTaskBoardOpenSections,
	useShellPreferenceStore,
} from '@/app/layouts/shell/model/useShellPreferenceStore'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { TaskContextMenu } from '@/features/task/ui/TaskContextMenu'
import { TASK_ROW_BULK_SELECTED_CLASS } from '@/features/task/ui/taskRowBulkSelected'
import {
	TaskLeadRail,
	TaskPrioritySelect,
	TaskSelectionCheckbox,
	TaskStatusIndicator,
	TaskStatusSelect,
} from '@/features/task/ui/TaskMetadataSelect'
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
import { ChevronRightIcon, ListTodoIcon, PlusIcon } from 'lucide-react'

const TASK_ROW_BASE_CLASS =
	'group flex min-w-0 items-center gap-3 rounded-md border border-transparent bg-transparent px-3 py-3 text-left transition-colors'
const TASK_ROW_IDLE_CLASS = 'hover:bg-(--sf-color-project-task-row-hover)'
const TASK_ROW_ACTIVE_CLASS =
	'border-(--sf-color-border-subtle) bg-(--sf-color-project-task-row-selected)'
const TASK_ROW_DONE_CLASS = 'text-muted-foreground'
const TASK_SECTION_META_CLASS = 'text-xs font-medium text-(--sf-color-text-tertiary)'

const TASK_SECTIONS: TaskStatus[] = ['todo', 'doing', 'waiting', 'done', 'canceled']

type TaskBoardProps = {
	tasks: TaskListItem[]
	createProjectId?: string | null
	showProjectName?: boolean
	pendingTaskId: string | null
	activeTaskId: string | null
	selectedTaskIdSet: Set<string>
	emptyTitle: string
	emptyDescription: string
	emptyActionLabel: string
	onEmptyAction: () => void
	onToggleTaskSelection: (taskId: string) => void
	onUpdateTaskPriority: (task: TaskListItem, priority: TaskPriorityValue) => Promise<void>
	onUpdateTaskStatus: (task: TaskListItem, status: TaskStatus) => Promise<void>
	onToggleTaskStatus: (task: TaskListItem) => Promise<void>
	onArchiveTask: (task: TaskListItem) => Promise<void>
	onOpenTask: (taskId: string) => void
}

export function TaskBoard({
	tasks,
	createProjectId = null,
	showProjectName = false,
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
	onOpenTask,
}: TaskBoardProps) {
	const openSections = useShellPreferenceStore(selectProjectTaskBoardOpenSections)
	const setProjectTaskBoardOpenSections = useShellPreferenceStore(
		(state) => state.setProjectTaskBoardOpenSections,
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

	if (tasks.length === 0) {
		return (
			<EmptyPage>
				<Empty>
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
		<div className='flex min-h-0 flex-1 flex-col gap-3'>
			{TASK_SECTIONS.map((status) => (
				<TaskStatusSection
					activeTaskId={activeTaskId}
					createProjectId={createProjectId}
					key={status}
					label={formatTaskStatusLabel(status)}
					onArchiveTask={onArchiveTask}
					onOpenChange={(open) => handleSectionOpenChange(status, open)}
					onOpenTask={onOpenTask}
					onToggleTaskSelection={onToggleTaskSelection}
					onToggleTaskStatus={onToggleTaskStatus}
					onUpdateTaskPriority={onUpdateTaskPriority}
					onUpdateTaskStatus={onUpdateTaskStatus}
					open={openSections.includes(status)}
					pendingTaskId={pendingTaskId}
					selectedTaskIdSet={selectedTaskIdSet}
					showProjectName={showProjectName}
					status={status}
					tasks={groupedTasks[status]}
				/>
			))}
		</div>
	)
}

type TaskStatusSectionProps = {
	status: TaskStatus
	label: string
	tasks: TaskListItem[]
	open: boolean
	createProjectId: string | null
	showProjectName: boolean
	pendingTaskId: string | null
	activeTaskId: string | null
	selectedTaskIdSet: Set<string>
	onOpenChange: (open: boolean) => void
	onToggleTaskSelection: (taskId: string) => void
	onUpdateTaskPriority: (task: TaskListItem, priority: TaskPriorityValue) => Promise<void>
	onUpdateTaskStatus: (task: TaskListItem, status: TaskStatus) => Promise<void>
	onToggleTaskStatus: (task: TaskListItem) => Promise<void>
	onArchiveTask: (task: TaskListItem) => Promise<void>
	onOpenTask: (taskId: string) => void
}

function TaskStatusSection({
	status,
	label,
	tasks,
	open,
	createProjectId,
	showProjectName,
	pendingTaskId,
	activeTaskId,
	selectedTaskIdSet,
	onOpenChange,
	onToggleTaskSelection,
	onUpdateTaskPriority,
	onUpdateTaskStatus,
	onToggleTaskStatus,
	onArchiveTask,
	onOpenTask,
}: TaskStatusSectionProps) {
	const openTaskCreateDialog = useDialogStore((state) => state.openTaskCreateDialog)

	return (
		<Collapsible onOpenChange={onOpenChange} open={open}>
			<div className='flex items-center justify-between gap-3 px-1'>
				<CollapsibleTrigger asChild>
					<button className='flex min-w-0 items-center gap-2 text-left' type='button'>
						<ChevronRightIcon
							className={cn('size-4 shrink-0 transition-transform', open ? 'rotate-90' : '')}
						/>
						<TaskStatusIndicator status={status} />
						<span className='text-sm font-medium text-foreground'>{label}</span>
						<Badge className='h-5 rounded-full px-2 text-[11px]' variant='secondary'>
							{tasks.length}
						</Badge>
					</button>
				</CollapsibleTrigger>

				<div className='flex items-center gap-2'>
					<span className={TASK_SECTION_META_CLASS}>
						{tasks.length === 0 ? '暂无任务' : `${tasks.length} 条`}
					</span>
					<Button
						aria-label={`在 ${label} 中创建任务`}
						className='hover:bg-(--sf-color-shell-hover-strong) focus-visible:bg-(--sf-color-shell-hover-strong)'
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
			</div>

			<CollapsibleContent className='overflow-hidden px-0'>
				<div className='mt-2 flex flex-col gap-1'>
					{tasks.map((task) => (
						<TaskBoardRow
							activeTaskId={activeTaskId}
							isProjectNameVisible={showProjectName}
							key={task.id}
							onArchiveTask={onArchiveTask}
							onOpenTask={onOpenTask}
							onToggleTaskSelection={onToggleTaskSelection}
							onToggleTaskStatus={onToggleTaskStatus}
							onUpdateTaskPriority={onUpdateTaskPriority}
							onUpdateTaskStatus={onUpdateTaskStatus}
							pendingTaskId={pendingTaskId}
							selectedTaskIdSet={selectedTaskIdSet}
							task={task}
						/>
					))}
				</div>
			</CollapsibleContent>
		</Collapsible>
	)
}

function TaskBoardRow({
	task,
	pendingTaskId,
	activeTaskId,
	selectedTaskIdSet,
	isProjectNameVisible,
	onToggleTaskSelection,
	onUpdateTaskPriority,
	onUpdateTaskStatus,
	onToggleTaskStatus,
	onArchiveTask,
	onOpenTask,
}: {
	task: TaskListItem
	pendingTaskId: string | null
	activeTaskId: string | null
	selectedTaskIdSet: Set<string>
	isProjectNameVisible: boolean
	onToggleTaskSelection: (taskId: string) => void
	onUpdateTaskPriority: (task: TaskListItem, priority: TaskPriorityValue) => Promise<void>
	onUpdateTaskStatus: (task: TaskListItem, status: TaskStatus) => Promise<void>
	onToggleTaskStatus: (task: TaskListItem) => Promise<void>
	onArchiveTask: (task: TaskListItem) => Promise<void>
	onOpenTask: (taskId: string) => void
}) {
	const isPending = pendingTaskId === task.id
	const isActive = activeTaskId === task.id
	const isSelected = selectedTaskIdSet.has(task.id)
	const isDoneLike = task.status === 'done' || task.status === 'canceled'

	return (
		<TaskContextMenu
			destructiveActionLabel='归档任务'
			isBusy={isPending}
			onMoveToTrash={() => void onArchiveTask(task)}
			onOpenDetails={() => onOpenTask(task.id)}
			onToggleStatus={() => void onToggleTaskStatus(task)}
			status={task.status}
		>
			<div
				aria-label={`打开任务 ${task.title}`}
				className={cn(
					TASK_ROW_BASE_CLASS,
					isActive
						? TASK_ROW_ACTIVE_CLASS
						: isSelected
							? TASK_ROW_BULK_SELECTED_CLASS
							: TASK_ROW_IDLE_CLASS,
					isDoneLike ? TASK_ROW_DONE_CLASS : null,
					isPending ? 'opacity-75' : null,
				)}
				data-shell-task-card='true'
				data-task-id={task.id}
				onClick={() => onOpenTask(task.id)}
				onKeyDown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault()
						onOpenTask(task.id)
					}
				}}
				role='button'
				tabIndex={0}
			>
				<div className='flex min-w-0 flex-1 items-center gap-2.5'>
					<TaskLeadRail>
						<TaskSelectionCheckbox
							ariaLabel={`选择任务 ${task.title}`}
							checked={isSelected}
							disabled={isPending}
							onCheckedChange={() => onToggleTaskSelection(task.id)}
						/>
						<TaskPrioritySelect
							ariaLabel={`设置任务 ${task.title} 的优先级`}
							disabled={isPending}
							onValueChange={(priority) => void onUpdateTaskPriority(task, priority)}
							value={task.priority}
						/>
						<TaskStatusSelect
							ariaLabel={`设置任务 ${task.title} 的状态`}
							disabled={isPending}
							onValueChange={(status) => void onUpdateTaskStatus(task, status)}
							value={task.status}
						/>
					</TaskLeadRail>

					<div className='min-w-0 flex-1'>
						<div className='flex min-w-0 items-center gap-2'>
							<p
								className={cn(
									'truncate text-sm font-medium text-foreground',
									isDoneLike ? 'text-(--sf-color-text-tertiary) line-through' : null,
								)}
							>
								{task.title}
							</p>
							{isProjectNameVisible && task.projectName ? (
								<Badge className='h-5 rounded-full px-2 text-[11px]' variant='outline'>
									{task.projectName}
								</Badge>
							) : null}
						</div>
						<div className='mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-(--sf-color-text-tertiary)'>
							{task.note ? <span className='truncate'>{task.note}</span> : null}
							{task.dueAt ? <span>Due {task.dueAt}</span> : null}
							{task.archivedAt ? <span>已归档</span> : null}
						</div>
					</div>
				</div>
			</div>
		</TaskContextMenu>
	)
}
