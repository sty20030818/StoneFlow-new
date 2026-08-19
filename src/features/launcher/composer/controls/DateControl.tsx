import type { ReactNode } from 'react'
import { Button, Input, Popover } from '@heroui/react'

import { formatDateLabel, getLauncherDatePreset } from '../../model/launcherFormatters'
import type { LauncherPopoverKey } from '../../model/types'

type DateField = 'dueAt' | 'plannedAt' | 'remindAt'

type DateControlProps = {
	open: boolean
	field: DateField
	icon: ReactNode
	label: string
	popoverKey: LauncherPopoverKey
	value: string | null
	onOpenChange: (open: boolean, key: LauncherPopoverKey) => void
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
		<Popover isOpen={open} onOpenChange={(nextOpen) => onOpenChange(nextOpen, popoverKey)}>
			<Button className={value ? 'text-foreground' : 'text-muted'} size='sm' variant='outline'>
				<span className='text-muted'>{icon}</span>
				{value ? `${label.slice(0, 2)} ${formatDateLabel(value)}` : label}
			</Button>
			<Popover.Content className='w-72' placement='bottom start'>
				<Popover.Dialog aria-label={`设置${label}`} className='space-y-3'>
					<div className='flex flex-wrap gap-1'>
						<DatePresetButton
							field={field}
							label='今天'
							preset='today'
							onDateChange={onDateChange}
						/>
						<DatePresetButton
							field={field}
							label='明天'
							preset='tomorrow'
							onDateChange={onDateChange}
						/>
						<DatePresetButton
							field={field}
							label='本周'
							preset='week'
							onDateChange={onDateChange}
						/>
						<Button onPress={() => onDateChange(field, null)} size='sm' variant='ghost'>
							清除
						</Button>
					</div>
					<Input
						aria-label={`${label}日期`}
						fullWidth
						type='date'
						value={value ?? ''}
						onChange={(event) => {
							if (event.currentTarget.value) {
								onDateChange(field, event.currentTarget.value)
							}
						}}
					/>
				</Popover.Dialog>
			</Popover.Content>
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
			onPress={() => onDateChange(field, getLauncherDatePreset(preset))}
			size='sm'
			variant='ghost'
		>
			{label}
		</Button>
	)
}
