import type { Scope } from '@/shared/types'
import { DEFAULT_SETTINGS_SECTION, type SettingsSectionKey } from '@/features/settings/contract'

/**
 * 唯一 path 方言（S1）+ 生成 + 字符串解析（→ AppRoute）。
 * ShellRoute 投影见 shellLocation。
 */

// ── types used by path (minimal; full Shell types in shellLocation) ──

export type RouteScope = Scope

export type ShellSectionSegment =
	| 'inbox'
	| 'tasks'
	| 'views'
	| 'projects'
	| 'no-project'
	| 'archive'
	| 'trash'
	| 'settings'

export type ShellSectionKey =
	| 'inbox'
	| 'tasks'
	| 'views'
	| 'projects'
	| 'noProject'
	| 'archive'
	| 'trash'
	| 'settings'

export type AppRouteKind =
	| 'startup'
	| 'launcher'
	| 'debug-activity'
	| 'shell-section'
	| 'view'
	| 'task'
	| 'project'
	| 'unknown'

export type AppRoute =
	| {
			kind: 'startup'
			pathname: '/'
			search: string
			hash: string
			fullPath: string
	  }
	| {
			kind: 'launcher'
			pathname: '/launcher'
			search: string
			hash: string
			fullPath: string
	  }
	| {
			kind: 'debug-activity'
			pathname: '/debug/activity'
			search: string
			hash: string
			fullPath: string
	  }
	| {
			kind: 'shell-section'
			scope: RouteScope
			section: ShellSectionKey
			pathname: string
			search: string
			hash: string
			fullPath: string
	  }
	| {
			kind: 'view'
			scope: RouteScope
			viewId: string | null
			pathname: string
			search: string
			hash: string
			fullPath: string
	  }
	| {
			kind: 'task'
			spaceId: string
			taskId: string
			pathname: string
			search: string
			hash: string
			fullPath: string
	  }
	| {
			kind: 'project'
			spaceId: string
			projectId: string
			pathname: string
			search: string
			hash: string
			fullPath: string
	  }
	| {
			kind: 'unknown'
			pathname: string
			search: string
			hash: string
			fullPath: string
	  }

export type ShellRouteLocationLike =
	| string
	| {
			pathname: string
			search?: string
			hash?: string
	  }

// ── dialect ──

export const ALL_SCOPE_KEY = 'all' as const
export const DEFAULT_SPACE_SECTION: ShellSectionSegment = 'inbox'
export const DEFAULT_ALL_SECTION: ShellSectionSegment = 'tasks'

export const RESERVED_SCOPE_KEYS = new Set([ALL_SCOPE_KEY, 'launcher', 'settings', 'debug'])

export const SECTION_SEGMENT_TO_KEY: Record<string, ShellSectionKey> = {
	inbox: 'inbox',
	tasks: 'tasks',
	views: 'views',
	projects: 'projects',
	'no-project': 'noProject',
	archive: 'archive',
	trash: 'trash',
	settings: 'settings',
}

export function toSectionSegment(
	section: ShellSectionKey | ShellSectionSegment,
): ShellSectionSegment {
	return section === 'noProject' ? 'no-project' : section
}

export function encodeScopeKey(scope: RouteScope, fallbackSpaceId?: string | null): string {
	if (scope.type === 'all') return ALL_SCOPE_KEY
	const spaceId = scope.spaceId || fallbackSpaceId
	if (!spaceId) return ALL_SCOPE_KEY
	return encodeURIComponent(spaceId)
}

export function decodeScopeKey(scopeKey: string): RouteScope | null {
	if (!scopeKey) return null
	if (scopeKey === ALL_SCOPE_KEY) return { type: 'all' }
	if (RESERVED_SCOPE_KEYS.has(scopeKey)) return null
	try {
		return { type: 'space', spaceId: decodeURIComponent(scopeKey) }
	} catch {
		return { type: 'space', spaceId: scopeKey }
	}
}

