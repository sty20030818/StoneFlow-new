import { AdvancedCollapse } from '../composer/AdvancedCollapse'
import { PrimaryMetaBar } from '../composer/PrimaryMetaBar'
import { CreateRow } from '../create/CreateRow'
import { useLauncher } from '../domain/LauncherDomainProvider'
import { ContinuousToast } from '../results/ContinuousToast'
import { LauncherResults } from '../results/LauncherResults'
import { SectionLabel } from '../results/SectionLabel'
import { LauncherFooter } from './LauncherFooter'
import { LauncherSurface } from './LauncherSurface'
import {
	isPresentedSurfacePhase,
	readActiveSessionId,
} from '../session/usePresentSession'
import { useLauncherSession } from '../session/SessionProvider'
import { AppScrollArea } from '@/shared/components/AppScrollArea'
import {
	launcherChromeClass,
	launcherResultsPaneClass,
} from '@/shared/components/patterns/launcher'

/**
 * Launcher 固定壳：Composer / Advanced / Create(条件) / Results(内滚) / Footer。
 * 搜索标题钉在滚动区外，列表单独滚动。
 */
export function LauncherPanel() {
	const { state: sessionState } = useLauncherSession()
	const { derived } = useLauncher()
	const activeSessionId = readActiveSessionId(sessionState.phase)
	const isVisible =
		sessionState.phase.type !== 'booting' &&
		isPresentedSurfacePhase(sessionState.phase) &&
		activeSessionId !== null
	const showSearchHeader = derived.mode === 'search'

	if (sessionState.phase.type === 'booting') {
		return <div className='h-full min-h-0 flex-1 bg-transparent' />
	}

	return (
		<LauncherSurface isVisible={isVisible}>
			<div
				className={
					derived.hasTitle
						? 'grid h-full min-h-0 w-full grid-rows-[auto_auto_auto_minmax(0,1fr)_auto]'
						: 'grid h-full min-h-0 w-full grid-rows-[auto_auto_minmax(0,1fr)_auto]'
				}
				data-testid='launcher-panel'
			>
				<div className={launcherChromeClass}>
					<div className='shrink-0' data-testid='launcher-composer'>
						<PrimaryMetaBar />
					</div>
				</div>

				<div className='shrink-0 bg-background/96'>
					<AdvancedCollapse />
				</div>

				{derived.hasTitle ? (
					<div className='shrink-0 bg-background/88 px-2 pt-0.5'>
						<CreateRow />
					</div>
				) : null}

				<div className={`${launcherResultsPaneClass} flex min-h-0 flex-col`}>
					{showSearchHeader ? (
						<div className='shrink-0 px-2' data-testid='launcher-search-section'>
							<SectionLabel count={derived.flatItems.length} title='搜索结果' />
						</div>
					) : null}

					<ContinuousToast />

					<AppScrollArea
						className='min-h-0 flex-1'
						minThumbHeight={40}
						thumbLengthRatio={0.58}
						trackInsetBottom={8}
						trackInsetTop={4}
						viewportClassName='pt-0.5'
						viewportProps={{
							'data-testid': 'launcher-results-scroll',
						}}
					>
						<LauncherResults />
					</AppScrollArea>
				</div>

				<div className='shrink-0'>
					<LauncherFooter />
				</div>
			</div>
		</LauncherSurface>
	)
}
