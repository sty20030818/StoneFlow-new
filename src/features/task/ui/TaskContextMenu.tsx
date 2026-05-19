import type { TaskStatus } from '@/shared/types'
import type { ReactNode } from 'react'

import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from '@/shared/ui/base/context-menu'
import {
	ArchiveIcon,
	CalendarClockIcon,
	CalendarDaysIcon,
	CalendarIcon,
	CalendarX2Icon,
	CheckIcon,
	FolderIcon,
	TargetIcon,
	Trash2Icon,
} from 'lucide-react'
import { TASK_PRIORITY_OPTIONS, type TaskPriorityValue } from '@/features/task/model/taskPriority'
import { TASK_STATUS_OPTIONS } from '@/features/task/model/taskStatus'
import { PriorityIcon } from '@/features/task/ui/PriorityIcon'
import { TaskStatusIndicator } from '@/features/task/ui/TaskMetadataSelect'

type TaskContextMenuProps = {
	children: ReactNode
	status: TaskStatus
	priority: TaskPriorityValue
	dueAt?: string | null
	projectId?: string | null
	projectName?: string | null
	projectOptions?: Array<{ id: string; name: string }>
	isBusy?: boolean
	onSelectStatus: (status: TaskStatus) => void
	onSelectPriority: (priority: TaskPriorityValue) => void
	onSelectDueDate?: (dueAt: string | null) => void
	onSelectProject?: (projectId: string) => void
	onSelectNoProject?: () => void
	onMoveToTrash?: () => void
	onArchive?: () => void
	moveToTrashLabel?: string
	archiveActionLabel?: string
}

type TaskDateMenuOption = {
	key: string
	label: string
	value: string | null
	meta?: string
	shortcut?: string
	disabled?: boolean
	disabledReason?: string
}

const TASK_CONTEXT_SHORTCUTS = {
	status: 'S',
	priority: 'P',
	date: 'D',
	project: '⇧ P',
	archive: 'A',
} as const

/**
 * 任务实体右键菜单只接收当前场景可用动作，避免在页面里重复拼菜单项。
 */
