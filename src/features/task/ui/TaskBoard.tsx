import { useMemo, type ReactNode } from 'react'

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
import { ListTodoIcon, PlusIcon } from 'lucide-react'

const TASK_ROW_DONE_CLASS = 'text-muted-foreground'

type TaskBoardSectionVariant = 'compact' | 'project'
type TaskBoardRowVariant = 'stacked' | 'project'

const TASK_SECTIONS: TaskStatus[] = ['todo', 'doing', 'waiting', 'done', 'canceled']

type TaskBoardProps = {
	tasks: TaskListItem[]
	customSections?: Array<{
		key: string
		label: string
		tasks: TaskListItem[]
	}>
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
	onArchiveTask?: (task: TaskListItem) => Promise<void>
	onDeleteTask?: (task: TaskListItem) => Promise<void>
	onOpenTask: (taskId: string) => void
	statusOrder?: TaskStatus[]
	hideEmptySections?: boolean
	sectionVariant?: TaskBoardSectionVariant
	rowVariant?: TaskBoardRowVariant
	renderRowActions?: (task: TaskListItem) => ReactNode
}

export function TaskBoard({
	tasks,
	customSections,
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
	onDeleteTask,
	onOpenTask,
	statusOrder = TASK_SECTIONS,
	hideEmptySections = false,
	sectionVariant = 'compact',
	rowVariant = 'stacked',
	renderRowActions,
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

	if (customSections && customSections.length > 0) {
		return (
			<div
				className={cn(
					CANONICAL_BOARD_STACK_CLASS,
					sectionVariant === 'project' ? 'gap-2' : 'gap-3',
				)}
			>
				{customSections.map((section) => (
					<TaskCustomSection
						activeTaskId={activeTaskId}
						createProjectId={createProjectId}
						key={section.key}
						label={section.label}
						onArchiveTask={onArchiveTask}
						onDeleteTask={onDeleteTask}
						onOpenTask={onOpenTask}
						onToggleTaskSelection={onToggleTaskSelection}
						onToggleTaskStatus={onToggleTaskStatus}
						onUpdateTaskPriority={onUpdateTaskPriority}
						onUpdateTaskStatus={onUpdateTaskStatus}
						pendingTaskId={pendingTaskId}
						renderRowActions={renderRowActions}
						rowVariant={rowVariant}
						selectedTaskIdSet={selectedTaskIdSet}
						showProjectName={showProjectName}
						tasks={section.tasks}
					/>
				))}
			</div>
		)
	}

	const visibleStatuses = statusOrder.filter(
		(status) => !hideEmptySections || groupedTasks[status].length > 0,
	)

	return (
		<div
			className={cn(CANONICAL_BOARD_STACK_CLASS, sectionVariant === 'project' ? 'gap-1' : 'gap-3')}
		>
			{visibleStatuses.map((status) => (
				<TaskStatusSection
					activeTaskId={activeTaskId}
					createProjectId={createProjectId}
					key={status}
					label={formatTaskStatusLabel(status)}
					onDeleteTask={onDeleteTask}
					onArchiveTask={onArchiveTask}
					onOpenChange={(open) => handleSectionOpenChange(status, open)}
					onOpenTask={onOpenTask}
					onToggleTaskSelection={onToggleTaskSelection}
					onToggleTaskStatus={onToggleTaskStatus}
					onUpdateTaskPriority={onUpdateTaskPriority}
					onUpdateTaskStatus={onUpdateTaskStatus}
					open={openSections.includes(status)}
					pendingTaskId={pendingTaskId}
					renderRowActions={renderRowActions}
					rowVariant={rowVariant}
					selectedTaskIdSet={selectedTaskIdSet}
					sectionVariant={sectionVariant}
					showProjectName={showProjectName}
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
	showProjectName,
	pendingTaskId,
	activeTaskId,
	selectedTaskIdSet,
	onToggleTaskSelection,
	onUpdateTaskPriority,
	onUpdateTaskStatus,
	onToggleTaskStatus,
	onDeleteTask,
	onArchiveTask,
	onOpenTask,
	rowVariant,
	renderRowActions,
}: {
	label: string
	tasks: TaskListItem[]
	createProjectId: string | null
	showProjectName: boolean
	pendingTaskId: string | null
	activeTaskId: string | null
	selectedTaskIdSet: Set<string>
	onToggleTaskSelection: (taskId: string) => void
	onUpdateTaskPriority: (task: TaskListItem, priority: TaskPriorityValue) => Promise<void>
	onUpdateTaskStatus: (task: TaskListItem, status: TaskStatus) => Promise<void>
	onToggleTaskStatus: (task: TaskListItem) => Promise<void>
	onDeleteTask?: (task: TaskListItem) => Promise<void>
	onArchiveTask?: (task: TaskListItem) => Promise<void>
	onOpenTask: (taskId: string) => void
	rowVariant: TaskBoardRowVariant
	renderRowActions?: (task: TaskListItem) => ReactNode
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
						className='hover:bg-(--sf-color-shell-hover-strong) focus-visible:bg-(--sf-color-shell-hover-strong)'
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
					<TaskBoardRow
						activeTaskId={activeTaskId}
						isProjectNameVisible={showProjectName}
						key={task.id}
						onDeleteTask={onDeleteTask}
						onArchiveTask={onArchiveTask}
						onOpenTask={onOpenTask}
						onToggleTaskSelection={onToggleTaskSelection}
						onToggleTaskStatus={onToggleTaskStatus}
						onUpdateTaskPriority={onUpdateTaskPriority}
						onUpdateTaskStatus={onUpdateTaskStatus}
						pendingTaskId={pendingTaskId}
						renderRowActions={renderRowActions}
						rowVariant={rowVariant}
						selectedTaskIdSet={selectedTaskIdSet}
						task={task}
					/>
				))}
			</CanonicalBoard.Rows>
		</CanonicalBoard.Section>
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
	onArchiveTask?: (task: TaskListItem) => Promise<void>
	onDeleteTask?: (task: TaskListItem) => Promise<void>
	onOpenTask: (taskId: string) => void
	sectionVariant: TaskBoardSectionVariant
	rowVariant: TaskBoardRowVariant
	renderRowActions?: (task: TaskListItem) => ReactNode
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
	onDeleteTask,
	onArchiveTask,
	onOpenTask,
	rowVariant,
	renderRowActions,
}: TaskStatusSectionProps) {
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
					className='inline-flex size-4 shrink-0 items-center justify-center border-none bg-transparent p-0 text-(--sf-color-icon-subtle) outline-none transition-none hover:bg-transparent hover:text-(--sf-color-icon-subtle) focus-visible:border-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:outline-none'
				>
					<CanonicalBoard.Chevron data-chevron />
				</CollapsibleTrigger>
				<div className='flex min-w-0 flex-1 items-center gap-2 px-1 text-sm font-semibold text-foreground'>
					<TaskStatusIndicator status={status} />
					<span className='truncate'>{label}</span>
					<Badge className='ml-1 border-transparent bg-transparent shadow-none' variant='secondary'>
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
						<TaskBoardRow
							activeTaskId={activeTaskId}
							isProjectNameVisible={showProjectName}
							key={task.id}
							onDeleteTask={onDeleteTask}
							onArchiveTask={onArchiveTask}
							onOpenTask={onOpenTask}
							onToggleTaskSelection={onToggleTaskSelection}
							onToggleTaskStatus={onToggleTaskStatus}
							onUpdateTaskPriority={onUpdateTaskPriority}
							onUpdateTaskStatus={onUpdateTaskStatus}
							pendingTaskId={pendingTaskId}
							renderRowActions={renderRowActions}
							rowVariant={rowVariant}
							selectedTaskIdSet={selectedTaskIdSet}
							task={task}
						/>
					))}
				</CanonicalBoard.Rows>
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
	onDeleteTask,
	onArchiveTask,
	onOpenTask,
	rowVariant,
	renderRowActions,
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
	onArchiveTask?: (task: TaskListItem) => Promise<void>
	onDeleteTask?: (task: TaskListItem) => Promise<void>
	onOpenTask: (taskId: string) => void
	rowVariant: TaskBoardRowVariant
	renderRowActions?: (task: TaskListItem) => ReactNode
}) {
	const isPending = pendingTaskId === task.id
	const isActive = activeTaskId === task.id
	const isSelected = selectedTaskIdSet.has(task.id)
	const isDoneLike = task.status === 'done' || task.status === 'canceled'

	return (
		<TaskContextMenu
			isBusy={isPending}
			onArchive={onArchiveTask ? () => void onArchiveTask(task) : undefined}
			onMoveToTrash={onDeleteTask ? () => void onDeleteTask(task) : undefined}
			onOpenDetails={() => onOpenTask(task.id)}
			onToggleStatus={() => void onToggleTaskStatus(task)}
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

					{rowVariant === 'project' ? (
						<>
							<span
								className={cn(
									'min-w-0 flex-1 truncate text-sm font-medium text-foreground transition-colors group-hover:text-foreground',
									isDoneLike ? 'text-(--sf-color-text-tertiary) line-through' : null,
								)}
							>
								{task.title}
							</span>
							<TaskMetaRail createdAt={task.createdAt} dueAt={task.dueAt} />
						</>
					) : (
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
								{task.dueAt ? <span>截止 {task.dueAt}</span> : null}
								{task.archivedAt ? <span>已归档</span> : null}
							</div>
							{renderRowActions ? (
								<div
									className='mt-2'
									onClick={(event) => event.stopPropagation()}
									onKeyDown={(event) => event.stopPropagation()}
								>
									{renderRowActions(task)}
								</div>
							) : null}
						</div>
					)}
				</div>
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
