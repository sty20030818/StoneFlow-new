import type { RouteScope, ShellSectionKey, ShellSectionSegment } from '@/app/navigation/shellRoute'

const DEFAULT_SPACE_SECTION: ShellSectionSegment = 'inbox'
const DEFAULT_ALL_SECTION: ShellSectionSegment = 'tasks'

function toSectionSegment(section: ShellSectionKey | ShellSectionSegment) {
	return section === 'noProject' ? 'no-project' : section
}

export function buildCanonicalSectionPath(
	scope: RouteScope,
	section: ShellSectionKey | ShellSectionSegment,
	fallbackSpaceId?: string | null,
) {
	const segment = toSectionSegment(section)
	if (scope.type === 'all') {
		return `/all/${segment}`
	}

	const spaceId = scope.spaceId || fallbackSpaceId
	return spaceId
		? `/spaces/${encodeURIComponent(spaceId)}/${segment}`
		: `/all/${DEFAULT_ALL_SECTION}`
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

	return `/spaces/${encodeURIComponent(spaceId)}/projects/${encodeURIComponent(projectId)}`
}

export function buildTaskDetailPath(spaceId: string, taskId: string) {
	return `/spaces/${encodeURIComponent(spaceId)}/tasks/${encodeURIComponent(taskId)}`
}

export function buildProjectPath(spaceId: string, projectId: string) {
	return `/spaces/${encodeURIComponent(spaceId)}/projects/${encodeURIComponent(projectId)}`
}

export function buildSettingsPath() {
	return '/all/settings'
}

export function buildScopedSettingsPath(scope: RouteScope, fallbackSpaceId?: string | null) {
	return buildCanonicalSectionPath(scope, 'settings', fallbackSpaceId)
}

export function buildDebugActivityPath() {
	return '/debug/activity'
}

export function buildStartupFallbackPath(
	scope?: RouteScope | null,
	fallbackSpaceId?: string | null,
) {
	if (!scope) {
		return `/all/${DEFAULT_ALL_SECTION}`
	}

	if (scope.type === 'all') {
		return `/all/${DEFAULT_ALL_SECTION}`
	}

	const spaceId = scope.spaceId || fallbackSpaceId
	return spaceId
		? buildCanonicalSectionPath({ type: 'space', spaceId }, DEFAULT_SPACE_SECTION)
		: `/all/${DEFAULT_ALL_SECTION}`
}
