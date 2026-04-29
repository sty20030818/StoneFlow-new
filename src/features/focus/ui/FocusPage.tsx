import { useState } from 'react'

import {
	selectActiveDrawerId,
	selectActiveDrawerKind,
	selectCurrentSpaceId,
	useShellLayoutStore,
} from '@/app/layouts/shell/model/useShellLayoutStore'
import { MainCardHeader, MainCardLayout, MainCardToolbar } from '@/app/layouts/main-card/MainCardLayout'
import { useTaskSelection } from '@/features/task/model/useTaskSelection'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { TASK_ROW_BULK_SELECTED_CLASS } from '@/features/task/ui/taskRowBulkSelected'
import {
	TaskLeadRail,
	TaskPrioritySelect,
	TaskSelectionCheckbox,
	TaskStatusSelect,
} from '@/features/task/ui/TaskMetadataSelect'
import {
	FOCUS_VIEWS,
	getFocusTasks,
	type FocusViewKey,
	type TaskView,
} from '@/features/workspace'
import { Badge } from '@/shared/ui/base/badge'
import { Button } from '@/shared/ui/base/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyPage,
	EmptyTitle,
} from '@/shared/ui/base/empty'
import { cn } from '@/shared/lib/utils'
import {
	LINEAR_CARD_ACTIVE_CLASS,
	LINEAR_CARD_BASE_CLASS,
	LINEAR_CARD_DONE_CLASS,
	LINEAR_CARD_IDLE_CLASS,
} from '@/shared/ui/linearSurface'
import { TaskContextMenu } from '@/features/task/ui/TaskContextMenu'
import { ListFilterIcon, TargetIcon } from 'lucide-react'

type FocusRecentTimeWindow = 'all' | '7d' | '30d'

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
	const [activeViewKey, setActiveViewKey] = useState<FocusViewKey>('today')
	const [recentTimeWindow, setRecentTimeWindow] = useState<FocusRecentTimeWindow>('all')
	const [tasks, setTasks] = useState(() => getFocusTasks('today'))
	const [bannerMessage, setBannerMessage] = useState(
		'Views 页面保留原来的切换、筛选和任务卡片外观，数据来自本地 mock。',
	)
	const { selectedTaskIdSet, toggleTaskSelection } = useTaskSelection(tasks.map((task) => task.id))
	const showRecentWindow = activeViewKey === 'recent'

	function handleSwitchView(nextViewKey: FocusViewKey) {
		setActiveViewKey(nextViewKey)
		setTasks(getFocusTasks(nextViewKey))
		setBannerMessage(`已切换到 ${FOCUS_VIEWS.find((view) => view.key === nextViewKey)?.name ?? nextViewKey} 视图。`)
	}

	function updateTask(
		taskId: string,
		updater: (task: TaskView) => TaskView,
		message: string,
	) {
		setTasks((currentTasks) =>
			currentTasks.map((task) => (task.id === taskId ? updater(task) : task)),
		)
		setBannerMessage(message)
	}

	function moveTaskToTrash(task: TaskView) {
		setTasks((currentTasks) => currentTasks.filter((currentTask) => currentTask.id !== task.id))
		setBannerMessage(`已从本地 mock ${currentSpaceId} / Views 列表中移除「${task.title}」。`)
	}

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
					onRefresh={() => {
						setTasks(getFocusTasks(activeViewKey))
						setBannerMessage('已刷新本地 mock 视图数据。')
					}}
					pills={FOCUS_VIEWS.map((view) => ({
						label: view.name,
						active: view.key === activeViewKey,
						onClick: () => handleSwitchView(view.key),
						role: 'tab',
					}))}
				/>
			}
		>
			<div className='flex min-h-0 flex-1 flex-col'>
				<div className='mb-3 rounded-md border border-(--sf-color-border-subtle) bg-muted/45 px-3 py-2 text-[12px] text-(--sf-color-shell-secondary)'>
					{bannerMessage}
				</div>

				<div className='flex min-h-0 flex-1 flex-col'>
					<FocusTaskPanel
						activeTaskId={activeDrawerKind === 'task' ? activeDrawerId : null}
						activeViewKey={activeViewKey}
						isLoading={false}
						onCreateTask={() => openTaskCreateDialog()}
						onMoveTaskToTrash={moveTaskToTrash}
						onOpenTask={(taskId) => openDrawer('task', taskId)}
						onToggleTaskPin={(task) =>
							updateTask(
								task.id,
								(currentTask) => ({ ...currentTask, pinned: !currentTask.pinned }),
								'已切换本地 mock Pin 状态。',
							)
						}
						onToggleTaskSelection={toggleTaskSelection}
						onToggleTaskStatus={(task) =>
							updateTask(
								task.id,
								(currentTask) => ({
									...currentTask,
									status: currentTask.status === 'done' ? 'todo' : 'done',
								}),
								'已切换本地 mock 任务状态。',
							)
						}
						onUpdateTaskPriority={(task, priority) =>
							updateTask(
								task.id,
								(currentTask) => ({ ...currentTask, priority }),
								'已更新本地 mock 优先级。',
							)
						}
						onUpdateTaskStatus={(task, status) =>
							updateTask(
								task.id,
								(currentTask) => ({ ...currentTask, status }),
								'已更新本地 mock 状态。',
							)
						}
						pendingTaskId={null}
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
	tasks: TaskView[]
	pendingTaskId: string | null
	isLoading: boolean
	selectedTaskIdSet: Set<string>
	onCreateTask: () => void
	onOpenTask: (taskId: string) => void
	onToggleTaskSelection: (taskId: string) => void
	onToggleTaskPin: (task: TaskView) => void
	onUpdateTaskPriority: (task: TaskView, priority: TaskPriorityValue) => void
	onUpdateTaskStatus: (task: TaskView, status: 'todo' | 'done') => void
	onToggleTaskStatus: (task: TaskView) => void
	onMoveTaskToTrash: (task: TaskView) => void
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
					onMoveTaskToTrash={onMoveTaskToTrash}
					onOpenTask={onOpenTask}
					onToggleTaskPin={onToggleTaskPin}
					onToggleTaskSelection={onToggleTaskSelection}
					onToggleTaskStatus={onToggleTaskStatus}
					onUpdateTaskPriority={onUpdateTaskPriority}
					onUpdateTaskStatus={onUpdateTaskStatus}
					selectedTaskIdSet={selectedTaskIdSet}
					task={task}
				/>
			))}
		</div>
	)
}

