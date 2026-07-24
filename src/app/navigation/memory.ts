import type { Scope, Space } from '@/shared/types'
import { getProjectDetail } from '@/features/project'
import { getTaskDetail } from '@/features/task'

import {
	buildCanonicalSectionPath,
	buildStartupFallbackPath,
	isCanonicalWorkRemainder,
	SHELL_SECTION_KEYS,
	splitWorkspacePath,
	stripQueryAndHash,
} from './path'
import {
	buildShellScopeKey,
	parseShellRoute,
	type ShellRouteMemory,
	type ShellScopeKey,
} from './shellLocation'

/**
 * Route memory：规则 + 启动恢复/校验（无 IO）。
 */

export const ROUTE_MEMORY_VERSION = 3

/** 可记入 route memory 的 section（不含 settings）。 */
export const ALLOWED_SECTION_SEGMENTS: ReadonlySet<string> = new Set(
	SHELL_SECTION_KEYS.filter((section) => section !== 'settings'),
)

export function defaultShellRouteMemory(): ShellRouteMemory {
	return {
		version: ROUTE_MEMORY_VERSION,
		lastScopeKey: 'all',
		lastRouteByScopeKey: {},
	}
}

/**
 * 规范化 store / 外部 payload。入参按 unknown 校验，不信任调用方类型。
 */
export function normalizeShellRouteMemory(candidate: unknown): ShellRouteMemory | null {
	if (!candidate || typeof candidate !== 'object') {
		return null
	}

	const record = candidate as Record<string, unknown>
	if (record.version !== ROUTE_MEMORY_VERSION) {
		return null
	}

	const lastScopeKey =
		typeof record.lastScopeKey === 'string' && isShellScopeKey(record.lastScopeKey)
			? record.lastScopeKey
			: 'all'

	const rawRoutes = record.lastRouteByScopeKey
	const lastRouteByScopeKey =
		rawRoutes && typeof rawRoutes === 'object'
			? Object.fromEntries(
					Object.entries(rawRoutes as Record<string, unknown>).filter(
						(entry): entry is [ShellScopeKey, string] => {
							const [scopeKey, path] = entry
							return isShellScopeKey(scopeKey) && typeof path === 'string' && path.length > 0
						},
					),
				)
			: {}

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

	if (pathname === '/launcher' || pathname === '/' || pathname.length === 0) {
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
		return buildCanonicalSectionPath({ type: 'space', spaceId }, 'standalone')
	}

	const defaultSpaceId = resolveDefaultSpaceId(spaces)
	return defaultSpaceId
		? buildCanonicalSectionPath({ type: 'space', spaceId: defaultSpaceId }, 'standalone')
		: buildCanonicalSectionPath({ type: 'all' }, 'tasks')
}

export type ResolveRememberedPathInput = {
	scopeKey: ShellScopeKey
	routeMemory: ShellRouteMemory | null
	spaces: Space[]
	defaultPath: string
}

export type ResolveStartupPathInput = {
	routeMemory: ShellRouteMemory | null
	spaces: Space[]
}

export async function validateShellRouteMemoryPaths(
	routeMemory: ShellRouteMemory | null,
	spaces: Space[],
): Promise<ShellRouteMemory | null> {
	const memory = normalizeShellRouteMemory(routeMemory)
	if (!memory) {
		return null
	}

	const entries = await Promise.all(
		Object.entries(memory.lastRouteByScopeKey).map(async ([scopeKey, path]) => {
			const fallbackPath = buildFallbackPathForScopeKey(scopeKey as ShellScopeKey, spaces)
			const normalizedPath = await normalizeRememberedShellPath(
				path,
				spaces,
				fallbackPath,
				scopeKey as ShellScopeKey,
			)
			return isRememberableShellPath(normalizedPath) ? [scopeKey, normalizedPath] : null
		}),
	)
	const lastRouteByScopeKey = Object.fromEntries(
		entries.filter((entry): entry is [string, string] => Boolean(entry)),
	)
	const lastScopeKey =
		memory.lastScopeKey in lastRouteByScopeKey || memory.lastScopeKey === 'all'
			? memory.lastScopeKey
			: 'all'

	return {
		version: memory.version,
		lastScopeKey,
		lastRouteByScopeKey,
	}
}

