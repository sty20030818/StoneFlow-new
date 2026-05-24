import { useShellRoute } from '@/app/routing'
import type { Scope } from '@/shared/types'

/**
 * 从结构化 Shell route 推导 Scope。
 * 保留旧接口，避免页面侧在阶段 3 被迫一次性迁移。
 */
export function useScopeRoute() {
	const route = useShellRoute()
	const scope: Scope = route.scope ?? { type: 'all' }

	return {
		scope,
		spaceId: scope.type === 'space' ? scope.spaceId : null,
	}
}
