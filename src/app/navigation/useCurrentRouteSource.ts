import { useCallback } from 'react'
import { trimPathRight, useMatch, useRouter, useRouterState } from '@tanstack/react-router'

/**
 * 查询与 URL 写回属于当前渲染的路由来源。
 * 同页 search 立即反馈；跨页加载期间，旧页不能解释或清理目标页的 search。
 */
export function useCurrentRouteSource() {
	const router = useRouter()
	const match = useMatch({
		strict: false,
		select: (match) => ({ pathname: match.pathname, search: match.search }),
	})
	const location = useRouterState({ select: (state) => state.location })
	const pathname = match.pathname
	const searchStr =
		trimPathRight(location.pathname) === trimPathRight(pathname)
			? location.searchStr
			: router.options.stringifySearch(match.search)
	const isCurrent = useCallback(
		() =>
			trimPathRight(router.state.location.pathname) === trimPathRight(pathname) &&
			router.state.location.searchStr === searchStr,
		[pathname, router, searchStr],
	)

	return { pathname, searchStr, isCurrent }
}
