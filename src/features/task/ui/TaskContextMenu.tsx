import type { TaskStatus } from '@/shared/types'
import { cn } from '@/shared/lib/utils'
import type { ReactNode } from 'react'
import { useRef, useState } from 'react'

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/shared/ui/base/alert-dialog'
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
	MinusIcon,
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
	selectionValues?: TaskContextSelectionValues
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
	moveToTrashRequiresConfirm?: boolean
	archiveRequiresConfirm?: boolean
}

type TaskContextSelectionValues = {
	statuses: TaskStatus[]
	priorities: TaskPriorityValue[]
	dueDates: Array<string | null>
	projectIds: Array<string | null>
	projectNames?: Array<string | null>
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
	selectionValues,
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
	moveToTrashRequiresConfirm = true,
	archiveRequiresConfirm = true,
}: TaskContextMenuProps) {
	const [pendingDangerAction, setPendingDangerAction] = useState<TaskDangerActionKind | null>(null)
	const confirmActionRef = useRef<HTMLButtonElement>(null)
	const canMoveToTrash = !!onMoveToTrash
	const canArchive = !!onArchive
	const canSelectDueDate = !!onSelectDueDate
	const canSelectProject = Boolean(onSelectProject && onSelectNoProject)
	const currentDueDate = normalizeDateValue(dueAt)
	const deleteShortcut = getDeleteShortcutLabel()
	const statusIndicatorValues = getIndicatorValues(selectionValues?.statuses ?? [status])
	const priorityIndicatorValues = getIndicatorValues(
		(selectionValues?.priorities ?? [priority]).map((value) => String(value)),
	)
	const dueDateIndicatorValues = getIndicatorValues(
		(selectionValues?.dueDates ?? [currentDueDate]).map((value) => normalizeDateValue(value)),
	)
	const dateOptions = getTaskContextDateOptions(
		Array.from(dueDateIndicatorValues).some((value) => value !== null),
	)
	const projectIndicatorValues = getIndicatorValues(selectionValues?.projectIds ?? [projectId])
	const projectNameIndicatorValues = getIndicatorValues(selectionValues?.projectNames ?? [projectName])
	const confirmCopy =
		pendingDangerAction === 'archive'
			? {
					title: '归档任务？',
					description: '任务归档后会移到归档页，后续仍可恢复。',
					confirmLabel: '归档',
					destructive: false,
				}
			: pendingDangerAction === 'delete'
				? {
						title: '移入回收站？',
						description: '任务移入回收站后仍可恢复。',
						confirmLabel: moveToTrashLabel,
						destructive: true,
					}
				: null

	function requestDangerActionConfirm(kind: TaskDangerActionKind) {
		setPendingDangerAction(kind)
	}

	function handleDangerActionOpenChange(open: boolean) {
		if (!open) {
			setPendingDangerAction(null)
		}
	}

	function handleConfirmDangerAction() {
		const action = pendingDangerAction
		setPendingDangerAction(null)
		if (action === 'archive') {
			onArchive?.()
			return
		}
		if (action === 'delete') {
			onMoveToTrash?.()
		}
	}

	return (
		<>
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
										indicator={getPropertyOptionIndicator(statusIndicatorValues, option.value)}
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
										indicator={getPropertyOptionIndicator(
											priorityIndicatorValues,
											String(option.value),
										)}
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
									<ContextMenuLabel className='normal-case tracking-normal'>
										设置时间为...
									</ContextMenuLabel>
									{dateOptions.map((option) => (
										<PropertyOptionItem
											indicator={
												!option.disabled
													? getPropertyOptionIndicator(dueDateIndicatorValues, option.value)
													: null
											}
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
									<ContextMenuLabel className='normal-case tracking-normal'>
										移动到项目...
									</ContextMenuLabel>
									<PropertyOptionItem
										indicator={getPropertyOptionIndicator(projectIndicatorValues, null)}
										icon={<TargetIcon />}
										onSelect={() => onSelectNoProject?.()}
										shortcut='0'
									>
										独立事项
									</PropertyOptionItem>
									{projectOptions.map((project, index) => (
										<PropertyOptionItem
											indicator={getProjectOptionIndicator({
												projectId: project.id,
												projectName: project.name,
												projectIds: projectIndicatorValues,
												projectNames: projectNameIndicatorValues,
											})}
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
									<ContextMenuItem
										disabled={isBusy}
										onSelect={() => {
											if (archiveRequiresConfirm) {
												requestDangerActionConfirm('archive')
												return
											}
											onArchive?.()
										}}
									>
										<ArchiveIcon />
										<span>{archiveActionLabel}</span>
										<MenuShortcut>{TASK_CONTEXT_SHORTCUTS.archive}</MenuShortcut>
									</ContextMenuItem>
								) : null}
								{canMoveToTrash ? (
									<ContextMenuItem
										disabled={isBusy}
										onSelect={() => {
											if (moveToTrashRequiresConfirm) {
												requestDangerActionConfirm('delete')
												return
											}
											onMoveToTrash?.()
										}}
										variant='destructive'
									>
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
			<AlertDialog
				onOpenChange={handleDangerActionOpenChange}
				open={pendingDangerAction !== null}
			>
				<AlertDialogContent
					onOpenAutoFocus={(event) => {
						event.preventDefault()
						confirmActionRef.current?.focus({ preventScroll: true })
					}}
				>
					<AlertDialogHeader>
						<AlertDialogTitle>{confirmCopy?.title ?? '确认操作'}</AlertDialogTitle>
						<AlertDialogDescription>{confirmCopy?.description ?? ''}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setPendingDangerAction(null)}>取消</AlertDialogCancel>
						<AlertDialogAction
							className={cn(confirmCopy?.destructive && destructiveActionClass)}
							onClick={(event) => {
								event.preventDefault()
								handleConfirmDangerAction()
							}}
							ref={confirmActionRef}
						>
							{confirmCopy?.confirmLabel ?? '确认'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

type TaskDangerActionKind = 'archive' | 'delete'

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
	checked = false,
	indicator = checked ? 'checked' : null,
	disabled,
	icon,
	onSelect,
	shortcut,
	trailing,
}: {
	children: ReactNode
	checked?: boolean
	indicator?: PropertyOptionIndicator
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
				<PropertyOptionIndicatorIcon indicator={indicator} />
				{shortcut ? <span className='tabular-nums'>{shortcut}</span> : null}
				{!shortcut && trailing ? <span className='tabular-nums'>{trailing}</span> : null}
			</span>
		</ContextMenuItem>
	)
}

type PropertyOptionIndicator = 'checked' | 'mixed' | null

function PropertyOptionIndicatorIcon({ indicator }: { indicator: PropertyOptionIndicator }) {
	if (indicator === 'checked') {
		return <CheckIcon className='size-3.5 text-foreground' />
	}

	if (indicator === 'mixed') {
		return <MinusIcon className='size-3.5 text-foreground' />
	}

	return <CheckIcon className='invisible size-3.5' />
}

function MenuShortcut({ children }: { children: ReactNode }) {
	return <span className='ml-auto text-[11px] text-muted-foreground'>{children}</span>
}

const destructiveActionClass =
	'border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40'

function getIndicatorValues<T>(values: T[]) {
	return new Set(values)
}

function getPropertyOptionIndicator<T>(
	values: Set<T>,
	value: T,
): PropertyOptionIndicator {
	if (!values.has(value)) {
		return null
	}
	return values.size === 1 ? 'checked' : 'mixed'
}

function getProjectOptionIndicator({
	projectId,
	projectName,
	projectIds,
	projectNames,
}: {
	projectId: string
	projectName: string
	projectIds: Set<string | null>
	projectNames: Set<string | null>
}): PropertyOptionIndicator {
	const matchedById = projectIds.has(projectId)
	const matchedByName = projectNames.has(projectName)
	if (!matchedById && !matchedByName) {
		return null
	}

	return projectIds.size === 1 && (projectIds.has(projectId) || projectNames.size <= 1)
		? 'checked'
		: 'mixed'
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
