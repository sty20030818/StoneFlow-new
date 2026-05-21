import { PlusIcon } from 'lucide-react'

import { Button } from '@/shared/ui/base/button'
import { DetailSection } from '@/shared/ui/detail'

export function TaskLinksSection() {
	return (
		<DetailSection title='链接'>
			<Button className='h-8 w-fit px-2 text-[12px]' type='button' variant='outline'>
				<PlusIcon className='size-3.5' />
				添加链接
			</Button>
		</DetailSection>
	)
}
