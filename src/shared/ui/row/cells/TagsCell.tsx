import { TagIcon } from 'lucide-react'

import { RowMetaButton, type RowMetaButtonProps } from '@/shared/ui/row/RowFieldCells'

export type TagsCellProps = Omit<RowMetaButtonProps, 'icon' | 'label' | 'value'> & {
	tags?: string[] | null
	placeholder?: string
}

export function TagsCell({ tags, disabled, placeholder = '标签', ...props }: TagsCellProps) {
	if (!tags || tags.length === 0) {
		return null
	}

	return (
		<RowMetaButton
			{...props}
			disabled={disabled ?? false}
			icon={<TagIcon className='size-3.5' />}
			label={tags.join(', ')}
			trailing={null}
			type='button'
		/>
	)
}
