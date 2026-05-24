import { getProjectDetail } from '@/features/project/api/projects'
import type { Space } from '@/shared/types'

const ALLOWED_ALL_SECTIONS = new Set([
	'inbox',
	'all-tasks',
	'no-project',
	'views',
	'projects',
	'archive',
	'trash',
	'settings',
])

const ALLOWED_SPACE_SECTIONS = new Set([
	'inbox',
	'all-tasks',
	'no-project',
	'views',
	'projects',
	'archive',
	'trash',
	'settings',
])

export function isRememberableShellPath(path: string): boolean {
	const allMatch = path.match(/^\/spaces\/(.+)$/)
	if (allMatch) {
		return ALLOWED_ALL_SECTIONS.has(allMatch[1]?.split('?')[0] ?? '')
	}

	const spaceMatch = path.match(/^\/space\/([^/]+)\/(.+)$/)
	if (!spaceMatch) {
		return false
	}

	const remainder = spaceMatch[2] ?? ''
	if (remainder.startsWith('project/')) {
		return remainder.length > 'project/'.length
	}

	return ALLOWED_SPACE_SECTIONS.has(remainder.split('?')[0] ?? '')
}

export async function normalizeRememberedShellPath(
	path: string | undefined,
	spaces: Space[],
	fallbackPath: string,
): Promise<string> {
	if (!path) {
		return fallbackPath
	}

	if (!isRememberableShellPath(path)) {
		return fallbackPath
	}

	const match = path.match(/^\/space\/([^/]+)\/(.+)$/)
	if (match) {
		const [, spaceId, remainder] = match
		if (spaces.length > 0 && !spaces.some((space) => space.id === spaceId)) {
			return fallbackPath
		}

		if (remainder.startsWith('project/')) {
			const projectId = remainder.slice('project/'.length)
			if (projectId.length === 0) {
				return fallbackPath
			}

			try {
				const detail = await getProjectDetail(projectId)
				if (detail.spaceId !== spaceId) {
					return fallbackPath
				}
				return path
			} catch {
				return fallbackPath
			}
		}

		return path
	}

	return path
}
