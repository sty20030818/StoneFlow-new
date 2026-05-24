import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { resolveShellSection } from '@/app/routing'
import { rememberShellRoute } from './shell/model/shellDevicePreferences'
import {
	selectActiveSection,
	selectCurrentSpaceId,
	selectCurrentScopeType,
	useShellNavStore,
} from './shell/model/useShellNavStore'
import { ShellLayout } from './shell/ShellLayout'
import { setActiveScope } from '@/features/space/api/spaces'
import { useScopeRoute } from '@/features/space/model/scopeRoute'
import { selectSpaces, useSpaceStore } from '@/features/space/model/useSpaceStore'
import { useWorkspaceSync } from '@/features/workspace/model/useWorkspaceSync'

export function SpaceLayout() {
	const { scope } = useScopeRoute()
	const { pathname, search, hash } = useLocation()
	const spaces = useSpaceStore(selectSpaces)
	const currentSpaceId = useShellNavStore(selectCurrentSpaceId)
	const currentScopeType = useShellNavStore(selectCurrentScopeType)
	const activeSection = useShellNavStore(selectActiveSection)
	const setCurrentScope = useShellNavStore((state) => state.setCurrentScope)
	const setActiveSection = useShellNavStore((state) => state.setActiveSection)
	const fallbackSpaceId =
		currentSpaceId ?? spaces.find((space) => space.isDefault)?.id ?? spaces[0]?.id ?? null

	// 挂载工作区事件同步
	useWorkspaceSync(scope)

	useEffect(() => {
		const nextScopeType = scope.type
		const nextSpaceId = scope.type === 'space' ? scope.spaceId : fallbackSpaceId
		if (currentScopeType !== nextScopeType || currentSpaceId !== nextSpaceId) {
			setCurrentScope(nextScopeType, nextSpaceId)
		}

		const nextSection = resolveShellSection(pathname)
		if (activeSection !== nextSection) {
			setActiveSection(nextSection)
		}
	}, [
		activeSection,
		currentScopeType,
		currentSpaceId,
		fallbackSpaceId,
		pathname,
		scope,
		setActiveSection,
		setCurrentScope,
	])

	useEffect(() => {
		void setActiveScope(scope).catch((error) => {
			console.error('active scope sync failed', {
				scope,
				error,
			})
		})
	}, [scope])

	useEffect(() => {
		void rememberShellRoute(scope, `${pathname}${search}${hash}`).catch((error) => {
			console.error('shell route restore save failed', {
				scope,
				pathname,
				search,
				hash,
				error,
			})
		})
	}, [hash, pathname, scope, search])

	return (
		<ShellLayout
			activeSection={activeSection}
			currentScope={scope}
			currentSpaceId={scope.type === 'space' ? scope.spaceId : fallbackSpaceId}
		>
			<Outlet />
		</ShellLayout>
	)
}
