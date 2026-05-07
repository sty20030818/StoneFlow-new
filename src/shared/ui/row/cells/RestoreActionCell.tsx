import { RotateCcwIcon } from 'lucide-react'

import { RowActionButton, type RowActionButtonProps } from '@/shared/ui/row/RowFieldCells'

export type RestoreActionCellProps = Omit<RowActionButtonProps, 'children'> & {
	onRestore: () => void
	label?: string
}

export function RestoreActionCell({
	onRestore,
	label = '恢复',
	disabled,
	variant = 'outline',
	size = 'sm',
	...props
}: RestoreActionCellProps) {
	return (
		<RowActionButton
			{...props}
			disabled={disabled}
			onClick={onRestore}
			size={size}
			variant={variant}
		>
			<RotateCcwIcon className='size-3.5' />
			{label}
		</RowActionButton>
	)
}
