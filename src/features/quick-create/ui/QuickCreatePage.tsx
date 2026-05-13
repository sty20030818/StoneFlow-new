import { useEffect } from 'react'

import { QuickCreateProvider } from '@/features/quick-create/model/QuickCreateProvider'
import { QuickCreateWindowShell } from '@/features/quick-create/shell/QuickCreateWindowShell'

export function QuickCreatePage() {
	useEffect(() => {
		document.body.dataset.quickCreate = 'true'
		return () => {
			delete document.body.dataset.quickCreate
		}
	}, [])

	return (
		<div className='flex h-full min-h-0 items-start bg-transparent'>
			<QuickCreateProvider>
				<QuickCreateWindowShell />
			</QuickCreateProvider>
		</div>
	)
}
