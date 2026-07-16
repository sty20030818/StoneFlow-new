import { startTransition } from 'react'

import type { ShellCommandActions } from '@/features/command'
import type { ShellNavigationTarget } from '@/shared/types'
import { openShellNavigationTarget } from '@/app/navigation/intents'
import { requestSidebarToggle } from '@/shared/components/base/sidebar'
import type { ShellCommandBridgeDeps } from '../types'

/** 导航、侧栏、会话前进后退 */
export function createNavSlice(
	deps: Pick<
		ShellCommandBridgeDeps,
		'navigate' | 'currentScope' | 'currentSpaceId' | 'goBack' | 'goForward'
	>,
): Partial<ShellCommandActions> {
	return {
		toggleSidebar: () => {
			requestSidebarToggle()
		},
		navigateTo: (target: ShellNavigationTarget) => {
			startTransition(() => {
				void deps.navigate({
					to: openShellNavigationTarget(target, {
						scope: deps.currentScope,
						fallbackSpaceId: deps.currentSpaceId,
					}) as never,
				})
			})
		},
		goBack: deps.goBack,
		goForward: deps.goForward,
	}
}
