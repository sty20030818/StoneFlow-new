import { getProjectDetail } from '@/features/project/api/projects'
import { getTaskDetail } from '@/features/task/api/tasks'
import type { Scope, Space } from '@/shared/types'

import {
	buildCanonicalSectionPath,
	buildStartupFallbackPath,
} from './routePaths'
import { parseShellRoute } from './routeParser'

const ROUTE_MEMORY_VERSION = 2

const ALLOWED_SECTION_SEGMENTS = new Set([
	'inbox',
	'tasks',
	'views',
	'projects',
	'no-project',
	'archive',
	'trash',
])

export type ShellScopeKey = 'all' | `space:${string}`

export type ShellRouteMemory = {
	version: 2
	lastScopeKey: ShellScopeKey
	lastRouteByScopeKey: Record<string, string>
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

export function buildShellScopeKey(scope: Scope): ShellScopeKey {
	return scope.type === 'all' ? 'all' : `space:${scope.spaceId}`
}

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
			defaultPath: buildCanonicalSectionPath({ type: 'space', spaceId: targetSpaceId }, 'inbox'),
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

export function normalizeShellMemoryPath(path: string): string {
	return stripShellDetailSearch(path)
}

export function isRememberableShellPath(path: string): boolean {
	const route = parseShellRoute(path)

	if (!route.isWorkPath) {
		return false
	}

	if (route.kind === 'shell-section') {
		const normalizedPath = normalizeShellMemoryPath(path).split(/[?#]/)[0] ?? path
		const allMatch = normalizedPath.match(/^\/all\/(.+)$/)
		if (allMatch) {
			return ALLOWED_SECTION_SEGMENTS.has(allMatch[1] ?? '')
		}

		const spaceMatch = normalizedPath.match(/^\/spaces\/([^/]+)\/(.+)$/)
		return spaceMatch ? ALLOWED_SECTION_SEGMENTS.has(spaceMatch[2] ?? '') : false
	}

	return route.kind === 'view' || route.kind === 'task' || route.kind === 'project'
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

	const route = parseShellRoute(canonicalPath)
	if (expectedScopeKey && !doesRouteMatchScopeKey(route, expectedScopeKey)) {
		return fallbackPath
	}

	if (route.kind === 'shell-section') {
		const scope = route.scope
		if (scope && scope.type === 'space') {
			if (spaces.length > 0 && !spaces.some((space) => space.id === scope.spaceId)) {
				return fallbackPath
			}
		}
		return canonicalPath
	}

	if (route.kind === 'view') {
		const scope = route.scope
		if (scope && scope.type === 'space') {
			if (spaces.length > 0 && !spaces.some((space) => space.id === scope.spaceId)) {
				return fallbackPath
			}
		}
		return canonicalPath
	}

	if (route.kind === 'project' && route.projectId && route.spaceId) {
		return validateProjectSpace(route.projectId, route.spaceId, canonicalPath, fallbackPath)
	}

	if (route.kind === 'task' && route.taskId && route.spaceId) {
		return validateTaskSpace(route.taskId, route.spaceId, canonicalPath, fallbackPath)
	}

	return fallbackPath
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

function extractSpaceIdFromScopeKey(scopeKey: ShellScopeKey): string | null {
	return scopeKey === 'all' ? null : scopeKey.slice('space:'.length)
}

function resolveDefaultSpaceId(spaces: Space[]): string | null {
	return spaces.find((space) => space.isDefault)?.id ?? spaces[0]?.id ?? null
}

function buildFallbackPathForScopeKey(scopeKey: ShellScopeKey, spaces: Space[]) {
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

function isShellScopeKey(value: string): value is ShellScopeKey {
	return value === 'all' || value.startsWith('space:')
}

function doesRouteMatchScopeKey(route: ReturnType<typeof parseShellRoute>, scopeKey: ShellScopeKey) {
	if (scopeKey === 'all') {
		return (
			(route.kind === 'shell-section' || route.kind === 'view') &&
			route.scope?.type === 'all'
		)
	}

	const expectedSpaceId = extractSpaceIdFromScopeKey(scopeKey)
	if (!expectedSpaceId) {
		return false
	}

	if (route.kind === 'task' || route.kind === 'project') {
		return route.spaceId === expectedSpaceId
	}

	return (
		(route.kind === 'shell-section' || route.kind === 'view') &&
		route.scope?.type === 'space' &&
		route.scope.spaceId === expectedSpaceId
	)
}
