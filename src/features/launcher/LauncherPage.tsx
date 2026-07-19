import { useEffect, useLayoutEffect } from 'react'

import { dismissBootShell } from '@/shared/lib/bootShell'
import { LauncherDomainProvider } from './domain/LauncherDomainProvider'
import { LauncherPanel } from './chrome/LauncherPanel'
import { LauncherSessionProvider } from './session/SessionProvider'
import { PresentSession } from './session/usePresentSession'

/** 与 Rust `LAUNCHER_PANEL_RADIUS` 对齐：macOS 16 / 其余 8。 */
function applyLauncherPanelRadius() {
	const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
	document.documentElement.style.setProperty('--launcher-panel-radius', isMac ? '16px' : '8px')
}

export function LauncherPage() {
	useLayoutEffect(() => {
		dismissBootShell()
	}, [])

	useEffect(() => {
		document.body.dataset.launcher = 'true'
		applyLauncherPanelRadius()
		return () => {
			delete document.body.dataset.launcher
		}
	}, [])

	return (
		<div className='flex h-full min-h-0 w-full bg-transparent'>
			<LauncherSessionProvider>
				<LauncherDomainProvider>
					<PresentSession />
					<LauncherPanel />
				</LauncherDomainProvider>
			</LauncherSessionProvider>
		</div>
	)
}
