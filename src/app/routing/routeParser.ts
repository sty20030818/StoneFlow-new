import type { ShellSectionKey } from '@/app/layouts/shell/types'
import type {
	RouteScope,
	EntityPageRouteTarget,
	ShellPathKind,
	ShellRoute,
	ShellRouteLocationLike,
} from './routeTypes'

const TASK_SHORTCUT_PATH = /^\/tasks\/[^/]+$/
const PROJECT_SHORTCUT_PATH = /^\/projects\/[^/]+$/
const LEGACY_SCOPED_SHELL_PATH = /^\/space\/([^/]+)(?:\/(.+))?$/
const LEGACY_ALL_SHELL_PATH = /^\/spaces(?:\/(.+))?$/
const CANONICAL_SCOPED_SHELL_PATH = /^\/spaces\/([^/]+)(?:\/(.+))?$/
const CANONICAL_ALL_SHELL_PATH = /^\/all(?:\/(.+))?$/
const CANONICAL_TASK_DETAIL_PATH = /^\/spaces\/([^/]+)\/tasks\/([^/]+)$/
const CANONICAL_PROJECT_DETAIL_PATH = /^\/spaces\/([^/]+)\/projects\/([^/]+)\/detail$/

function stripQueryAndHash(pathname: string) {
	return pathname.split(/[?#]/)[0] || '/'
}

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

	return {
		pathname: pathname || '/',
		search,
		hash,
	}
}

export function parseShellRoute(input: ShellRouteLocationLike): ShellRoute {
	const { pathname, search, hash } = splitLocationLike(input)
	const normalizedPath = stripQueryAndHash(pathname)
	const scope = parseShellScopePath(normalizedPath)
	const pathKind = resolveShellPathKind(normalizedPath)
	const projectId = resolveShellProjectId(normalizedPath)
	const entityPageTarget = resolveEntityPageRouteTarget(normalizedPath)

	return {
		scope,
		spaceId: scope?.type === 'space' ? scope.spaceId : null,
		section: resolveShellSection(normalizedPath),
		projectId,
		entityPageTarget,
		pathKind,
		pathname: normalizedPath,
		search,
		hash,
		fullPath: `${normalizedPath}${search}${hash}`,
		isShellPath:
			pathKind === 'canonical-all' ||
			pathKind === 'canonical-space' ||
			pathKind === 'legacy-all' ||
			pathKind === 'legacy-space',
	}
}

export function resolveShellSection(pathname: string): ShellSectionKey {
	const normalizedPath = stripQueryAndHash(pathname)

	if (isCanonicalTaskDetailPath(normalizedPath)) {
		return 'allTasks'
	}

	if (
		isProjectShortcutPath(normalizedPath) ||
		normalizedPath.includes('/project/') ||
		isCanonicalProjectDetailPath(normalizedPath)
	) {
		return 'project'
	}

	if (normalizedPath.includes('/all-tasks')) {
		return 'allTasks'
	}

	if (normalizedPath.includes('/no-project')) {
		return 'noProject'
	}

	if (normalizedPath.includes('/views') || normalizedPath.includes('/focus')) {
		return 'views'
	}

	if (normalizedPath.includes('/projects')) {
		return 'projects'
	}

	if (normalizedPath.includes('/archive')) {
		return 'archive'
	}

	if (normalizedPath.includes('/trash')) {
		return 'trash'
	}

	if (normalizedPath.includes('/settings')) {
		return 'settings'
	}

	return 'inbox'
}

export function parseShellScopePath(pathname: string): RouteScope | null {
	const normalizedPath = stripQueryAndHash(pathname)

	if (CANONICAL_ALL_SHELL_PATH.test(normalizedPath) || isLegacyAllShellPath(normalizedPath)) {
		return { type: 'all' }
	}

	const canonicalScopedMatch = normalizedPath.match(CANONICAL_SCOPED_SHELL_PATH)
	if (canonicalScopedMatch?.[1]) {
		const remainder = canonicalScopedMatch[2] ?? ''
		if (
			remainder &&
			(remainder.startsWith('project/') ||
				isCanonicalDetailRemainder(remainder) ||
				isCanonicalSectionRemainder(remainder))
		) {
			return { type: 'space', spaceId: decodeURIComponent(canonicalScopedMatch[1]) }
		}
	}

	const legacyScopedMatch = normalizedPath.match(LEGACY_SCOPED_SHELL_PATH)
	if (!legacyScopedMatch?.[1]) {
		return null
	}

	return { type: 'space', spaceId: decodeURIComponent(legacyScopedMatch[1]) }
}

export function isProjectShellPath(pathname: string) {
	const normalizedPath = stripQueryAndHash(pathname)
	return normalizedPath.includes('/project/') || isCanonicalProjectDetailPath(normalizedPath)
}

export function isTaskShortcutPath(pathname: string) {
	return TASK_SHORTCUT_PATH.test(stripQueryAndHash(pathname))
}

export function isProjectShortcutPath(pathname: string) {
	return PROJECT_SHORTCUT_PATH.test(stripQueryAndHash(pathname))
}

export function resolveShellPathKind(pathname: string): ShellPathKind {
	const normalizedPath = stripQueryAndHash(pathname)

	if (isTaskShortcutPath(normalizedPath)) {
		return 'task-shortcut'
	}

	if (isProjectShortcutPath(normalizedPath)) {
		return 'project-shortcut'
	}

	if (CANONICAL_ALL_SHELL_PATH.test(normalizedPath)) {
		return 'canonical-all'
	}

	if (isCanonicalScopedShellPath(normalizedPath)) {
		return 'canonical-space'
	}

	if (isLegacyAllShellPath(normalizedPath)) {
		return 'legacy-all'
	}

	if (LEGACY_SCOPED_SHELL_PATH.test(normalizedPath)) {
		return 'legacy-space'
	}

	return 'other'
}

export function isShellPath(pathname: string) {
	const kind = resolveShellPathKind(pathname)
	return (
		kind === 'canonical-all' ||
		kind === 'canonical-space' ||
		kind === 'legacy-all' ||
		kind === 'legacy-space'
	)
}

export function isQuickCreatePath(pathname: string) {
	return stripQueryAndHash(pathname) === '/quick-create'
}

export function isTaskPageSection(section: ShellSectionKey) {
	return section === 'allTasks'
}

function resolveShellProjectId(pathname: string) {
	const normalizedPath = stripQueryAndHash(pathname)
	const detailMatch = normalizedPath.match(CANONICAL_PROJECT_DETAIL_PATH)
	if (detailMatch?.[2]) {
		return decodeURIComponent(detailMatch[2])
	}

	const match = normalizedPath.match(/\/project\/([^/]+)/)
	return match?.[1] ? decodeURIComponent(match[1]) : null
}

function resolveEntityPageRouteTarget(pathname: string): EntityPageRouteTarget | null {
	const taskMatch = pathname.match(CANONICAL_TASK_DETAIL_PATH)
	if (taskMatch?.[1] && taskMatch[2]) {
		return {
			kind: 'task',
			spaceId: decodeURIComponent(taskMatch[1]),
			id: decodeURIComponent(taskMatch[2]),
		}
	}

	const projectMatch = pathname.match(CANONICAL_PROJECT_DETAIL_PATH)
	if (projectMatch?.[1] && projectMatch[2]) {
		return {
			kind: 'project',
			spaceId: decodeURIComponent(projectMatch[1]),
			id: decodeURIComponent(projectMatch[2]),
		}
	}

	return null
}

function isCanonicalTaskDetailPath(pathname: string) {
	return CANONICAL_TASK_DETAIL_PATH.test(pathname)
}

function isCanonicalProjectDetailPath(pathname: string) {
	return CANONICAL_PROJECT_DETAIL_PATH.test(pathname)
}

function isLegacyAllShellPath(pathname: string) {
	return LEGACY_ALL_SHELL_PATH.test(pathname) && !isCanonicalScopedShellPath(pathname)
}

function isCanonicalScopedShellPath(pathname: string) {
	const match = pathname.match(CANONICAL_SCOPED_SHELL_PATH)
	if (!match?.[1]) {
		return false
	}

	const remainder = match[2] ?? ''
	return (
		Boolean(remainder) &&
		(remainder.startsWith('project/') ||
			isCanonicalDetailRemainder(remainder) ||
			isCanonicalSectionRemainder(remainder))
	)
}

function isCanonicalDetailRemainder(remainder: string) {
	return /^tasks\/[^/]+$/.test(remainder) || /^projects\/[^/]+\/detail$/.test(remainder)
}

function isCanonicalSectionRemainder(remainder: string) {
	return (
		remainder === 'inbox' ||
		remainder === 'all-tasks' ||
		remainder === 'no-project' ||
		remainder === 'views' ||
		remainder === 'projects' ||
		remainder === 'archive' ||
		remainder === 'trash' ||
		remainder === 'settings' ||
		remainder === 'debug/activity' ||
		remainder === 'focus'
	)
}
