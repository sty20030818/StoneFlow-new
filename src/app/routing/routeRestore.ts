import { getProjectDetail } from '@/features/project/api/projects'
import { getTaskDetail } from '@/features/task/api/tasks'
import type { Space } from '@/shared/types'

import { normalizeLegacyRoute } from './routeMigration'
import { isProjectShellPath, isShellPath } from './routeParser'

const ALLOWED_SECTION_SEGMENTS = new Set([
	'inbox',
	'all-tasks',
	'no-project',
	'views',
	'projects',
	'archive',
	'trash',
	'settings',
	'debug/activity',
])

export function isRememberableShellPath(path: string): boolean {
	const normalizedPath = normalizeLegacyRoute(path).split(/[?#]/)[0] ?? path
	if (!isShellPath(normalizedPath)) {
		return false
	}

	const allMatch = normalizedPath.match(/^\/all\/(.+)$/)
	if (allMatch) {
		return ALLOWED_SECTION_SEGMENTS.has(allMatch[1] ?? '')
	}

	const spaceMatch = normalizedPath.match(/^\/spaces\/([^/]+)\/(.+)$/)
	if (!spaceMatch) {
		return false
	}

	const remainder = spaceMatch[2] ?? ''
	if (remainder.startsWith('project/')) {
		return remainder.length > 'project/'.length
	}

	if (isTaskDetailRemainder(remainder) || isProjectDetailRemainder(remainder)) {
		return true
	}

	return ALLOWED_SECTION_SEGMENTS.has(remainder)
}

export function stripShellDetailSearch(path: string): string {
	const [pathname, searchAndHash = ''] = path.split(/(?=[?#])/)
	if (!searchAndHash.startsWith('?')) {
		return path
	}

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
): Promise<string> {
	if (!path) {
		return fallbackPath
	}

	const canonicalPath = normalizeLegacyRoute(path)
	if (!isRememberableShellPath(canonicalPath)) {
		return fallbackPath
	}

	const pathname = canonicalPath.split(/[?#]/)[0] ?? canonicalPath
	const match = pathname.match(/^\/spaces\/([^/]+)\/(.+)$/)
	if (match) {
		const [, spaceId, remainder] = match
		if (spaces.length > 0 && !spaces.some((space) => space.id === spaceId)) {
			return fallbackPath
		}

		if (remainder.startsWith('project/')) {
			return validateProjectSpace(remainder.slice('project/'.length), spaceId, canonicalPath, fallbackPath)
		}

		if (isProjectDetailRemainder(remainder)) {
			const projectId = remainder.match(/^projects\/([^/]+)\/detail$/)?.[1] ?? ''
			return validateProjectSpace(projectId, spaceId, canonicalPath, fallbackPath)
		}

		if (isTaskDetailRemainder(remainder)) {
			const taskId = remainder.match(/^tasks\/([^/]+)$/)?.[1] ?? ''
			return validateTaskSpace(taskId, spaceId, canonicalPath, fallbackPath)
		}

		return canonicalPath
	}

	if (isProjectShellPath(pathname)) {
		return fallbackPath
	}

	return canonicalPath
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

function isTaskDetailRemainder(remainder: string) {
	return /^tasks\/[^/]+$/.test(remainder)
}

function isProjectDetailRemainder(remainder: string) {
	return /^projects\/[^/]+\/detail$/.test(remainder)
}
