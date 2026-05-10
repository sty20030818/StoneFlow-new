import { useEffect } from 'react'

import { QuickCreateProvider } from '@/features/quick-create/model/QuickCreateProvider'
import { QuickCreateRoot } from '@/features/quick-create/ui/QuickCreateRoot'

export function QuickCreatePage() {
	useEffect(() => {
		document.body.dataset.quickCreate = 'true'
		return () => {
			delete document.body.dataset.quickCreate
		}
	}, [])

	return (
		<div className='flex h-full min-h-0 items-stretch bg-transparent p-0.75'>
			<QuickCreateProvider>
				<QuickCreateRoot />
			</QuickCreateProvider>
		</div>
	)
}
