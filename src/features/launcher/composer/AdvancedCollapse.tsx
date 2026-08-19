import { useLauncher } from '../domain/LauncherDomainProvider'
import { AdvancedMetaBar } from './AdvancedMetaBar'

/**
 * Advanced 壳内折叠：外窗高度不变，只占用 Results 份额。
 */
export function AdvancedCollapse() {
	const { state } = useLauncher()
	if (!state.isAdvancedOpen) return null

	return (
		<div data-testid='launcher-advanced-collapse'>
			<AdvancedMetaBar />
		</div>
	)
}
