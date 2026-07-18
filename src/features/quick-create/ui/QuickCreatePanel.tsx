import { QuickCreateAdvancedCollapse } from '@/features/quick-create/ui/QuickCreateAdvancedCollapse'
import { QuickCreateComposer } from '@/features/quick-create/ui/QuickCreateComposer'
import { QuickCreateContinuousToast } from '@/features/quick-create/ui/QuickCreateContinuousToast'
import { QuickCreateCreateSection } from '@/features/quick-create/ui/QuickCreateCreateSection'
import { QuickCreateFooter } from '@/features/quick-create/ui/QuickCreateFooter'
import { QuickCreateResults } from '@/features/quick-create/ui/QuickCreateResults'
import { QuickCreateSurface } from '@/features/quick-create/ui/QuickCreateSurface'
import { useQuickCreate } from '@/features/quick-create/domain/QuickCreateDomainProvider'
import { cn } from '@/shared/lib/utils'
import {
	isPresentedSurfacePhase,
	readActiveSessionId,
} from '@/features/quick-create/session/usePresentSession'
import { useQuickCreateSession } from '@/features/quick-create/session/SessionProvider'
import {
	quickCreateChromeClass,
	quickCreateResultsPaneClass,
} from '@/shared/components/patterns/quick-create'

/**
 * 固定壳五行布局：Primary / Advanced / Create / Results(内滚) / Footer。
 * 无标题时不渲染 Create 槽，避免空槽 border 在「最近任务」上方多出一条线。
 */
export function QuickCreatePanel() {
	const { state: sessionState } = useQuickCreateSession()
	const { derived } = useQuickCreate()
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
				className={
					derived.hasTitle
						? 'grid h-full min-h-0 w-full grid-rows-[auto_auto_auto_minmax(0,1fr)_auto]'
						: 'grid h-full min-h-0 w-full grid-rows-[auto_auto_minmax(0,1fr)_auto]'
				}
				data-testid='quick-create-panel'
			>
				<div className={quickCreateChromeClass}>
					<QuickCreateComposer />
				</div>

				<div className='shrink-0 bg-background/96'>
					<QuickCreateAdvancedCollapse />
				</div>

				{derived.hasTitle ? (
					<div className='shrink-0 bg-background/88 px-2 pt-0.5'>
						<QuickCreateCreateSection />
					</div>
				) : null}

				<div className={cn(quickCreateResultsPaneClass, 'pt-0.5')} data-testid='quick-create-results-scroll'>
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
