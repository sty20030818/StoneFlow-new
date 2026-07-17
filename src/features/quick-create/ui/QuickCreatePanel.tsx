import { QuickCreateAdvancedCollapse } from '@/features/quick-create/ui/QuickCreateAdvancedCollapse'
import { QuickCreateComposer } from '@/features/quick-create/ui/QuickCreateComposer'
import { QuickCreateContinuousToast } from '@/features/quick-create/ui/QuickCreateContinuousToast'
import { QuickCreateCreateSection } from '@/features/quick-create/ui/QuickCreateCreateSection'
import { QuickCreateFooter } from '@/features/quick-create/ui/QuickCreateFooter'
import { QuickCreateResults } from '@/features/quick-create/ui/QuickCreateResults'
import { QuickCreateSurface } from '@/features/quick-create/ui/QuickCreateSurface'
import {
	isPresentedSurfacePhase,
	readActiveSessionId,
} from '@/features/quick-create/session/usePresentSession'
import { useQuickCreateSession } from '@/features/quick-create/session/SessionProvider'

/**
 * 固定壳五行布局：Primary / Advanced / Create / Results(内滚) / Footer。
 * 连续创建 toast 挂在 Results 顶部，不撑外窗。
 */
export function QuickCreatePanel() {
	const { state: sessionState } = useQuickCreateSession()
	const activeSessionId = readActiveSessionId(sessionState.phase)
	const isVisible =
		sessionState.phase.type !== 'booting' &&
		isPresentedSurfacePhase(sessionState.phase) &&
		activeSessionId !== null

	if (sessionState.phase.type === 'booting') {
		return <div className='h-full min-h-0 flex-1 bg-transparent' />
	}

	return (
		<QuickCreateSurface isVisible={isVisible}>
			<div
				className='grid h-full min-h-0 w-full grid-rows-[auto_auto_auto_minmax(0,1fr)_auto]'
				data-testid='quick-create-panel'
			>
				<div className='shrink-0 border-b border-sf-divider/80 bg-background/70'>
					<QuickCreateComposer />
				</div>

				<div className='shrink-0 bg-background/70'>
					<QuickCreateAdvancedCollapse />
				</div>

				<div className='shrink-0 border-b border-sf-divider/80 px-2 pt-0.5'>
					<QuickCreateCreateSection />
				</div>

				<div
					className='min-h-0 overflow-x-hidden overflow-y-auto'
					data-testid='quick-create-results-scroll'
				>
					<QuickCreateContinuousToast />
					<QuickCreateResults />
				</div>

				<div className='shrink-0'>
					<QuickCreateFooter />
				</div>
			</div>
		</QuickCreateSurface>
	)
}
