import { lazy, Suspense } from 'react'

import { useLauncher } from '../domain/LauncherDomainProvider'

const AdvancedMetaBar = lazy(() =>
	import('./AdvancedMetaBar').then((module) => ({ default: module.AdvancedMetaBar })),
)

/**
 * Advanced 壳内折叠：外窗高度不变，只占用 Results 份额。
 */
export function AdvancedCollapse() {
	const { state } = useLauncher()
	if (!state.isAdvancedOpen) return null

	return (
		<div data-testid='launcher-advanced-collapse'>
			<Suspense fallback={null}>
				<AdvancedMetaBar />
			</Suspense>
		</div>
	)
}
