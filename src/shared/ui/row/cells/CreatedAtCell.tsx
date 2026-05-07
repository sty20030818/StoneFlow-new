import { Clock3Icon } from 'lucide-react'

import { RowMetaButton, type RowMetaButtonProps } from '@/shared/ui/row/RowFieldCells'

export type CreatedAtCellProps = Omit<
	RowMetaButtonProps,
	'icon' | 'label' | 'trailing' | 'value'
> & {
	value: string | null | undefined
	formatter?: (value: string) => string
	emptyLabel?: string
}

function defaultCreatedAtFormatter(value: string) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return value
	}
	return new Intl.DateTimeFormat('zh-CN', {
		month: 'numeric',
		day: 'numeric',
	}).format(date)
}

export function CreatedAtCell({
	value,
	formatter = defaultCreatedAtFormatter,
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
