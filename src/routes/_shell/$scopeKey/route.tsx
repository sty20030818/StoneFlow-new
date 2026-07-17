import { createFileRoute } from '@tanstack/react-router'

import { decodeScopeKey } from '@/app/navigation/pathDialect'
import { useRememberCurrentShellRoute } from '@/app/navigation/useRememberCurrentShellRoute'
import type { Scope } from '@/shared/types'

import { ScopedShellRouteLayout } from '../-scoped-shell-route-layout'

export const Route = createFileRoute('/_shell/$scopeKey')({
	beforeLoad: ({ params }): { shellScope: Scope } => {
		const scope = decodeScopeKey(params.scopeKey)
		if (!scope) {
			// 非法 scopeKey：交给 notFound / 上层
			return { shellScope: { type: 'all' } }
		}
		return { shellScope: scope }
	},
	component: ScopeRoute,
})

function ScopeRoute() {
	const { shellScope } = Route.useRouteContext()
	useRememberCurrentShellRoute(shellScope)
	return <ScopedShellRouteLayout scope={shellScope} />
}
