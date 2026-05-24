import type { RouteScope, ShellSectionSegment } from './routeTypes'

const DEFAULT_SHELL_SECTION: ShellSectionSegment = 'inbox'

export function buildScopedSectionPath(
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

export function buildScopedProjectPath(
	scope: RouteScope,
	projectId?: string | null,
	fallbackSpaceId?: string | null,
) {
	const spaceId = scope.type === 'space' ? scope.spaceId : fallbackSpaceId
	if (!projectId || !spaceId) {
		return buildScopedSectionPath(scope, 'projects', fallbackSpaceId)
	}

	return `/space/${spaceId}/project/${projectId}`
}

export function buildTaskShortcutPath(taskId: string) {
	return `/tasks/${encodeURIComponent(taskId)}`
}

export function buildProjectShortcutPath(projectId: string) {
	return `/projects/${encodeURIComponent(projectId)}`
}

export function buildStartupFallbackPath(scope?: RouteScope | null, fallbackSpaceId?: string | null) {
	if (!scope) {
		return buildScopedSectionPath({ type: 'all' }, DEFAULT_SHELL_SECTION)
	}

	return buildScopedSectionPath(scope, DEFAULT_SHELL_SECTION, fallbackSpaceId)
}
