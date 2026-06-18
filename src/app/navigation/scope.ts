import type { ShellRoute } from '@/app/navigation/shellRoute'
import type { Scope } from '@/shared/types'

const ALL_SCOPE = { type: 'all' } as const satisfies Scope

export function resolveShellRouteScope(shellRoute: Pick<ShellRoute, 'scope' | 'spaceId'>): Scope {
	return (
		shellRoute.scope ??
		(shellRoute.spaceId
			? {
					type: 'space',
					spaceId: shellRoute.spaceId,
				}
			: ALL_SCOPE)
	)
}
