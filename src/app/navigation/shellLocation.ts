import { isSettingsSectionKey, type SettingsSectionKey } from '@/features/settings/contract'
import type { Scope } from '@/shared/types'

import {
	isShellSectionKey,
	locationPartsFromInput,
	parseAppRoute,
	splitPathSegments,
	stripQueryAndHash,
	type AppRoute,
	type AppRouteKind,
	type RouteScope,
	type ShellRouteLocationLike,
	type ShellSectionKey,
} from './path'

export type {
	AppRoute,
	AppRouteKind,
	RouteScope,
	ShellRouteLocationLike,
	ShellSectionKey,
	SettingsSectionKey,
}

export type ShellScopeKey = 'all' | `space:${string}`

export type ShellRouteMemory = {
	version: 3
	lastScopeKey: ShellScopeKey
	lastRouteByScopeKey: Record<string, string>
}

export type ShellRoute = {
	appRoute: AppRoute
	kind: AppRouteKind
	scope: RouteScope | null
	spaceId: string | null
	section: ShellSectionKey
	settingsSection: SettingsSectionKey | null
	viewId: string | null
	projectId: string | null
	taskId: string | null
	pathname: string
	search: string
	hash: string
	fullPath: string
	isShellPath: boolean
	isSettingsPath: boolean
	isDebugPath: boolean
	isWorkPath: boolean
}

export function buildShellScopeKey(scope: Scope): ShellScopeKey {
	return scope.type === 'all' ? 'all' : `space:${scope.spaceId}`
}

export function resolveShellRouteScope(shellRoute: Pick<ShellRoute, 'scope' | 'spaceId'>): Scope {
	return (
		shellRoute.scope ??
		(shellRoute.spaceId ? { type: 'space', spaceId: shellRoute.spaceId } : { type: 'all' })
	)
}

export function resolveShellSection(routeOrPath: AppRoute | string): ShellSectionKey {
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
			return 'tasks'
	}
}

type LocationParts = {
	pathname: string
	search: string
	hash: string
	fullPath: string
}

function deriveScopeFromAppRoute(appRoute: AppRoute): RouteScope | null {
	if (appRoute.kind === 'shell-section' || appRoute.kind === 'view') return appRoute.scope
	if (appRoute.kind === 'task') return { type: 'space', spaceId: appRoute.spaceId }
	if (appRoute.kind === 'project') {
		return appRoute.spaceId ? { type: 'space', spaceId: appRoute.spaceId } : { type: 'all' }
	}
	return null
}

function resolveSpaceId(appRoute: AppRoute, scope: RouteScope | null): string | null {
	if (appRoute.kind === 'task') return appRoute.spaceId
	if (appRoute.kind === 'project') return appRoute.spaceId || null
	if (scope?.type === 'space') return scope.spaceId
	return null
}

function resolveSettingsSection(
	appRoute: AppRoute,
	pathname: string,
	override?: SettingsSectionKey | null,
): SettingsSectionKey | null {
	if (override !== undefined) return override
	if (appRoute.kind !== 'shell-section' || appRoute.section !== 'settings') return null
	const segments = pathname.split('/').filter(Boolean)
	const settingsIndex = segments.lastIndexOf('settings')
	if (settingsIndex < 0) return null
	const sectionSegment = segments[settingsIndex + 1]
	if (!sectionSegment) return null
	try {
		const decoded = decodeURIComponent(sectionSegment)
		return isSettingsSectionKey(decoded) ? decoded : null
	} catch {
		return isSettingsSectionKey(sectionSegment) ? sectionSegment : null
	}
}