export function TaskContextMenu({
	children,
	status,
	priority,
	dueAt = null,
	projectId = null,
	projectName = null,
	projectOptions = [],
	isBusy,
	onSelectStatus,
	onSelectPriority,
	onSelectDueDate,
	onSelectProject,
	onSelectNoProject,
	onMoveToTrash,
	onArchive,
	moveToTrashLabel = '移入回收站',
	archiveActionLabel = '归档任务',
}: TaskContextMenuProps) {
	const canMoveToTrash = !!onMoveToTrash
	const canArchive = !!onArchive
	const canSelectDueDate = !!onSelectDueDate
	const canSelectProject = Boolean(onSelectProject && onSelectNoProject)
	const currentDueDate = normalizeDateValue(dueAt)
	const dateOptions = getTaskContextDateOptions(Boolean(currentDueDate))
	const deleteShortcut = getDeleteShortcutLabel()

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild onContextMenu={(event) => event.stopPropagation()}>
				{children}
			</ContextMenuTrigger>
			<ContextMenuContent className='w-56'>
				<ContextMenuGroup>
					<ContextMenuSub>
						<PropertySubTrigger
							disabled={isBusy}
							icon={<TaskStatusIndicator status={status} />}
							shortcut={TASK_CONTEXT_SHORTCUTS.status}
						>
							状态
						</PropertySubTrigger>
						<ContextMenuSubContent className='w-64'>
							<ContextMenuLabel className='normal-case tracking-normal'>设置状态为...</ContextMenuLabel>
							{TASK_STATUS_OPTIONS.map((option, index) => (
								<PropertyOptionItem
									checked={option.value === status}
									icon={<TaskStatusIndicator status={option.value} />}
									key={option.value}
									onSelect={() => onSelectStatus(option.value)}
									shortcut={String(index + 1)}
								>
									{option.label}
								</PropertyOptionItem>
							))}
						</ContextMenuSubContent>
					</ContextMenuSub>

					<ContextMenuSub>
						<PropertySubTrigger
							disabled={isBusy}
							icon={<PriorityIcon priority={priority} />}
							shortcut={TASK_CONTEXT_SHORTCUTS.priority}
						>
							优先级
						</PropertySubTrigger>
						<ContextMenuSubContent className='w-64'>
							<ContextMenuLabel className='normal-case tracking-normal'>设置优先级为...</ContextMenuLabel>
							{TASK_PRIORITY_OPTIONS.map((option, index) => (
								<PropertyOptionItem
									checked={option.value === priority}
									icon={<PriorityIcon priority={option.value} />}
									key={option.value}
									onSelect={() => onSelectPriority(option.value)}
									shortcut={String(index)}
								>
									{option.label}
								</PropertyOptionItem>
							))}
						</ContextMenuSubContent>
					</ContextMenuSub>

					{canSelectDueDate ? (
						<ContextMenuSub>
							<PropertySubTrigger
								disabled={isBusy}
								icon={<CalendarDaysIcon />}
								shortcut={TASK_CONTEXT_SHORTCUTS.date}
							>
								时间
							</PropertySubTrigger>
							<ContextMenuSubContent className='w-64'>
								<ContextMenuLabel className='normal-case tracking-normal'>设置时间为...</ContextMenuLabel>
								{dateOptions.map((option) => (
									<PropertyOptionItem
										checked={!option.disabled && option.value === currentDueDate}
										disabled={option.disabled}
										icon={getTaskContextDateIcon(option.key)}
										key={option.key}
										onSelect={() => {
											if (!option.disabled) {
												onSelectDueDate?.(option.value)
											}
										}}
										shortcut={option.shortcut}
										trailing={option.disabledReason ?? option.meta}
									>
										{option.label}
									</PropertyOptionItem>
								))}
							</ContextMenuSubContent>
						</ContextMenuSub>
					) : null}

					{canSelectProject ? (
						<ContextMenuSub>
							<PropertySubTrigger
								disabled={isBusy}
								icon={<FolderIcon />}
								shortcut={TASK_CONTEXT_SHORTCUTS.project}
							>
								项目
							</PropertySubTrigger>
							<ContextMenuSubContent className='w-64'>
								<ContextMenuLabel className='normal-case tracking-normal'>移动到项目...</ContextMenuLabel>
								<PropertyOptionItem
									checked={projectId === null}
									icon={<TargetIcon />}
									onSelect={() => onSelectNoProject?.()}
									shortcut='0'
								>
									独立事项
								</PropertyOptionItem>
								{projectOptions.map((project, index) => (
									<PropertyOptionItem
										checked={project.id === projectId || project.name === projectName}
										icon={<FolderIcon />}
										key={project.id}
										onSelect={() => onSelectProject?.(project.id)}
										shortcut={index < 9 ? String(index + 1) : undefined}
									>
										{project.name}
									</PropertyOptionItem>
								))}
								{projectOptions.length === 0 ? (
									<ContextMenuItem disabled>
										<FolderIcon />
										暂无可移动项目
									</ContextMenuItem>
								) : null}
							</ContextMenuSubContent>
						</ContextMenuSub>
					) : null}
				</ContextMenuGroup>
				{canMoveToTrash || canArchive ? (
					<>
						<ContextMenuSeparator />
						<ContextMenuGroup>
							{canArchive ? (
								<ContextMenuItem disabled={isBusy} onSelect={onArchive}>
									<ArchiveIcon />
									<span>{archiveActionLabel}</span>
									<MenuShortcut>{TASK_CONTEXT_SHORTCUTS.archive}</MenuShortcut>
								</ContextMenuItem>
							) : null}
							{canMoveToTrash ? (
								<ContextMenuItem disabled={isBusy} onSelect={onMoveToTrash} variant='destructive'>
									<Trash2Icon />
									<span>{moveToTrashLabel}</span>
									<MenuShortcut>{deleteShortcut}</MenuShortcut>
								</ContextMenuItem>
							) : null}
						</ContextMenuGroup>
					</>
				) : null}
			</ContextMenuContent>
		</ContextMenu>
	)
}

