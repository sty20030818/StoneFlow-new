import { useDangerConfirm } from '@/features/danger-confirm'
import { COMMAND_IDS, CommandShortcut } from '@/features/command'
import { useDialogStore } from '@/features/shell-dialogs'
import {
	createDueDateActionSpec,
	createPriorityActionSpec,
	createStatusActionSpec,
	getTaskPlacementTargetValue,
	normalizeMetadataDateValue,
	type TaskPlacementGroup,
	type TaskPlacementTarget,
} from '@/features/metadata-fields'
import type { TaskStatus } from '@/shared/types'
import { useState, type ReactNode } from 'react'
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuTrigger,
} from '@/shared/components/base/context-menu'
import { ArchiveIcon, CalendarX2Icon, Trash2Icon } from 'lucide-react'
import { type TaskPriorityValue } from '@/features/task/model/taskPriority'
import { PriorityIcon } from '@/features/task/model/indicators/PriorityIcon'
import { TaskStatusIndicator } from '@/features/task/model/indicators/TaskStatusIndicator'
import { mapMetadataActionSpecToTaskContextMenuGroup } from './task-context-menu-metadata'
import {
	getIndicatorValues,
	getPlacementOptionIndicator,
	getPropertyOptionIndicator,
} from './task-context-menu-helpers'
import {
	getPlacementIcon,
	MenuShortcut,
	PropertyOptionItem,
	PropertySubTrigger,
} from './task-context-menu-items'

type TaskContextMenuProps = {
	children: ReactNode
	status: TaskStatus
	priority: TaskPriorityValue
	dueAt?: string | null
	selectionValues?: TaskContextSelectionValues
	placementGroups?: TaskPlacementGroup[]
	placementValue?: TaskPlacementTarget
	isBusy?: boolean
	onSelectStatus: (status: TaskStatus) => void
	onSelectPriority: (priority: TaskPriorityValue) => void
	onSelectDueDate?: (dueAt: string | null) => void
	onSelectPlacement?: (target: TaskPlacementTarget) => void
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
	placements: TaskPlacementTarget[]
	projectNames?: Array<string | null>
}

/**
 * 任务实体右键菜单只接收当前场景可用动作，避免在页面里重复拼菜单项。
 */
