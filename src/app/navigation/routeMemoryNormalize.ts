import type { Scope, Space } from '@/shared/types'

import { buildCanonicalSectionPath } from '@/app/navigation/routePaths'
import {
	buildShellScopeKey,
	type ShellRouteMemory,
	type ShellScopeKey,
} from '@/app/navigation/shellRoute'
import {
	isCanonicalWorkRemainder,
	splitWorkspacePath,
	stripQueryAndHash,
} from '@/app/navigation/shellRouteSegments'

/**
 * Route memory 规范化：纯路径规则与 memory 形状。
 * v3：仅认 S1 方言 /:scopeKey/...；旧 version 整包丢弃。
 */

export const ROUTE_MEMORY_VERSION = 3

export const ALLOWED_SECTION_SEGMENTS = new Set([
	'inbox',
	'tasks',
	'views',
	'projects',
	'no-project',
	'archive',
	'trash',
])

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
	if (!candidate || candidate.version !== ROUTE_MEMORY_VERSION) {
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
	const pathname = stripQueryAndHash(canonicalPath)

	if (pathname === '/quick-create' || pathname === '/' || pathname.length === 0) {
		return false
	}

	const workspace = splitWorkspacePath(pathname)
	if (!workspace) {
		return false
	}

	if (workspace.remainder[0] === 'settings') {
		return false
	}

	const allowDetail = workspace.scope.type === 'space'
	return isCanonicalWorkRemainder(workspace.remainder, allowDetail)
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
	const workspace = splitWorkspacePath(stripQueryAndHash(path))
	if (!workspace || workspace.scope.type !== 'space') {
		return null
	}
	return workspace.scope.spaceId
}

export function doesPathMatchScopeKey(path: string, scopeKey: ShellScopeKey) {
	const workspace = splitWorkspacePath(stripQueryAndHash(path))
	if (!workspace) {
		return false
	}

	if (scopeKey === 'all') {
		return workspace.scope.type === 'all'
	}

	const expectedSpaceId = extractSpaceIdFromScopeKey(scopeKey)
	return workspace.scope.type === 'space' && workspace.scope.spaceId === expectedSpaceId
}

export function detectRememberedPathKind(
	path: string,
): 'section' | 'view' | 'task' | 'project' | null {
	const pathname = stripQueryAndHash(path)
	const workspace = splitWorkspacePath(pathname)
	if (!workspace || workspace.remainder.length === 0) {
		return null
	}

	const [head, second] = workspace.remainder
	if (head === 'tasks' && second && workspace.scope.type === 'space') {
		return 'task'
	}
	if (head === 'projects' && second && workspace.scope.type === 'space') {
		return 'project'
	}
	if (head === 'views' && second) {
		return 'view'
	}
	if (workspace.remainder.length === 1 && ALLOWED_SECTION_SEGMENTS.has(head)) {
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
