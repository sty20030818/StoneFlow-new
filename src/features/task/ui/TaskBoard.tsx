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
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import { TaskContextMenu } from '@/features/task/ui/TaskContextMenu'
import { TASK_ROW_BULK_SELECTED_CLASS } from '@/features/task/ui/taskRowBulkSelected'
import {
	ProjectSelect,
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
import { BellIcon, CalendarIcon, Clock3Icon, FolderIcon, ListTodoIcon, PlusIcon, TagIcon } from 'lucide-react'
import {
	entityBoardSectionActionButtonClass,
	entityBoardSectionHeadingClass,
	entityBoardSectionCountBadgeClass,
	entityBoardSectionToggleClass,
} from '@/shared/ui/patterns/entity-board'
import {
	RowMetaButton,
	RowShell,
	RowTitleCell,
} from '@/shared/ui/row'

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
	onSelectProject,
	onSelectNoProject,
}: {
	dueAt: string | null
	createdAt: string
	projectName: string | null | undefined
	projects?: Array<{ id: string; name: string }>
	hasProjectOptions: boolean
	isPending: boolean
	onSelectProject?: (projectId: string) => void
	onSelectNoProject?: () => void
}) {
	return (
		<RowShell.Fields>
			<RowMetaButton disabled icon={<TagIcon className='size-3.5' />} label='标签' type='button' />
			<RowMetaButton
				disabled={!dueAt}
				icon={<CalendarIcon className='size-3.5' />}
				label={dueAt ? `截止 ${formatTaskDate(dueAt)}` : '截止'}
				type='button'
			/>
			<RowMetaButton
				disabled
				icon={<CalendarIcon className='size-3.5' />}
				label='计划'
				type='button'
			/>
			<RowMetaButton disabled icon={<BellIcon className='size-3.5' />} label='提醒' type='button' />
			{hasProjectOptions && projects && onSelectProject && onSelectNoProject ? (
				<ProjectSelect
					currentProjectName={projectName}
					disabled={isPending}
					onSelectNoProject={onSelectNoProject}
					onSelectProject={onSelectProject}
					projects={projects}
				/>
			) : (
				<RowMetaButton
					disabled={!projectName}
					icon={<FolderIcon className='size-3.5' />}
					label={projectName || '项目'}
					type='button'
				/>
			)}
			<RowMetaButton
				disabled
				icon={<Clock3Icon className='size-3.5' />}
				label={formatTaskDate(createdAt)}
				trailing={null}
				type='button'
			/>
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