export function TaskContextMenu({
	children,
	status,
	priority,
	dueAt = null,
	selectionValues,
	placementGroups = [],
	placementValue,
	isBusy,
	onSelectStatus,
	onSelectPriority,
	onSelectDueDate,
	onSelectPlacement,
	onMoveToTrash,
	onArchive,
	moveToTrashLabel = '移入回收站',
	archiveActionLabel = '归档任务',
	moveToTrashRequiresConfirm = true,
	archiveRequiresConfirm = true,
	dangerEntityLabel,
}: TaskContextMenuProps) {
	// 仅打开时挂载 Content，避免每行常驻整棵菜单子树
	const [menuOpen, setMenuOpen] = useState(false)
	const { requestDangerConfirm } = useDangerConfirm()
	const openCustomDateDialog = useDialogStore((state) => state.openCustomDateDialog)
	const canMoveToTrash = !!onMoveToTrash
	const canArchive = !!onArchive
	const canSelectDueDate = !!onSelectDueDate
	const canSelectPlacement = Boolean(
		onSelectPlacement && placementValue && placementGroups.length > 0,
	)
	const currentDueDate = normalizeMetadataDateValue(dueAt)
	const statusIndicatorValues = getIndicatorValues(selectionValues?.statuses ?? [status])
	const priorityIndicatorValues = getIndicatorValues(
		(selectionValues?.priorities ?? [priority]).map((value) => String(value)),
	)
	const dueDateIndicatorValues = getIndicatorValues(
		(selectionValues?.dueDates ?? [currentDueDate]).map((value) =>
			normalizeMetadataDateValue(value),
		),
	)
	const normalizedDueDates = (selectionValues?.dueDates ?? [currentDueDate]).map((value) =>
		normalizeMetadataDateValue(value),
	)
	const statusGroup = menuOpen
		? mapMetadataActionSpecToTaskContextMenuGroup(createStatusActionSpec())
		: null
	const priorityGroup = menuOpen
		? mapMetadataActionSpecToTaskContextMenuGroup(createPriorityActionSpec())
		: null
	const dateGroup = menuOpen
		? mapMetadataActionSpecToTaskContextMenuGroup(
				createDueDateActionSpec({
					showClearOption: Array.from(dueDateIndicatorValues).some((value) => value !== null),
				}),
			)
		: null
	const placementIndicatorValues = getIndicatorValues(
		(selectionValues?.placements ?? (placementValue ? [placementValue] : [])).map((value) =>
			getTaskPlacementTargetValue(value),
		),
	)
	const uniqueNonEmptyDueDates = Array.from(
		new Set(normalizedDueDates.filter((value): value is string => Boolean(value))),
	)
	const customDateDialogValue =
		uniqueNonEmptyDueDates.length === 1 ? uniqueNonEmptyDueDates[0] : null

	return (
		<ContextMenu onOpenChange={setMenuOpen}>
			<ContextMenuTrigger asChild onContextMenu={(event) => event.stopPropagation()}>
				{children}
			</ContextMenuTrigger>
			{menuOpen && statusGroup && priorityGroup && dateGroup ? (
				<ContextMenuContent className='w-56'>
					<ContextMenuGroup>
						<ContextMenuSub>
							<PropertySubTrigger
								disabled={isBusy}
								icon={<TaskStatusIndicator status={status} />}
								shortcut={<CommandShortcut commandId={COMMAND_IDS.taskSetStatus} scope='row' />}
							>
								状态
							</PropertySubTrigger>
							<ContextMenuSubContent className='w-64'>
								<ContextMenuLabel className='normal-case tracking-normal'>
									{statusGroup.label}
								</ContextMenuLabel>
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
								shortcut={<CommandShortcut commandId={COMMAND_IDS.taskSetPriority} scope='row' />}
							>
								优先级
							</PropertySubTrigger>
							<ContextMenuSubContent className='w-64'>
								<ContextMenuLabel className='normal-case tracking-normal'>
									{priorityGroup.label}
								</ContextMenuLabel>
								{priorityGroup.options.map((option) => (
									<PropertyOptionItem
										indicator={getPropertyOptionIndicator(
											priorityIndicatorValues,
											String(option.value),
										)}
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
									shortcut={
										<CommandShortcut commandId={COMMAND_IDS.taskOpenDateMenu} scope='row' />
									}
								>
									截止时间
								</PropertySubTrigger>
								<ContextMenuSubContent className='w-64'>
									<ContextMenuLabel className='normal-case tracking-normal'>
										{dateGroup.label}
									</ContextMenuLabel>
									{dateGroup.options.map((option) => (
										<PropertyOptionItem
											indicator={getPropertyOptionIndicator(dueDateIndicatorValues, option.value)}
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

						{canSelectPlacement ? (
							<ContextMenuSub>
								<PropertySubTrigger
									disabled={isBusy}
									icon={getPlacementIcon(placementValue!)}
									shortcut={
										<CommandShortcut commandId={COMMAND_IDS.taskChangePlacement} scope='row' />
									}
								>
									归属
								</PropertySubTrigger>
								<ContextMenuSubContent className='w-64'>
									<ContextMenuLabel className='normal-case tracking-normal'>
										移动到项目...
									</ContextMenuLabel>
									{placementGroups.map((group) => (
										<div key={group.spaceId}>
											<ContextMenuLabel className='px-2 py-1.5 text-[12px] normal-case tracking-normal text-sf-text-tertiary'>
												{group.heading}
											</ContextMenuLabel>
											{group.items.map((item) => (
												<PropertyOptionItem
													indicator={getPlacementOptionIndicator(
														placementIndicatorValues,
														item.target,
													)}
													icon={getPlacementIcon(item.target)}
													key={item.key}
													onSelect={() => onSelectPlacement?.(item.target)}
													shortcut={item.showsDigit ? item.digit : undefined}
												>
													{item.title}
												</PropertyOptionItem>
											))}
										</div>
									))}
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
										<MenuShortcut>
											<CommandShortcut commandId={COMMAND_IDS.taskArchive} scope='row' />
										</MenuShortcut>
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
										<MenuShortcut>
											<CommandShortcut commandId={COMMAND_IDS.taskDelete} scope='row' />
										</MenuShortcut>
									</ContextMenuItem>
								) : null}
							</ContextMenuGroup>
						</>
					) : null}
				</ContextMenuContent>
			) : null}
		</ContextMenu>
	)
}