type FocusTaskRowProps = {
	task: TaskView
	activeViewKey: FocusViewKey
	isActive: boolean
	isPending: boolean
	selectedTaskIdSet: Set<string>
	onOpenTask: (taskId: string) => void
	onToggleTaskSelection: (taskId: string) => void
	onToggleTaskPin: (task: TaskView) => void
	onUpdateTaskPriority: (task: TaskView, priority: TaskPriorityValue) => void
	onUpdateTaskStatus: (task: TaskView, status: 'todo' | 'done') => void
	onToggleTaskStatus: (task: TaskView) => void
	onMoveTaskToTrash: (task: TaskView) => void
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
			onMoveToTrash={() => onMoveTaskToTrash(task)}
			onOpenDetails={() => onOpenTask(task.id)}
			onTogglePin={() => onToggleTaskPin(task)}
			onToggleStatus={() => onToggleTaskStatus(task)}
			status={task.status}
		>
			<article
				className={cn(
					LINEAR_CARD_BASE_CLASS,
					TASK_CARD_INTERACTIVE_CLASS,
					TASK_CARD_GRID_CLASS,
					task.status === 'done' ? LINEAR_CARD_DONE_CLASS : LINEAR_CARD_IDLE_CLASS,
					isSelected && !isActive ? TASK_ROW_BULK_SELECTED_CLASS : null,
					isActive ? LINEAR_CARD_ACTIVE_CLASS : null,
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
				<div className='min-w-0 space-y-3'>
					<div className='flex min-w-0 items-start gap-2.5'>
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
								onValueChange={(priority) => onUpdateTaskPriority(task, priority)}
								value={task.priority}
							/>
							<TaskStatusSelect
								ariaLabel={`${task.title} 状态`}
								disabled={isPending}
								onValueChange={(status) => onUpdateTaskStatus(task, status)}
								value={task.status}
							/>
						</TaskLeadRail>

						<div className='min-w-0 space-y-2'>
							<div className='flex flex-wrap items-center gap-2'>
								<p
									className={cn(
										'text-sm font-semibold text-foreground',
										task.status === 'done' ? 'line-through text-muted-foreground' : null,
									)}
								>
									{task.title}
								</p>
								{task.pinned ? <Badge variant='secondary'>Pinned</Badge> : null}
								{activeViewKey === 'today' && task.dueLabel ? (
									<Badge variant='outline'>{task.dueLabel}</Badge>
								) : null}
							</div>
							<p className='text-sm leading-6 text-muted-foreground'>
								{task.note?.trim() || '当前任务没有备注。'}
							</p>
						</div>
					</div>
				</div>

				<div className='flex shrink-0 items-center gap-2'>
					{task.projectName ? <Badge variant='outline'>{task.projectName}</Badge> : null}
					<Button
						className='rounded-md'
						onClick={(event) => {
							event.stopPropagation()
							onOpenTask(task.id)
						}}
						size='sm'
						type='button'
						variant='outline'
					>
						详情
					</Button>
				</div>
			</article>
		</TaskContextMenu>
	)
}

function RecentWindowFilter({
	value,
	onWindowChange,
}: {
	value: FocusRecentTimeWindow
	onWindowChange: (value: FocusRecentTimeWindow) => void
}) {
	const currentOption =
		RECENT_TIME_WINDOW_OPTIONS.find((option) => option.value === value) ??
		RECENT_TIME_WINDOW_OPTIONS[0]

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button className='gap-1.5' size='sm' variant='outline'>
					<ListFilterIcon className='size-3.5' />
					<span>{currentOption.label}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end'>
				<DropdownMenuGroup>
					{RECENT_TIME_WINDOW_OPTIONS.map((option) => (
						<DropdownMenuItem key={option.value} onSelect={() => onWindowChange(option.value)}>
							{option.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

function getFocusViewLabel(viewKey: FocusViewKey) {
	return FOCUS_VIEWS.find((view) => view.key === viewKey)?.name ?? viewKey
}

function getEmptyTitle(viewKey: FocusViewKey) {
	return viewKey === 'pinned' ? '当前没有 Pin 的任务' : viewKey === 'recent' ? '最近没有任务变动' : '今天没有任务'
}

function getEmptyDescription(viewKey: FocusViewKey) {
	return viewKey === 'pinned'
		? '给任务加上 Pin 后，它会出现在这里。'
		: viewKey === 'recent'
			? '最近完成或更新的任务会出现在这里。'
			: '今天需要关注的任务会出现在这里。'
}
