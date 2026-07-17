import {
	DEFAULT_ALL_SECTION,
	DEFAULT_SPACE_SECTION,
	encodeScopeKey,
	toSectionSegment,
} from '@/app/navigation/pathDialect'
import type {
	RouteScope,
	ShellSectionKey,
	ShellSectionSegment,
} from '@/app/navigation/shellRouteTypes'
import { DEFAULT_SETTINGS_SECTION, type SettingsSectionKey } from '@/features/settings/contract'

/**
 * Canonical path builder：只拼方言认可的 URL。
 * 形态：/:scopeKey/<section>[/id] ；详情任务/项目仅 space scopeKey。
 */

export function buildCanonicalSectionPath(
	scope: RouteScope,
	section: ShellSectionKey | ShellSectionSegment,
	fallbackSpaceId?: string | null,
) {
	const scopeKey = encodeScopeKey(scope, fallbackSpaceId)
	const segment = toSectionSegment(section)
	return `/${scopeKey}/${segment}`
}

export function buildCanonicalViewPath(
	scope: RouteScope,
	viewId?: string | null,
	fallbackSpaceId?: string | null,
) {
	const sectionPath = buildCanonicalSectionPath(scope, 'views', fallbackSpaceId)
	return viewId ? `${sectionPath}/${encodeURIComponent(viewId)}` : sectionPath
}

/**
 * 项目详情：永远落在真实 space 下。
 * 无 projectId/spaceId 时退回 projects 列表（可在 all）。
 */
export function buildCanonicalProjectPath(
	scope: RouteScope,
	projectId?: string | null,
	fallbackSpaceId?: string | null,
) {
	const spaceId = scope.type === 'space' ? scope.spaceId : fallbackSpaceId
	if (!projectId || !spaceId) {
		return buildCanonicalSectionPath(scope, 'projects', fallbackSpaceId)
	}
	return buildProjectPath(spaceId, projectId)
}

export function buildTaskDetailPath(spaceId: string, taskId: string) {
	return `/${encodeURIComponent(spaceId)}/tasks/${encodeURIComponent(taskId)}`
}

export function buildProjectPath(spaceId: string, projectId: string) {
	return `/${encodeURIComponent(spaceId)}/projects/${encodeURIComponent(projectId)}`
}

export function buildSettingsPath(section: SettingsSectionKey = DEFAULT_SETTINGS_SECTION) {
	return buildScopedSettingsPath({ type: 'all' }, null, section)
}

export function buildScopedSettingsPath(
	scope: RouteScope,
	fallbackSpaceId?: string | null,
	section?: SettingsSectionKey | null,
) {
	const base = buildCanonicalSectionPath(scope, 'settings', fallbackSpaceId)
	if (!section) {
		return base
	}
	return `${base}/${section}`
}

export function buildDebugActivityPath() {
	return '/debug/activity'
}

export function buildStartupFallbackPath(
	scope?: RouteScope | null,
	fallbackSpaceId?: string | null,
) {
	if (!scope || scope.type === 'all') {
		return `/${encodeScopeKey({ type: 'all' })}/${DEFAULT_ALL_SECTION}`
	}
	const spaceId = scope.spaceId || fallbackSpaceId
	return spaceId
		? buildCanonicalSectionPath({ type: 'space', spaceId }, DEFAULT_SPACE_SECTION)
		: `/${encodeScopeKey({ type: 'all' })}/${DEFAULT_ALL_SECTION}`
}
