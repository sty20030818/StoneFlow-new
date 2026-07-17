import { QuickCreateLayoutPresenter } from '@/features/quick-create/layout/QuickCreateLayoutPresenter'
import { useQuickCreateSession } from '@/features/quick-create/runtime/useQuickCreateSession'

export function QuickCreateWindowShell() {
	const { state: sessionState } = useQuickCreateSession()

	if (sessionState.phase.type === 'booting') {
		return <div className='flex h-full min-h-0 flex-1 bg-transparent' />
	}

	return <QuickCreateLayoutPresenter />
}
