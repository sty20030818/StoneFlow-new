import { TagIcon } from 'lucide-react'

import { RowMetaButton, type RowMetaButtonProps } from '@/shared/ui/row/RowFieldCells'

export type TagsCellProps = Omit<RowMetaButtonProps, 'icon' | 'label' | 'value'> & {
	tags?: string[] | null
	placeholder?: string
}

export function TagsCell({
	tags,
	disabled,
	placeholder = '标签',
	...props
}: TagsCellProps) {
	const label = tags && tags.length > 0 ? tags.join(', ') : placeholder

	return (
		<RowMetaButton
			{...props}
			disabled={disabled ?? (!tags || tags.length === 0)}
			icon={<TagIcon className='size-3.5' />}
			label={label}
			type='button'
		/>
	)
}
