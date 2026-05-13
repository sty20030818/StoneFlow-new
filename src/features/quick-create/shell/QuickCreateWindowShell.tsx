import { useQuickCreate } from '@/features/quick-create/domain/QuickCreateDomainProvider'
import { QuickCreateLayoutPresenter } from '@/features/quick-create/layout/QuickCreateLayoutPresenter'
import { useQuickCreateSession } from '@/features/quick-create/runtime/useQuickCreateSession'

export function QuickCreateWindowShell() {
	const { derived, state } = useQuickCreate()
	const { state: sessionState } = useQuickCreateSession()
	const layoutRevisionKey = [
		derived.continuousToastVisible,
		derived.displayProjects.length,
		derived.displayTasks.length,
		derived.isSearchEmpty,
		derived.isShowingRecent,
		state.draft.title,
		state.isAdvancedOpen,
	] as const

	if (sessionState.phase.type === 'booting') {
		return <div className='flex h-full min-h-0 flex-1 bg-transparent' />
	}

	return <QuickCreateLayoutPresenter layoutRevisionKey={layoutRevisionKey} />
}
