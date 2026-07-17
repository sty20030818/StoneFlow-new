import { useEffect } from 'react'

import { QuickCreateDomainProvider } from '@/features/quick-create/domain/QuickCreateDomainProvider'
import { QuickCreateSessionProvider } from '@/features/quick-create/session/SessionProvider'
import { PresentSession } from '@/features/quick-create/session/usePresentSession'
import { QuickCreatePanel } from '@/features/quick-create/ui/QuickCreatePanel'

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
					<PresentSession />
					<QuickCreatePanel />
				</QuickCreateDomainProvider>
			</QuickCreateSessionProvider>
		</div>
	)
}
