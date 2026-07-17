import {
	buildShellRouteFromAppRoute,
	resolveShellSectionFromAppRouteOnly,
} from '@/app/navigation/shellRouteBuild'
import {
	isCanonicalWorkRemainder,
	isSingleSettingsRemainder,
	SECTION_SEGMENT_TO_KEY,
	splitPathSegments,
	splitWorkspacePath,
	stripQueryAndHash,
} from '@/app/navigation/shellRouteSegments'
import type {
	AppRoute,
	RouteScope,
	ShellRoute,
	ShellRouteLocationLike,
	ShellSectionKey,
} from '@/app/navigation/shellRouteTypes'

/**
 * 字符串路由解析：仅 memory / IPC / 历史 fallback。
 * 方言 S1：/:scopeKey/<section>[/id]；任务/项目详情仅 space。
 */

export { stripQueryAndHash }

function splitLocationLike(input: ShellRouteLocationLike) {
	if (typeof input !== 'string') {
		return {
			pathname: input.pathname || '/',
			search: input.search ?? '',
			hash: input.hash ?? '',
		}
	}

	const hashStart = input.indexOf('#')
	const withoutHash = hashStart >= 0 ? input.slice(0, hashStart) : input
	const hash = hashStart >= 0 ? input.slice(hashStart) : ''
	const searchStart = withoutHash.indexOf('?')
	const pathname = searchStart >= 0 ? withoutHash.slice(0, searchStart) : withoutHash
	const search = searchStart >= 0 ? withoutHash.slice(searchStart) : ''

	return {
		pathname: pathname || '/',
		search,
		hash,
	}
}

export function parseShellRoute(input: ShellRouteLocationLike): ShellRoute {
	const { pathname, search, hash } = splitLocationLike(input)
	const normalizedPath = stripQueryAndHash(pathname)
	const fullPath = `${normalizedPath}${search}${hash}`
	const appRoute = parseAppRoute(normalizedPath, search, hash, fullPath)
	return buildShellRouteFromAppRoute(appRoute, {
		pathname: normalizedPath,
		search,
		hash,
		fullPath,
	})
}

export function parseAppRoute(
	pathname: string,
	search = '',
	hash = '',
	fullPath = `${pathname}${search}${hash}`,
): AppRoute {
	const segments = splitPathSegments(pathname)

	if (segments.length === 0) {
		return { kind: 'startup', pathname: '/', search, hash, fullPath }
	}

	if (segments.length === 1 && segments[0] === 'quick-create') {
		return { kind: 'quick-create', pathname: '/quick-create', search, hash, fullPath }
	}

	if (segments[0] === 'debug' && segments[1] === 'activity' && segments.length === 2) {
		return { kind: 'debug-activity', pathname: '/debug/activity', search, hash, fullPath }
	}

	const workspace = splitWorkspacePath(pathname)
	if (workspace) {
		return parseWorkRemainder(
			workspace.scope,
			workspace.remainder,
			pathname,
			search,
			hash,
			fullPath,
		)
	}

	return { kind: 'unknown', pathname, search, hash, fullPath }
}

export function resolveShellSection(routeOrPath: AppRoute | string): ShellSectionKey {
	if (typeof routeOrPath !== 'string') {
		return resolveShellSectionFromAppRouteOnly(routeOrPath)
	}
	return resolveShellSectionFromAppRouteOnly(parseAppRoute(stripQueryAndHash(routeOrPath)))
}

export function parseShellScopePath(pathname: string): RouteScope | null {
	const workspace = splitWorkspacePath(stripQueryAndHash(pathname))
	if (!workspace) {
		return null
	}
	const allowDetail = workspace.scope.type === 'space'
	if (!isCanonicalWorkRemainder(workspace.remainder, allowDetail)) {
		return null
	}
	return workspace.scope
}

export function isProjectShellPath(pathname: string) {
	const workspace = splitWorkspacePath(stripQueryAndHash(pathname))
	if (!workspace || workspace.scope.type !== 'space') {
		return false
	}
	return workspace.remainder[0] === 'projects' && workspace.remainder.length === 2
}

export function isShellPath(pathname: string) {
	const route = parseAppRoute(stripQueryAndHash(pathname))
	return route.kind === 'shell-section' || route.kind === 'view'
}

function parseWorkRemainder(
	scope: RouteScope,
	remainder: string[],
	pathname: string,
	search: string,
	hash: string,
	fullPath: string,
): AppRoute {
	if (remainder.length === 0) {
		return { kind: 'unknown', pathname, search, hash, fullPath }
	}

	const head = remainder[0]

	// 任务/项目详情：仅 space scope
	if (scope.type === 'space' && head === 'tasks' && remainder.length === 2) {
		return {
			kind: 'task',
			spaceId: scope.spaceId,
			taskId: remainder[1],
			pathname,
			search,
			hash,
			fullPath,
		}
	}

	if (scope.type === 'space' && head === 'projects' && remainder.length === 2) {
		return {
			kind: 'project',
			spaceId: scope.spaceId,
			projectId: remainder[1],
			pathname,
			search,
			hash,
			fullPath,
		}
	}

	// all 下误进详情 → unknown（运行时 loader 会纠正；memory 不记）
	if (scope.type === 'all' && (head === 'tasks' || head === 'projects') && remainder.length === 2) {
		return { kind: 'unknown', pathname, search, hash, fullPath }
	}

	if (head === 'views' && remainder.length === 2) {
		return {
			kind: 'view',
			scope,
			viewId: remainder[1],
			pathname,
			search,
			hash,
			fullPath,
		}
	}

	if (isSingleSettingsRemainder(remainder)) {
		return {
			kind: 'shell-section',
			scope,
			section: 'settings',
			pathname,
			search,
			hash,
			fullPath,
		}
	}

	if (remainder.length === 1) {
		const section = SECTION_SEGMENT_TO_KEY[head]
		if (section) {
			return {
				kind: 'shell-section',
				scope,
				section,
				pathname,
				search,
				hash,
				fullPath,
			}
		}
	}

	return { kind: 'unknown', pathname, search, hash, fullPath }
}
