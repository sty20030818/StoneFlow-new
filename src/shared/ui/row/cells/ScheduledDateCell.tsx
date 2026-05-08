import { CalendarDaysIcon } from 'lucide-react'

import { RowMetaButton, type RowMetaButtonProps } from '@/shared/ui/row/RowFieldCells'

export type ScheduledDateCellProps = Omit<RowMetaButtonProps, 'icon' | 'label' | 'value'> & {
	value: string | null | undefined
	labelPrefix?: string
	formatter?: (value: string) => string
}

export function ScheduledDateCell({
	value,
	disabled,
	labelPrefix = '计划',
	formatter = (next) => next,
	...props
}: ScheduledDateCellProps) {
	if (!value) {
		return null
	}

	return (
		<RowMetaButton
			{...props}
			disabled={disabled ?? !value}
			icon={<CalendarDaysIcon className='size-3.5' />}
			label={`${labelPrefix} ${formatter(value)}`}
			trailing={null}
			type='button'
		/>
	)
}
