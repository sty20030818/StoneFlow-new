import type { AutosaveController } from '@/shared/autosave'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/shared/ui/base/dropdown-menu'
import { DetailFieldRow, DetailMetaButton } from '@/shared/ui/detail'
import { buildDigitShortcutMap, ShortcutDigitSelectLayer } from '@/shared/ui/shortcut-menu'
import { TASK_PRIORITY_OPTIONS } from '@/features/task/model/taskPriority'
import { formatTaskStatusLabel, TASK_STATUS_OPTIONS } from '@/features/task/model/taskStatus'
import type { TaskPriority, TaskStatus } from '@/shared/types'
import { BellIcon, CalendarDaysIcon, CalendarIcon } from 'lucide-react'

import type { TaskDetailDraft } from '../model/taskDetailDraft'
import { PriorityIcon } from '@/features/task/ui/PriorityIcon'
import { TaskStatusIndicator } from '@/features/task/ui/TaskMetadataSelect'
import { DetailMenuOptionRow, getDetailMenuOptionIndicator } from './taskDetailMenuUtils'

type TaskPropertiesSectionProps = {
	autosave: AutosaveController<TaskDetailDraft>
}

export function TaskPropertiesSection({ autosave }: TaskPropertiesSectionProps) {
	const statusShortcutItems = TASK_STATUS_OPTIONS.map((option) => ({
		label: option.label,
		value: option.value,
		disabled: false,
	}))
	const statusDigitShortcutMap = buildDigitShortcutMap(statusShortcutItems)
	const priorityShortcutItems = TASK_PRIORITY_OPTIONS.map((option) => ({
		label: option.label,
		value: option.value,
		disabled: false,
		isEmptyValue: String(option.value) === '0',
	}))
	const priorityDigitShortcutMap = buildDigitShortcutMap(priorityShortcutItems)
	const dueDateMenu = createDateMenuOptions(autosave.draft.dueAt)
	const dueDateDigitShortcutMap = buildDigitShortcutMap(dueDateMenu.shortcutItems)
	const scheduledDateMenu = createDateMenuOptions(autosave.draft.scheduledAt)
	const scheduledDateDigitShortcutMap = buildDigitShortcutMap(scheduledDateMenu.shortcutItems)
	const reminderDateMenu = createDateMenuOptions(autosave.draft.reminderAt)
	const reminderDateDigitShortcutMap = buildDigitShortcutMap(reminderDateMenu.shortcutItems)

	return (
		<div className='space-y-1' data-task-properties='stack'>
			<DetailFieldRow className='items-center' label='状态' labelClassName='pt-0'>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<DetailMetaButton
							aria-label='状态'
							icon={<TaskStatusIndicator status={autosave.draft.status} />}
							label={formatTaskStatusLabel(autosave.draft.status)}
						/>
					</DropdownMenuTrigger>
					<DropdownMenuContent align='start' data-drawer-owned-overlay='true' sideOffset={6}>
						<ShortcutDigitSelectLayer
							items={statusShortcutItems}
							onSelect={(item) =>
								autosave.setField('status', item.value as TaskStatus, { saveMode: 'immediate' })
							}
						/>
						<DropdownMenuLabel>状态</DropdownMenuLabel>
						<DropdownMenuGroup>
							{TASK_STATUS_OPTIONS.map((option, index) => (
								<DropdownMenuItem
									className='gap-2 p-2'
									key={option.value}
									onSelect={() =>
										autosave.setField('status', option.value as TaskStatus, {
											saveMode: 'immediate',
										})
									}
								>
									<DetailMenuOptionRow
										digit={statusDigitShortcutMap[index]?.digit ?? ''}
										icon={<TaskStatusIndicator status={option.value} />}
										indicator={getDetailMenuOptionIndicator(
											new Set([autosave.draft.status]),
											option.value,
										)}
										label={option.label}
									/>
								</DropdownMenuItem>
							))}
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</DetailFieldRow>

			<DetailFieldRow className='items-center' label='优先级' labelClassName='pt-0'>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<DetailMetaButton
							aria-label='优先级'
							icon={<PriorityIcon priority={autosave.draft.priority} size='sm' />}
							label={formatPriorityLabel(autosave.draft.priority)}
						/>
					</DropdownMenuTrigger>
					<DropdownMenuContent align='start' data-drawer-owned-overlay='true' sideOffset={6}>
						<ShortcutDigitSelectLayer
							items={priorityShortcutItems}
							onSelect={(item) =>
								autosave.setField('priority', Number(item.value) as TaskPriority, {
									saveMode: 'immediate',
								})
							}
						/>
						<DropdownMenuLabel>优先级</DropdownMenuLabel>
						<DropdownMenuGroup>
							{TASK_PRIORITY_OPTIONS.map((option, index) => (
								<DropdownMenuItem
									className='gap-2 p-2'
									key={option.value}
									onSelect={() =>
										autosave.setField('priority', option.value as TaskPriority, {
											saveMode: 'immediate',
										})
									}
								>
									<DetailMenuOptionRow
										digit={priorityDigitShortcutMap[index]?.digit ?? ''}
										icon={<PriorityIcon priority={option.value} size='sm' />}
										indicator={getDetailMenuOptionIndicator(
											new Set([autosave.draft.priority]),
											option.value,
										)}
										label={option.label}
									/>
								</DropdownMenuItem>
							))}
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</DetailFieldRow>

			<DetailFieldRow className='items-center' label='截止' labelClassName='pt-0'>
				{renderDateMenu({
					ariaLabel: '截止日期',
					icon: <CalendarIcon className='size-3.5' />,
					label: formatDateValue(autosave.draft.dueAt, '未设置'),
					menu: dueDateMenu,
					digitShortcutMap: dueDateDigitShortcutMap,
					onSelect: (value) => autosave.setField('dueAt', value, { saveMode: 'immediate' }),
				})}
			</DetailFieldRow>

			<DetailFieldRow className='items-center' label='计划' labelClassName='pt-0'>
				{renderDateMenu({
					ariaLabel: '计划日期',
					icon: <CalendarDaysIcon className='size-3.5' />,
					label: formatDateValue(autosave.draft.scheduledAt, '未设置'),
					menu: scheduledDateMenu,
					digitShortcutMap: scheduledDateDigitShortcutMap,
					onSelect: (value) => autosave.setField('scheduledAt', value, { saveMode: 'immediate' }),
				})}
			</DetailFieldRow>

			<DetailFieldRow className='items-center' label='提醒' labelClassName='pt-0'>
				{renderDateMenu({
					ariaLabel: '提醒',
					icon: <BellIcon className='size-3.5' />,
					label: formatDateValue(autosave.draft.reminderAt, '未设置'),
					menu: reminderDateMenu,
					digitShortcutMap: reminderDateDigitShortcutMap,
					onSelect: (value) => autosave.setField('reminderAt', value, { saveMode: 'immediate' }),
				})}
			</DetailFieldRow>
		</div>
	)
}

