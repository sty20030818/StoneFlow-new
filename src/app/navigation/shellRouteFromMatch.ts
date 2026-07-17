import { isSettingsSectionKey } from '@/features/settings/contract'

import {
	buildShellRouteFromAppRoute,
	type ShellRouteLocationParts,
} from '@/app/navigation/shellRouteBuild'
import {
	SECTION_SEGMENT_TO_KEY,
	splitPathSegments,
	stripQueryAndHash,
} from '@/app/navigation/pathDialect'
import type { AppRoute, RouteScope, ShellRoute } from '@/app/navigation/shellRouteTypes'

/**
 * 运行时主路径：Router scope + params → ShellRoute（无二次猜路径方言）。
 */

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

export function shellRouteFromMatch(input: ShellRouteMatchInput): ShellRoute {
	const pathname = stripQueryAndHash(input.pathname)
	const search = input.search ?? ''
	const hash = input.hash ?? ''
	const fullPath = `${pathname}${search}${hash}`
	const location: ShellRouteLocationParts = { pathname, search, hash, fullPath }
	const params = input.params ?? {}

	const appRoute = appRouteFromMatch(input.scope, pathname, search, hash, fullPath, params)
	const settingsSection =
		appRoute.kind === 'shell-section' &&
		appRoute.section === 'settings' &&
		params.section &&
		isSettingsSectionKey(params.section)
			? params.section
			: null

	return buildShellRouteFromAppRoute(appRoute, location, {
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
	const remainder = remainderAfterScope(pathname)

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

	const sectionKey = SECTION_SEGMENT_TO_KEY[remainder[0] ?? '']
	if (
		sectionKey &&
		(remainder.length === 1 || (sectionKey === 'settings' && remainder.length <= 2))
	) {
		return {
			kind: 'shell-section',
			scope,
			section: sectionKey,
			pathname,
			search,
			hash,
			fullPath,
		}
	}

	return { kind: 'unknown', pathname, search, hash, fullPath }
}

function remainderAfterScope(pathname: string): string[] {
	const segments = splitPathSegments(pathname)
	return segments.slice(1)
}
