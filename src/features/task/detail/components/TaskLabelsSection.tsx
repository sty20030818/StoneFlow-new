import { PlusIcon } from 'lucide-react'

import { DetailFieldRow, DetailMetaButton } from '@/shared/components/detail'

export function TaskLabelsSection() {
	return (
		<DetailFieldRow className='items-center' label='标签' labelClassName='pt-0'>
			<DetailMetaButton disabled icon={<PlusIcon className='size-3.5' />} label='添加标签' />
		</DetailFieldRow>
	)
}
