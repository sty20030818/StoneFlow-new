import { useMemo } from 'react'

import {
	selectProjectTaskBoardOpenSections,
	useShellPreferenceStore,
} from '@/app/layouts/shell/model/useShellPreferenceStore'
import {
	CANONICAL_BOARD_COLLAPSIBLE_CLASS,
	CANONICAL_BOARD_META_TEXT_CLASS,
	CANONICAL_BOARD_ROW_ACTIVE_CLASS,
	CANONICAL_BOARD_ROW_BASE_CLASS,
	CANONICAL_BOARD_ROW_IDLE_CLASS,
	CANONICAL_BOARD_SECTION_HEADER_CLASS,
	CANONICAL_BOARD_STACK_CLASS,
	CanonicalBoard,
} from '@/app/layouts/entity-scene/CanonicalBoard'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { TaskContextMenu } from '@/features/task/ui/TaskContextMenu'
import { TASK_ROW_BULK_SELECTED_CLASS } from '@/features/task/ui/taskRowBulkSelected'
import {
	ProjectSelect,
	TaskLeadRail,
	TaskPrioritySelect,
	TaskSelectionCheckbox,
	TaskStatusIndicator,
	TaskStatusSelect,
} from '@/features/task/ui/TaskMetadataSelect'
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
	entityBoardCompactBadgeClass,
	entityBoardSectionActionButtonClass,
	entityBoardSectionHeadingClass,
	entityBoardSectionCountBadgeClass,
	entityBoardSectionToggleClass,
} from '@/shared/ui/patterns/entity-board'

const TASK_ROW_DONE_CLASS = 'text-muted-foreground'

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
						CANONICAL_BOARD_STACK_CLASS,
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
						CANONICAL_BOARD_STACK_CLASS,
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
		<CanonicalBoard.Section>
			<CanonicalBoard.SectionHeader
				className={CANONICAL_BOARD_SECTION_HEADER_CLASS}
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
			<CanonicalBoard.Rows>
				{tasks.map((task) => (
					<TaskBoardRow key={task.id} task={task} />
				))}
			</CanonicalBoard.Rows>
		</CanonicalBoard.Section>
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
			className={CANONICAL_BOARD_COLLAPSIBLE_CLASS}
			onOpenChange={onOpenChange}
			open={open}
		>
			<div className={CANONICAL_BOARD_SECTION_HEADER_CLASS}>
				<CollapsibleTrigger
					aria-label={`切换 ${label} 分区折叠状态`}
					className={entityBoardSectionToggleClass}
				>
					<CanonicalBoard.Chevron data-chevron />
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
				<CanonicalBoard.Rows>
					{tasks.map((task) => (
						<TaskBoardRow key={task.id} task={task} />
					))}
				</CanonicalBoard.Rows>
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
	const hasProjectOptions = ctx.projectOptions && ctx.onSelectProject && ctx.onSelectNoProject

	return (
		<TaskContextMenu
			isBusy={isPending}
			onArchive={ctx.onArchiveTask ? () => void ctx.onArchiveTask!(task) : undefined}
			onMoveToTrash={ctx.onDeleteTask ? () => void ctx.onDeleteTask!(task) : undefined}
			onOpenDetails={() => ctx.onOpenTask(task.id)}
			onToggleStatus={() => void ctx.onToggleTaskStatus(task)}
			status={task.status}
		>
			<div
				aria-label={`打开任务 ${task.title}`}
				className={cn(
					CANONICAL_BOARD_ROW_BASE_CLASS,
					isActive
						? CANONICAL_BOARD_ROW_ACTIVE_CLASS
						: isSelected
							? TASK_ROW_BULK_SELECTED_CLASS
							: CANONICAL_BOARD_ROW_IDLE_CLASS,
					isDoneLike ? TASK_ROW_DONE_CLASS : null,
					isPending ? 'opacity-75' : null,
				)}
				data-shell-task-card='true'
				data-task-id={task.id}
				onClick={() => ctx.onOpenTask(task.id)}
				onKeyDown={(event) => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault()
						ctx.onOpenTask(task.id)
					}
				}}
				role='button'
				tabIndex={0}
			>
				<TaskLeadRail>
					<TaskSelectionCheckbox
						ariaLabel={`选择任务 ${task.title}`}
						checked={isSelected}
						disabled={isPending}
						onCheckedChange={() => ctx.onToggleTaskSelection(task.id)}
					/>
					<TaskPrioritySelect
						ariaLabel={`设置任务 ${task.title} 的优先级`}
						disabled={isPending}
						onValueChange={(priority) => void ctx.onUpdateTaskPriority(task, priority)}
						value={task.priority}
					/>
					<TaskStatusSelect
						ariaLabel={`设置任务 ${task.title} 的状态`}
						disabled={isPending}
						onValueChange={(status) => void ctx.onUpdateTaskStatus(task, status)}
						value={task.status}
					/>
				</TaskLeadRail>

				<span
					className={cn(
						'min-w-0 flex-1 truncate text-sm font-medium text-foreground transition-colors group-hover:text-foreground',
						isDoneLike ? 'text-sf-text-tertiary line-through' : null,
					)}
				>
					{task.title}
				</span>
				{hasProjectOptions ? (
					<ProjectSelect
						currentProjectName={task.projectName}
						disabled={isPending}
						onSelectNoProject={() => ctx.onSelectNoProject!(task)}
						onSelectProject={(projectId) => ctx.onSelectProject!(task, projectId)}
						projects={ctx.projectOptions!}
					/>
				) : task.projectName ? (
					<Badge className={entityBoardCompactBadgeClass} variant='outline'>
						{task.projectName}
					</Badge>
				) : null}
				<TaskMetaRail createdAt={task.createdAt} dueAt={task.dueAt} />
			</div>
		</TaskContextMenu>
	)
}

function TaskMetaRail({ dueAt, createdAt }: { dueAt: string | null; createdAt: string }) {
	return (
		<div className='ml-auto hidden shrink-0 items-center justify-end gap-2 text-right md:flex'>
			{dueAt ? (
				<span className={CANONICAL_BOARD_META_TEXT_CLASS}>{formatTaskDate(dueAt)}</span>
			) : null}
			<span className={CANONICAL_BOARD_META_TEXT_CLASS}>{formatTaskDate(createdAt)}</span>
		</div>
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
