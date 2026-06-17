import { useEffect } from 'react'

import { useShellRoute } from '@/app/routing'
import { Outlet } from '@/app/routing/tanstackCompat'
import { rememberShellRoute } from './shell/model/shellDevicePreferences'
import {
	selectActiveSection,
	selectCurrentSpaceId,
	selectCurrentScopeType,
	useShellNavStore,
} from './shell/model/useShellNavStore'
import { ShellLayout } from './shell/ShellLayout'
import { setActiveScope } from '@/features/space/api/spaces'
import { useSpaces } from '@/features/space/query'
import { useWorkspaceSync } from '@/features/workspace/model/useWorkspaceSync'

const ALL_SCOPE = { type: 'all' as const }

export function SpaceLayout() {
	const shellRoute = useShellRoute()
	const scope = shellRoute.scope ?? ALL_SCOPE
	const isWorkPath = shellRoute.isWorkPath
	const scopeType = scope.type
	const scopeSpaceId = scope.type === 'space' ? scope.spaceId : null
	const { spaces } = useSpaces()
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
		if (!isWorkPath) {
			return
		}

		const nextScopeType = scopeType
		const nextSpaceId = scopeSpaceId ?? fallbackSpaceId
		if (currentScopeType !== nextScopeType || currentSpaceId !== nextSpaceId) {
			setCurrentScope(nextScopeType, nextSpaceId)
		}

		const nextSection = shellRoute.section
		if (activeSection !== nextSection) {
			setActiveSection(nextSection)
		}
	}, [
		activeSection,
		currentScopeType,
		currentSpaceId,
		fallbackSpaceId,
		isWorkPath,
		shellRoute.section,
		scopeSpaceId,
		scopeType,
		setActiveSection,
		setCurrentScope,
	])

	useEffect(() => {
		if (!isWorkPath) {
			return
		}

		void setActiveScope(scope).catch((error) => {
			console.error('active scope sync failed', {
				scope,
				error,
			})
		})
	}, [isWorkPath, scope, scopeSpaceId, scopeType])

	useEffect(() => {
		if (!isWorkPath) {
			return
		}

		void rememberShellRoute(scope, shellRoute.fullPath).catch((error) => {
			console.error('shell route restore save failed', {
				scope,
				path: shellRoute.fullPath,
				error,
			})
		})
	}, [isWorkPath, scope, scopeSpaceId, scopeType, shellRoute.fullPath])

	return (
		<ShellLayout
			activeSection={activeSection}
			currentScope={scope}
			currentSpaceId={scope.type === 'space' ? scope.spaceId : fallbackSpaceId}
			shellRoute={shellRoute}
		>
			<Outlet />
		</ShellLayout>
	)
}
