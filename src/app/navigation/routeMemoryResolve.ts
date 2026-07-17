import { getProjectDetail } from '@/features/project'
import { getTaskDetail } from '@/features/task'
import type { Space } from '@/shared/types'

import { buildCanonicalSectionPath, buildStartupFallbackPath } from '@/app/navigation/routePaths'
import type { ShellRouteMemory, ShellScopeKey } from '@/app/navigation/shellRoute'
import { parseShellRoute } from '@/app/navigation/shellRouteParse'
import {
	buildFallbackPathForScopeKey,
	detectRememberedPathKind,
	doesPathMatchScopeKey,
	extractSpaceIdFromPath,
	extractSpaceIdFromScopeKey,
	isRememberableShellPath,
	normalizeShellMemoryPath,
	normalizeShellRouteMemory,
	resolveDefaultSpaceId,
} from '@/app/navigation/routeMemoryNormalize'

/**
 * Route memory 解析：启动恢复、scope 上次路径、带 entity 校验的 normalize。
 * 可调用 project/task public 校验详情是否仍属该 space。
 */

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
