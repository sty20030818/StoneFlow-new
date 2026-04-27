import { useFocusWorkspace } from '@/features/focus/model/useFocusWorkspace'
import {
	selectActiveDrawerId,
	selectActiveDrawerKind,
	selectCurrentSpaceId,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { StatusNotice } from '@/shared/ui/StatusNotice'
import { cn } from '@/shared/lib/utils'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/ui/base/empty'
import {
	LINEAR_CARD_ACTIVE_CLASS,
	LINEAR_CARD_BASE_CLASS,
	LINEAR_CARD_DONE_CLASS,
	LINEAR_CARD_IDLE_CLASS,
} from '@/shared/ui/linearSurface'
import type {
	FocusRecentTimeWindow,
	FocusTaskRecord,
	FocusViewKey,
} from '@/features/focus/model/types'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import { TASK_ROW_BULK_SELECTED_CLASS } from '@/features/task/ui/taskRowBulkSelected'
import {
	TaskLeadRail,
	TaskPrioritySelect,
	TaskSelectionCheckbox,
	TaskStatusSelect,
} from '@/features/task/ui/TaskMetadataSelect'
import {
	MainCardHeader,
	MainCardLayout,
	MainCardToolbar,
} from '@/app/layouts/main-card/MainCardLayout'
import { TaskContextMenu } from '@/features/task/ui/TaskContextMenu'
import { ListFilterIcon, TargetIcon } from 'lucide-react'
import { ToastFeedbackBridge } from '@/shared/ui/ToastFeedbackBridge'

const TASK_CARD_INTERACTIVE_CLASS = 'group cursor-pointer'
const TASK_CARD_GRID_CLASS = 'flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'

const RECENT_TIME_WINDOW_OPTIONS: Array<{
	value: FocusRecentTimeWindow
	label: string
}> = [
	{ value: 'all', label: '全部' },
	{ value: '7d', label: '最近 7 天' },
	{ value: '30d', label: '最近 30 天' },
]

export function FocusPage() {
	const currentSpaceId = useShellLayoutStore(selectCurrentSpaceId)
	const activeDrawerKind = useShellLayoutStore(selectActiveDrawerKind)
	const activeDrawerId = useShellLayoutStore(selectActiveDrawerId)
	const openDrawer = useShellLayoutStore((state) => state.openDrawer)
	const openTaskCreateDialog = useShellLayoutStore((state) => state.openTaskCreateDialog)
	const {
		views,
		activeViewKey,
		recentTimeWindow,
		tasks,
		isLoading,
		loadError,
		feedback,
		pendingTaskId,
		setActiveViewKey,
		setRecentTimeWindow,
		refresh,
		toggleTaskPin,
		updateTaskPriority,
		updateTaskStatus,
		toggleTaskStatus,
		moveTaskToTrash,
	} = useFocusWorkspace(currentSpaceId)
	const { selectedTaskIdSet, toggleTaskSelection } = useTaskSelection(tasks.map((task) => task.id))
	const showRecentWindow = activeViewKey === 'recent'

	return (
		<MainCardLayout
			header={<MainCardHeader title='Views' />}
			toolbar={
				<MainCardToolbar
					filterAction={
						showRecentWindow ? (
							<RecentWindowFilter onWindowChange={setRecentTimeWindow} value={recentTimeWindow} />
						) : undefined
					}
					onRefresh={() => void refresh()}
					pills={views.map((view) => ({
						label: view.name,
						active: view.key === activeViewKey,
						onClick: () => setActiveViewKey(view.key),
						role: 'tab',
					}))}
					refreshDisabled={isLoading}
				/>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col'>
				<ToastFeedbackBridge feedback={feedback} />

				{loadError ? (
					<StatusNotice
						actions={
							<Button
								className='rounded-md'
								onClick={() => void refresh()}
								size='sm'
								variant='outline'
							>
								重试
							</Button>
						}
						className='mb-3'
						role='alert'
						variant='danger'
					>
						<p className='text-sm'>{loadError}</p>
					</StatusNotice>
				) : null}

				<div className='flex min-h-0 flex-1 flex-col'>
					<FocusTaskPanel
						activeViewKey={activeViewKey}
						activeTaskId={activeDrawerKind === 'task' ? activeDrawerId : null}
						isLoading={isLoading}
						onCreateTask={() => openTaskCreateDialog()}
						onOpenTask={(taskId) => openDrawer('task', taskId)}
						onMoveTaskToTrash={moveTaskToTrash}
						onToggleTaskSelection={toggleTaskSelection}
						onToggleTaskPin={toggleTaskPin}
						onUpdateTaskPriority={updateTaskPriority}
						onUpdateTaskStatus={updateTaskStatus}
						onToggleTaskStatus={toggleTaskStatus}
						pendingTaskId={pendingTaskId}
						selectedTaskIdSet={selectedTaskIdSet}
						tasks={tasks}
					/>
				</div>
			</div>
		</MainCardLayout>
	)
}

type FocusTaskPanelProps = {
	activeViewKey: FocusViewKey
	activeTaskId: string | null
	tasks: FocusTaskRecord[]
	pendingTaskId: string | null
	isLoading: boolean
	selectedTaskIdSet: Set<string>
	onCreateTask: () => void
	onOpenTask: (taskId: string) => void
	onToggleTaskSelection: (taskId: string) => void
	onToggleTaskPin: (task: FocusTaskRecord) => Promise<void>
	onUpdateTaskPriority: (
		task: FocusTaskRecord,
		priority: '' | 'low' | 'medium' | 'high' | 'urgent',
	) => Promise<void>
	onUpdateTaskStatus: (task: FocusTaskRecord, status: 'todo' | 'done') => Promise<void>
	onToggleTaskStatus: (task: FocusTaskRecord) => Promise<void>
	onMoveTaskToTrash: (task: FocusTaskRecord) => Promise<void>
}

function FocusTaskPanel({
	activeViewKey,
	activeTaskId,
	tasks,
	pendingTaskId,
	isLoading,
	selectedTaskIdSet,
	onCreateTask,
	onOpenTask,
	onToggleTaskSelection,
	onToggleTaskPin,
	onUpdateTaskPriority,
	onUpdateTaskStatus,
	onToggleTaskStatus,
	onMoveTaskToTrash,
}: FocusTaskPanelProps) {
	if (isLoading) {
		return (
			<p className='py-8 text-sm text-muted-foreground' role='status'>
				正在加载 {getFocusViewLabel(activeViewKey)}...
			</p>
		)
	}

	if (tasks.length === 0) {
		return (
			<EmptyPage>
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant='icon'>
							<TargetIcon />
						</EmptyMedia>
						<EmptyTitle>{getEmptyTitle(activeViewKey)}</EmptyTitle>
						<EmptyDescription>{getEmptyDescription(activeViewKey)}</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button onClick={onCreateTask} type='button'>
							创建任务
						</Button>
					</EmptyContent>
				</Empty>
			</EmptyPage>
		)
	}

	return (
		<div className='flex min-h-0 flex-1 flex-col gap-3'>
			{tasks.map((task) => (
				<FocusTaskRow
					activeViewKey={activeViewKey}
					isActive={activeTaskId === task.id}
					isPending={pendingTaskId === task.id}
					key={task.id}
					onOpenTask={onOpenTask}
					onMoveTaskToTrash={onMoveTaskToTrash}
					onToggleTaskSelection={onToggleTaskSelection}
					onToggleTaskPin={onToggleTaskPin}
					onUpdateTaskPriority={onUpdateTaskPriority}
					onUpdateTaskStatus={onUpdateTaskStatus}
					onToggleTaskStatus={onToggleTaskStatus}
					selectedTaskIdSet={selectedTaskIdSet}
					task={task}
				/>
			))}
		</div>
	)
}

type FocusTaskRowProps = {
	task: FocusTaskRecord
	activeViewKey: FocusViewKey
	isActive: boolean
	isPending: boolean
	selectedTaskIdSet: Set<string>
	onOpenTask: (taskId: string) => void
	onToggleTaskSelection: (taskId: string) => void
	onToggleTaskPin: (task: FocusTaskRecord) => Promise<void>
	onUpdateTaskPriority: (
		task: FocusTaskRecord,
		priority: '' | 'low' | 'medium' | 'high' | 'urgent',
	) => Promise<void>
	onUpdateTaskStatus: (task: FocusTaskRecord, status: 'todo' | 'done') => Promise<void>
	onToggleTaskStatus: (task: FocusTaskRecord) => Promise<void>
	onMoveTaskToTrash: (task: FocusTaskRecord) => Promise<void>
}

function FocusTaskRow({
	task,
	activeViewKey,
	isActive,
	isPending,
	selectedTaskIdSet,
	onOpenTask,
	onToggleTaskSelection,
	onToggleTaskPin,
	onUpdateTaskPriority,
	onUpdateTaskStatus,
	onToggleTaskStatus,
	onMoveTaskToTrash,
}: FocusTaskRowProps) {
	const isSelected = selectedTaskIdSet.has(task.id)

	return (
		<TaskContextMenu
			isBusy={isPending}
			isPinned={task.pinned}
			onMoveToTrash={() => void onMoveTaskToTrash(task)}
			onOpenDetails={() => onOpenTask(task.id)}
			onTogglePin={() => void onToggleTaskPin(task)}
			onToggleStatus={() => void onToggleTaskStatus(task)}
			status={task.status}
		>
			<div
				aria-label={`打开任务 ${task.title}`}
				className={cn(
					LINEAR_CARD_BASE_CLASS,
					TASK_CARD_INTERACTIVE_CLASS,
					TASK_CARD_GRID_CLASS,
					task.status === 'done' ? LINEAR_CARD_DONE_CLASS : LINEAR_CARD_IDLE_CLASS,
					isSelected && !isActive ? TASK_ROW_BULK_SELECTED_CLASS : null,
					isActive ? LINEAR_CARD_ACTIVE_CLASS : null,
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
				<div className='flex min-w-0 flex-1 items-start gap-2.5'>
					<TaskLeadRail className='pt-0.5'>
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
					<div className='min-w-0 space-y-2'>
						<div className='flex flex-wrap items-center gap-2'>
							<p
								className={cn(
									'text-left text-sm font-semibold transition-colors group-hover:text-primary',
									task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground',
								)}
							>
								{task.title}
							</p>
							{task.pinned ? <Badge variant='secondary'>已 Pin</Badge> : null}
							<Badge variant='outline'>{getTaskMetaLabel(task, activeViewKey)}</Badge>
						</div>
						<p className='text-sm leading-6 text-muted-foreground'>
							{task.note?.trim() || '当前任务还没有补充备注，可直接打开 Drawer 完成上下文编辑。'}
						</p>
					</div>
				</div>

				<div className='flex shrink-0 flex-wrap items-center gap-2'>
					<Button
						aria-label={task.pinned ? `取消 pin ${task.title}` : `pin ${task.title}`}
						disabled={isPending}
						onClick={(event) => {
							event.stopPropagation()
							void onToggleTaskPin(task)
						}}
						size='sm'
						variant={task.pinned ? 'secondary' : 'outline'}
					>
						{isPending ? '处理中...' : task.pinned ? '取消 Pin' : 'Pin 到 Focus'}
					</Button>
				</div>
			</div>
		</TaskContextMenu>
	)
}

function getFocusViewLabel(activeViewKey: FocusViewKey) {
	switch (activeViewKey) {
		case 'focus':
			return 'Focus'
		case 'upcoming':
			return 'Upcoming'
		case 'recent':
			return '最近添加'
		case 'high_priority':
			return '高优先级'
	}
}

function getEmptyTitle(activeViewKey: FocusViewKey) {
	switch (activeViewKey) {
		case 'focus':
			return '当前还没有 Pin 到 Focus 的任务'
		case 'upcoming':
			return '当前没有带截止时间的任务'
		case 'recent':
			return '当前时间窗内没有最近添加的任务'
		case 'high_priority':
			return '当前没有高优先级任务'
	}
}

function getEmptyDescription(activeViewKey: FocusViewKey) {
	switch (activeViewKey) {
		case 'focus':
			return '在列表中 Pin 任务后，它会出现在这里，作为你的手动聚焦入口。'
		case 'upcoming':
			return '带截止时间的执行任务会出现在这里，便于你按时间排序推进。'
		case 'recent':
			return '切换时间窗或继续捕获新任务后，这里会自动回看最近新增的执行项。'
		case 'high_priority':
			return '优先级为高或紧急的任务会自动聚合到这里。'
	}
}

type RecentWindowFilterProps = {
	value: FocusRecentTimeWindow
	onWindowChange: (window: FocusRecentTimeWindow) => void
}

function RecentWindowFilter({ value, onWindowChange }: RecentWindowFilterProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button aria-label='筛选' size='icon-sm' type='button' variant='outline'>
					<ListFilterIcon />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				<DropdownMenuGroup>
					{RECENT_TIME_WINDOW_OPTIONS.map((option) => (
						<DropdownMenuItem key={option.value} onSelect={() => onWindowChange(option.value)}>
							<span className={cn(option.value === value ? 'font-semibold text-foreground' : null)}>
								{option.label}
							</span>
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

function getTaskMetaLabel(task: FocusTaskRecord, activeViewKey: FocusViewKey) {
	if (activeViewKey === 'upcoming' && task.dueAt) {
		return `截止 ${formatDateTime(task.dueAt)}`
	}

	if (activeViewKey === 'recent') {
		return `创建于 ${formatDateTime(task.createdAt)}`
	}

	return `更新于 ${formatDateTime(task.updatedAt)}`
}

function formatDateTime(value: string) {
	return new Intl.DateTimeFormat('zh-CN', {
		month: 'numeric',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(value))
}
