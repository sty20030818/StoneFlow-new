import type { ReactNode } from 'react'

import {
	formatDateLabel,
	getQuickDatePreset,
} from '@/features/quick-create/model/QuickCreateProvider'
import type { QuickCreatePopoverKey } from '@/features/quick-create/model/types'
import { Button } from '@/shared/ui/base/button'
import { Calendar } from '@/shared/ui/base/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/base/popover'
import { cn } from '@/shared/lib/utils'

type DateField = 'dueAt' | 'scheduledAt' | 'reminderAt'

type DateControlProps = {
	open: boolean
	field: DateField
	icon: ReactNode
	label: string
	popoverKey: QuickCreatePopoverKey
	value: string | null
	onOpenChange: (open: boolean, key: QuickCreatePopoverKey) => void
	onDateChange: (field: DateField, value: string | null) => void
}

export function DateControl({
	open,
	field,
	icon,
	label,
	popoverKey,
	value,
	onOpenChange,
	onDateChange,
}: DateControlProps) {
	return (
		<Popover onOpenChange={(nextOpen) => onOpenChange(nextOpen, popoverKey)} open={open}>
			<PopoverTrigger asChild>
				<Button
					className={cn(
						value ? 'text-foreground' : 'text-sf-text-quaternary',
					)}
					size='sm'
					variant='outline'
				>
					<span className='text-sf-text-secondary'>{icon}</span>
					{value ? `${label.slice(0, 2)} ${formatDateLabel(value)}` : label}
				</Button>
			</PopoverTrigger>
			<PopoverContent align='start' className='w-74.5 rounded-xl p-0'>
				<div className='flex flex-wrap gap-1 px-3 pt-3'>
					<DatePresetButton field={field} label='今天' preset='today' onDateChange={onDateChange} />
					<DatePresetButton
						field={field}
						label='明天'
						preset='tomorrow'
						onDateChange={onDateChange}
					/>
					<DatePresetButton field={field} label='本周' preset='week' onDateChange={onDateChange} />
					<Button
						className='h-7 rounded-md px-2.5 text-[11.5px]'
						onClick={() => onDateChange(field, null)}
						size='sm'
						variant='ghost'
					>
						清除
					</Button>
				</div>
				<Calendar
					className='mx-auto'
					mode='single'
					onSelect={(selected) => {
						if (!selected) return
						onDateChange(field, getLocalDateValue(selected))
					}}
					selected={value ? new Date(`${value}T00:00:00`) : undefined}
				/>
			</PopoverContent>
		</Popover>
	)
}

function DatePresetButton({
	field,
	label,
	preset,
	onDateChange,
}: {
	field: DateField
	label: string
	preset: 'today' | 'tomorrow' | 'week'
	onDateChange: (field: DateField, value: string | null) => void
}) {
	return (
		<Button
			className='h-7 rounded-md px-2.5 text-[11.5px]'
			onClick={() => onDateChange(field, getQuickDatePreset(preset))}
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
