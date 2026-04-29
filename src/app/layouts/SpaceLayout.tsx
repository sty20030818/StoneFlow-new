import { useEffect } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'

import { resolveShellSection } from './shell/config'
import {
	selectActiveSection,
	selectCurrentSpaceId,
	useShellNavStore,
} from './shell/model/useShellNavStore'
import { ShellLayout } from './shell/ShellLayout'
import { setActiveSpace } from '@/features/task/api/setActiveSpace'
import { useWorkspaceSync } from '@/features/workspace/model'

export function SpaceLayout() {
	const { spaceId = 'work' } = useParams()
	const { pathname } = useLocation()
	const currentSpaceId = useShellNavStore(selectCurrentSpaceId)
	const activeSection = useShellNavStore(selectActiveSection)
	const setCurrentSpaceId = useShellNavStore((state) => state.setCurrentSpaceId)
	const setActiveSection = useShellNavStore((state) => state.setActiveSection)

	// 挂载工作区事件同步
	useWorkspaceSync(spaceId)

	useEffect(() => {
		if (currentSpaceId !== spaceId) {
			setCurrentSpaceId(spaceId)
		}

		const nextSection = resolveShellSection(pathname)
		if (activeSection !== nextSection) {
			setActiveSection(nextSection)
		}
	}, [activeSection, currentSpaceId, pathname, setActiveSection, setCurrentSpaceId, spaceId])

	useEffect(() => {
		void setActiveSpace(spaceId).catch((error) => {
			console.error('active space sync failed', {
				spaceId,
				error,
			})
		})
	}, [spaceId])

	return (
		<ShellLayout activeSection={activeSection} currentSpaceId={spaceId}>
			<Outlet />
		</ShellLayout>
	)
}
