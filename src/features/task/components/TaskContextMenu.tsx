import {
	COMMAND_IDS,
	CommandShortcut,
	type CommandId,
	type CommandProjection,
} from '@/features/command'
import { useDialogStore } from '@/features/shell-dialogs'
import { ContextMenu } from '@heroui-pro/react'
import { Header } from '@heroui/react'
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
	projectCommand: (commandId: CommandId) => CommandProjection | null
	onSelectStatus: (status: TaskStatus) => void
	onSelectPriority: (priority: TaskPriorityValue) => void
	onSelectDueDate?: (dueAt: string | null) => void
	onSelectPlacement?: (target: TaskPlacementTarget) => void
	onOpenChange?: (open: boolean) => void
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
	projectCommand,
	onSelectStatus,
	onSelectPriority,
	onSelectDueDate,
	onSelectPlacement,
	onOpenChange,
}: TaskContextMenuProps) {
	// 仅打开时挂载 Content，避免每行常驻整棵菜单子树
	const [menuOpen, setMenuOpen] = useState(false)
	const openCustomDateDialog = useDialogStore((state) => state.openCustomDateDialog)
	const statusCommand = menuOpen ? projectCommand(COMMAND_IDS.taskSetStatus) : null
	const priorityCommand = menuOpen ? projectCommand(COMMAND_IDS.taskSetPriority) : null
	const dateCommand = menuOpen ? projectCommand(COMMAND_IDS.taskOpenDateMenu) : null
	const placementCommand = menuOpen ? projectCommand(COMMAND_IDS.taskChangePlacement) : null
	const archiveCommand = menuOpen ? projectCommand(COMMAND_IDS.taskArchive) : null
	const deleteCommand = menuOpen ? projectCommand(COMMAND_IDS.taskDelete) : null
	const canMoveToTrash = Boolean(deleteCommand?.visible)
	const canArchive = Boolean(archiveCommand?.visible)
	const canSelectDueDate = Boolean(onSelectDueDate && dateCommand?.visible)
	const canSelectPlacement = Boolean(
		onSelectPlacement && placementValue && placementGroups.length > 0 && placementCommand?.visible,
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
		<ContextMenu
			open={menuOpen}
			onOpenChange={(open) => {
				setMenuOpen(open)
				onOpenChange?.(open)
			}}
		>
			<ContextMenu.Trigger
				className='group/task-context-menu block w-full'
				data-open={menuOpen || undefined}
			>
				{children}
			</ContextMenu.Trigger>
			{menuOpen && statusGroup && priorityGroup && dateGroup ? (
				<ContextMenu.Popover className='w-56'>
					<ContextMenu.Menu aria-label='任务操作'>
						<ContextMenu.Section>
							{statusCommand?.visible ? (
								<ContextMenu.SubmenuTrigger>
									<PropertySubTrigger
										disabledReason={statusCommand.disabledReason}
										id='task-status-submenu'
										isDisabled={isBusy || !statusCommand.enabled}
										icon={<TaskStatusIndicator status={status} />}
										shortcut={<CommandShortcut commandId={COMMAND_IDS.taskSetStatus} scope='row' />}
										textValue={statusCommand.label}
									>
										{statusCommand.label}
									</PropertySubTrigger>
									<ContextMenu.Popover className='w-64' placement='right top'>
										<ContextMenu.Menu aria-label='任务状态'>
											<ContextMenu.Section>
												<Header>{statusGroup.label}</Header>
												{statusGroup.options.map((option) => (
													<PropertyOptionItem
														id={`task-status-${String(option.value)}`}
														indicator={getPropertyOptionIndicator(
															statusIndicatorValues,
															option.value,
														)}
														icon={option.icon}
														key={option.value}
														onAction={() => onSelectStatus(option.value)}
														shortcut={option.shortcut}
														textValue={option.label}
													>
														{option.label}
													</PropertyOptionItem>
												))}
											</ContextMenu.Section>
										</ContextMenu.Menu>
									</ContextMenu.Popover>
								</ContextMenu.SubmenuTrigger>
							) : null}

							{priorityCommand?.visible ? (
								<ContextMenu.SubmenuTrigger>
									<PropertySubTrigger
										disabledReason={priorityCommand.disabledReason}
										id='task-priority-submenu'
										isDisabled={isBusy || !priorityCommand.enabled}
										icon={<PriorityIcon priority={priority} />}
										shortcut={
											<CommandShortcut commandId={COMMAND_IDS.taskSetPriority} scope='row' />
										}
										textValue={priorityCommand.label}
									>
										{priorityCommand.label}
									</PropertySubTrigger>
									<ContextMenu.Popover className='w-64' placement='right top'>
										<ContextMenu.Menu aria-label='任务优先级'>
											<ContextMenu.Section>
												<Header>{priorityGroup.label}</Header>
												{priorityGroup.options.map((option) => (
													<PropertyOptionItem
														id={`task-priority-${String(option.value)}`}
														indicator={getPropertyOptionIndicator(
															priorityIndicatorValues,
															String(option.value),
														)}
														icon={option.icon}
														key={option.value}
														onAction={() => onSelectPriority(option.value)}
														shortcut={option.shortcut}
														textValue={option.label}
													>
														{option.label}
													</PropertyOptionItem>
												))}
											</ContextMenu.Section>
										</ContextMenu.Menu>
									</ContextMenu.Popover>
								</ContextMenu.SubmenuTrigger>
							) : null}
							{canSelectDueDate ? (
								<ContextMenu.SubmenuTrigger>
									<PropertySubTrigger
										disabledReason={dateCommand?.disabledReason}
										id='task-due-date-submenu'
										isDisabled={isBusy || !dateCommand?.enabled}
										icon={<CalendarX2Icon />}
										shortcut={
											<CommandShortcut commandId={COMMAND_IDS.taskOpenDateMenu} scope='row' />
										}
										textValue={dateCommand?.label ?? '截止时间'}
									>
										{dateCommand?.label ?? '截止时间'}
									</PropertySubTrigger>
									<ContextMenu.Popover className='w-64' placement='right top'>
										<ContextMenu.Menu aria-label='任务截止时间'>
											<ContextMenu.Section>
												<Header>{dateGroup.label}</Header>
												{dateGroup.options.map((option) => (
													<PropertyOptionItem
														id={`task-due-date-${option.key}`}
														indicator={getPropertyOptionIndicator(
															dueDateIndicatorValues,
															option.value,
														)}
														isDisabled={option.disabled}
														icon={option.icon}
														key={option.key}
														onAction={() => {
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
														textValue={option.label}
														trailing={option.trailing}
													>
														{option.label}
													</PropertyOptionItem>
												))}
											</ContextMenu.Section>
										</ContextMenu.Menu>
									</ContextMenu.Popover>
								</ContextMenu.SubmenuTrigger>
							) : null}

							{canSelectPlacement ? (
								<ContextMenu.SubmenuTrigger>
									<PropertySubTrigger
										disabledReason={placementCommand?.disabledReason}
										id='task-placement-submenu'
										isDisabled={isBusy || !placementCommand?.enabled}
										icon={getPlacementIcon(placementValue!)}
										shortcut={
											<CommandShortcut commandId={COMMAND_IDS.taskChangePlacement} scope='row' />
										}
										textValue={placementCommand?.label ?? '归属'}
									>
										{placementCommand?.label ?? '归属'}
									</PropertySubTrigger>
									<ContextMenu.Popover className='w-64' placement='right top'>
										<ContextMenu.Menu aria-label='移动到项目'>
											{placementGroups.map((group) => (
												<ContextMenu.Section key={group.spaceId}>
													<Header>{group.heading}</Header>
													{group.items.map((item) => (
														<PropertyOptionItem
															id={`task-placement-${item.key}`}
															indicator={getPlacementOptionIndicator(
																placementIndicatorValues,
																item.target,
															)}
															icon={getPlacementIcon(item.target)}
															key={item.key}
															onAction={() => onSelectPlacement?.(item.target)}
															shortcut={item.showsDigit ? item.digit : undefined}
															textValue={item.title}
														>
															{item.title}
														</PropertyOptionItem>
													))}
												</ContextMenu.Section>
											))}
										</ContextMenu.Menu>
									</ContextMenu.Popover>
								</ContextMenu.SubmenuTrigger>
							) : null}
						</ContextMenu.Section>
						{canMoveToTrash || canArchive ? (
							<>
								<ContextMenu.Separator />
								<ContextMenu.Section>
									{canArchive ? (
										<ContextMenu.Item
											aria-description={
												isBusy ? '正在更新任务，暂时无法归档' : archiveCommand?.disabledReason
											}
											id='task-archive'
											isDisabled={isBusy || !archiveCommand?.enabled}
											onAction={() => void archiveCommand?.execute({ source: 'context-menu' })}
											textValue={archiveCommand?.label}
										>
											<ArchiveIcon />
											<span>{archiveCommand?.label}</span>
											<MenuShortcut>
												<CommandShortcut commandId={COMMAND_IDS.taskArchive} scope='row' />
											</MenuShortcut>
										</ContextMenu.Item>
									) : null}
									{canMoveToTrash ? (
										<ContextMenu.Item
											aria-description={
												isBusy ? '正在更新任务，暂时无法移到回收站' : deleteCommand?.disabledReason
											}
											id='task-move-to-trash'
											isDisabled={isBusy || !deleteCommand?.enabled}
											onAction={() => void deleteCommand?.execute({ source: 'context-menu' })}
											textValue={deleteCommand?.label}
											variant='danger'
										>
											<Trash2Icon />
											<span>{deleteCommand?.label}</span>
											<MenuShortcut>
												<CommandShortcut commandId={COMMAND_IDS.taskDelete} scope='row' />
											</MenuShortcut>
										</ContextMenu.Item>
									) : null}
								</ContextMenu.Section>
							</>
						) : null}
					</ContextMenu.Menu>
				</ContextMenu.Popover>
			) : null}
		</ContextMenu>
	)
}
