import { startTransition, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useLocation, useNavigate, useRouter } from '@tanstack/react-router'

import { type ShellRoute } from '@/app/navigation/shellRoute'
import { parseShellRoute } from '@/app/navigation/shellRoute'
import type { ShellProjectLink } from '@/layout/config'
import type { Scope, Space } from '@/shared/types'
import { normalizeShellMemoryPath } from '@/app/navigation/routeMemory'
import {
	buildShellRouteHistoryEntry,
	isTrackableRouteHistoryEntry,
	reduceRouteHistory,
	type ShellRouteHistoryEntry,
	type ShellRouteHistoryState,
} from '@/app/navigation/sessionRouteHistoryEntry'

export type { ShellRouteHistoryEntry } from '@/app/navigation/sessionRouteHistoryEntry'
export { buildShellRouteHistoryEntry } from '@/app/navigation/sessionRouteHistoryEntry'

/**
 * 当前应用会话内的最近浏览列表和 Header back/forward 状态。
 * 它不是启动恢复，也不替代浏览器 history；真正前进后退仍走 TanStack Router history。
 * 条目构建与归约纯函数见 sessionRouteHistoryEntry。
 */

type UseShellRouteHistoryOptions = {
	currentScope: Scope
	currentSpaceId: string | null
	currentRoute?: ShellRoute
	spaces: Space[]
	projects: ShellProjectLink[]
	maxEntries?: number
}

const DEFAULT_MAX_HISTORY_ENTRIES = 8
let lastNavigationAction: string = 'POP'

/**
 * 收集当前应用会话内访问过的 Shell 路由，供 Header 的最近浏览和 back/forward 状态使用。
 * 不持久化、不恢复启动路径；启动恢复由 route memory store 负责。
 */
export function useShellSessionRouteHistory({
	currentScope,
	currentSpaceId,
	currentRoute,
	spaces,
	projects,
	maxEntries = DEFAULT_MAX_HISTORY_ENTRIES,
}: UseShellRouteHistoryOptions) {
	const location = useLocation()
	const navigationType = useNavigationType()
	const navigate = useNavigate({ from: '/' })
	const router = useRouter()
	// 有壳注入的 currentRoute 时不再字符串 parse；仅 fallback（无 Provider）才 parse。
	const locationRoute = useMemo(
		() =>
			currentRoute
				? null
				: parseShellRoute({
						pathname: location.pathname,
						search: location.searchStr,
						hash: location.hash ? `#${location.hash}` : '',
					}),
		[currentRoute, location.hash, location.pathname, location.searchStr],
	)
	const route = currentRoute ?? locationRoute!
	const currentPath = normalizeShellMemoryPath(route.fullPath)
	const currentEntry = useMemo(
		() => buildShellRouteHistoryEntry(route, currentScope, currentSpaceId, spaces, projects),
		[route, currentScope, currentSpaceId, spaces, projects],
	)
	const [historyState, setHistoryState] = useState<ShellRouteHistoryState>({
		entries: [],
		currentIndex: -1,
	})

	useEffect(() => {
		if (!isTrackableRouteHistoryEntry(currentEntry)) {
			return
		}

		setHistoryState((previous) =>
			reduceRouteHistory(previous, currentEntry, navigationType, maxEntries),
		)
	}, [currentEntry, maxEntries, navigationType])

	const currentHistoryEntry = historyState.entries[historyState.currentIndex] ?? currentEntry

	const goBack = () => {
		if (historyState.currentIndex <= 0) {
			return
		}

		startTransition(() => {
			router.history.go(-1)
		})
	}

	const goForward = () => {
		if (historyState.currentIndex >= historyState.entries.length - 1) {
			return
		}

		startTransition(() => {
			router.history.go(1)
		})
	}

	const navigateToHistoryEntry = (entry: ShellRouteHistoryEntry) => {
		if (entry.path === currentPath) {
			return
		}

		startTransition(() => {
			void navigate({ to: entry.path as never })
		})
	}

	return {
		entries: historyState.entries.filter((entry) => entry.path !== currentPath).reverse(),
		currentEntry: currentHistoryEntry,
		canGoBack: historyState.currentIndex > 0,
		canGoForward: historyState.currentIndex < historyState.entries.length - 1,
		goBack,
		goForward,
		navigateToHistoryEntry,
	}
}

function useNavigationType() {
	const router = useRouter()

	return useSyncExternalStore(
		(onStoreChange) =>
			router.history.subscribe(({ action }) => {
				lastNavigationAction = action.type
				onStoreChange()
			}),
		() => lastNavigationAction,
		() => 'POP',
	)
}
