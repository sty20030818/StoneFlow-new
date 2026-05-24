import type { ShellSectionSegment } from './routeTypes'
import {
	buildCanonicalProjectPath,
	buildCanonicalSectionPath,
} from './routePaths'
import { resolveShellPathKind } from './routeParser'

const CANONICAL_SECTIONS = new Set<ShellSectionSegment>([
	'inbox',
	'all-tasks',
	'no-project',
	'views',
	'projects',
	'archive',
	'trash',
	'settings',
	'debug/activity',
	'focus',
])

function splitPath(path: string) {
	const [pathname, suffix = ''] = path.split(/(?=[?#])/)
	return {
		pathname: pathname || '/',
		suffix,
	}
}

export function normalizeLegacyRoute(path: string): string {
	const { pathname, suffix } = splitPath(path)
	const pathKind = resolveShellPathKind(pathname)

	if (pathKind !== 'legacy-all' && pathKind !== 'legacy-space') {
		return path
	}

	if (pathKind === 'legacy-all') {
		const remainder = pathname.replace(/^\/spaces\/?/, '')
		if (remainder === 'focus') {
			return `/all/views${suffix ? `${suffix.includes('?') ? `${suffix}&view=focus` : `?view=focus${suffix}`}` : '?view=focus'}`
		}

		const section = resolveCanonicalSection(remainder)
		if (!section) {
			return path
		}

		return `${buildCanonicalSectionPath({ type: 'all' }, section)}${suffix}`
	}

	const scopedMatch = pathname.match(/^\/space\/([^/]+)(?:\/(.+))?$/)
	if (!scopedMatch?.[1]) {
		return path
	}

	const [, rawSpaceId, remainder = ''] = scopedMatch
	const spaceId = decodeURIComponent(rawSpaceId)
	if (remainder === 'focus') {
		return `/spaces/${spaceId}/views${suffix ? `${suffix.includes('?') ? `${suffix}&view=focus` : `?view=focus${suffix}`}` : '?view=focus'}`
	}

	if (remainder.startsWith('project/')) {
		const projectId = remainder.slice('project/'.length)
		return `${buildCanonicalProjectPath({ type: 'space', spaceId }, projectId, spaceId)}${suffix}`
	}

	const section = resolveCanonicalSection(remainder)
	if (!section) {
		return path
	}

	return `${buildCanonicalSectionPath({ type: 'space', spaceId }, section, spaceId)}${suffix}`
}

function resolveCanonicalSection(remainder: string): ShellSectionSegment | null {
	if (!remainder) {
		return 'inbox'
	}

	return CANONICAL_SECTIONS.has(remainder as ShellSectionSegment)
		? (remainder as ShellSectionSegment)
		: null
}
