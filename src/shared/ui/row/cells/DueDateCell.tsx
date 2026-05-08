import { CalendarIcon } from 'lucide-react'

import { RowMetaButton, type RowMetaButtonProps } from '@/shared/ui/row/RowFieldCells'

export type DueDateCellProps = Omit<RowMetaButtonProps, 'icon' | 'label' | 'value'> & {
	value: string | null | undefined
	labelPrefix?: string
	formatter?: (value: string) => string
}

export function DueDateCell({
	value,
	disabled,
	labelPrefix = '截止',
	formatter = (next) => next,
	...props
}: DueDateCellProps) {
	if (!value) {
		return null
	}

	return (
		<RowMetaButton
			{...props}
			disabled={disabled ?? !value}
			icon={<CalendarIcon className='size-3.5' />}
			label={`${labelPrefix} ${formatter(value)}`}
			trailing={null}
			type='button'
		/>
	)
}
