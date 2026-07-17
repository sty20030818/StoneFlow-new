import { useEffect } from 'react'

import { QuickCreateDomainProvider } from '@/features/quick-create/domain/QuickCreateDomainProvider'
import { QuickCreateSessionProvider } from '@/features/quick-create/runtime/QuickCreateSessionProvider'
import { QuickCreateWindowShell } from '@/features/quick-create/shell/QuickCreateWindowShell'

export function QuickCreatePage() {
	useEffect(() => {
		document.body.dataset.quickCreate = 'true'
		return () => {
			delete document.body.dataset.quickCreate
		}
	}, [])

	return (
		<div className='flex h-full min-h-0 w-full bg-transparent'>
			<QuickCreateSessionProvider>
				<QuickCreateDomainProvider>
					<QuickCreateWindowShell />
				</QuickCreateDomainProvider>
			</QuickCreateSessionProvider>
		</div>
	)
}
