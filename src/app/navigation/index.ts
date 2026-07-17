/**
 * navigation 公共出口。业务侧优先从此 import。
 */

export {
	decodeScopeKey,
	encodeScopeKey,
	buildCanonicalSectionPath,
	buildCanonicalViewPath,
	buildCanonicalProjectPath,
	buildTaskDetailPath,
	buildProjectPath,
	buildSettingsPath,
	buildScopedSettingsPath,
	buildStartupFallbackPath,
	buildDebugActivityPath,
	parseAppRoute,
	parseShellScopePath,
	isShellPath,
	isProjectShellPath,
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
	buildShellScopeKey,
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

export {
	rememberShellRoute,
	resolveStartupPath,
	resolveRememberedPathForScope,
	loadShellNavigationRestore,
} from './memoryStore'

export {
	useShellSessionRouteHistory,
	buildShellRouteHistoryEntry,
	type ShellRouteHistoryEntry,
} from './sessionHistory'

export { resolveBreadcrumb } from './breadcrumb'
export { useRememberCurrentShellRoute } from './useRememberCurrentShellRoute'

export {
	isRememberableShellPath,
	normalizeShellMemoryPath,
	normalizeShellRouteMemory,
	createNextShellRouteMemory,
	defaultShellRouteMemory,
	stripShellDetailSearch,
	normalizeRememberedShellPath,
	resolveStartupPathFromMemory,
	validateShellRouteMemoryPaths,
} from './memory'
