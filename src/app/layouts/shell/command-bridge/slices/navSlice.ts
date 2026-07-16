import { startTransition } from 'react'

import type { ShellCommandActions, ShellNavigationTarget } from '@/features/command'
import { openShellNavigationTarget } from '@/app/navigation/intents'
import { requestSidebarToggle } from '@/shared/ui/base/sidebar'
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
