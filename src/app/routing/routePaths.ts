import type { RouteScope, ShellSectionSegment } from './routeTypes'

const DEFAULT_SHELL_SECTION: ShellSectionSegment = 'inbox'

export function buildCanonicalSectionPath(
	scope: RouteScope,
	section: ShellSectionSegment,
	fallbackSpaceId?: string | null,
) {
	if (scope.type === 'all') {
		return `/all/${section}`
	}

	const spaceId = scope.spaceId || fallbackSpaceId
	return spaceId ? `/spaces/${spaceId}/${section}` : `/all/${section}`
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

	return `/spaces/${spaceId}/project/${encodeURIComponent(projectId)}`
}

export function buildTaskDetailPath(spaceId: string, taskId: string) {
	return `/spaces/${encodeURIComponent(spaceId)}/tasks/${encodeURIComponent(taskId)}`
}

export function buildProjectDetailPath(spaceId: string, projectId: string) {
	return `/spaces/${encodeURIComponent(spaceId)}/projects/${encodeURIComponent(projectId)}/detail`
}

export function buildLegacySectionPath(
	scope: RouteScope,
	section: ShellSectionSegment,
	fallbackSpaceId?: string | null,
) {
	if (scope.type === 'all') {
		return `/spaces/${section}`
	}

	const spaceId = scope.spaceId || fallbackSpaceId
	return spaceId ? `/space/${spaceId}/${section}` : `/spaces/${section}`
}

export function buildLegacyProjectPath(
	scope: RouteScope,
	projectId?: string | null,
	fallbackSpaceId?: string | null,
) {
	const spaceId = scope.type === 'space' ? scope.spaceId : fallbackSpaceId
	if (!projectId || !spaceId) {
		return buildLegacySectionPath(scope, 'projects', fallbackSpaceId)
	}

	return `/space/${spaceId}/project/${encodeURIComponent(projectId)}`
}

export function buildScopedSectionPath(
	scope: RouteScope,
	section: ShellSectionSegment,
	fallbackSpaceId?: string | null,
) {
	return buildCanonicalSectionPath(scope, section, fallbackSpaceId)
}

export function buildScopedProjectPath(
	scope: RouteScope,
	projectId?: string | null,
	fallbackSpaceId?: string | null,
) {
	return buildCanonicalProjectPath(scope, projectId, fallbackSpaceId)
}

export function buildTaskShortcutPath(taskId: string) {
	return `/tasks/${encodeURIComponent(taskId)}`
}

export function buildProjectShortcutPath(projectId: string) {
	return `/projects/${encodeURIComponent(projectId)}`
}

export function buildStartupFallbackPath(scope?: RouteScope | null, fallbackSpaceId?: string | null) {
	if (!scope) {
		return buildCanonicalSectionPath({ type: 'all' }, DEFAULT_SHELL_SECTION)
	}

	return buildCanonicalSectionPath(scope, DEFAULT_SHELL_SECTION, fallbackSpaceId)
}
