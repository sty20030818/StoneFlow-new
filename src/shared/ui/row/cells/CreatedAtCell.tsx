import { Clock3Icon } from 'lucide-react'

import { formatShortDate } from '@/shared/lib/date'
import { RowMetaButton, type RowMetaButtonProps } from '@/shared/ui/row/RowFieldCells'

export type CreatedAtCellProps = Omit<
	RowMetaButtonProps,
	'icon' | 'label' | 'trailing' | 'value'
> & {
	value: string | null | undefined
	formatter?: (value: string) => string
	emptyLabel?: string
}

export function CreatedAtCell({
	value,
	formatter = formatShortDate,
	emptyLabel = '-',
	disabled = true,
	...props
}: CreatedAtCellProps) {
	return (
		<RowMetaButton
			{...props}
			disabled={disabled}
			icon={<Clock3Icon className='size-3.5' />}
			label={value ? formatter(value) : emptyLabel}
			trailing={null}
			type='button'
		/>
	)
}
