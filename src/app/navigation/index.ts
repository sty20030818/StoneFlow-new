/**
 * navigation 公共出口。业务侧优先从此 import；path/memory 构建函数留包内。
 */

export {
	decodeScopeKey,
	buildScopedSettingsPath,
	type AppRoute,
	type AppRouteKind,
	type RouteScope,
	type ShellSectionKey,
	type ShellSectionSegment,
	type ShellRouteLocationLike,
} from './path'

export {
	parseShellRoute,
	shellRouteFromMatch,
	resolveShellSection,
	resolveShellRouteScope,
	type ShellRoute,
	type ShellRouteMemory,
	type ShellScopeKey,
	type ShellRouteMatchInput,
	type ShellRouteMatchParams,
	type SettingsSectionKey,
} from './shellLocation'

export { ShellRouteProvider, useCurrentShellRoute } from './ShellRouteContext'

export {
	openSection,
	openSettings,
	openView,
	openTaskDetail,
	openProjectDetail,
	openCanonicalProjectDetail,
	openStartupFallback,
	openShellNavigationTarget,
	type ShellNavigationTarget,
} from './intents'

export { resolveStartupPath, resolveRememberedPathForScope } from './memoryStore'
export { isRememberableShellPath, normalizeShellMemoryPath } from './memory'

export { useShellSessionRouteHistory, type ShellRouteHistoryEntry } from './sessionHistory'

export { resolveBreadcrumb } from './breadcrumb'
export { useRememberCurrentShellRoute } from './useRememberCurrentShellRoute'
