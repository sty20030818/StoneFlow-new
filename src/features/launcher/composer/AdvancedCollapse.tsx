import { useLauncher } from '../domain/LauncherDomainProvider'
import { AdvancedMetaBar } from './AdvancedMetaBar'
import { cn } from '@/shared/lib/utils'

/**
 * Advanced 壳内折叠：外窗高度不变，只占用 Results 份额。
 */
export function AdvancedCollapse() {
	const { state } = useLauncher()
	const open = state.isAdvancedOpen

	return (
		<div
			aria-hidden={!open}
			className={cn(
				'grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
				open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
			)}
			data-testid='launcher-advanced-collapse'
		>
			<div className='min-h-0 overflow-hidden'>
				<AdvancedMetaBar />
			</div>
		</div>
	)
}
