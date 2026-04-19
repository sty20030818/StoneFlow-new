import { useEffect } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'

import { resolveShellSection } from './shell/config'
import {
	selectActiveSection,
	selectCurrentSpaceId,
	useShellLayoutStore,
} from './shell/model/useShellLayoutStore'
import { ShellLayout } from './shell/ShellLayout'

export function SpaceLayout() {
	const { spaceId = 'default' } = useParams()
	const { pathname } = useLocation()
	const currentSpaceId = useShellLayoutStore(selectCurrentSpaceId)
	const activeSection = useShellLayoutStore(selectActiveSection)
	const setCurrentSpaceId = useShellLayoutStore((state) => state.setCurrentSpaceId)
	const setActiveSection = useShellLayoutStore((state) => state.setActiveSection)

	useEffect(() => {
		if (currentSpaceId !== spaceId) {
			setCurrentSpaceId(spaceId)
		}

		const nextSection = resolveShellSection(pathname)
		if (activeSection !== nextSection) {
			setActiveSection(nextSection)
		}
	}, [activeSection, currentSpaceId, pathname, setActiveSection, setCurrentSpaceId, spaceId])

	return (
		<ShellLayout activeSection={activeSection} currentSpaceId={spaceId}>
			<Outlet />
		</ShellLayout>
	)
}
