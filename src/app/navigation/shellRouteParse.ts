import { isSettingsSectionKey } from '@/features/settings/contract'

import type {
	AppRoute,
	RouteScope,
	SettingsSectionKey,
	ShellRoute,
	ShellRouteLocationLike,
} from '@/app/navigation/shellRouteTypes'

/**
 * 路由解析：URL → ShellRoute / AppRoute 结构化语义。
 * 类型见 shellRouteTypes；谓词见 shellRouteGuards。
 */

const CANONICAL_ALL_PATH = /^\/all(?:\/(.+))?$/
const CANONICAL_SPACE_PATH = /^\/spaces\/([^/]+)(?:\/(.+))?$/
const TASK_DETAIL_PATH = /^\/spaces\/([^/]+)\/tasks\/([^/]+)$/
const PROJECT_PAGE_PATH = /^\/spaces\/([^/]+)\/projects\/([^/]+)$/
const VIEW_DETAIL_REMAINDER = /^views\/([^/]+)$/
/** bare `settings` 或 `settings/<section>`（单段） */
const SETTINGS_REMAINDER = /^settings(?:\/([^/]+))?$/

function stripQueryAndHash(pathname: string) {
	return pathname.split(/[?#]/)[0] || '/'
}

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
	const isShellPath = appRoute.kind === 'shell-section' || appRoute.kind === 'view'

	return {
		appRoute,
		kind: appRoute.kind,
		scope:
			appRoute.kind === 'shell-section' || appRoute.kind === 'view'
				? appRoute.scope
				: appRoute.kind === 'task' || appRoute.kind === 'project'
					? { type: 'space', spaceId: appRoute.spaceId }
					: null,
		spaceId:
			appRoute.kind === 'task' || appRoute.kind === 'project'
				? appRoute.spaceId
				: appRoute.kind === 'shell-section' || appRoute.kind === 'view'
					? appRoute.scope.type === 'space'
						? appRoute.scope.spaceId
						: null
					: null,
		section: resolveShellSection(appRoute),
		settingsSection: resolveSettingsSectionFromAppRoute(appRoute, normalizedPath),
		viewId: appRoute.kind === 'view' ? appRoute.viewId : null,
		projectId: appRoute.kind === 'project' ? appRoute.projectId : null,
		taskId: appRoute.kind === 'task' ? appRoute.taskId : null,
		pathname: normalizedPath,
		search,
		hash,
		fullPath,
		isShellPath,
		isSettingsPath: appRoute.kind === 'shell-section' && appRoute.section === 'settings',
		isDebugPath: appRoute.kind === 'debug-activity',
		isQuickCreatePath: appRoute.kind === 'quick-create',
		isWorkPath:
			appRoute.kind === 'shell-section' ||
			appRoute.kind === 'view' ||
			appRoute.kind === 'task' ||
			appRoute.kind === 'project',
	}
}

export function parseAppRoute(
	pathname: string,
	search = '',
	hash = '',
	fullPath = `${pathname}${search}${hash}`,
): AppRoute {
	if (pathname === '/') {
		return { kind: 'startup', pathname: '/', search, hash, fullPath }
	}

	if (pathname === '/quick-create') {
		return { kind: 'quick-create', pathname: '/quick-create', search, hash, fullPath }
	}

	if (pathname === '/debug/activity') {
		return { kind: 'debug-activity', pathname: '/debug/activity', search, hash, fullPath }
	}

	const taskMatch = pathname.match(TASK_DETAIL_PATH)
	if (taskMatch?.[1] && taskMatch[2]) {
		return {
			kind: 'task',
			spaceId: decodeURIComponent(taskMatch[1]),
			taskId: decodeURIComponent(taskMatch[2]),
			pathname,
			search,
			hash,
			fullPath,
		}
	}

	const projectMatch = pathname.match(PROJECT_PAGE_PATH)
	if (projectMatch?.[1] && projectMatch[2]) {
		return {
			kind: 'project',
			spaceId: decodeURIComponent(projectMatch[1]),
			projectId: decodeURIComponent(projectMatch[2]),
			pathname,
			search,
			hash,
			fullPath,
		}
	}

	const allMatch = pathname.match(CANONICAL_ALL_PATH)
	if (allMatch) {
		return parseScopedWorkRoute(
			{ type: 'all' },
			allMatch[1] ?? '',
			pathname,
			search,
			hash,
			fullPath,
		)
	}

	const spaceMatch = pathname.match(CANONICAL_SPACE_PATH)
	if (spaceMatch?.[1]) {
		return parseScopedWorkRoute(
			{ type: 'space', spaceId: decodeURIComponent(spaceMatch[1]) },
			spaceMatch[2] ?? '',
			pathname,
			search,
			hash,
			fullPath,
		)
	}

	return {
		kind: 'unknown',
		pathname,
		search,
		hash,
		fullPath,
	}
}

export function resolveShellSection(routeOrPath: AppRoute | string) {
	const route =
		typeof routeOrPath === 'string' ? parseAppRoute(stripQueryAndHash(routeOrPath)) : routeOrPath

	switch (route.kind) {
		case 'shell-section':
			return route.section
		case 'view':
			return 'views'
		case 'task':
			return 'tasks'
		case 'project':
			return 'projects'
		default:
			return 'inbox'
	}
}

export function parseShellScopePath(pathname: string): RouteScope | null {
	const normalizedPath = stripQueryAndHash(pathname)
	const taskMatch = normalizedPath.match(TASK_DETAIL_PATH)
	if (taskMatch?.[1]) {
		return { type: 'space', spaceId: decodeURIComponent(taskMatch[1]) }
	}

	const projectMatch = normalizedPath.match(PROJECT_PAGE_PATH)
	if (projectMatch?.[1]) {
		return { type: 'space', spaceId: decodeURIComponent(projectMatch[1]) }
	}

	const allMatch = normalizedPath.match(CANONICAL_ALL_PATH)
	if (allMatch && isCanonicalAllRemainder(allMatch[1] ?? '')) {
		return { type: 'all' }
	}

	const spaceMatch = normalizedPath.match(CANONICAL_SPACE_PATH)
	if (spaceMatch?.[1] && isCanonicalSpaceRemainder(spaceMatch[2] ?? '')) {
		return { type: 'space', spaceId: decodeURIComponent(spaceMatch[1]) }
	}

	return null
}

export function isProjectShellPath(pathname: string) {
	return PROJECT_PAGE_PATH.test(stripQueryAndHash(pathname))
}

export function isShellPath(pathname: string) {
	const route = parseAppRoute(stripQueryAndHash(pathname))
	return route.kind === 'shell-section' || route.kind === 'view'
}

function parseScopedWorkRoute(
	scope: RouteScope,
	remainder: string,
	pathname: string,
	search: string,
	hash: string,
	fullPath: string,
): AppRoute {
	if (!remainder) {
		return {
			kind: 'unknown',
			pathname,
			search,
			hash,
			fullPath,
		}
	}

	if (remainder === 'inbox') {
		return { kind: 'shell-section', scope, section: 'inbox', pathname, search, hash, fullPath }
	}

	if (remainder === 'tasks') {
		return { kind: 'shell-section', scope, section: 'tasks', pathname, search, hash, fullPath }
	}

	if (remainder === 'views') {
		return { kind: 'shell-section', scope, section: 'views', pathname, search, hash, fullPath }
	}

	const viewMatch = remainder.match(VIEW_DETAIL_REMAINDER)
	if (viewMatch?.[1]) {
		return {
			kind: 'view',
			scope,
			viewId: decodeURIComponent(viewMatch[1]),
			pathname,
			search,
			hash,
			fullPath,
		}
	}

	if (remainder === 'projects') {
		return { kind: 'shell-section', scope, section: 'projects', pathname, search, hash, fullPath }
	}

	if (remainder === 'no-project') {
		return { kind: 'shell-section', scope, section: 'noProject', pathname, search, hash, fullPath }
	}

	if (remainder === 'archive') {
		return { kind: 'shell-section', scope, section: 'archive', pathname, search, hash, fullPath }
	}

	if (remainder === 'trash') {
		return { kind: 'shell-section', scope, section: 'trash', pathname, search, hash, fullPath }
	}

	const settingsMatch = remainder.match(SETTINGS_REMAINDER)
	if (settingsMatch) {
		// bare 与 `settings/<any-single-segment>` 均识别为设置（非法 section 由路由层 redirect）
		return { kind: 'shell-section', scope, section: 'settings', pathname, search, hash, fullPath }
	}

	return {
		kind: 'unknown',
		pathname,
		search,
		hash,
		fullPath,
	}
}

function resolveSettingsSectionFromAppRoute(
	appRoute: AppRoute,
	pathname: string,
): SettingsSectionKey | null {
	if (appRoute.kind !== 'shell-section' || appRoute.section !== 'settings') {
		return null
	}

	const settingsMatch = pathname.match(/\/settings(?:\/([^/]+))?\/?$/)
	const segment = settingsMatch?.[1]
	if (!segment) {
		return null
	}
	return isSettingsSectionKey(segment) ? segment : null
}

function isSettingsRemainder(remainder: string) {
	return SETTINGS_REMAINDER.test(remainder)
}

function isCanonicalAllRemainder(remainder: string) {
	return (
		remainder === 'inbox' ||
		remainder === 'tasks' ||
		remainder === 'views' ||
		remainder === 'projects' ||
		remainder === 'no-project' ||
		remainder === 'archive' ||
		remainder === 'trash' ||
		isSettingsRemainder(remainder) ||
		Boolean(remainder.match(VIEW_DETAIL_REMAINDER))
	)
}

function isCanonicalSpaceRemainder(remainder: string) {
	return (
		remainder === 'inbox' ||
		remainder === 'tasks' ||
		remainder === 'views' ||
		remainder === 'projects' ||
		remainder === 'no-project' ||
		remainder === 'archive' ||
		remainder === 'trash' ||
		isSettingsRemainder(remainder) ||
		Boolean(remainder.match(VIEW_DETAIL_REMAINDER))
	)
}
