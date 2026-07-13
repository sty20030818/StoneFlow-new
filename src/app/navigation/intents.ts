import {
	buildCanonicalProjectPath,
	buildCanonicalSectionPath,
	buildCanonicalViewPath,
	buildProjectPath,
	buildScopedSettingsPath,
	buildStartupFallbackPath,
	buildTaskDetailPath,
} from '@/app/routing'
import type { ShellNavigationTarget } from '@/features/command'
import {
	DEFAULT_SETTINGS_SECTION,
	type SettingsSectionKey,
} from '@/features/settings/model/settingsSection'
import type { Scope } from '@/shared/types'

export function openSection(
	scope: Scope,
	section:
		| 'inbox'
		| 'tasks'
		| 'views'
		| 'projects'
		| 'archive'
		| 'trash'
		| 'settings'
		| 'no-project',
	fallbackSpaceId?: string | null,
) {
	if (section === 'settings') {
		return openSettings(scope, DEFAULT_SETTINGS_SECTION, fallbackSpaceId)
	}

	return buildCanonicalSectionPath(scope, section, fallbackSpaceId)
}

/**
 * 打开设置分区。默认 `general`。
 * 分区间导航请在调用方使用 `replace: true`（见设计方案）。
 */
export function openSettings(
	scope: Scope,
	section: SettingsSectionKey = DEFAULT_SETTINGS_SECTION,
	fallbackSpaceId?: string | null,
) {
	return buildScopedSettingsPath(scope, fallbackSpaceId, section)
}

export function openView(scope: Scope, viewId?: string | null, fallbackSpaceId?: string | null) {
	return buildCanonicalViewPath(scope, viewId ?? undefined, fallbackSpaceId)
}

export function openTaskDetail(taskId: string, spaceId: string) {
	return buildTaskDetailPath(spaceId, taskId)
}

export function openProjectDetail(
	projectId: string,
	input: {
		scope: Scope
		fallbackSpaceId?: string | null
	},
) {
	return buildCanonicalProjectPath(input.scope, projectId, input.fallbackSpaceId)
}

export function openCanonicalProjectDetail(projectId: string, spaceId: string) {
	return buildProjectPath(spaceId, projectId)
}

export function openStartupFallback(scope?: Scope) {
	return buildStartupFallbackPath(scope)
}

export function openShellNavigationTarget(
	target: ShellNavigationTarget,
	input: {
		scope: Scope
		fallbackSpaceId?: string | null
	},
) {
	if (target === 'settings') {
		return openSettings(input.scope, DEFAULT_SETTINGS_SECTION, input.fallbackSpaceId)
	}

	if (target.startsWith('views/')) {
		return openView(input.scope, target.slice('views/'.length), input.fallbackSpaceId)
	}

	const sectionTarget = target as Exclude<ShellNavigationTarget, 'settings' | `views/${string}`>

	return openSection(input.scope, sectionTarget, input.fallbackSpaceId)
}
