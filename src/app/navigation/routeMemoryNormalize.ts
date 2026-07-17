import type { Scope, Space } from '@/shared/types'

import { buildCanonicalSectionPath } from '@/app/navigation/routePaths'
import {
	buildShellScopeKey,
	type ShellRouteMemory,
	type ShellScopeKey,
} from '@/app/navigation/shellRoute'

/**
 * Route memory 规范化：纯路径规则与 memory 形状。
 * 不读写 Tauri Store；不请求 entity detail。
 */

export const ROUTE_MEMORY_VERSION = 2

export const ALLOWED_SECTION_SEGMENTS = new Set([
	'inbox',
	'tasks',
	'views',
	'projects',
	'no-project',
	'archive',
	'trash',
])

export const ALL_SECTION_PATH = /^\/all\/([^/?#]+)(?:[?#].*)?$/
export const SPACE_SECTION_PATH = /^\/spaces\/([^/]+)\/([^/?#]+)(?:[?#].*)?$/
export const VIEW_PATH = /^\/(?:all|spaces\/([^/]+))\/views\/([^/?#]+)(?:[?#].*)?$/
export const TASK_DETAIL_PATH = /^\/spaces\/([^/]+)\/tasks\/([^/?#]+)(?:[?#].*)?$/
export const PROJECT_DETAIL_PATH = /^\/spaces\/([^/]+)\/projects\/([^/?#]+)(?:[?#].*)?$/

export function defaultShellRouteMemory(): ShellRouteMemory {
	return {
		version: ROUTE_MEMORY_VERSION,
		lastScopeKey: 'all',
		lastRouteByScopeKey: {},
	}
}

export function normalizeShellRouteMemory(
	candidate: ShellRouteMemory | null | undefined,
): ShellRouteMemory | null {
	if (!candidate) {
		return null
	}

	const lastScopeKey = isShellScopeKey(candidate.lastScopeKey) ? candidate.lastScopeKey : 'all'
	const lastRouteByScopeKey = Object.fromEntries(
		Object.entries(candidate.lastRouteByScopeKey ?? {}).filter(
			([scopeKey, path]) =>
				isShellScopeKey(scopeKey) && typeof path === 'string' && path.length > 0,
		),
	)

	return {
		version: ROUTE_MEMORY_VERSION,
		lastScopeKey,
		lastRouteByScopeKey,
	}
}

export function createNextShellRouteMemory(
	current: ShellRouteMemory | null | undefined,
	scope: Scope,
	path: string,
): ShellRouteMemory | null {
	const canonicalPath = normalizeShellMemoryPath(path)
	if (!isRememberableShellPath(canonicalPath)) {
		return null
	}

	const currentMemory = normalizeShellRouteMemory(current) ?? defaultShellRouteMemory()
	const scopeKey = buildShellScopeKey(scope)

	return {
		version: ROUTE_MEMORY_VERSION,
		lastScopeKey: scopeKey,
		lastRouteByScopeKey: {
			...currentMemory.lastRouteByScopeKey,
			[scopeKey]: canonicalPath,
		},
	}
}

export function normalizeShellMemoryPath(path: string): string {
	return stripShellDetailSearch(path)
}

export function isRememberableShellPath(path: string): boolean {
	const canonicalPath = normalizeShellMemoryPath(path)
	const pathname = canonicalPath.split(/[?#]/)[0] ?? canonicalPath

	if (pathname === '/quick-create' || pathname === '/' || pathname.length === 0) {
		return false
	}

	const allMatch = pathname.match(/^\/all\/([^/]+)$/)
	if (allMatch?.[1]) {
		return ALLOWED_SECTION_SEGMENTS.has(allMatch[1])
	}

	const spaceSectionMatch = pathname.match(/^\/spaces\/([^/]+)\/([^/]+)$/)
	if (spaceSectionMatch?.[2]) {
		return ALLOWED_SECTION_SEGMENTS.has(spaceSectionMatch[2])
	}

	return (
		VIEW_PATH.test(pathname) ||
		TASK_DETAIL_PATH.test(pathname) ||
		PROJECT_DETAIL_PATH.test(pathname)
	)
}

export function stripShellDetailSearch(path: string): string {
	const queryIndex = path.indexOf('?')
	if (queryIndex < 0) {
		return path
	}

	const pathname = path.slice(0, queryIndex)
	const searchAndHash = path.slice(queryIndex)
	const hashIndex = searchAndHash.indexOf('#')
	const search = hashIndex >= 0 ? searchAndHash.slice(0, hashIndex) : searchAndHash
	const hash = hashIndex >= 0 ? searchAndHash.slice(hashIndex) : ''
	const params = new URLSearchParams(search)
	params.delete('task')
	params.delete('project')
	const nextSearch = params.toString()

	return `${pathname}${nextSearch ? `?${nextSearch}` : ''}${hash}`
}

export function isShellScopeKey(value: string): value is ShellScopeKey {
	return value === 'all' || value.startsWith('space:')
}

export function extractSpaceIdFromScopeKey(scopeKey: ShellScopeKey): string | null {
	return scopeKey === 'all' ? null : scopeKey.slice('space:'.length)
}

export function extractSpaceIdFromPath(path: string): string | null {
	const pathname = path.split(/[?#]/)[0] ?? path
	const detailMatch = pathname.match(/^\/spaces\/([^/]+)\//)

	return detailMatch?.[1] ? decodeURIComponent(detailMatch[1]) : null
}

export function doesPathMatchScopeKey(path: string, scopeKey: ShellScopeKey) {
	const pathname = path.split(/[?#]/)[0] ?? path

	if (scopeKey === 'all') {
		return pathname.startsWith('/all/')
	}

	const expectedSpaceId = extractSpaceIdFromScopeKey(scopeKey)
	if (!expectedSpaceId) {
		return false
	}

	return extractSpaceIdFromPath(path) === expectedSpaceId
}

export function detectRememberedPathKind(
	path: string,
): 'section' | 'view' | 'task' | 'project' | null {
	const pathname = path.split(/[?#]/)[0] ?? path

	if (TASK_DETAIL_PATH.test(pathname)) {
		return 'task'
	}

	if (PROJECT_DETAIL_PATH.test(pathname)) {
		return 'project'
	}

	if (VIEW_PATH.test(pathname)) {
		return 'view'
	}

	if (ALL_SECTION_PATH.test(pathname) || SPACE_SECTION_PATH.test(pathname)) {
		return 'section'
	}

	return null
}

export function resolveDefaultSpaceId(spaces: Space[]): string | null {
	return spaces.find((space) => space.isDefault)?.id ?? spaces[0]?.id ?? null
}

export function buildFallbackPathForScopeKey(scopeKey: ShellScopeKey, spaces: Space[]) {
	if (scopeKey === 'all') {
		return buildCanonicalSectionPath({ type: 'all' }, 'tasks')
	}

	const spaceId = extractSpaceIdFromScopeKey(scopeKey)
	if (spaceId && spaces.some((space) => space.id === spaceId)) {
		return buildCanonicalSectionPath({ type: 'space', spaceId }, 'inbox')
	}

	const defaultSpaceId = resolveDefaultSpaceId(spaces)
	return defaultSpaceId
		? buildCanonicalSectionPath({ type: 'space', spaceId: defaultSpaceId }, 'inbox')
		: buildCanonicalSectionPath({ type: 'all' }, 'tasks')
}
