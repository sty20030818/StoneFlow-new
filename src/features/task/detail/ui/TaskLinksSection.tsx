import { PlusIcon } from 'lucide-react'

import { DetailMetaButton, DetailSection } from '@/shared/ui/detail'

export function TaskLinksSection() {
	return (
		<DetailSection title='链接'>
			<DetailMetaButton
				icon={<PlusIcon className='size-3.5' />}
				label='添加链接'
			/>
		</DetailSection>
	)
}
