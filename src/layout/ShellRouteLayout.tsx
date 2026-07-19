import { useEffect, type PropsWithChildren } from 'react'
import { useNavigate } from '@tanstack/react-router'

import type { ShellRoute } from '@/app/navigation'
import { openSection } from '@/app/navigation'
import type { Scope } from '@/shared/types'
import { ShellRouteProvider } from '@/app/navigation'
import { AppLayout } from './AppLayout'
import { ShellProvider } from './model/ShellContext'
import { setActiveScope } from '@/features/space'
import { useSpaces } from '@/features/space'
import { useWorkspaceSync } from '@/features/workspace'

type ShellRouteLayoutProps = PropsWithChildren<{
	scope: Scope
	shellRoute: ShellRoute
}>

function toSectionNavigationTarget(section: ShellRoute['section']) {
	return section === 'noProject' ? 'no-project' : section
}

/**
 * 工作区壳入口：URL → 只读壳上下文，不再镜像可写 nav store。
 * - activeSection / spaceId 直接来自 shellRoute + scope
 * - all scope 下 currentSpaceId 回退到默认/首个可见 space（供创建等）
 */
export function ShellRouteLayout({ children, scope, shellRoute }: ShellRouteLayoutProps) {
	const navigate = useNavigate({ from: '/' })
	const isWorkPath = shellRoute.isWorkPath
	const { spaces } = useSpaces()
	const activeSection = shellRoute.section
	const fallbackSpaceId = spaces.find((space) => space.isDefault)?.id ?? spaces[0]?.id ?? null
	const routeSpaceIsMissing =
		isWorkPath &&
		scope.type === 'space' &&
		spaces.length > 0 &&
		!spaces.some((space) => space.id === scope.spaceId)

	useWorkspaceSync(scope)

	useEffect(() => {
		if (!routeSpaceIsMissing || !fallbackSpaceId) {
			return
		}

		void navigate({
			to: openSection(
				{
					type: 'space',
					spaceId: fallbackSpaceId,
				},
				toSectionNavigationTarget(shellRoute.section),
				fallbackSpaceId,
			) as never,
			replace: true,
		})
	}, [fallbackSpaceId, navigate, routeSpaceIsMissing, shellRoute.section])

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

	const resolvedSpaceId = scope.type === 'space' ? scope.spaceId : fallbackSpaceId

	return (
		<ShellRouteProvider shellRoute={shellRoute}>
			<ShellProvider
				value={{
					scope,
					shellRoute,
					currentSpaceId: resolvedSpaceId,
					activeSection,
				}}
			>
				<AppLayout
					activeSection={activeSection}
					currentScope={scope}
					currentSpaceId={resolvedSpaceId}
					shellRoute={shellRoute}
				>
					{children}
				</AppLayout>
			</ShellProvider>
		</ShellRouteProvider>
	)
}
