import { BellIcon } from 'lucide-react'

import { RowMetaButton, type RowMetaButtonProps } from '@/shared/ui/row/RowFieldCells'

export type ReminderCellProps = Omit<RowMetaButtonProps, 'icon' | 'label' | 'value'> & {
	value: string | null | undefined
	labelPrefix?: string
	formatter?: (value: string) => string
}

export function ReminderCell({
	value,
	disabled,
	labelPrefix = '提醒',
	formatter = (next) => next,
	...props
}: ReminderCellProps) {
	if (!value) {
		return null
	}

	return (
		<RowMetaButton
			{...props}
			disabled={disabled ?? !value}
			icon={<BellIcon className='size-3.5' />}
			label={`${labelPrefix} ${formatter(value)}`}
			trailing={null}
			type='button'
		/>
	)
}
