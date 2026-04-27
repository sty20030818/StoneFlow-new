import { useMemo } from 'react'

import {
	selectProjectTaskBoardOpenSections,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import type { ProjectExecutionTask, ProjectTaskStatus } from '@/features/project/model/types'
import { TaskContextMenu } from '@/features/task/ui/TaskContextMenu'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/shared/ui/base/collapsible'
import { CheckIcon, ChevronRightIcon, CircleIcon, PlusIcon } from 'lucide-react'

const PROJECT_TASK_BOARD_EMPTY_CLASS =
	'rounded-xl border border-dashed border-(--sf-color-border-subtle) bg-transparent px-4 py-6 text-sm text-muted-foreground'

const PROJECT_TASK_ROW_BASE_CLASS =
	'group flex min-w-0 items-center gap-3 rounded-md border border-transparent bg-transparent px-3 py-2.5 text-left transition-colors'

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
	onToggleTaskStatus,
	onMoveTaskToTrash,
	onOpenTask,
}: ProjectTaskBoardProps) {
	const openSections = useShellLayoutStore(selectProjectTaskBoardOpenSections)
	const setProjectTaskBoardOpenSections = useShellLayoutStore(
		(state) => state.setProjectTaskBoardOpenSections,
	)

	const tasksByStatus = useMemo(
		() => ({
			todo: tasks.filter((task) => task.status === 'todo'),
			done: tasks.filter((task) => task.status === 'done'),
		}),
		[tasks],
	)

	function handleSectionOpenChange(status: ProjectTaskStatus, open: boolean) {
		const nextSections = open
			? Array.from(new Set([...openSections, status]))
			: openSections.filter((section) => section !== status)
		setProjectTaskBoardOpenSections(nextSections)
	}

	return (
		<div className='flex flex-col gap-1'>
			{PROJECT_TASK_SECTIONS.map((section) => (
				<TaskStatusSection
					activeTaskId={activeTaskId}
					key={section.status}
					label={section.label}
					onOpenChange={(open) => handleSectionOpenChange(section.status, open)}
					onMoveTaskToTrash={onMoveTaskToTrash}
					onOpenTask={onOpenTask}
					onToggleTaskStatus={onToggleTaskStatus}
					open={openSections.includes(section.status)}
					pendingTaskId={pendingTaskId}
					projectId={projectId}
					status={section.status}
					tasks={tasksByStatus[section.status]}
				/>
			))}
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
			<div className='flex items-center gap-2 rounded-md bg-(--sf-color-project-task-section-header) px-3 py-2'>
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
					className='rounded-md hover:bg-(--sf-color-shell-hover-strong) focus-visible:bg-(--sf-color-shell-hover-strong)'
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
				{tasks.length === 0 ? (
					<div className={PROJECT_TASK_BOARD_EMPTY_CLASS}>
						{status === 'todo' ? '当前没有待执行任务。' : '当前没有已完成任务。'}
					</div>
				) : (
					<div className='flex flex-col gap-1'>
						{tasks.map((task) => (
							<ProjectTaskRow
								activeTaskId={activeTaskId}
								key={task.id}
								onMoveTaskToTrash={onMoveTaskToTrash}
								onOpenTask={onOpenTask}
								onToggleTaskStatus={onToggleTaskStatus}
								pendingTaskId={pendingTaskId}
								task={task}
							/>
						))}
					</div>
				)}
			</CollapsibleContent>
		</Collapsible>
	)
}

function ProjectTaskRow({
	task,
	pendingTaskId,
	activeTaskId,
	onToggleTaskStatus,
	onMoveTaskToTrash,
	onOpenTask,
}: {
	task: ProjectExecutionTask
	pendingTaskId: string | null
	activeTaskId: string | null
	onToggleTaskStatus: (task: ProjectExecutionTask) => Promise<void>
	onMoveTaskToTrash: (task: ProjectExecutionTask) => Promise<void>
	onOpenTask: (taskId: string) => void
}) {
	const isPending = pendingTaskId === task.id
	const isActive = activeTaskId === task.id

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
					PROJECT_TASK_ROW_IDLE_CLASS,
					task.status === 'done' ? PROJECT_TASK_ROW_DONE_CLASS : null,
					isActive ? PROJECT_TASK_ROW_ACTIVE_CLASS : null,
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
				<div className='flex min-w-0 flex-1 items-center gap-3'>
					<TaskPriorityBadge priority={task.priority} />
					<TaskStatusToggle
						isPending={isPending}
						onToggle={() => void onToggleTaskStatus(task)}
						status={task.status}
						title={task.title}
					/>
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

function TaskPriorityBadge({ priority }: { priority: string | null | undefined }) {
	const label = mapPriorityToProjectLabel(priority)

	return (
		<span
			className={cn(
				'shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold tracking-[0.02em]',
				label === 'P0'
					? 'bg-(--sf-color-danger-soft) text-(--sf-color-danger-soft-text)'
					: label === 'P1'
						? 'bg-(--sf-color-warning-soft) text-(--sf-color-warning-soft-text)'
						: label === 'P2'
							? 'bg-(--sf-color-accent-primary-soft) text-(--sf-color-accent-soft-text)'
							: 'bg-(--sf-color-bg-surface-muted) text-(--sf-color-text-tertiary)',
			)}
		>
			{label}
		</span>
	)
}

function TaskStatusToggle({
	status,
	title,
	isPending,
	onToggle,
}: {
	status: ProjectTaskStatus
	title: string
	isPending: boolean
	onToggle: () => void
}) {
	return (
		<Button
			aria-label={status === 'todo' ? `标记完成 ${title}` : `恢复待执行 ${title}`}
			className='rounded-full'
			disabled={isPending}
			onClick={(event) => {
				event.stopPropagation()
				onToggle()
			}}
			size='icon-xs'
			type='button'
			variant='ghost'
		>
			<TaskStatusIndicator status={status} />
		</Button>
	)
}

function TaskStatusIndicator({ status }: { status: ProjectTaskStatus }) {
	if (status === 'done') {
		return (
			<span className='flex size-4 shrink-0 items-center justify-center rounded-full bg-(--sf-color-project-task-status-done) text-white'>
				<CheckIcon className='size-3' />
			</span>
		)
	}

	return (
		<span className='flex size-4 shrink-0 items-center justify-center rounded-full border border-(--sf-color-border-strong) text-transparent'>
			<CircleIcon className='size-3 fill-transparent stroke-transparent' />
		</span>
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

function mapPriorityToProjectLabel(priority: string | null | undefined) {
	switch (priority) {
		case 'urgent':
			return 'P0'
		case 'high':
			return 'P1'
		case 'medium':
			return 'P2'
		default:
			return 'P3'
	}
}

function formatProjectTaskDate(value: string) {
	return new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
	}).format(new Date(value))
}
