import { formatInboxPriorityLabel } from '@/features/inbox/model/constants'
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
	LINEAR_CARD_ACTIVE_CLASS,
	LINEAR_CARD_BASE_CLASS,
	LINEAR_CARD_DONE_CLASS,
	LINEAR_CARD_IDLE_CLASS,
	LINEAR_EMPTY_STATE_CLASS,
} from '@/shared/ui/linearSurface'
import type {
	FocusRecentTimeWindow,
	FocusTaskRecord,
	FocusViewKey,
} from '@/features/focus/model/types'
import { MainCardHeader, MainCardLayout, MainCardToolbar } from '@/shared/ui/MainCardLayout'
import { ListFilterIcon, PinIcon, SquareCheckBigIcon } from 'lucide-react'

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
		toggleTaskStatus,
	} = useFocusWorkspace(currentSpaceId)
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
			<div className='flex flex-col gap-5 pt-4'>
				<div className='flex flex-col gap-5'>
					{feedback ? (
						<StatusNotice className='text-sm' role='status' size='sm' variant='success'>
							{feedback}
						</StatusNotice>
					) : null}

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
							role='alert'
							variant='danger'
						>
							<p className='text-sm'>{loadError}</p>
						</StatusNotice>
					) : null}

					<FocusTaskPanel
						activeViewKey={activeViewKey}
						activeTaskId={activeDrawerKind === 'task' ? activeDrawerId : null}
						isLoading={isLoading}
						onOpenTask={(taskId) => openDrawer('task', taskId)}
						onToggleTaskPin={toggleTaskPin}
						onToggleTaskStatus={toggleTaskStatus}
						pendingTaskId={pendingTaskId}
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
	onOpenTask: (taskId: string) => void
	onToggleTaskPin: (task: FocusTaskRecord) => Promise<void>
	onToggleTaskStatus: (task: FocusTaskRecord) => Promise<void>
}

function FocusTaskPanel({
	activeViewKey,
	activeTaskId,
	tasks,
	pendingTaskId,
	isLoading,
	onOpenTask,
	onToggleTaskPin,
	onToggleTaskStatus,
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
			<div className={cn(LINEAR_EMPTY_STATE_CLASS, 'px-4 py-8 text-center')}>
				<p className='text-sm font-medium text-foreground'>{getEmptyTitle(activeViewKey)}</p>
				<p className='mt-2 text-sm text-muted-foreground'>{getEmptyDescription(activeViewKey)}</p>
			</div>
		)
	}

	return (
		<div className='flex flex-col gap-3'>
			{tasks.map((task) => (
				<FocusTaskRow
					activeViewKey={activeViewKey}
					isActive={activeTaskId === task.id}
					isPending={pendingTaskId === task.id}
					key={task.id}
					onOpenTask={onOpenTask}
					onToggleTaskPin={onToggleTaskPin}
					onToggleTaskStatus={onToggleTaskStatus}
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
	onOpenTask: (taskId: string) => void
	onToggleTaskPin: (task: FocusTaskRecord) => Promise<void>
	onToggleTaskStatus: (task: FocusTaskRecord) => Promise<void>
}

function FocusTaskRow({
	task,
	activeViewKey,
	isActive,
	isPending,
	onOpenTask,
	onToggleTaskPin,
	onToggleTaskStatus,
}: FocusTaskRowProps) {
	return (
		<div
			aria-label={`打开任务 ${task.title}`}
			className={cn(
				LINEAR_CARD_BASE_CLASS,
				TASK_CARD_INTERACTIVE_CLASS,
				TASK_CARD_GRID_CLASS,
				task.status === 'done' ? LINEAR_CARD_DONE_CLASS : LINEAR_CARD_IDLE_CLASS,
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
					<Badge variant='outline'>{formatInboxPriorityLabel(task.priority)}</Badge>
					{task.pinned ? <Badge variant='secondary'>已 Pin</Badge> : null}
					<Badge variant='outline'>{getTaskMetaLabel(task, activeViewKey)}</Badge>
				</div>
				<p className='text-sm leading-6 text-muted-foreground'>
					{task.note?.trim() || '当前任务还没有补充备注，可直接打开 Drawer 完成上下文编辑。'}
				</p>
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
					<PinIcon data-icon='inline-start' />
					{isPending ? '处理中...' : task.pinned ? '取消 Pin' : 'Pin 到 Focus'}
				</Button>
				<Button
					aria-label={
						task.status === 'todo' ? `标记完成 ${task.title}` : `恢复待执行 ${task.title}`
					}
					disabled={isPending}
					onClick={(event) => {
						event.stopPropagation()
						void onToggleTaskStatus(task)
					}}
					size='sm'
					variant='outline'
				>
					<SquareCheckBigIcon data-icon='inline-start' />
					{isPending ? '处理中...' : task.status === 'todo' ? '标记完成' : '恢复待执行'}
				</Button>
			</div>
		</div>
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
