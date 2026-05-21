import { PlusIcon } from 'lucide-react'

import { Button } from '@/shared/ui/base/button'
import { DetailSection } from '@/shared/ui/detail'

export function TaskLabelsSection() {
	return (
		<DetailSection title='标签'>
			<div className='flex flex-wrap gap-2'>
				<Button className='h-7 px-2 text-[12px]' disabled type='button' variant='outline'>
					<PlusIcon className='size-3.5' />
					添加标签
				</Button>
			</div>
		</DetailSection>
	)
}
