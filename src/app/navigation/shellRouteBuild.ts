import { isSettingsSectionKey } from '@/features/settings/contract'

import type {
	AppRoute,
	RouteScope,
	SettingsSectionKey,
	ShellRoute,
	ShellSectionKey,
} from '@/app/navigation/shellRouteTypes'

/**
 * AppRoute → ShellRoute 投影。
 * scope 可由 Router 布局注入覆盖（match 真相）；字符串 parse 时不传 override。
 */

export type ShellRouteLocationParts = {
	pathname: string
	search: string
	hash: string
	fullPath: string
}

export function resolveShellSectionFromAppRouteOnly(appRoute: AppRoute): ShellSectionKey {
	switch (appRoute.kind) {
		case 'shell-section':
			return appRoute.section
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

export function buildShellRouteFromAppRoute(
	appRoute: AppRoute,
	location: ShellRouteLocationParts,
	options?: {
		/** Router layout 注入的 scope，优先于从 path 推导 */
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
		section: resolveShellSectionFromAppRouteOnly(appRoute),
		settingsSection:
			options?.settingsSection !== undefined
				? options.settingsSection
				: resolveSettingsSectionFromAppRoute(appRoute, location.pathname),
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
		isQuickCreatePath: appRoute.kind === 'quick-create',
		isWorkPath:
			appRoute.kind === 'shell-section' ||
			appRoute.kind === 'view' ||
			appRoute.kind === 'task' ||
			appRoute.kind === 'project',
	}
}

function deriveScopeFromAppRoute(appRoute: AppRoute): RouteScope | null {
	if (appRoute.kind === 'shell-section' || appRoute.kind === 'view') {
		return appRoute.scope
	}
	if (appRoute.kind === 'task') {
		return { type: 'space', spaceId: appRoute.spaceId }
	}
	if (appRoute.kind === 'project') {
		return appRoute.spaceId ? { type: 'space', spaceId: appRoute.spaceId } : { type: 'all' }
	}
	return null
}

function resolveSpaceId(appRoute: AppRoute, scope: RouteScope | null): string | null {
	if (appRoute.kind === 'task') {
		return appRoute.spaceId
	}
	if (appRoute.kind === 'project') {
		return appRoute.spaceId || null
	}
	if (scope?.type === 'space') {
		return scope.spaceId
	}
	return null
}

export function resolveSettingsSectionFromAppRoute(
	appRoute: AppRoute,
	pathname: string,
): SettingsSectionKey | null {
	if (appRoute.kind !== 'shell-section' || appRoute.section !== 'settings') {
		return null
	}

	const segments = pathname.split('/').filter(Boolean)
	const settingsIndex = segments.lastIndexOf('settings')
	if (settingsIndex < 0) {
		return null
	}
	const sectionSegment = segments[settingsIndex + 1]
	if (!sectionSegment) {
		return null
	}
	try {
		const decoded = decodeURIComponent(sectionSegment)
		return isSettingsSectionKey(decoded) ? decoded : null
	} catch {
		return isSettingsSectionKey(sectionSegment) ? sectionSegment : null
	}
}
