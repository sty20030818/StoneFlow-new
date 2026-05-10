import type { ReactNode } from 'react'
import { BellIcon, CalendarIcon, CheckIcon, CircleIcon, Clock3Icon, Layers3Icon } from 'lucide-react'

import {
	formatDateLabel,
	formatStatusLabel,
	getQuickDatePreset,
	useQuickCreate,
} from '@/features/quick-create/model/QuickCreateProvider'
import type { QuickCreatePopoverKey, QuickCreateStatus } from '@/features/quick-create/model/types'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/base/button'
import { Calendar } from '@/shared/ui/base/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/base/popover'

const STATUS_OPTIONS: Array<{ value: QuickCreateStatus; label: string; dotClass: string }> = [
	{ value: 'todo', label: '待执行', dotClass: 'bg-sf-text-quaternary' },
	{ value: 'doing', label: '进行中', dotClass: 'bg-primary' },
	{ value: 'done', label: '已完成', dotClass: 'bg-sf-success-surface-text' },
]

export function QuickCreateAdvancedRow() {
	const { actions, derived, state } = useQuickCreate()

	if (!state.isAdvancedOpen) {
		return null
	}

	return (
		<div className='flex flex-wrap items-center gap-2 border-t border-sf-divider px-3 pb-3 pt-0'>
			<Popover
				open={state.activePopover === 'status'}
				onOpenChange={(open) => actions.setPopover(open ? 'status' : null)}
			>
				<PopoverTrigger asChild>
					<Button className='h-7 rounded-md px-2.5 text-[11.5px]' size='sm' variant='ghost'>
						<span
							className={cn(
								'size-2 rounded-full',
								STATUS_OPTIONS.find((option) => option.value === state.draft.status)?.dotClass,
							)}
						/>
						{formatStatusLabel(state.draft.status)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className='w-40 rounded-xl p-1.5' align='start'>
					<div className='px-2 py-1 text-[10.5px] font-medium tracking-[0.06em] text-sf-text-quaternary uppercase'>
						状态
					</div>
					{STATUS_OPTIONS.map((option) => (
						<button
							className='flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[12.5px] hover:bg-accent'
							key={option.value}
							onClick={() => actions.setStatus(option.value)}
							type='button'
						>
							<span className='flex w-4 justify-center text-primary'>
								{option.value === state.draft.status ? <CheckIcon className='size-3.5' /> : null}
							</span>
							<span className={cn('size-2 rounded-full', option.dotClass)} />
							<span>{option.label}</span>
						</button>
					))}
				</PopoverContent>
			</Popover>

			<QuickCreateDateChip
				field='dueAt'
				icon={<CalendarIcon className='size-3.5' />}
				label='截止时间'
				popoverKey='due'
				value={state.draft.dueAt}
			/>
			<QuickCreateDateChip
				field='scheduledAt'
				icon={<Clock3Icon className='size-3.5' />}
				label='计划时间'
				popoverKey='scheduled'
				value={state.draft.scheduledAt}
			/>
			<QuickCreateDateChip
				field='reminderAt'
				icon={<BellIcon className='size-3.5' />}
				label='提醒时间'
				popoverKey='reminder'
				value={state.draft.reminderAt}
			/>

			<Popover
				open={state.activePopover === 'space'}
				onOpenChange={(open) => actions.setPopover(open ? 'space' : null)}
			>
				<PopoverTrigger asChild>
					<Button className='h-7 rounded-md px-2.5 text-[11.5px]' size='sm' variant='ghost'>
						<Layers3Icon className='size-3.5 text-sf-text-secondary' />
						{derived.spaceName}
					</Button>
				</PopoverTrigger>
				<PopoverContent className='w-48 rounded-xl p-1.5' align='end'>
					<div className='px-2 py-1 text-[10.5px] font-medium tracking-[0.06em] text-sf-text-quaternary uppercase'>
						空间
					</div>
					{state.initialState?.spaces.map((space) => (
						<button
							className='flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-[12.5px] hover:bg-accent'
							key={space.id}
							onClick={() => actions.selectSpace(space.id)}
							type='button'
						>
							<span className='flex w-4 justify-center text-primary'>
								{space.id === state.draft.spaceId ? <CheckIcon className='size-3.5' /> : null}
							</span>
							<CircleIcon className='size-3.5 text-sf-text-secondary' />
							<span className='truncate'>{space.name}</span>
						</button>
					))}
				</PopoverContent>
			</Popover>
		</div>
	)
}

function QuickCreateDateChip({
	field,
	icon,
	label,
	popoverKey,
	value,
}: {
	field: 'dueAt' | 'scheduledAt' | 'reminderAt'
	icon: ReactNode
	label: string
	popoverKey: QuickCreatePopoverKey
	value: string | null
}) {
	const { actions, state } = useQuickCreate()

	return (
		<Popover
			open={state.activePopover === popoverKey}
			onOpenChange={(open) => actions.setPopover(open ? popoverKey : null)}
		>
			<PopoverTrigger asChild>
				<Button
					className={cn(
						'h-7 rounded-md px-2.5 text-[11.5px]',
						value ? 'text-foreground' : 'text-sf-text-quaternary',
					)}
					size='sm'
					variant='ghost'
				>
					<span className='text-sf-text-secondary'>{icon}</span>
					{value ? `${label.slice(0, 2)} ${formatDateLabel(value)}` : label}
				</Button>
			</PopoverTrigger>
			<PopoverContent className='w-[298px] rounded-xl p-0' align='start'>
				<div className='border-b border-sf-divider px-3 py-2 text-[10.5px] font-medium tracking-[0.06em] text-sf-text-quaternary uppercase'>
					{label}
				</div>
				<div className='flex flex-wrap gap-1 px-3 pt-3'>
					<DatePresetButton field={field} label='今天' preset='today' />
					<DatePresetButton field={field} label='明天' preset='tomorrow' />
					<DatePresetButton field={field} label='本周' preset='week' />
					<Button
						className='h-7 rounded-md px-2.5 text-[11.5px]'
						onClick={() => actions.setDate(field, null)}
						size='sm'
						variant='ghost'
					>
						清除
					</Button>
				</div>
				<Calendar
					className='mx-auto'
					mode='single'
					selected={value ? new Date(`${value}T00:00:00`) : undefined}
					onSelect={(selected) => {
						if (!selected) return
						actions.setDate(field, getLocalDateValue(selected))
					}}
				/>
			</PopoverContent>
		</Popover>
	)
}

function DatePresetButton({
	field,
	label,
	preset,
}: {
	field: 'dueAt' | 'scheduledAt' | 'reminderAt'
	label: string
	preset: 'today' | 'tomorrow' | 'week'
}) {
	const { actions } = useQuickCreate()

	return (
		<Button
			className='h-7 rounded-md px-2.5 text-[11.5px]'
			onClick={() => actions.setDate(field, getQuickDatePreset(preset))}
			size='sm'
			variant='ghost'
		>
			{label}
		</Button>
	)
}

function getLocalDateValue(date: Date) {
	const year = date.getFullYear()
	const month = `${date.getMonth() + 1}`.padStart(2, '0')
	const day = `${date.getDate()}`.padStart(2, '0')
	return `${year}-${month}-${day}`
}
