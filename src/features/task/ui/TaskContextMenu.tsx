import { useDangerConfirm } from '@/features/danger-confirm'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import {
	createDueDateActionSpec,
	createPriorityActionSpec,
	createStatusActionSpec,
	normalizeMetadataDateValue,
} from '@/features/metadata-fields/core'
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
	CalendarX2Icon,
	CheckIcon,
	FolderIcon,
	MinusIcon,
	TargetIcon,
	Trash2Icon,
} from 'lucide-react'
import { type TaskPriorityValue } from '@/features/task/model/taskPriority'
import { PriorityIcon } from '@/features/task/ui/PriorityIcon'
import { TaskStatusIndicator } from '@/features/task/ui/TaskMetadataSelect'
import { mapMetadataActionSpecToTaskContextMenuGroup } from './task-context-menu-metadata'

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
	dangerEntityLabel?: string
}

type TaskContextSelectionValues = {
	statuses: TaskStatus[]
	priorities: TaskPriorityValue[]
	dueDates: Array<string | null>
	projectIds: Array<string | null>
	projectNames?: Array<string | null>
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
	dangerEntityLabel,
}: TaskContextMenuProps) {
	const { requestDangerConfirm } = useDangerConfirm()
	const openCustomDateDialog = useDialogStore((state) => state.openCustomDateDialog)
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
	const normalizedDueDates = (selectionValues?.dueDates ?? [currentDueDate]).map((value) =>
		normalizeDateValue(value),
	)
	const statusGroup = mapMetadataActionSpecToTaskContextMenuGroup(createStatusActionSpec())
	const priorityGroup = mapMetadataActionSpecToTaskContextMenuGroup(createPriorityActionSpec())
	const dateGroup = mapMetadataActionSpecToTaskContextMenuGroup(
		createDueDateActionSpec({
			showClearOption: Array.from(dueDateIndicatorValues).some((value) => value !== null),
		}),
	)
	const projectIndicatorValues = getIndicatorValues(selectionValues?.projectIds ?? [projectId])
	const uniqueNonEmptyDueDates = Array.from(
		new Set(normalizedDueDates.filter((value): value is string => Boolean(value))),
	)
	const customDateDialogValue = uniqueNonEmptyDueDates.length === 1 ? uniqueNonEmptyDueDates[0] : null

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
							<ContextMenuLabel className='normal-case tracking-normal'>{statusGroup.label}</ContextMenuLabel>
							{statusGroup.options.map((option) => (
								<PropertyOptionItem
									indicator={getPropertyOptionIndicator(statusIndicatorValues, option.value)}
									icon={option.icon}
									key={option.value}
									onSelect={() => onSelectStatus(option.value)}
									shortcut={option.shortcut}
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
							<ContextMenuLabel className='normal-case tracking-normal'>{priorityGroup.label}</ContextMenuLabel>
							{priorityGroup.options.map((option) => (
								<PropertyOptionItem
									indicator={getPropertyOptionIndicator(priorityIndicatorValues, String(option.value))}
									icon={option.icon}
									key={option.value}
									onSelect={() => onSelectPriority(option.value)}
									shortcut={option.shortcut}
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
								icon={<CalendarX2Icon />}
								shortcut={TASK_CONTEXT_SHORTCUTS.date}
							>
								截止时间
							</PropertySubTrigger>
							<ContextMenuSubContent className='w-64'>
								<ContextMenuLabel className='normal-case tracking-normal'>{dateGroup.label}</ContextMenuLabel>
								{dateGroup.options.map((option) => (
									<PropertyOptionItem
										indicator={getPropertyOptionIndicator(
											dueDateIndicatorValues,
											option.value,
										)}
										disabled={option.disabled}
										icon={option.icon}
										key={option.key}
										onSelect={() => {
											if (option.disabled) {
												return
											}
											if (option.action === 'openCustomDateDialog') {
												openCustomDateDialog({
													fieldKey: 'dueDate',
													label: '截止时间',
													value: customDateDialogValue,
													hasExistingValue: uniqueNonEmptyDueDates.length > 0,
													onSubmit: (nextValue) => onSelectDueDate?.(nextValue),
												})
												return
											}
											onSelectDueDate?.(option.value)
										}}
										shortcut={option.shortcut}
										trailing={option.trailing}
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
								{projectOptions.map((project) => (
									<ContextMenuItem
										key={project.id}
										onSelect={() => onSelectProject?.(project.id)}
									>
										<FolderIcon />
										{project.name}
									</ContextMenuItem>
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
									onSelect={async () => {
										if (
											archiveRequiresConfirm &&
											!(await requestDangerConfirm({
												intent: 'archive',
												entityType: 'task',
												count: 1,
												entityLabel: dangerEntityLabel,
											}))
										) {
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
									onSelect={async () => {
										if (
											moveToTrashRequiresConfirm &&
											!(await requestDangerConfirm({
												intent: 'trash',
												entityType: 'task',
												count: 1,
												entityLabel: dangerEntityLabel,
											}))
										) {
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

function normalizeDateValue(value: string | null | undefined) {
	return normalizeMetadataDateValue(value)
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