export function shellRouteFromAppRoute(
	appRoute: AppRoute,
	location: LocationParts,
	options?: {
		scopeOverride?: RouteScope | null
		settingsSection?: SettingsSectionKey | null
	},
): ShellRoute {
	const derivedScope = deriveScopeFromAppRoute(appRoute)
	const scope = options?.scopeOverride !== undefined ? options.scopeOverride : derivedScope
	const isShellPath = appRoute.kind === 'shell-section' || appRoute.kind === 'view'
	return {
		appRoute,
		kind: appRoute.kind,
		scope,
		spaceId: resolveSpaceId(appRoute, scope),
		section: resolveShellSection(appRoute),
		settingsSection: resolveSettingsSection(appRoute, location.pathname, options?.settingsSection),
		viewId: appRoute.kind === 'view' ? appRoute.viewId : null,
		projectId: appRoute.kind === 'project' ? appRoute.projectId : null,
		taskId: appRoute.kind === 'task' ? appRoute.taskId : null,
		pathname: location.pathname,
		search: location.search,
		hash: location.hash,
		fullPath: location.fullPath,
		isShellPath,
		isSettingsPath: appRoute.kind === 'shell-section' && appRoute.section === 'settings',
		isDebugPath: appRoute.kind === 'debug-activity',
		isWorkPath:
			appRoute.kind === 'shell-section' ||
			appRoute.kind === 'view' ||
			appRoute.kind === 'task' ||
			appRoute.kind === 'project',
	}
}

/** 字符串 path → ShellRoute（memory / 历史 fallback） */
export function parseShellRoute(input: ShellRouteLocationLike): ShellRoute {
	const location = locationPartsFromInput(input)
	const appRoute = parseAppRoute(
		location.pathname,
		location.search,
		location.hash,
		location.fullPath,
	)
	return shellRouteFromAppRoute(appRoute, location)
}

export type ShellRouteMatchParams = {
	scopeKey?: string
	taskId?: string
	projectId?: string
	viewId?: string
	section?: string
}

export type ShellRouteMatchInput = {
	scope: RouteScope
	pathname: string
	search?: string
	hash?: string
	params?: ShellRouteMatchParams
}

/** 运行时主路径：Router scope + params → ShellRoute */
export function shellRouteFromMatch(input: ShellRouteMatchInput): ShellRoute {
	const pathname = stripQueryAndHash(input.pathname)
	const search = input.search ?? ''
	const hash = input.hash ?? ''
	const fullPath = `${pathname}${search}${hash}`
	const location = { pathname, search, hash, fullPath }
	const params = input.params ?? {}
	const appRoute = appRouteFromMatch(input.scope, pathname, search, hash, fullPath, params)
	const settingsSection =
		appRoute.kind === 'shell-section' &&
		appRoute.section === 'settings' &&
		params.section &&
		isSettingsSectionKey(params.section)
			? params.section
			: null
	return shellRouteFromAppRoute(appRoute, location, {
		scopeOverride: input.scope,
		settingsSection:
			appRoute.kind === 'shell-section' && appRoute.section === 'settings'
				? settingsSection
				: undefined,
	})
}

function appRouteFromMatch(
	scope: RouteScope,
	pathname: string,
	search: string,
	hash: string,
	fullPath: string,
	params: ShellRouteMatchParams,
): AppRoute {
	const remainder = splitPathSegments(pathname).slice(1)
	if (params.taskId && scope.type === 'space') {
		return {
			kind: 'task',
			spaceId: scope.spaceId,
			taskId: params.taskId,
			pathname,
			search,
			hash,
			fullPath,
		}
	}
	if (params.projectId && scope.type === 'space') {
		return {
			kind: 'project',
			spaceId: scope.spaceId,
			projectId: params.projectId,
			pathname,
			search,
			hash,
			fullPath,
		}
	}
	if (params.viewId || (remainder[0] === 'views' && remainder[1])) {
		return {
			kind: 'view',
			scope,
			viewId: params.viewId ?? remainder[1] ?? null,
			pathname,
			search,
			hash,
			fullPath,
		}
	}
	const head = remainder[0] ?? ''
	if (
		isShellSectionKey(head) &&
		(remainder.length === 1 || (head === 'settings' && remainder.length <= 2))
	) {
		return {
			kind: 'shell-section',
			scope,
			section: head,
			pathname,
			search,
			hash,
			fullPath,
		}
	}
	return { kind: 'unknown', pathname, search, hash, fullPath }
}