function PropertySubTrigger({
	children,
	disabled,
	icon,
	shortcut,
}: {
	children: ReactNode
	disabled?: boolean
	icon: ReactNode
	shortcut: string
}) {
	return (
		<ContextMenuSubTrigger disabled={disabled} className='[&>svg:last-child]:ml-1'>
			{icon}
			<span>{children}</span>
			<MenuShortcut>{shortcut}</MenuShortcut>
		</ContextMenuSubTrigger>
	)
}

function PropertyOptionItem({
	children,
	checked,
	disabled,
	icon,
	onSelect,
	shortcut,
	trailing,
}: {
	children: ReactNode
	checked: boolean
	disabled?: boolean
	icon: ReactNode
	onSelect: () => void
	shortcut?: string
	trailing?: ReactNode
}) {
	return (
		<ContextMenuItem disabled={disabled} onSelect={onSelect}>
			{icon}
			<span className='min-w-0 flex-1 truncate'>{children}</span>
			<span className='ml-auto flex min-w-12 items-center justify-end gap-2 text-[11px] text-muted-foreground'>
				<CheckIcon className={checked ? 'size-3.5 text-foreground' : 'invisible size-3.5'} />
				{shortcut ? <span className='tabular-nums'>{shortcut}</span> : null}
				{!shortcut && trailing ? <span className='tabular-nums'>{trailing}</span> : null}
			</span>
		</ContextMenuItem>
	)
}

function MenuShortcut({ children }: { children: ReactNode }) {
	return <span className='ml-auto text-[11px] text-muted-foreground'>{children}</span>
}

function getTaskContextDateOptions(hasExistingDate: boolean): TaskDateMenuOption[] {
	const today = startOfLocalDay(new Date())
	const tomorrow = addLocalDays(today, 1)
	const oneWeek = addLocalDays(today, 7)
	const options: TaskDateMenuOption[] = []

	if (hasExistingDate) {
		options.push({ key: 'none', label: '移除时间', value: null, shortcut: '0' })
	}

	const tomorrowValue = formatLocalDate(tomorrow)
	const weekValue = formatLocalDate(getEndOfLocalWeek(today))
	const oneWeekValue = formatLocalDate(oneWeek)

	options.push(
		{ key: 'tomorrow', label: '明天', value: tomorrowValue, meta: tomorrowValue },
		{ key: 'week', label: '本周', value: weekValue, meta: weekValue },
		{ key: 'one-week', label: '一周', value: oneWeekValue, meta: oneWeekValue },
		{
			key: 'custom',
			label: '自定义日期',
			value: null,
			disabled: true,
			disabledReason: '后续接入',
		},
	)

	return options
}

function getTaskContextDateIcon(key: string) {
	switch (key) {
		case 'none':
			return <CalendarX2Icon />
		case 'week':
		case 'one-week':
			return <CalendarDaysIcon />
		case 'custom':
			return <CalendarClockIcon />
		default:
			return <CalendarIcon />
	}
}

function normalizeDateValue(value: string | null | undefined) {
	if (!value) {
		return null
	}
	return value.slice(0, 10)
}

function startOfLocalDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addLocalDays(date: Date, days: number) {
	const next = new Date(date)
	next.setDate(next.getDate() + days)
	return next
}

function getEndOfLocalWeek(date: Date) {
	const day = date.getDay() === 0 ? 7 : date.getDay()
	return addLocalDays(date, 7 - day)
}

function formatLocalDate(date: Date) {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	return `${year}-${month}-${day}`
}

function isApplePlatform() {
	if (typeof navigator === 'undefined') {
		return false
	}
	return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function getDeleteShortcutLabel() {
	return isApplePlatform() ? '⌘ ⌫' : 'Ctrl ⌫'
}