function renderDateMenu({
	ariaLabel,
	icon,
	label,
	menu,
	digitShortcutMap,
	onSelect,
}: {
	ariaLabel: string
	icon: React.ReactNode
	label: string
	menu: ReturnType<typeof createDateMenuOptions>
	digitShortcutMap: ReturnType<typeof buildDigitShortcutMap>
	onSelect: (value: string) => void
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<DetailMetaButton aria-label={ariaLabel} icon={icon} label={label} />
			</DropdownMenuTrigger>
			<DropdownMenuContent align='start' data-drawer-owned-overlay='true' sideOffset={6}>
				<ShortcutDigitSelectLayer
					items={menu.shortcutItems}
					onSelect={(item) => onSelect(String(item.value))}
				/>
				<DropdownMenuLabel>{ariaLabel}</DropdownMenuLabel>
				<DropdownMenuGroup>
					{menu.options.map((option, index) => (
						<DropdownMenuItem
							className='gap-2 p-2'
							key={option.key}
							onSelect={() => onSelect(option.value)}
						>
							<DetailMenuOptionRow
								digit={digitShortcutMap[index]?.digit ?? ''}
								icon={icon}
								indicator={getDetailMenuOptionIndicator(new Set([menu.currentValue]), option.value)}
								label={option.label}
								trailing={option.meta}
							/>
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

function formatPriorityLabel(priority: TaskPriority) {
	return TASK_PRIORITY_OPTIONS.find((option) => option.value === priority)?.label ?? '无优先级'
}

function formatDateValue(value: string, fallback: string) {
	if (!value) {
		return fallback
	}

	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}

	return new Intl.DateTimeFormat('zh-CN', {
		month: 'numeric',
		day: 'numeric',
	}).format(date)
}

function createDateMenuOptions(currentValue: string) {
	const today = startOfLocalDay(new Date())
	const tomorrow = addLocalDays(today, 1)
	const oneWeek = addLocalDays(today, 7)
	const options = [
		{ key: 'none', label: '未设置', value: '', meta: '' },
		{
			key: 'tomorrow',
			label: '明天',
			value: formatLocalDate(tomorrow),
			meta: formatMetaDate(tomorrow),
		},
		{
			key: 'one-week',
			label: '一周后',
			value: formatLocalDate(oneWeek),
			meta: formatMetaDate(oneWeek),
		},
	]

	return {
		currentValue,
		options,
		shortcutItems: options.map((option, index) => ({
			label: option.label,
			value: option.value,
			disabled: false,
			isEmptyValue: index === 0,
		})),
	}
}

function startOfLocalDay(value: Date) {
	return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function addLocalDays(value: Date, days: number) {
	const next = new Date(value)
	next.setDate(next.getDate() + days)
	return next
}

function formatLocalDate(value: Date) {
	const year = value.getFullYear()
	const month = `${value.getMonth() + 1}`.padStart(2, '0')
	const day = `${value.getDate()}`.padStart(2, '0')
	return `${year}-${month}-${day}`
}

function formatMetaDate(value: Date) {
	return new Intl.DateTimeFormat('zh-CN', {
		month: 'numeric',
		day: 'numeric',
	}).format(value)
}
