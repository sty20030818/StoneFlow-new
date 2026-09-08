import { createFileRoute, type ParsedLocation } from '@tanstack/react-router'

import { decodeScopeKey } from '@/app/navigation'
import { useRememberCurrentShellRoute } from '@/app/navigation'
import type { Scope } from '@/shared/types'

import { ScopedShellRouteLayout } from '../-scoped-shell-route-layout'

export const Route = createFileRoute('/_shell/$scopeKey')({
	beforeLoad: ({ params, location }): { shellScope: Scope; shellLocation: ParsedLocation } => {
		const scope = decodeScopeKey(params.scopeKey)
		if (!scope) {
			// 非法 scopeKey：交给 notFound / 上层
			return { shellScope: { type: 'all' }, shellLocation: location }
		}
		return { shellScope: scope, shellLocation: location }
	},
	component: ScopeRoute,
})

function ScopeRoute() {
	const { shellScope, shellLocation } = Route.useRouteContext()
	useRememberCurrentShellRoute(shellScope, shellLocation)
	return <ScopedShellRouteLayout location={shellLocation} scope={shellScope} />
}
