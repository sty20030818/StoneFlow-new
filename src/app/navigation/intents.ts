import {
	buildCanonicalProjectPath,
	buildCanonicalSectionPath,
	buildCanonicalViewPath,
	buildProjectPath,
	buildScopedSettingsPath,
	buildStartupFallbackPath,
	buildTaskDetailPath,
} from '@/app/navigation/routePaths'
import type { ShellNavigationTarget } from '@/features/command'
import { readLastSettingsSection } from '@/features/settings/model/lastSettingsSection'
import type { SettingsSectionKey } from '@/features/settings/model/settingsSection'
import type { Scope } from '@/shared/types'

/**
 * 业务导航意图层：把“打开项目 / 打开设置 / 返回启动页”等产品动作映射为 path。
 * 调用方仍负责使用 TanStack Router 执行 navigate/redirect。
 */
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
		return openSettings(scope, undefined, fallbackSpaceId)
	}

	return buildCanonicalSectionPath(scope, section, fallbackSpaceId)
}

/**
 * 打开设置分区。
 * - 传入 section → 直达该分区
 * - 省略 section → 使用 session 内上次分区（无则 general）
 * 分区间导航请在调用方使用 `replace: true`（见设计方案）。
 */
export function openSettings(
	scope: Scope,
	section?: SettingsSectionKey | null,
	fallbackSpaceId?: string | null,
) {
	const resolved = section ?? readLastSettingsSection()
	return buildScopedSettingsPath(scope, fallbackSpaceId, resolved)
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
		return openSettings(input.scope, undefined, input.fallbackSpaceId)
	}

	if (target.startsWith('views/')) {
		return openView(input.scope, target.slice('views/'.length), input.fallbackSpaceId)
	}

	const sectionTarget = target as Exclude<ShellNavigationTarget, 'settings' | `views/${string}`>

	return openSection(input.scope, sectionTarget, input.fallbackSpaceId)
}
