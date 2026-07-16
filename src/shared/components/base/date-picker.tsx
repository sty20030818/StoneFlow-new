'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/base/button'
import { Calendar } from '@/shared/components/base/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/base/popover'

type DatePickerProps = {
	value?: string
	onChange?: (value: string) => void
	placeholder?: string
	className?: string
	contentClassName?: string
	contentDrawerOwnedOverlay?: boolean
	disabled?: boolean
}

function parseDate(value: string): Date | undefined {
	if (!value) return undefined
	const date = new Date(value)
	return Number.isNaN(date.getTime()) ? undefined : date
}

function formatDate(date: Date | undefined): string {
	if (!date) return ''
	return format(date, 'yyyy-MM-dd')
}

export function DatePicker({
	value,
	onChange,
	placeholder = '选择日期',
	className,
	contentClassName,
	contentDrawerOwnedOverlay = false,
	disabled = false,
}: DatePickerProps) {
	const [open, setOpen] = React.useState(false)
	const date = parseDate(value ?? '')

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					disabled={disabled}
					data-empty={!date}
					className={cn(
						'h-9 w-full justify-start text-left font-normal text-[13px] data-[empty=true]:text-muted-foreground',
						className,
					)}
				>
					<CalendarIcon className='size-4' />
					{date ? format(date, 'PPP') : <span>{placeholder}</span>}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align='start'
				className={cn('w-auto p-0', contentClassName)}
				data-drawer-owned-overlay={contentDrawerOwnedOverlay ? 'true' : undefined}
			>
				<Calendar
					mode='single'
					selected={date}
					onSelect={(selected) => {
						onChange?.(formatDate(selected))
						setOpen(false)
					}}
					autoFocus
				/>
			</PopoverContent>
		</Popover>
	)
}
