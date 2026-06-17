import { useEffect, type PropsWithChildren } from 'react'

import type { ShellRoute } from '@/app/routing'
import type { Scope } from '@/shared/types'
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

type ShellRouteLayoutProps = PropsWithChildren<{
	scope: Scope
	shellRoute: ShellRoute
}>

export function ShellRouteLayout({ children, scope, shellRoute }: ShellRouteLayoutProps) {
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

	// 路由壳层统一承接工作区事件同步与导航状态同步。
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
		scopeSpaceId,
		scopeType,
		setActiveSection,
		setCurrentScope,
		shellRoute.section,
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
	}, [isWorkPath, scope])

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
	}, [isWorkPath, scope, shellRoute.fullPath])

	return (
		<ShellLayout
			activeSection={activeSection}
			currentScope={scope}
			currentSpaceId={scope.type === 'space' ? scope.spaceId : fallbackSpaceId}
			shellRoute={shellRoute}
		>
			{children}
		</ShellLayout>
	)
}