export function splitPathSegments(pathname: string): string[] {
	const normalized = pathname.split(/[?#]/)[0] || '/'
	if (normalized === '/') return []
	return normalized
		.split('/')
		.filter(Boolean)
		.map((segment) => {
			try {
				return decodeURIComponent(segment)
			} catch {
				return segment
			}
		})
}

export function stripQueryAndHash(pathname: string) {
	return pathname.split(/[?#]/)[0] || '/'
}

export function isSettingsRemainder(remainder: string[]) {
	return remainder[0] === 'settings' && remainder.length <= 2
}

export function isCanonicalWorkRemainder(remainder: string[], allowDetail: boolean) {
	if (remainder.length === 0) return false
	const head = remainder[0]
	if (remainder.length === 1) return head in SECTION_SEGMENT_TO_KEY
	if (head === 'views' && remainder.length === 2) return true
	if (head === 'projects' && remainder.length === 2 && allowDetail) return true
	if (allowDetail && head === 'tasks' && remainder.length === 2) return true
	if (head === 'settings' && remainder.length === 2) return true
	return false
}

export function splitWorkspacePath(pathname: string): {
	scope: RouteScope
	remainder: string[]
	scopeKey: string
} | null {
	const segments = splitPathSegments(pathname)
	if (segments.length === 0) return null
	const scopeKey = segments[0]
	const scope = decodeScopeKey(scopeKey)
	if (!scope) return null
	return { scope, scopeKey, remainder: segments.slice(1) }
}

// ── build ──

export function buildCanonicalSectionPath(
	scope: RouteScope,
	section: ShellSectionKey | ShellSectionSegment,
	fallbackSpaceId?: string | null,
) {
	return `/${encodeScopeKey(scope, fallbackSpaceId)}/${toSectionSegment(section)}`
}

export function buildCanonicalViewPath(
	scope: RouteScope,
	viewId?: string | null,
	fallbackSpaceId?: string | null,
) {
	const sectionPath = buildCanonicalSectionPath(scope, 'views', fallbackSpaceId)
	return viewId ? `${sectionPath}/${encodeURIComponent(viewId)}` : sectionPath
}

export function buildCanonicalProjectPath(
	scope: RouteScope,
	projectId?: string | null,
	fallbackSpaceId?: string | null,
) {
	const spaceId = scope.type === 'space' ? scope.spaceId : fallbackSpaceId
	if (!projectId || !spaceId) {
		return buildCanonicalSectionPath(scope, 'projects', fallbackSpaceId)
	}
	return buildProjectPath(spaceId, projectId)
}

export function buildTaskDetailPath(spaceId: string, taskId: string) {
	return `/${encodeURIComponent(spaceId)}/tasks/${encodeURIComponent(taskId)}`
}

export function buildProjectPath(spaceId: string, projectId: string) {
	return `/${encodeURIComponent(spaceId)}/projects/${encodeURIComponent(projectId)}`
}

export function buildSettingsPath(section: SettingsSectionKey = DEFAULT_SETTINGS_SECTION) {
	return buildScopedSettingsPath({ type: 'all' }, null, section)
}

export function buildScopedSettingsPath(
	scope: RouteScope,
	fallbackSpaceId?: string | null,
	section?: SettingsSectionKey | null,
) {
	const base = buildCanonicalSectionPath(scope, 'settings', fallbackSpaceId)
	return section ? `${base}/${section}` : base
}

export function buildStartupFallbackPath(
	scope?: RouteScope | null,
	fallbackSpaceId?: string | null,
) {
	if (!scope || scope.type === 'all') {
		return `/${ALL_SCOPE_KEY}/${DEFAULT_ALL_SECTION}`
	}
	const spaceId = scope.spaceId || fallbackSpaceId
	return spaceId
		? buildCanonicalSectionPath({ type: 'space', spaceId }, DEFAULT_SPACE_SECTION)
		: `/${ALL_SCOPE_KEY}/${DEFAULT_ALL_SECTION}`
}

// ── parse → AppRoute ──

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
	return { pathname: pathname || '/', search, hash }
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
	if (segments.length === 1 && segments[0] === 'launcher') {
		return { kind: 'launcher', pathname: '/launcher', search, hash, fullPath }
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
	if (scope.type === 'all' && (head === 'tasks' || head === 'projects') && remainder.length === 2) {
		return { kind: 'unknown', pathname, search, hash, fullPath }
	}
	if (head === 'views' && remainder.length === 2) {
		return { kind: 'view', scope, viewId: remainder[1], pathname, search, hash, fullPath }
	}
	if (isSettingsRemainder(remainder)) {
		return { kind: 'shell-section', scope, section: 'settings', pathname, search, hash, fullPath }
	}
	if (remainder.length === 1) {
		const section = SECTION_SEGMENT_TO_KEY[head]
		if (section) {
			return { kind: 'shell-section', scope, section, pathname, search, hash, fullPath }
		}
	}
	return { kind: 'unknown', pathname, search, hash, fullPath }
}

export function locationPartsFromInput(input: ShellRouteLocationLike) {
	const { pathname, search, hash } = splitLocationLike(input)
	const normalizedPath = stripQueryAndHash(pathname)
	return {
		pathname: normalizedPath,
		search,
		hash,
		fullPath: `${normalizedPath}${search}${hash}`,
	}
}