export async function resolveRememberedPathForScope({
	scopeKey,
	routeMemory,
	spaces,
	defaultPath,
}: ResolveRememberedPathInput): Promise<string> {
	const memory = normalizeShellRouteMemory(routeMemory)
	if (!memory) {
		return defaultPath
	}

	return resolveScopePath({
		scopeKey,
		routeMemory: memory,
		spaces,
		defaultPath,
	})
}

export async function resolveStartupPathFromMemory({
	routeMemory,
	spaces,
}: ResolveStartupPathInput): Promise<string> {
	const memory = normalizeShellRouteMemory(routeMemory)
	const allTasksPath = buildCanonicalSectionPath({ type: 'all' }, 'tasks')
	if (!memory) {
		return allTasksPath
	}

	const defaultSpaceId = resolveDefaultSpaceId(spaces)
	if (memory.lastScopeKey === 'all') {
		return await normalizeRememberedShellPath(
			memory.lastRouteByScopeKey.all,
			spaces,
			allTasksPath,
			'all',
		)
	}

	const targetSpaceId = extractSpaceIdFromScopeKey(memory.lastScopeKey)
	if (targetSpaceId && spaces.some((space) => space.id === targetSpaceId)) {
		return resolveScopePath({
			scopeKey: memory.lastScopeKey,
			routeMemory: memory,
			spaces,
			defaultPath: buildCanonicalSectionPath(
				{ type: 'space', spaceId: targetSpaceId },
				'standalone',
			),
		})
	}

	if (!defaultSpaceId) {
		return allTasksPath
	}

	return resolveScopePath({
		scopeKey: `space:${defaultSpaceId}`,
		routeMemory: memory,
		spaces,
		defaultPath: buildStartupFallbackPath({ type: 'space', spaceId: defaultSpaceId }),
	})
}

export async function normalizeRememberedShellPath(
	path: string | undefined,
	spaces: Space[],
	fallbackPath: string,
	expectedScopeKey?: ShellScopeKey,
): Promise<string> {
	if (!path) {
		return fallbackPath
	}

	const canonicalPath = normalizeShellMemoryPath(path)
	if (!isRememberableShellPath(canonicalPath)) {
		return fallbackPath
	}

	if (expectedScopeKey && !doesPathMatchScopeKey(canonicalPath, expectedScopeKey)) {
		return fallbackPath
	}

	const routeKind = detectRememberedPathKind(canonicalPath)
	if (!routeKind) {
		return fallbackPath
	}

	const rememberedSpaceId = extractSpaceIdFromPath(canonicalPath)
	if (
		rememberedSpaceId &&
		spaces.length > 0 &&
		!spaces.some((space) => space.id === rememberedSpaceId)
	) {
		return fallbackPath
	}

	if (routeKind === 'section' || routeKind === 'view') {
		return canonicalPath
	}

	const route = parseShellRoute(canonicalPath)

	if (routeKind === 'project') {
		if (route.kind !== 'project' || !route.projectId || !route.spaceId) {
			return fallbackPath
		}
		return validateProjectSpace(route.projectId, route.spaceId, canonicalPath, fallbackPath)
	}

	if (route.kind !== 'task' || !route.taskId || !route.spaceId) {
		return fallbackPath
	}

	return validateTaskSpace(route.taskId, route.spaceId, canonicalPath, fallbackPath)
}

async function resolveScopePath(input: {
	scopeKey: ShellScopeKey
	routeMemory: ShellRouteMemory
	spaces: Space[]
	defaultPath: string
}): Promise<string> {
	const rememberedPath = input.routeMemory.lastRouteByScopeKey[input.scopeKey]
	return normalizeRememberedShellPath(
		rememberedPath,
		input.spaces,
		input.defaultPath,
		input.scopeKey,
	)
}

async function validateProjectSpace(
	projectId: string,
	spaceId: string,
	canonicalPath: string,
	fallbackPath: string,
) {
	if (!projectId) {
		return fallbackPath
	}

	try {
		const detail = await getProjectDetail(decodeURIComponent(projectId))
		return detail.spaceId === spaceId ? canonicalPath : fallbackPath
	} catch {
		return fallbackPath
	}
}

async function validateTaskSpace(
	taskId: string,
	spaceId: string,
	canonicalPath: string,
	fallbackPath: string,
) {
	if (!taskId) {
		return fallbackPath
	}

	try {
		const detail = await getTaskDetail(decodeURIComponent(taskId))
		return detail.spaceId === spaceId ? canonicalPath : fallbackPath
	} catch {
		return fallbackPath
	}
}
