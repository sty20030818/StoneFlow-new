import { useDangerConfirm } from '@/features/danger-confirm'
import { COMMAND_IDS, CommandShortcut } from '@/features/command'
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
	onSelectStatus: (status: TaskStatus) => void
	onSelectPriority: (priority: TaskPriorityValue) => void
	onSelectDueDate?: (dueAt: string | null) => void
	onSelectPlacement?: (target: TaskPlacementTarget) => void
	onMoveToTrash?: () => void
	onArchive?: () => void
	onOpenChange?: (open: boolean) => void
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
	onOpenChange,
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
		<ContextMenu
			open={menuOpen}
			onOpenChange={(open) => {
				setMenuOpen(open)
				onOpenChange?.(open)
			}}
		>
			<ContextMenu.Trigger className='block w-full'>{children}</ContextMenu.Trigger>
			{menuOpen && statusGroup && priorityGroup && dateGroup ? (
				<ContextMenu.Popover className='w-56'>
					<ContextMenu.Menu aria-label='任务操作'>
						<ContextMenu.Section>
							<ContextMenu.SubmenuTrigger>
								<PropertySubTrigger
									id='task-status-submenu'
									isDisabled={isBusy}
									icon={<TaskStatusIndicator status={status} />}
									shortcut={<CommandShortcut commandId={COMMAND_IDS.taskSetStatus} scope='row' />}
									textValue='状态'
								>
									状态
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

							<ContextMenu.SubmenuTrigger>
								<PropertySubTrigger
									id='task-priority-submenu'
									isDisabled={isBusy}
									icon={<PriorityIcon priority={priority} />}
									shortcut={<CommandShortcut commandId={COMMAND_IDS.taskSetPriority} scope='row' />}
									textValue='优先级'
								>
									优先级
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
							{canSelectDueDate ? (
								<ContextMenu.SubmenuTrigger>
									<PropertySubTrigger
										id='task-due-date-submenu'
										isDisabled={isBusy}
										icon={<CalendarX2Icon />}
										shortcut={
											<CommandShortcut commandId={COMMAND_IDS.taskOpenDateMenu} scope='row' />
										}
										textValue='截止时间'
									>
										截止时间
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
										id='task-placement-submenu'
										isDisabled={isBusy}
										icon={getPlacementIcon(placementValue!)}
										shortcut={
											<CommandShortcut commandId={COMMAND_IDS.taskChangePlacement} scope='row' />
										}
										textValue='归属'
									>
										归属
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
											id='task-archive'
											isDisabled={isBusy}
											onAction={async () => {
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
											textValue={archiveActionLabel}
										>
											<ArchiveIcon />
											<span>{archiveActionLabel}</span>
											<MenuShortcut>
												<CommandShortcut commandId={COMMAND_IDS.taskArchive} scope='row' />
											</MenuShortcut>
										</ContextMenu.Item>
									) : null}
									{canMoveToTrash ? (
										<ContextMenu.Item
											id='task-move-to-trash'
											isDisabled={isBusy}
											onAction={async () => {
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
											textValue={moveToTrashLabel}
											variant='danger'
										>
											<Trash2Icon />
											<span>{moveToTrashLabel}</span>
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
