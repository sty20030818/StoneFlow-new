import { useMemo } from 'react'

import {
	selectProjectTaskBoardOpenSections,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import { type TaskPriorityValue } from '@/features/task/model/taskPriority'
import type { ProjectExecutionTask, ProjectTaskStatus } from '@/features/project/model/types'
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

const PROJECT_TASK_ROW_BASE_CLASS =
	'group flex min-w-0 items-center gap-3 rounded-md border border-transparent bg-transparent px-3 py-3 text-left transition-colors'

const PROJECT_TASK_ROW_IDLE_CLASS = 'hover:bg-(--sf-color-project-task-row-hover)'
const PROJECT_TASK_ROW_ACTIVE_CLASS =
	'border-(--sf-color-border-subtle) bg-(--sf-color-project-task-row-selected)'
const PROJECT_TASK_ROW_DONE_CLASS = 'text-muted-foreground'

const PROJECT_TASK_SECTION_META_CLASS = 'text-xs font-medium text-(--sf-color-text-tertiary)'

type ProjectTaskBoardProps = {
	projectId: string
	tasks: ProjectExecutionTask[]
	pendingTaskId: string | null
	activeTaskId: string | null
	selectedTaskIdSet: Set<string>
	onToggleTaskSelection: (taskId: string) => void
	onUpdateTaskPriority: (task: ProjectExecutionTask, priority: TaskPriorityValue) => Promise<void>
	onUpdateTaskStatus: (task: ProjectExecutionTask, status: ProjectTaskStatus) => Promise<void>
	onToggleTaskStatus: (task: ProjectExecutionTask) => Promise<void>
	onMoveTaskToTrash: (task: ProjectExecutionTask) => Promise<void>
	onOpenTask: (taskId: string) => void
}

type TaskStatusSectionProps = {
	projectId: string
	status: ProjectTaskStatus
	label: string
	tasks: ProjectExecutionTask[]
	open: boolean
	onOpenChange: (open: boolean) => void
	pendingTaskId: string | null
	activeTaskId: string | null
	selectedTaskIdSet: Set<string>
	onToggleTaskSelection: (taskId: string) => void
	onUpdateTaskPriority: (task: ProjectExecutionTask, priority: TaskPriorityValue) => Promise<void>
	onUpdateTaskStatus: (task: ProjectExecutionTask, status: ProjectTaskStatus) => Promise<void>
	onToggleTaskStatus: (task: ProjectExecutionTask) => Promise<void>
	onMoveTaskToTrash: (task: ProjectExecutionTask) => Promise<void>
	onOpenTask: (taskId: string) => void
}

const PROJECT_TASK_SECTIONS: Array<{ status: ProjectTaskStatus; label: string }> = [
	{ status: 'todo', label: 'Todo' },
	{ status: 'done', label: 'Done' },
]

export function ProjectTaskBoard({
	projectId,
	tasks,
	pendingTaskId,
	activeTaskId,
	selectedTaskIdSet,
	onToggleTaskSelection,
	onUpdateTaskPriority,
	onUpdateTaskStatus,
	onToggleTaskStatus,
	onMoveTaskToTrash,
	onOpenTask,
}: ProjectTaskBoardProps) {
	const openSections = useShellLayoutStore(selectProjectTaskBoardOpenSections)
	const setProjectTaskBoardOpenSections = useShellLayoutStore(
		(state) => state.setProjectTaskBoardOpenSections,
	)
	const openTaskCreateDialog = useShellLayoutStore((state) => state.openTaskCreateDialog)

	const tasksByStatus = useMemo(
		() => ({
			todo: tasks.filter((task) => task.status === 'todo'),
			done: tasks.filter((task) => task.status === 'done'),
		}),
		[tasks],
	)
	const visibleSections = PROJECT_TASK_SECTIONS.filter(
		(section) => tasksByStatus[section.status].length > 0,
	)

	function handleSectionOpenChange(status: ProjectTaskStatus, open: boolean) {
		const nextSections = open
			? Array.from(new Set([...openSections, status]))
			: openSections.filter((section) => section !== status)
		setProjectTaskBoardOpenSections(nextSections)
	}

	return (
		<div className='flex min-h-0 flex-1 flex-col gap-1'>
			{visibleSections.length === 0 ? (
				<EmptyPage>
					<Empty className='rounded-md bg-transparent'>
						<EmptyHeader>
							<EmptyMedia variant='icon'>
								<ListTodoIcon />
							</EmptyMedia>
							<EmptyTitle>当前还没有任务</EmptyTitle>
							<EmptyDescription>先创建第一条任务，再从这里开始推进这个 Project。</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button
								onClick={() =>
									openTaskCreateDialog({
										projectId,
										status: 'todo',
									})
								}
								type='button'
							>
								创建任务
							</Button>
						</EmptyContent>
					</Empty>
				</EmptyPage>
			) : (
				visibleSections.map((section) => (
					<TaskStatusSection
						activeTaskId={activeTaskId}
						key={section.status}
						label={section.label}
						onOpenChange={(open) => handleSectionOpenChange(section.status, open)}
						onMoveTaskToTrash={onMoveTaskToTrash}
						onOpenTask={onOpenTask}
						onToggleTaskSelection={onToggleTaskSelection}
						onUpdateTaskPriority={onUpdateTaskPriority}
						onUpdateTaskStatus={onUpdateTaskStatus}
						onToggleTaskStatus={onToggleTaskStatus}
						open={openSections.includes(section.status)}
						pendingTaskId={pendingTaskId}
						projectId={projectId}
						selectedTaskIdSet={selectedTaskIdSet}
						status={section.status}
						tasks={tasksByStatus[section.status]}
					/>
				))
			)}
		</div>
	)
}

function TaskStatusSection({
	projectId,
	status,
	label,
	tasks,
	open,
	onOpenChange,
	pendingTaskId,
	activeTaskId,
	selectedTaskIdSet,
	onToggleTaskSelection,
	onUpdateTaskPriority,
	onUpdateTaskStatus,
	onToggleTaskStatus,
	onMoveTaskToTrash,
	onOpenTask,
}: TaskStatusSectionProps) {
	const openTaskCreateDialog = useShellLayoutStore((state) => state.openTaskCreateDialog)

	return (
		<Collapsible
			className='flex flex-col gap-1 [&[data-state=open]_[data-chevron]]:rotate-90'
			onOpenChange={onOpenChange}
			open={open}
		>
			<div className='flex items-center gap-2 rounded-md bg-(--sf-color-project-task-section-header) py-1 pl-3 pr-1'>
				<CollapsibleTrigger
					aria-label={`切换 ${label} 分区折叠状态`}
					className='inline-flex size-4 shrink-0 items-center justify-center border-none bg-transparent p-0 text-(--sf-color-icon-subtle) outline-none transition-none hover:bg-transparent hover:text-(--sf-color-icon-subtle) focus-visible:border-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:outline-none'
				>
					<ChevronRightIcon className='size-4 shrink-0' data-chevron />
				</CollapsibleTrigger>
				<div className='flex min-w-0 flex-1 items-center gap-2 px-1 text-sm font-semibold text-foreground'>
					<TaskStatusIndicator status={status} />
					<span className='truncate'>{label}</span>
					<Badge className='ml-1' variant='secondary'>
						{tasks.length}
					</Badge>
				</div>
				<Button
					aria-label={`在 ${label} 中创建任务`}
					className='hover:bg-(--sf-color-shell-hover-strong) focus-visible:bg-(--sf-color-shell-hover-strong)'
					onClick={(event) => {
						event.preventDefault()
						event.stopPropagation()
						openTaskCreateDialog({
							projectId,
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
				<div className='flex flex-col gap-1'>
					{tasks.map((task) => (
						<ProjectTaskRow
							activeTaskId={activeTaskId}
							key={task.id}
							onMoveTaskToTrash={onMoveTaskToTrash}
							onOpenTask={onOpenTask}
							onToggleTaskSelection={onToggleTaskSelection}
							onUpdateTaskPriority={onUpdateTaskPriority}
							onUpdateTaskStatus={onUpdateTaskStatus}
							onToggleTaskStatus={onToggleTaskStatus}
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

function ProjectTaskRow({
	task,
	pendingTaskId,
	activeTaskId,
	selectedTaskIdSet,
	onToggleTaskSelection,
	onUpdateTaskPriority,
	onUpdateTaskStatus,
	onToggleTaskStatus,
	onMoveTaskToTrash,
	onOpenTask,
}: {
	task: ProjectExecutionTask
	pendingTaskId: string | null
	activeTaskId: string | null
	selectedTaskIdSet: Set<string>
	onToggleTaskSelection: (taskId: string) => void
	onUpdateTaskPriority: (task: ProjectExecutionTask, priority: TaskPriorityValue) => Promise<void>
	onUpdateTaskStatus: (task: ProjectExecutionTask, status: ProjectTaskStatus) => Promise<void>
	onToggleTaskStatus: (task: ProjectExecutionTask) => Promise<void>
	onMoveTaskToTrash: (task: ProjectExecutionTask) => Promise<void>
	onOpenTask: (taskId: string) => void
}) {
	const isPending = pendingTaskId === task.id
	const isActive = activeTaskId === task.id
	const isSelected = selectedTaskIdSet.has(task.id)

	return (
		<TaskContextMenu
			isBusy={isPending}
			onMoveToTrash={() => void onMoveTaskToTrash(task)}
			onOpenDetails={() => onOpenTask(task.id)}
			onToggleStatus={() => void onToggleTaskStatus(task)}
			status={task.status}
		>
			<div
				aria-label={`打开任务 ${task.title}`}
				className={cn(
					PROJECT_TASK_ROW_BASE_CLASS,
					isActive
						? PROJECT_TASK_ROW_ACTIVE_CLASS
						: isSelected
							? TASK_ROW_BULK_SELECTED_CLASS
							: PROJECT_TASK_ROW_IDLE_CLASS,
					task.status === 'done' ? PROJECT_TASK_ROW_DONE_CLASS : null,
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
							ariaLabel={`${task.title} 优先级`}
							disabled={isPending}
							onValueChange={(priority) => void onUpdateTaskPriority(task, priority)}
							value={task.priority}
						/>
						<TaskStatusSelect
							ariaLabel={`${task.title} 状态`}
							disabled={isPending}
							onValueChange={(status) => void onUpdateTaskStatus(task, status)}
							value={task.status}
						/>
					</TaskLeadRail>
					<span
						className={cn(
							'truncate text-sm font-medium text-foreground transition-colors group-hover:text-foreground',
							task.status === 'done' ? 'text-(--sf-color-text-tertiary) line-through' : null,
						)}
					>
						{task.title}
					</span>
				</div>

				<TaskMetaRail createdAt={task.createdAt} dueAt={task.dueAt} tags={task.tags ?? []} />
			</div>
		</TaskContextMenu>
	)
}

function TaskMetaRail({
	tags,
	dueAt,
	createdAt,
}: {
	tags: string[]
	dueAt: string | null
	createdAt: string
}) {
	return (
		<div className='hidden shrink-0 items-center gap-2 md:flex'>
			{tags.length > 0 ? (
				<div className='flex max-w-40 items-center gap-1 overflow-hidden'>
					{tags.slice(0, 2).map((tag) => (
						<Badge className='max-w-24 truncate' key={tag} variant='outline'>
							{tag}
						</Badge>
					))}
				</div>
			) : null}
			{dueAt ? (
				<span className={PROJECT_TASK_SECTION_META_CLASS}>{formatProjectTaskDate(dueAt)}</span>
			) : null}
			<span className={PROJECT_TASK_SECTION_META_CLASS}>{formatProjectTaskDate(createdAt)}</span>
		</div>
	)
}

function formatProjectTaskDate(value: string) {
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
	}).format(new Date(value))
}
